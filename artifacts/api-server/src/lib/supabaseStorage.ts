// Polyfill WebSocket for Node.js < 22 (supabase-js v2.111+ requires it)
import { WebSocket } from "ws";
if (!("WebSocket" in globalThis)) {
  // @ts-expect-error — ws is compatible enough for supabase-js realtime
  globalThis.WebSocket = WebSocket;
}
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL not set. Add your Supabase project URL.");
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY not set. Add your Supabase service_role secret key.",
  );
}

// Service-role client — bypasses RLS, used server-side only. Never expose
// this key or client to the frontend.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const IMAGES_BUCKET = "product-images";

let bucketEnsured = false;

/** Idempotently ensure the images bucket exists (public read). */
export async function ensureImagesBucket(): Promise<void> {
  if (bucketEnsured) return;
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;
  const exists = buckets?.some((b) => b.name === IMAGES_BUCKET);
  if (!exists) {
    const { error: createErr } = await supabase.storage.createBucket(IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: "10MB",
    });
    // Ignore "already exists" races from concurrent requests
    if (createErr && !/already exists/i.test(createErr.message)) {
      throw createErr;
    }
  }
  bucketEnsured = true;
}

export async function uploadFile(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
  cacheControl = "31536000",
): Promise<void> {
  await ensureImagesBucket();
  const { error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: true, cacheControl });
  if (error) throw error;
}

export async function fileExists(objectPath: string): Promise<boolean> {
  await ensureImagesBucket();
  const dir = objectPath.split("/").slice(0, -1).join("/");
  const filename = objectPath.split("/").pop()!;
  const { data, error } = await supabase.storage.from(IMAGES_BUCKET).list(dir, {
    search: filename,
  });
  if (error) throw error;
  return !!data?.some((f) => f.name === filename);
}

export async function downloadFile(objectPath: string): Promise<Buffer> {
  await ensureImagesBucket();
  const { data, error } = await supabase.storage.from(IMAGES_BUCKET).download(objectPath);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

/** Delete every object whose path starts with the given prefix. */
export async function deleteByPrefix(prefix: string): Promise<void> {
  await ensureImagesBucket();
  const { data, error } = await supabase.storage.from(IMAGES_BUCKET).list(prefix);
  if (error) throw error;
  if (!data || data.length === 0) return;
  const paths = data.map((f) => `${prefix}${f.name}`);
  const { error: removeErr } = await supabase.storage.from(IMAGES_BUCKET).remove(paths);
  if (removeErr) throw removeErr;
}
