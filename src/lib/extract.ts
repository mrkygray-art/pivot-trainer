// Server-side text extraction for uploaded documents.
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { RequestError } from "./api";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is 4.5 MB

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

function decode(s: string) {
  return s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ENTITIES[e]).replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
}

// Mammoth's HTML is simple (headings, paragraphs, lists, tables). Keep headings as
// markdown so they can become sections; everything else becomes plain lines.
function htmlToMarkdown(html: string) {
  return decode(
    html
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g, (_, level: string, inner: string) => `\n\n${"#".repeat(Number(level))} ${inner.replace(/<[^>]+>/g, "").trim()}\n\n`)
      .replace(/<li[^>]*>/g, "\n- ")
      .replace(/<\/(p|li|tr|table|ul|ol)>/g, "\n")
      .replace(/<\/t[dh]>/g, " | ")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractDocument(file: File): Promise<{ title: string; text: string }> {
  if (file.size > MAX_UPLOAD_BYTES) throw new RequestError("That file is larger than 4 MB. Split it, or paste the text instead.");
  const name = file.name;
  const ext = name.toLowerCase().split(".").pop() ?? "";
  let title = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;

  if (ext === "txt" || ext === "md" || ext === "markdown") {
    text = buffer.toString("utf8");
  } else if (ext === "docx") {
    // Word's "Title" style becomes the document title rather than a section.
    const { value } = await mammoth.convertToHtml({ buffer }, { styleMap: ["p[style-name='Title'] => p.doc-title:fresh"] });
    const titleMatch = value.match(/<p class="doc-title">([\s\S]*?)<\/p>/);
    if (titleMatch) title = decode(titleMatch[1].replace(/<[^>]+>/g, "")).trim() || title;
    text = htmlToMarkdown(value.replace(/<p class="doc-title">[\s\S]*?<\/p>/g, ""));
  } else if (ext === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    text = String(result.text).replace(/[ \t]+\n/g, "\n").trim();
    if (text.length < 40) throw new RequestError("No text found in that PDF. It may be a scanned image; paste the text instead.");
  } else {
    throw new RequestError("Supported files: Word (.docx), PDF, text (.txt), and markdown (.md).");
  }

  // A single top-level heading at the start is the document's title.
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const firstIdx = lines.findIndex((l) => l.trim().length > 0);
  if (firstIdx >= 0 && /^#\s+/.test(lines[firstIdx]) && lines.filter((l) => /^#\s+/.test(l)).length === 1) {
    title = lines[firstIdx].replace(/^#\s+/, "").trim();
    lines.splice(firstIdx, 1);
  }
  return { title: title.slice(0, 160), text: lines.join("\n").trim() };
}
