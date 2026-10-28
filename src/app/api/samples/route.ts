import { loadPackAsData } from "@/lib/packs";
import { buildDemoFile } from "@/lib/demo-file";
import { errorResponse } from "@/lib/api";

// The default sample (HR) and a second sample shipped as a demo file (Security).
// Both are read-only on the server; the browser works on an in-memory copy.
export async function GET() {
  try {
    const [hr, security] = await Promise.all([loadPackAsData("hr-retaliation"), loadPackAsData("security-sop")]);
    return Response.json({
      sample: buildDemoFile(hr.pack, hr.training, true),
      secondSample: buildDemoFile(security.pack, security.training, true),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
