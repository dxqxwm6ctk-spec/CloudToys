---
name: Heroku API build in monorepo
description: Heroku must build only the Cloud Toys API, not every workspace artifact.
---

The Heroku app is the API service, while the repository also contains web and Expo artifacts whose builds require separate environments and can fail unrelated server publishing.

**Why:** A root recursive build caused Heroku to enter the Expo Metro build and reject the push before the API was built.

**How to apply:** Keep the normal workspace build for local/monorepo checks, but expose a Heroku-specific postbuild that typechecks and bundles only `@workspace/api-server`; keep the Procfile pointed at that API's production start script.