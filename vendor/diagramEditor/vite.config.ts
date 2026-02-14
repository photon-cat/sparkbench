import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

function savePlugin(): Plugin {
  return {
    name: "save-diagram",
    configureServer(server) {
      server.middlewares.use("/api/save", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }
        let body = "";
        req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            const filePath = path.resolve(__dirname, "diagram.json");
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), savePlugin()],
  server: { port: 5180 },
});
