import type { SchSymbol, Primitive, Port } from "../types";

function renderPrimitiveSvg(p: Primitive): string {
  switch (p.type) {
    case "path": {
      if (p.points.length < 2) return "";
      const d = p.points
        .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
        .join(" ");
      const pathD = p.closed ? d + " Z" : d;
      const fill = p.fill ? p.color : "none";
      return `<path d="${pathD}" stroke="${p.color}" stroke-width="0.02" fill="${fill}" />`;
    }
    case "circle": {
      const fill = p.fill ? p.color : "none";
      return `<circle cx="${p.x}" cy="${p.y}" r="${p.radius}" stroke="${p.color}" stroke-width="0.02" fill="${fill}" />`;
    }
    case "text":
      return `<text x="${p.x}" y="${p.y}" font-size="${p.fontSize ?? 0.1}" text-anchor="${p.anchor}" fill="${p.color}">${p.text}</text>`;
    case "box": {
      const fill = p.fill ? p.color : "none";
      return `<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" stroke="${p.color}" stroke-width="0.02" fill="${fill}" />`;
    }
  }
}

function renderPortSvg(port: Port): string {
  const size = 0.03;
  const lines = [
    `<line x1="${port.x - size}" y1="${port.y - size}" x2="${port.x + size}" y2="${port.y + size}" stroke="red" stroke-width="0.015" />`,
    `<line x1="${port.x - size}" y1="${port.y + size}" x2="${port.x + size}" y2="${port.y - size}" stroke="red" stroke-width="0.015" />`,
  ];
  if (port.labels.length > 0) {
    lines.push(
      `<text x="${port.x}" y="${port.y - 0.05}" font-size="0.05" text-anchor="middle" fill="red">${port.labels[0]}</text>`
    );
  }
  return lines.join("\n  ");
}

export function generateSvg(symbol: SchSymbol): string {
  const { size, center } = symbol;
  const vx = center.x - size.width / 2;
  const vy = center.y - size.height / 2;
  const prims = symbol.primitives.map(renderPrimitiveSvg).join("\n  ");
  const ports = symbol.ports.map(renderPortSvg).join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${size.width} ${size.height}">
  ${prims}
  ${ports}
</svg>`;
}
