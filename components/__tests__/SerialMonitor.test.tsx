import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SerialMonitor from "../SerialMonitor";

// Mock the CSS module
vi.mock("../SimulationPanel.module.css", () => ({
  default: {
    serialSection: "serialSection",
    serialHeader: "serialHeader",
    serialOutput: "serialOutput",
  },
}));

describe("SerialMonitor", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(
      <SerialMonitor output="Hello" visible={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders serial output text when visible", () => {
    render(<SerialMonitor output="Hello World" visible={true} />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("shows placeholder when output is empty", () => {
    render(<SerialMonitor output="" visible={true} />);
    expect(screen.getByText("Serial output will appear here...")).toBeInTheDocument();
  });

  it("shows 'Serial Monitor' header", () => {
    render(<SerialMonitor output="test" visible={true} />);
    expect(screen.getByText("Serial Monitor")).toBeInTheDocument();
  });

  it("shows debug button when isError is true and handler provided", () => {
    const onDebug = vi.fn();
    render(
      <SerialMonitor
        output="Error: compilation failed"
        visible={true}
        isError={true}
        onDebugWithSparky={onDebug}
      />,
    );
    expect(screen.getByText("Debug with Sparky")).toBeInTheDocument();
  });

  it("calls onDebugWithSparky with output when debug button clicked", async () => {
    const user = userEvent.setup();
    const onDebug = vi.fn();
    render(
      <SerialMonitor
        output="Error text"
        visible={true}
        isError={true}
        onDebugWithSparky={onDebug}
      />,
    );

    await user.click(screen.getByText("Debug with Sparky"));
    expect(onDebug).toHaveBeenCalledWith("Error text");
  });

  it("hides debug button when isError is false", () => {
    render(
      <SerialMonitor
        output="OK"
        visible={true}
        isError={false}
        onDebugWithSparky={vi.fn()}
      />,
    );
    expect(screen.queryByText("Debug with Sparky")).not.toBeInTheDocument();
  });
});
