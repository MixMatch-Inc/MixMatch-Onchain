'use client';

import { useReducer, useCallback } from 'react';
import {
  JourneyEditorMachine,
  EditorState,
  SLOT_COUNT,
  type SlotDraft,
} from '@/lib/journey-editor';

const machine = new JourneyEditorMachine();
machine.load({ title: '', slots: machine.getSnapshot().draft.slots });

function useEditorMachine() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const snap = machine.getSnapshot();

  const editSlot = useCallback(
    (index: number, patch: Partial<Pick<SlotDraft, 'trackId' | 'authoredNote'>>) => {
      machine.editSlot(index, patch);
      forceUpdate();
    },
    [],
  );

  const setTitle = useCallback((title: string) => {
    machine.setTitle(title);
    forceUpdate();
  }, []);

  const publish = useCallback(() => {
    machine.publish();
    forceUpdate();
  }, []);

  return { snap, editSlot, setTitle, publish };
}

const SLOT_LABELS = [
  'Opening Vibe',
  'Build-Up',
  'First Peak',
  'Mid-Journey',
  'Second Peak',
  'Wind-Down',
  'Closing Note',
] as const;

function SlotCard({
  slot,
  label,
  onChange,
}: {
  slot: SlotDraft;
  label: string;
  onChange: (patch: Partial<Pick<SlotDraft, 'trackId' | 'authoredNote'>>) => void;
}) {
  const hasErrors = slot.errors.length > 0;

  return (
    <article
      className={`rounded-2xl border p-5 ${hasErrors ? 'border-red-300 bg-red-50' : 'border-zinc-200 bg-white'} shadow-sm`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
          {slot.index + 1}
        </span>
        <h3 className="text-sm font-semibold text-zinc-900">{label}</h3>
      </div>

      {/* Provider-track selection placeholder */}
      <input
        type="text"
        placeholder="Track ID or search…"
        value={slot.trackId ?? ''}
        onChange={(e) => onChange({ trackId: e.target.value })}
        aria-label={`Track for slot ${slot.index + 1}: ${label}`}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
      />

      {/* Authored note */}
      <textarea
        placeholder="Add a note for this slot (optional)"
        value={slot.authoredNote ?? ''}
        onChange={(e) => onChange({ authoredNote: e.target.value })}
        aria-label={`Note for slot ${slot.index + 1}`}
        rows={2}
        className="mt-2 w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
      />

      {/* Validation messages */}
      {hasErrors && (
        <ul className="mt-2 space-y-0.5" role="alert">
          {slot.errors.map((err) => (
            <li key={err} className="text-xs text-red-600">
              {err}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

const PUBLISH_LABEL: Partial<Record<EditorState, string>> = {
  [EditorState.PUBLISH_READY]: 'Publish Journey',
  [EditorState.PUBLISHED]: 'Published ✓',
  [EditorState.SAVING]: 'Saving…',
  [EditorState.SAVE_ERROR]: 'Retry Save',
  [EditorState.CONFLICT]: 'Conflict — reload',
};

export default function VibeJourneyEditorPage() {
  const { snap, editSlot, setTitle, publish } = useEditorMachine();
  const { draft, state, isDirty, saveError, conflictMessage } = snap;

  const isPublishable = state === EditorState.PUBLISH_READY;
  const isPublished = state === EditorState.PUBLISHED;
  const filledSlots = draft.slots.filter((s) => s.trackId?.trim()).length;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <header className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">Vibe Journey Editor</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Fill all {SLOT_COUNT} slots to unlock publishing.
          </p>

          <input
            type="text"
            placeholder="Journey title…"
            value={draft.title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Journey title"
            className="mt-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </header>

        {/* Publication status banner */}
        {saveError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            Save failed: {saveError}
          </div>
        )}
        {conflictMessage && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700">
            Conflict: {conflictMessage}
          </div>
        )}
        {isPublished && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">
            Journey published successfully.
          </div>
        )}

        {/* Progress indicator */}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{filledSlots} / {SLOT_COUNT} slots filled</span>
          {isDirty && <span className="text-amber-600">Unsaved changes</span>}
        </div>

        {/* 7 slot cards */}
        <div className="space-y-4">
          {draft.slots.map((slot, i) => (
            <SlotCard
              key={slot.index}
              slot={slot}
              label={SLOT_LABELS[i]}
              onChange={(patch) => editSlot(i, patch)}
            />
          ))}
        </div>

        {/* Publish CTA */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={publish}
            disabled={!isPublishable}
            aria-disabled={!isPublishable}
            className={`rounded-xl px-6 py-3 text-sm font-semibold transition ${
              isPublishable
                ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                : 'cursor-not-allowed bg-zinc-200 text-zinc-400'
            }`}
          >
            {PUBLISH_LABEL[state] ?? 'Publish Journey'}
          </button>
        </div>

      </section>
    </main>
  );
}
