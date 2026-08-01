---
name: supabase-js WebSocket polyfill for Node.js 20
description: supabase-js v2.111+ requires WebSocket but Node.js 20 doesn't have it globally — must polyfill with ws
---

# supabase-js WebSocket on Node.js 20

## Rule
Add a `ws` WebSocket polyfill before importing `createClient` from `@supabase/supabase-js` when running on Node.js 20.

## Fix applied
In `artifacts/api-server/src/lib/supabaseStorage.ts`:
```ts
import { WebSocket } from "ws";
if (!("WebSocket" in globalThis)) {
  globalThis.WebSocket = WebSocket;
}
import { createClient } from "@supabase/supabase-js";
```

`ws` is added as a dependency to `@workspace/api-server`.

**Why:** `@supabase/realtime-js` (bundled in supabase-js) checks for native WebSocket at module init time and throws if not found. Node.js 22 has it natively; Node.js 20 does not.

**How to apply:** Any new file that imports supabase-js on the server should have this polyfill, or it should be applied once in the server entry point (index.ts).
