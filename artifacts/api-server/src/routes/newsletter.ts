import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { newsletterSubscribersTable, db } from "@workspace/db";
import * as z from "zod";

const router: IRouter = Router();

const SubscribeBody = z.object({
  email: z.string().email(),
});

const UnsubscribeQuery = z.object({
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

// ── Newsletter unsubscribe (public – link from campaign emails) ────────────
router.post("/newsletter/unsubscribe", async (req, res): Promise<void> => {
  const query = UnsubscribeQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "A valid email address is required" });
    return;
  }

  const email = query.data.email.trim().toLowerCase();

  await db
    .delete(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.email, email));

  res.status(200).json({ email });
});

export default router;
