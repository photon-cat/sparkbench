/**
 * Generate Gerber fabrication output files from a KiCad PCB tree.
 * TODO: implement actual Gerber RS-274X generation.
 */
export function generateFabricationFiles(
  _pcbTree: any,
): { name: string; content: string }[] {
  throw new Error("Gerber export is not yet implemented");
}
