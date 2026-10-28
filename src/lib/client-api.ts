// Browser-side helpers for calling the app's API routes.

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return readJson<T>(res);
}

export async function postFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  return readJson<T>(await fetch(path, { method: "POST", body: form }));
}

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({ error: res.status === 413 ? "That file is too large." : "The server sent back something unexpected." }));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}
