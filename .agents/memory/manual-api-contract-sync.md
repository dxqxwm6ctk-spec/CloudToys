---
name: Manual API contract synchronization
description: How to keep generated API consumers aligned when dependencies are intentionally unavailable
---

When package installation and codegen are intentionally unavailable, a small API change can be kept consistent by updating the OpenAPI source, server validation, generated Zod export, generated client type, and generated React Query helper together.

**Why:** Imported workspaces may not have `node_modules`, while some feature work still needs to be prepared without spending environment credits.

**How to apply:** Keep the generated-file edits minimal and run text-level checks such as `git diff --check`; defer typecheck and runtime verification until dependencies are available.