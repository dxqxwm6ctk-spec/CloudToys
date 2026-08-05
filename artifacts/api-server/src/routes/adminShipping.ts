import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, shippingZonesTable } from "@workspace/db";
import * as z from "zod";

// Admin CRUD for shipping zones — mounted behind `requireAdmin` in
// routes/index.ts. Never merge this back into routes/shipping.ts (which is
// mounted before the admin auth gate and must stay public-read-only).
const router: IRouter = Router();

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

  if (isDefault) {
    await db.update(shippingZonesTable).set({ isDefault: false });
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

  if (isDefault) {
    await db.update(shippingZonesTable).set({ isDefault: false });
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
