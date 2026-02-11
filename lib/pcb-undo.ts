/**
 * Command-pattern undo/redo system for PCBDesign edits.
 *
 * Each command stores the data needed to execute and undo a mutation.
 * The PCBDesign is treated as an immutable value — commands return new
 * objects (via structuredClone + mutation) so React can detect changes.
 */

import type {
    PCBDesign,
    PCBFootprint,
    PCBTrace,
    PCBVia,
    PCBZone,
    PCBPoint,
} from "./pcb-types";

// ── Command Interface ──────────────────────────────────────────────

export interface PCBCommand {
    /** Human-readable description for undo/redo UI */
    description: string;
    /** Apply the command, returning the new design */
    execute(design: PCBDesign): PCBDesign;
    /** Reverse the command, returning the previous design */
    undo(design: PCBDesign): PCBDesign;
}

// ── Undo Stack ─────────────────────────────────────────────────────

export class PCBUndoStack {
    private undoStack: PCBCommand[] = [];
    private redoStack: PCBCommand[] = [];

    /** Execute a command and push it onto the undo stack */
    execute(command: PCBCommand, design: PCBDesign): PCBDesign {
        const result = command.execute(design);
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo on new action
        return result;
    }

    /** Undo the last command */
    undo(design: PCBDesign): PCBDesign | null {
        const command = this.undoStack.pop();
        if (!command) return null;
        this.redoStack.push(command);
        return command.undo(design);
    }

    /** Redo the last undone command */
    redo(design: PCBDesign): PCBDesign | null {
        const command = this.redoStack.pop();
        if (!command) return null;
        this.undoStack.push(command);
        return command.execute(design);
    }

    get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    get undoDescription(): string | null {
        const cmd = this.undoStack[this.undoStack.length - 1];
        return cmd?.description ?? null;
    }

    get redoDescription(): string | null {
        const cmd = this.redoStack[this.redoStack.length - 1];
        return cmd?.description ?? null;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}

// ── Helper: clone design and apply mutation ────────────────────────

function mutate(design: PCBDesign, fn: (d: PCBDesign) => void): PCBDesign {
    const clone = structuredClone(design);
    fn(clone);
    return clone;
}

// ── Concrete Commands ──────────────────────────────────────────────

/** Move a footprint to a new position */
export class MoveFootprintCommand implements PCBCommand {
    description: string;

    constructor(
        private ref: string,
        private fromX: number,
        private fromY: number,
        private toX: number,
        private toY: number,
    ) {
        this.description = `Move ${ref}`;
    }

    execute(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            const fp = d.footprints.find((f) => f.ref === this.ref);
            if (fp) {
                fp.x = this.toX;
                fp.y = this.toY;
            }
        });
    }

    undo(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            const fp = d.footprints.find((f) => f.ref === this.ref);
            if (fp) {
                fp.x = this.fromX;
                fp.y = this.fromY;
            }
        });
    }
}

/** Rotate a footprint by a delta angle (degrees, CCW) */
export class RotateFootprintCommand implements PCBCommand {
    description: string;

    constructor(
        private ref: string,
        private deltaAngle: number,
    ) {
        this.description = `Rotate ${ref}`;
    }

    execute(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            const fp = d.footprints.find((f) => f.ref === this.ref);
            if (fp) {
                fp.rotation = (fp.rotation + this.deltaAngle) % 360;
            }
        });
    }

    undo(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            const fp = d.footprints.find((f) => f.ref === this.ref);
            if (fp) {
                fp.rotation = (fp.rotation - this.deltaAngle + 360) % 360;
            }
        });
    }
}

/** Flip a footprint between F.Cu and B.Cu */
export class FlipFootprintCommand implements PCBCommand {
    description: string;

    constructor(private ref: string) {
        this.description = `Flip ${ref}`;
    }

    execute(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            const fp = d.footprints.find((f) => f.ref === this.ref);
            if (fp) {
                fp.layer = fp.layer === "F.Cu" ? "B.Cu" : "F.Cu";
                // Mirror pad layers
                for (const pad of fp.pads) {
                    pad.layers = pad.layers.map((l) => {
                        if (l === "F.Cu") return "B.Cu";
                        if (l === "B.Cu") return "F.Cu";
                        return l;
                    });
                }
                // Mirror silkscreen layer
                if (fp.silkscreen) {
                    fp.silkscreen.layer =
                        fp.silkscreen.layer === "F.SilkS"
                            ? "B.SilkS"
                            : "F.SilkS";
                }
            }
        });
    }

    undo(design: PCBDesign): PCBDesign {
        // Flip is self-inverse
        return this.execute(design);
    }
}

/** Add a trace to the design */
export class AddTraceCommand implements PCBCommand {
    description: string;

    constructor(private trace: PCBTrace) {
        this.description = `Route ${trace.net}`;
    }

    execute(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            d.traces.push(structuredClone(this.trace));
        });
    }

    undo(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            // Remove trace matching the first segment UUID
            const segUuid = this.trace.segments[0]?.uuid;
            if (segUuid) {
                d.traces = d.traces.filter(
                    (t) => t.segments[0]?.uuid !== segUuid,
                );
            }
        });
    }
}

/** Add a via to the design */
export class AddViaCommand implements PCBCommand {
    description: string;

    constructor(private via: PCBVia) {
        this.description = `Place via`;
    }

    execute(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            d.vias.push(structuredClone(this.via));
        });
    }

    undo(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            d.vias = d.vias.filter((v) => v.uuid !== this.via.uuid);
        });
    }
}

/** Add a zone to the design */
export class AddZoneCommand implements PCBCommand {
    description: string;

    constructor(private zone: PCBZone) {
        this.description = `Add ${zone.net} zone`;
    }

    execute(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            d.zones.push(structuredClone(this.zone));
        });
    }

    undo(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            d.zones = d.zones.filter((z) => z.uuid !== this.zone.uuid);
        });
    }
}

/** Delete items by UUID */
export class DeleteItemsCommand implements PCBCommand {
    description: string;
    private deletedFootprints: PCBFootprint[] = [];
    private deletedTraces: PCBTrace[] = [];
    private deletedVias: PCBVia[] = [];
    private deletedZones: PCBZone[] = [];

    constructor(private uuids: Set<string>) {
        this.description = `Delete ${uuids.size} item(s)`;
    }

    execute(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            // Save deleted items for undo
            this.deletedFootprints = d.footprints.filter((f) =>
                this.uuids.has(f.uuid),
            );
            this.deletedTraces = d.traces.filter((t) =>
                t.segments.some((s) => this.uuids.has(s.uuid)),
            );
            this.deletedVias = d.vias.filter((v) => this.uuids.has(v.uuid));
            this.deletedZones = d.zones.filter((z) =>
                this.uuids.has(z.uuid),
            );

            // Remove them
            d.footprints = d.footprints.filter(
                (f) => !this.uuids.has(f.uuid),
            );
            d.traces = d.traces.filter(
                (t) => !t.segments.some((s) => this.uuids.has(s.uuid)),
            );
            d.vias = d.vias.filter((v) => !this.uuids.has(v.uuid));
            d.zones = d.zones.filter((z) => !this.uuids.has(z.uuid));
        });
    }

    undo(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            d.footprints.push(...structuredClone(this.deletedFootprints));
            d.traces.push(...structuredClone(this.deletedTraces));
            d.vias.push(...structuredClone(this.deletedVias));
            d.zones.push(...structuredClone(this.deletedZones));
        });
    }
}

/** Edit the board outline */
export class EditBoardOutlineCommand implements PCBCommand {
    description = "Edit board outline";

    constructor(
        private oldVertices: PCBPoint[],
        private newVertices: PCBPoint[],
    ) {}

    execute(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            d.boardOutline.vertices = structuredClone(this.newVertices);
        });
    }

    undo(design: PCBDesign): PCBDesign {
        return mutate(design, (d) => {
            d.boardOutline.vertices = structuredClone(this.oldVertices);
        });
    }
}
