"use client";

import { Allotment } from "allotment";
import "allotment/dist/style.css";

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export default function SplitPane({ left, right }: SplitPaneProps) {
  return (
    <Allotment defaultSizes={[50, 50]}>
      <Allotment.Pane minSize={200}>{left}</Allotment.Pane>
      <Allotment.Pane minSize={300}>{right}</Allotment.Pane>
    </Allotment>
  );
}
