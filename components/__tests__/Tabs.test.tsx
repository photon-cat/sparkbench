import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Tabs from "../Tabs";

// Mock the CSS module
vi.mock("../Tabs.module.css", () => ({
  default: {
    tabs: "tabs",
    tab: "tab",
    active: "active",
  },
}));

const sampleTabs = [
  { id: "code", label: "Code" },
  { id: "diagram", label: "Diagram" },
  { id: "pcb", label: "PCB" },
];

describe("Tabs", () => {
  it("renders all tab labels", () => {
    render(<Tabs tabs={sampleTabs} activeId="code" onTabChange={vi.fn()} />);
    expect(screen.getByText("Code")).toBeInTheDocument();
    expect(screen.getByText("Diagram")).toBeInTheDocument();
    expect(screen.getByText("PCB")).toBeInTheDocument();
  });

  it("applies active class to the active tab", () => {
    render(<Tabs tabs={sampleTabs} activeId="diagram" onTabChange={vi.fn()} />);
    const diagramTab = screen.getByText("Diagram");
    expect(diagramTab.className).toContain("active");

    const codeTab = screen.getByText("Code");
    expect(codeTab.className).not.toContain("active");
  });

  it("calls onTabChange with tab id when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs tabs={sampleTabs} activeId="code" onTabChange={onChange} />);

    await user.click(screen.getByText("PCB"));
    expect(onChange).toHaveBeenCalledWith("pcb");
  });

  it("renders empty when no tabs provided", () => {
    const { container } = render(<Tabs tabs={[]} activeId="" onTabChange={vi.fn()} />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });
});
