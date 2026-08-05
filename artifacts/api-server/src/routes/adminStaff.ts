/**
 * Admin staff management — lets an "admin" role create, edit, and remove
 * other internal admin-dashboard accounts (admin / manager / supervisor).
 * Entirely restricted to the "admin" role — see routes/index.ts.
 */
import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import * as z from "zod";
import { db, adminStaffTable, adminRoles } from "@workspace/db";
import { hashPassword } from "../lib/adminAuth";

const router: IRouter = Router();

function toStaffDto(row: typeof adminStaffTable.$inferSelect) {
  return {
    id: String(row.id),
    username: row.username,
    role: row.role,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  };
}

// GET /admin/staff — list all staff accounts
router.get("/admin/staff", async (_req, res): Promise<void> => {
  const rows = await db.select().from(adminStaffTable).orderBy(adminStaffTable.createdAt);
  res.json(rows.map(toStaffDto));
});

const CreateStaffBody = z.object({
  username: z.string().trim().min(3).max(100),
  password: z.string().min(8).max(200),
  role: z.enum(adminRoles),
});

// POST /admin/staff — create a new staff account
router.post("/admin/staff", async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: adminStaffTable.id })
    .from(adminStaffTable)
    .where(sql`lower(${adminStaffTable.username}) = lower(${parsed.data.username})`);
  if (existing) {
    res.status(409).json({ error: "A staff account with this username already exists" });
    return;
  }

  const [inserted] = await db
    .insert(adminStaffTable)
    .values({
      username: parsed.data.username,
      passwordHash: hashPassword(parsed.data.password),
      role: parsed.data.role,
      active: true,
    })
    .returning();

  res.status(201).json(toStaffDto(inserted));
});

const StaffIdParams = z.object({ id: z.coerce.number() });
const UpdateStaffBody = z.object({
  role: z.enum(adminRoles).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

// PATCH /admin/staff/:id — update role, active status, and/or password
router.patch("/admin/staff/:id", async (req, res): Promise<void> => {
  const params = StaffIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = UpdateStaffBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { role, active, password } = body.data;
  if (role === undefined && active === undefined && password === undefined) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  // Prevent removing the last active admin — the dashboard would become
  // unmanageable (no one left who can grant admin access again).
  if ((role !== undefined && role !== "admin") || active === false) {
    const [target] = await db
      .select()
      .from(adminStaffTable)
      .where(eq(adminStaffTable.id, params.data.id));
    if (target?.role === "admin" && (target.active ?? true)) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(adminStaffTable)
        .where(sql`${adminStaffTable.role} = 'admin' AND ${adminStaffTable.active} = true`);
      if (count <= 1) {
        res.status(400).json({ error: "Can't remove the last remaining admin" });
        return;
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (active !== undefined) updates.active = active;
  if (password !== undefined) updates.passwordHash = hashPassword(password);

  const [updated] = await db
    .update(adminStaffTable)
    .set(updates)
    .where(eq(adminStaffTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Staff account not found" });
    return;
  }

  res.json(toStaffDto(updated));
});

// DELETE /admin/staff/:id — remove a staff account
router.delete("/admin/staff/:id", async (req, res): Promise<void> => {
  const params = StaffIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  if (req.adminUsername) {
    const [self] = await db
      .select({ id: adminStaffTable.id })
      .from(adminStaffTable)
      .where(sql`lower(${adminStaffTable.username}) = lower(${req.adminUsername})`);
    if (self?.id === params.data.id) {
      res.status(400).json({ error: "You can't delete your own account" });
      return;
    }
  }

  const [target] = await db
    .select()
    .from(adminStaffTable)
    .where(eq(adminStaffTable.id, params.data.id));
  if (target?.role === "admin" && target.active) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adminStaffTable)
      .where(sql`${adminStaffTable.role} = 'admin' AND ${adminStaffTable.active} = true`);
    if (count <= 1) {
      res.status(400).json({ error: "Can't remove the last remaining admin" });
      return;
    }
  }

  const [deleted] = await db
    .delete(adminStaffTable)
    .where(eq(adminStaffTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Staff account not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
