import { loadPack } from "./packs";
import { CustomPackData, customToPack } from "./custom-pack";
import { RequestError } from "./api";
import type { Pack } from "./pack-types";

// A request names a built-in pack ({ pack: "security-sop" }) or carries a pack
// made in the builder ({ customPack: {...} }), which is validated and rebuilt here.
export async function resolvePack(body: { pack?: unknown; customPack?: unknown }): Promise<Pack> {
  if (body.customPack) {
    const parsed = CustomPackData.safeParse(body.customPack);
    if (!parsed.success) throw new RequestError(`This pack isn't valid: ${parsed.error.issues[0]?.message ?? "unknown problem"}`);
    const pack = customToPack(parsed.data);
    if (!pack.sections.some((s) => s.docId !== "glossary")) {
      throw new RequestError("This pack has no numbered sections yet. Finish the sections step in the pack builder.");
    }
    return pack;
  }
  try {
    return await loadPack(String(body.pack));
  } catch {
    throw new RequestError("Unknown pack.");
  }
}
