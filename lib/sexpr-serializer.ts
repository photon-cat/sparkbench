/**
 * Serialize an S-expression tree (nested arrays from KiCanvas tokenizer)
 * back to .kicad_pcb text format.
 */

import type { List } from "@kicanvas/kicad/tokenizer";

type SNode = string | number | List;

/** Tags whose children should always be rendered on a single line. */
const INLINE_TAGS = new Set([
  "at", "start", "end", "mid", "size", "xy", "offset", "rect_delta",
  "width", "thickness", "drill", "net", "stroke", "color",
  "hatch", "clearance", "min_thickness", "thermal_gap", "thermal_bridge_width",
  "solder_mask_margin", "solder_paste_margin", "solder_paste_margin_ratio",
  "roundrect_rratio", "chamfer_ratio", "die_length",
]);

/** Tags that are bare atoms (no value, just presence). */
const ATOM_TAGS = new Set([
  "locked", "placed", "through_hole", "smd", "virtual",
  "board_only", "exclude_from_pos_files", "exclude_from_bom",
  "allow_solder_mask_bridges", "allow_missing_courtyard",
  "remove_unused_layers", "keep_end_layers",
]);

/** Strings that should NOT be quoted (bare atoms / keywords). */
const BARE_ATOMS = new Set([
  "yes", "no", "none", "true", "false",
  "signal", "power", "mixed", "jumper", "user",
  "top", "bottom", "both",
  "thru_hole", "smd", "connect", "np_thru_hole",
  "circle", "rect", "oval", "roundrect", "trapezoid", "custom",
  "edge", "full",
  "solid", "dash", "dot", "dash_dot", "dash_dot_dot", "default",
  "left", "center", "right", "mirror",
  "blind", "micro",
]);

/** Layer names that appear as bare atoms in some contexts. */
const LAYER_NAMES = new Set([
  "F.Cu", "B.Cu", "In1.Cu", "In2.Cu", "In3.Cu", "In4.Cu",
  "F.SilkS", "B.SilkS", "F.Mask", "B.Mask",
  "F.Paste", "B.Paste", "F.Fab", "B.Fab",
  "F.CrtYd", "B.CrtYd", "Edge.Cuts",
  "Dwgs.User", "Cmts.User", "Eco1.User", "Eco2.User",
  "Margin", "*.Cu", "*.Mask", "*.Paste", "F&B.Cu",
]);

/**
 * Format a number to KiCad-compatible string.
 * Up to 6 decimal places, trailing zeros stripped.
 */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // Use fixed 6, strip trailing zeros
  let s = n.toFixed(6);
  // Remove trailing zeros after decimal
  s = s.replace(/0+$/, "");
  // Remove trailing dot
  s = s.replace(/\.$/, "");
  return s;
}

/** Check if a string needs quoting. */
function needsQuote(s: string): boolean {
  if (s === "") return true;
  if (BARE_ATOMS.has(s)) return false;
  if (LAYER_NAMES.has(s)) return false;
  // Check for chars that require quoting
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === " " || c === "(" || c === ")" || c === '"' || c === "\n" || c === "\r") {
      return true;
    }
  }
  // If it starts with a digit or +/- followed by digit, needs quoting to avoid
  // being parsed as a number (unless it IS a bare atom like a layer name)
  if (/^[-+]?\d/.test(s) && !LAYER_NAMES.has(s)) return true;
  return false;
}

/** Escape and quote a string value. */
function quoteString(s: string): string {
  const escaped = s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/** Format a single primitive value. */
function formatValue(v: SNode): string {
  if (typeof v === "number") return formatNumber(v);
  if (typeof v === "string") {
    return needsQuote(v) ? quoteString(v) : v;
  }
  // It's a sub-list — format inline
  return formatInline(v as List);
}

/** Format a list all on one line: (tag val1 val2 ...) */
function formatInline(node: List): string {
  const parts = (node as SNode[]).map(formatValue);
  return `(${parts.join(" ")})`;
}

/** Check if a node should be rendered inline (single line). */
function isInlineNode(node: List): boolean {
  const tag = node[0];
  if (typeof tag === "string" && INLINE_TAGS.has(tag)) return true;
  // Short lists with no sub-lists can be inline
  if (node.length <= 3 && node.every((n) => !Array.isArray(n))) return true;
  // Layer definitions in the layers section: (0 "F.Cu" signal)
  if (typeof tag === "number") return true;
  return false;
}

/** Tags that get their own block with indented children. */
const BLOCK_TAGS = new Set([
  "kicad_pcb", "footprint", "zone", "setup", "general", "title_block",
  "pad", "segment", "arc", "via", "gr_line", "gr_arc", "gr_circle",
  "gr_poly", "gr_rect", "gr_text", "fp_line", "fp_arc", "fp_circle",
  "fp_poly", "fp_rect", "fp_text", "polygon", "filled_polygon",
  "fill", "connect_pads", "keepout", "property", "model",
  "group", "embedded_fonts", "layers",
]);

/**
 * Serialize an S-expression tree to formatted .kicad_pcb text.
 */
export function serializeSExpr(tree: List, indent = 0): string {
  const pad = "  ".repeat(indent);

  if (isInlineNode(tree)) {
    return `${pad}${formatInline(tree)}`;
  }

  const tag = tree[0];
  const children = tree.slice(1);

  // Build the opening: (tag
  const parts: string[] = [];
  let header = `${pad}(${formatValue(tag as SNode)}`;

  // Collect leading non-list values (positional args)
  let i = 0;
  for (; i < children.length; i++) {
    const child = children[i]!;
    if (Array.isArray(child)) break;
    header += ` ${formatValue(child)}`;
  }

  parts.push(header);

  // Remaining children (sub-lists) each get their own line
  for (; i < children.length; i++) {
    const child = children[i]!;
    if (Array.isArray(child)) {
      parts.push(serializeSExpr(child as List, indent + 1));
    } else {
      // Bare atom or value at this level
      parts.push(`${"  ".repeat(indent + 1)}${formatValue(child)}`);
    }
  }

  // Close
  if (i > 0 && Array.isArray(children[children.length - 1])) {
    // Last child was a sub-list, close on its own line
    parts.push(`${pad})`);
  } else {
    // Close on the same line as last item
    parts[parts.length - 1] += ")";
  }

  return parts.join("\n");
}
