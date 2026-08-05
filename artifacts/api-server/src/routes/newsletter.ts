import { Router, type IRouter } from "express";
import { newsletterSubscribersTable, db } from "@workspace/db";
import * as z from "zod";

const router: IRouter = Router();

const SubscribeBody = z.object({
  email: z.string().email(),
});

// ── Newsletter subscribe (public – footer signup form) ─────────────────────
router.post("/newsletter/subscribe", async (req, res): Promise<void> => {
  const body = SubscribeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid email address is required" });
    return;
  }

  const email = body.data.email.trim().toLowerCase();

  await db
    .insert(newsletterSubscribersTable)
    .values({ email })
    .onConflictDoNothing();

  res.status(201).json({ email });
});

export default router;
