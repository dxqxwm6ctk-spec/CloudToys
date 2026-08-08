// Polyfill WebSocket for Node.js < 22 (supabase-js v2.111+ requires it)
import { WebSocket } from "ws";
if (!("WebSocket" in globalThis)) {
  // @ts-expect-error — ws is compatible enough for supabase-js realtime
  globalThis.WebSocket = WebSocket;
}
import { createClient } from "@supabase/supabase-js";

let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error("Image storage is not configured: SUPABASE_URL is missing.");
  }
  if (!key) {
    throw new Error(
      "Image storage is not configured: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
  }
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

export const IMAGES_BUCKET = "product-images";

let bucketEnsured = false;

/** Idempotently ensure the images bucket exists (public read). */
export async function ensureImagesBucket(): Promise<void> {
  if (bucketEnsured) return;
  const { data: buckets, error: listErr } = await getSupabaseClient().storage.listBuckets();
  if (listErr) throw listErr;
  const exists = buckets?.some((b) => b.name === IMAGES_BUCKET);
  if (!exists) {
    const { error: createErr } = await getSupabaseClient().storage.createBucket(IMAGES_BUCKET, {
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
  const { error } = await getSupabaseClient().storage
    .from(IMAGES_BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: true, cacheControl });
  if (error) throw error;
}

export async function fileExists(objectPath: string): Promise<boolean> {
  await ensureImagesBucket();
  const dir = objectPath.split("/").slice(0, -1).join("/");
  const filename = objectPath.split("/").pop()!;
  const { data, error } = await getSupabaseClient().storage.from(IMAGES_BUCKET).list(dir, {
    search: filename,
  });
  if (error) throw error;
  return !!data?.some((f) => f.name === filename);
}

export async function downloadFile(objectPath: string): Promise<Buffer> {
  await ensureImagesBucket();
  const { data, error } = await getSupabaseClient().storage.from(IMAGES_BUCKET).download(objectPath);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

/** Delete every object whose path starts with the given prefix. */
export async function deleteByPrefix(prefix: string): Promise<void> {
  await ensureImagesBucket();
  const { data, error } = await getSupabaseClient().storage.from(IMAGES_BUCKET).list(prefix);
  if (error) throw error;
  if (!data || data.length === 0) return;
  const paths = data.map((f) => `${prefix}${f.name}`);
  const { error: removeErr } = await getSupabaseClient().storage.from(IMAGES_BUCKET).remove(paths);
  if (removeErr) throw removeErr;
}

export interface StorageObjectInfo {
  path: string;
  name: string;
  size: number;
  mimeType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  publicUrl: string;
}

/**
 * Supabase Storage's list() operation is directory-scoped and does not recurse.
 * Walk folders explicitly so the admin UI can manage every object in the bucket.
 */
export async function listImageObjects(): Promise<StorageObjectInfo[]> {
  await ensureImagesBucket();
  const storage = getSupabaseClient().storage.from(IMAGES_BUCKET);
  const objects: StorageObjectInfo[] = [];
  const pendingPrefixes = [""];

  while (pendingPrefixes.length > 0) {
    const prefix = pendingPrefixes.pop()!;
    const { data, error } = await storage.list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;

    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folder entries have no id/metadata in Supabase's storage response.
      if (!entry.id && !entry.metadata) {
        pendingPrefixes.push(path);
        continue;
      }

      const publicUrl = getSupabaseClient().storage
        .from(IMAGES_BUCKET)
        .getPublicUrl(path).data.publicUrl;
      objects.push({
        path,
        name: entry.name,
        size: Number(entry.metadata?.size ?? 0),
        mimeType: entry.metadata?.mimetype ?? null,
        createdAt: entry.created_at ?? null,
        updatedAt: entry.updated_at ?? null,
        publicUrl,
      });
    }
  }

  return objects.sort((a, b) => a.path.localeCompare(b.path));
}

export async function deleteObject(objectPath: string): Promise<void> {
  await ensureImagesBucket();
  const { error } = await getSupabaseClient().storage.from(IMAGES_BUCKET).remove([objectPath]);
  if (error) throw error;
}
