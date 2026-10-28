import type { Flag } from "@/lib/schemas";

const SOURCE_LABEL: Record<Flag["source"], string> = {
  "citation-check": "Source check",
  "never-say": "Words to avoid",
  verify: "Second check",
};

export default function FlagNote({ flags }: { flags: Flag[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-semibold">⚠ Take a closer look: this part could not be fully matched to your documents</p>
      <ul className="mt-1 list-disc pl-5">
        {flags.map((f, i) => (
          <li key={i}>
            <span className="font-medium">{SOURCE_LABEL[f.source]}:</span> {f.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
