import { extractDocument } from "@/lib/extract";
import { badRequest, errorResponse } from "@/lib/api";

export const maxDuration = 60;

// Uploaded file -> plain text (headings kept as markdown). No AI involved.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("No file received.");
    return Response.json(await extractDocument(file));
  } catch (err) {
    return errorResponse(err);
  }
}
