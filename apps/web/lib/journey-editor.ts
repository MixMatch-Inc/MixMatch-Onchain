/**
 * Journey Editor State Machine (#204)
 *
 * Manages draft load, dirty tracking, slot edits, validation,
 * optimistic save, conflict handling, and publish readiness.
 * UI rendering stays thin — all behavior lives here.
 */

export const SLOT_COUNT = 7;

export enum EditorState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  EDITING = 'EDITING',
  SAVING = 'SAVING',
  SAVE_ERROR = 'SAVE_ERROR',
  CONFLICT = 'CONFLICT',
  PUBLISH_READY = 'PUBLISH_READY',
  PUBLISHED = 'PUBLISHED',
}

export interface SlotDraft {
  index: number; // 0-6
  trackId?: string;
  authoredNote?: string;
  errors: string[];
}

export interface JourneyDraft {
  id?: string;
  title: string;
  slots: SlotDraft[];
  serverVersion?: number;
}

export interface EditorSnapshot {
  state: EditorState;
  draft: JourneyDraft;
  isDirty: boolean;
  saveError: string | null;
  conflictMessage: string | null;
}

const emptySlots = (): SlotDraft[] =>
  Array.from({ length: SLOT_COUNT }, (_, i) => ({ index: i, errors: [] }));

const validateSlot = (slot: SlotDraft): string[] => {
  const errors: string[] = [];
  if (!slot.trackId?.trim()) errors.push('Track is required');
  return errors;
};

const isPublishReady = (slots: SlotDraft[]): boolean =>
  slots.every((s) => s.trackId?.trim());

export class JourneyEditorMachine {
  private snap: EditorSnapshot;

  constructor(initial?: Partial<JourneyDraft>) {
    this.snap = {
      state: EditorState.IDLE,
      draft: {
        title: '',
        slots: emptySlots(),
        ...initial,
      },
      isDirty: false,
      saveError: null,
      conflictMessage: null,
    };
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  getSnapshot(): Readonly<EditorSnapshot> {
    return this.snap;
  }

  // ── Commands ─────────────────────────────────────────────────────────────

  load(draft: JourneyDraft): void {
    this.snap = {
      state: EditorState.EDITING,
      draft: { ...draft, slots: draft.slots.map((s) => ({ ...s, errors: [] })) },
      isDirty: false,
      saveError: null,
      conflictMessage: null,
    };
  }

  setTitle(title: string): void {
    if (!this.isEditable()) return;
    this.snap.draft.title = title;
    this.snap.isDirty = true;
    this.snap.state = EditorState.EDITING;
  }

  editSlot(index: number, patch: Partial<Pick<SlotDraft, 'trackId' | 'authoredNote'>>): void {
    if (!this.isEditable()) return;
    this.assertValidIndex(index);

    const slot = this.snap.draft.slots[index];
    Object.assign(slot, patch);
    slot.errors = validateSlot(slot);

    this.snap.isDirty = true;
    this.snap.state = isPublishReady(this.snap.draft.slots)
      ? EditorState.PUBLISH_READY
      : EditorState.EDITING;
  }

  /** Slots are ordered 0-6 and cannot be reordered arbitrarily — only adjacent swaps. */
  swapSlots(fromIndex: number, toIndex: number): void {
    if (!this.isEditable()) return;
    this.assertValidIndex(fromIndex);
    this.assertValidIndex(toIndex);

    if (Math.abs(fromIndex - toIndex) !== 1) {
      throw new Error('Slots can only be swapped with adjacent neighbours');
    }

    const slots = this.snap.draft.slots;
    [slots[fromIndex], slots[toIndex]] = [slots[toIndex], slots[fromIndex]];
    slots[fromIndex].index = fromIndex;
    slots[toIndex].index = toIndex;

    this.snap.isDirty = true;
  }

  startSave(): void {
    if (this.snap.state === EditorState.SAVING) return;
    this.snap.state = EditorState.SAVING;
    this.snap.saveError = null;
  }

  saveSuccess(serverVersion: number): void {
    this.snap.draft.serverVersion = serverVersion;
    this.snap.isDirty = false;
    this.snap.saveError = null;
    this.snap.state = isPublishReady(this.snap.draft.slots)
      ? EditorState.PUBLISH_READY
      : EditorState.EDITING;
  }

  saveFailure(message: string): void {
    this.snap.state = EditorState.SAVE_ERROR;
    this.snap.saveError = message;
  }

  conflict(message: string): void {
    this.snap.state = EditorState.CONFLICT;
    this.snap.conflictMessage = message;
  }

  resolveConflict(serverDraft: JourneyDraft): void {
    this.load(serverDraft);
  }

  publish(): void {
    if (this.snap.state !== EditorState.PUBLISH_READY) return;
    this.snap.state = EditorState.PUBLISHED;
    this.snap.isDirty = false;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isEditable(): boolean {
    return [
      EditorState.EDITING,
      EditorState.SAVE_ERROR,
      EditorState.PUBLISH_READY,
    ].includes(this.snap.state);
  }

  private assertValidIndex(index: number): void {
    if (index < 0 || index >= SLOT_COUNT) {
      throw new RangeError(`Slot index ${index} is out of range (0-${SLOT_COUNT - 1})`);
    }
  }
}
