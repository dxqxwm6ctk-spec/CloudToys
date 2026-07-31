import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { TrackOrderParams, TrackOrderResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/orders/:orderNumber/track", async (req, res): Promise<void> => {
  const params = TrackOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.orderNumber, params.data.orderNumber));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(
    TrackOrderResponse.parse({
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      steps: order.steps,
    }),
  );
});

export default router;
