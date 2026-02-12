/**
 * Snapshot-based undo/redo for S-expression trees.
 *
 * Each undo entry is a structuredClone of the entire tree.
 * For typical PCB designs (few hundred nodes), this is fast (<1ms).
 */

import type { List } from "@kicanvas/kicad/tokenizer";

export class SExprUndoStack {
  private undoStack: List[] = [];
  private redoStack: List[] = [];
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  /** Push current tree state before a mutation. */
  pushSnapshot(tree: List): void {
    this.undoStack.push(structuredClone(tree));
    this.redoStack = [];
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  /** Undo: returns previous tree, or null if nothing to undo. */
  undo(currentTree: List): List | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(structuredClone(currentTree));
    return prev;
  }

  /** Redo: returns next tree, or null if nothing to redo. */
  redo(currentTree: List): List | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(structuredClone(currentTree));
    return next;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
