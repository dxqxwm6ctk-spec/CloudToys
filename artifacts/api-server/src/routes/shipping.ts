import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, shippingZonesTable } from "@workspace/db";
import * as z from "zod";
import { lookupShippingFee } from "../lib/shippingFee";

const router: IRouter = Router();

// ── Public: look up shipping price for a governorate ──────────────────────
router.get("/shipping/lookup", async (req, res): Promise<void> => {
  const parsed = z.object({ governorate: z.string().min(1) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "governorate query param is required" });
    return;
  }

  const result = await lookupShippingFee(parsed.data.governorate);
  res.json(result ?? { price: null, zoneName: null });
});

// ── Public: list all shipping zones (for display) ─────────────────────────
router.get("/shipping/zones", async (_req, res): Promise<void> => {
  const zones = await db
    .select()
    .from(shippingZonesTable)
    .orderBy(asc(shippingZonesTable.id));

  res.json(
    zones.map((z) => ({
      id: String(z.id),
      name: z.name,
      governorates: z.governorates
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
      price: Number(z.price),
      isDefault: z.isDefault,
    })),
  );
});

export default router;
