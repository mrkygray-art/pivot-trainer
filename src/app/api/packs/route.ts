import { loadAllPacks } from "@/lib/packs";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    return Response.json({ packs: await loadAllPacks() });
  } catch (err) {
    return errorResponse(err);
  }
}
