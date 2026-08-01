import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import ordersRouter from "./orders";
import adminAuthRouter from "./adminAuth";
import adminRouter from "./admin";
import imagesRouter from "./images";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(ordersRouter);

// Auth routes first: /admin/auth/login and /admin/auth/logout must stay
// public. Everything else under /admin/* (including image uploads) requires
// a valid session.
router.use(adminAuthRouter);
router.use("/admin", requireAdmin);
router.use(adminRouter);
router.use(imagesRouter);

export default router;
