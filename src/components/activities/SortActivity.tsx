"use client";

import { useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Activity } from "@/lib/schemas";
import { CitationChips } from "../SourceDrawer";

type Props = { activity: Extract<Activity, { type: "sort" }>; onDone: () => void };

// Deterministic shuffle that never returns the original order.
function shuffled(n: number) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = (i * 7 + 3) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (order.every((v, i) => v === i) && n > 1) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

function Row({ id, index, text, state }: { id: number; index: number; text: string; state: "idle" | "right" | "wrong" }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`flex cursor-grab touch-none items-center gap-3 rounded-[var(--pk-radius)] border-2 bg-white px-4 py-3 select-none ${
        isDragging ? "z-10 shadow-lg" : ""
      } ${state === "right" ? "border-emerald-400" : state === "wrong" ? "border-amber-400" : "border-black/10"}`}
    >
      <span className="text-neutral-400" aria-hidden>
        ⋮⋮
      </span>
      <span className="font-bold text-primary">{index + 1}</span>
      <span className="flex-1">{text}</span>
      {state === "right" && <span className="text-emerald-600">✓</span>}
    </li>
  );
}

export default function SortActivity({ activity, onDone }: Props) {
  const initial = useMemo(() => shuffled(activity.items.length), [activity.items.length]);
  const [order, setOrder] = useState<number[]>(initial);
  const [checked, setChecked] = useState(false);
  const [solved, setSolved] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setChecked(false);
    setOrder((o) => arrayMove(o, o.indexOf(Number(e.active.id)), o.indexOf(Number(e.over!.id))));
  }

  function check() {
    setChecked(true);
    if (order.every((v, i) => v === i)) {
      setSolved(true);
      onDone();
    }
  }

  const rightCount = order.filter((v, i) => v === i).length;

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-neutral-700">{activity.instruction}</p>
      <p className="mt-1 text-xs text-neutral-500">Drag to reorder, or focus an item and use Space plus the arrow keys.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="mt-4 space-y-2">
            {order.map((itemIndex, pos) => (
              <Row
                key={itemIndex}
                id={itemIndex}
                index={pos}
                text={activity.items[itemIndex].text}
                state={!checked ? "idle" : itemIndex === pos ? "right" : "wrong"}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {!solved ? (
        <div className="mt-4 flex items-center gap-3">
          <button type="button" className="pk-btn" onClick={check}>
            Check order
          </button>
          {checked && (
            <p className="text-sm text-amber-800">
              {rightCount} of {order.length} in the right spot. Move the highlighted ones and check again.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="font-semibold text-emerald-800">✓ That&apos;s the right order.</p>
          <CitationChips className="mt-2" citations={activity.items.flatMap((i) => i.citations)} />
        </div>
      )}
    </div>
  );
}
