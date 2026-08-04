import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, shippingZonesTable } from "@workspace/db";
import * as z from "zod";

const router: IRouter = Router();

// ── Public: look up shipping price for a governorate ──────────────────────
router.get("/shipping/lookup", async (req, res): Promise<void> => {
  const parsed = z.object({ governorate: z.string().min(1) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "governorate query param is required" });
    return;
  }

  const governorate = parsed.data.governorate.toLowerCase().trim();

  // Fetch all zones ordered by id (creation order) so we pick the most-specific first
  const zones = await db
    .select()
    .from(shippingZonesTable)
    .orderBy(asc(shippingZonesTable.id));

  // Find the first zone that explicitly includes this governorate
  const match = zones.find((z) =>
    z.governorates
      .split(",")
      .map((g) => g.trim().toLowerCase())
      .filter(Boolean)
      .includes(governorate),
  );

  if (match) {
    res.json({ price: Number(match.price), zoneName: match.name });
    return;
  }

  // Fall back to the default zone
  const defaultZone = zones.find((z) => z.isDefault);
  if (defaultZone) {
    res.json({ price: Number(defaultZone.price), zoneName: defaultZone.name });
    return;
  }

  // No zones configured at all — return null so the frontend can fall back
  res.json({ price: null, zoneName: null });
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

// ── Admin: CRUD for shipping zones ────────────────────────────────────────

const ShippingZoneBody = z.object({
  name: z.string().min(1),
  governorates: z.array(z.string()),
  price: z.number().min(0),
  isDefault: z.boolean().optional(),
});

router.get("/admin/settings/shipping-zones", async (_req, res): Promise<void> => {
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

router.post("/admin/settings/shipping-zones", async (req, res): Promise<void> => {
  const parsed = ShippingZoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, governorates, price, isDefault } = parsed.data;

  // If this zone is being set as default, clear the flag on all others first
  if (isDefault) {
    await db
      .update(shippingZonesTable)
      .set({ isDefault: false });
  }

  const [inserted] = await db
    .insert(shippingZonesTable)
    .values({
      name,
      governorates: governorates.join(","),
      price: String(price),
      isDefault: isDefault ?? false,
    })
    .returning();

  res.status(201).json({
    id: String(inserted.id),
    name: inserted.name,
    governorates: inserted.governorates.split(",").map((g) => g.trim()).filter(Boolean),
    price: Number(inserted.price),
    isDefault: inserted.isDefault,
  });
});

router.put("/admin/settings/shipping-zones/:id", async (req, res): Promise<void> => {
  const params = z.object({ id: z.coerce.number() }).safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = ShippingZoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, governorates, price, isDefault } = parsed.data;

  // If this zone is becoming default, clear other zones first
  if (isDefault) {
    await db
      .update(shippingZonesTable)
      .set({ isDefault: false });
  }

  const [updated] = await db
    .update(shippingZonesTable)
    .set({
      name,
      governorates: governorates.join(","),
      price: String(price),
      isDefault: isDefault ?? false,
    })
    .where(eq(shippingZonesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Shipping zone not found" });
    return;
  }

  res.json({
    id: String(updated.id),
    name: updated.name,
    governorates: updated.governorates.split(",").map((g) => g.trim()).filter(Boolean),
    price: Number(updated.price),
    isDefault: updated.isDefault,
  });
});

router.delete("/admin/settings/shipping-zones/:id", async (req, res): Promise<void> => {
  const params = z.object({ id: z.coerce.number() }).safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(shippingZonesTable)
    .where(eq(shippingZonesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Shipping zone not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
