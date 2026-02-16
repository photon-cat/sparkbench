import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const DEEPPCB_SSE_URL = "https://mcp.deeppcb.ai/agent/tools/sse";

export interface DeepPCBProgress {
  step: string;
  message: string;
  percent?: number;
}

export type ProgressCallback = (progress: DeepPCBProgress) => void;

interface ToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

function extractText(result: ToolResult): string {
  return (
    result.content
      ?.filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("\n") ?? ""
  );
}

export class DeepPCBClient {
  private client: Client;
  private apiKey: string;
  private connected = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new Client({ name: "sparkbench", version: "1.0.0" });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    const transport = new SSEClientTransport(new URL(DEEPPCB_SSE_URL), {
      requestInit: {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      },
    });
    await this.client.connect(transport);
    this.connected = true;
  }

  async listTools(): Promise<{ name: string; description?: string }[]> {
    const result = await this.client.listTools();
    return result.tools.map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const result = await this.client.callTool({ name, arguments: args });
    return result as ToolResult;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.close();
    } catch {
      // ignore close errors
    }
    this.connected = false;
  }

  /**
   * Discover tool names from the DeepPCB MCP server and match by substring patterns.
   */
  private findTool(
    tools: string[],
    patterns: string[],
  ): string | undefined {
    return tools.find((t) =>
      patterns.some((p) => t.toLowerCase().includes(p)),
    );
  }

  /**
   * Run the full autoroute workflow: extract constraints → validate → place → route → poll → retrieve.
   * Tool names are discovered dynamically since the exact API may evolve.
   */
  async autoroute(
    pcbContent: string,
    onProgress: ProgressCallback,
  ): Promise<string> {
    await this.connect();

    try {
      // Discover available tools
      const toolList = await this.listTools();
      const toolNames = toolList.map((t) => t.name);

      onProgress({
        step: "connected",
        message: `Connected to DeepPCB. Found ${toolNames.length} tools: ${toolNames.join(", ")}`,
      });

      const extractTool = this.findTool(toolNames, [
        "extract_constraint",
        "derive_constraint",
      ]);
      const validateTool = this.findTool(toolNames, ["validate"]);
      const placementTool = this.findTool(toolNames, [
        "start_placement",
        "place",
      ]);
      const routingTool = this.findTool(toolNames, [
        "start_rout",
        "route",
      ]);
      const statusTool = this.findTool(toolNames, [
        "check_status",
        "get_status",
        "status",
      ]);
      const resultTool = this.findTool(toolNames, [
        "get_best",
        "retrieve",
        "get_board",
        "best_board",
      ]);

      // Step 1: Extract constraints
      if (extractTool) {
        onProgress({
          step: "extracting",
          message: "Extracting constraints from board...",
          percent: 10,
        });
        const constraintResult = await this.callTool(extractTool, {
          board_content: pcbContent,
        });
        const constraintText = extractText(constraintResult);

        if (constraintResult.isError) {
          throw new Error(
            `Constraint extraction failed: ${constraintText}`,
          );
        }

        // Step 2: Validate constraints
        if (validateTool) {
          onProgress({
            step: "validating",
            message: "Validating constraints...",
            percent: 20,
          });
          const validationResult = await this.callTool(validateTool, {
            constraints: constraintText,
          });
          if (validationResult.isError) {
            throw new Error(
              `Validation failed: ${extractText(validationResult)}`,
            );
          }
        }

        // Step 3: Start placement
        if (placementTool) {
          onProgress({
            step: "placing",
            message: "Starting component placement...",
            percent: 30,
          });
          const placementResult = await this.callTool(placementTool, {
            board_content: pcbContent,
            constraints: constraintText,
          });
          if (placementResult.isError) {
            throw new Error(
              `Placement failed: ${extractText(placementResult)}`,
            );
          }
        }

        // Step 4: Start routing
        if (routingTool) {
          onProgress({
            step: "routing",
            message: "Starting autorouting...",
            percent: 50,
          });
          const routingResult = await this.callTool(routingTool, {
            board_content: pcbContent,
            constraints: constraintText,
          });
          if (routingResult.isError) {
            throw new Error(
              `Routing failed: ${extractText(routingResult)}`,
            );
          }
        }

        // Step 5: Poll status until complete
        if (statusTool) {
          let complete = false;
          let pollCount = 0;
          const maxPolls = 720; // 5s * 720 = 1 hour max polling

          while (!complete && pollCount < maxPolls) {
            await new Promise((r) => setTimeout(r, 5000));
            pollCount++;

            const statusResult = await this.callTool(statusTool, {});
            const statusText = extractText(statusResult);

            const percent = Math.min(
              50 + Math.floor((pollCount / maxPolls) * 40),
              90,
            );
            onProgress({
              step: "routing",
              message: statusText || `Routing in progress... (poll ${pollCount})`,
              percent,
            });

            // Check for completion indicators in the status text
            const lower = statusText.toLowerCase();
            if (
              lower.includes("complete") ||
              lower.includes("finished") ||
              lower.includes("done") ||
              lower.includes("ready")
            ) {
              complete = true;
            }
            if (
              lower.includes("failed") ||
              lower.includes("error") ||
              statusResult.isError
            ) {
              throw new Error(`Routing failed: ${statusText}`);
            }
          }

          if (!complete) {
            throw new Error("Routing timed out after 1 hour of polling");
          }
        }
      }

      // Step 6: Retrieve the best routed board
      if (resultTool) {
        onProgress({
          step: "retrieving",
          message: "Retrieving routed board...",
          percent: 95,
        });
        const bestResult = await this.callTool(resultTool, {});
        const boardText = extractText(bestResult);

        if (bestResult.isError || !boardText) {
          throw new Error(
            `Failed to retrieve board: ${extractText(bestResult)}`,
          );
        }

        onProgress({
          step: "done",
          message: "Routing complete!",
          percent: 100,
        });

        return boardText;
      }

      throw new Error(
        "Could not find a result retrieval tool among: " +
          toolNames.join(", "),
      );
    } finally {
      await this.disconnect();
    }
  }
}
