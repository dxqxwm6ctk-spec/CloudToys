import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import ordersRouter from "./orders";
import shippingRouter from "./shipping";
import newsletterRouter from "./newsletter";
import adminAuthRouter from "./adminAuth";
import adminRouter from "./admin";
import adminUsersRouter from "./adminUsers";
import adminStaffRouter from "./adminStaff";
import adminSecurityRouter from "./adminSecurity";
import adminShippingRouter from "./adminShipping";
import imagesRouter from "./images";
import { requireAdmin, requireRole } from "../middleware/requireAdmin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(ordersRouter);
router.use(shippingRouter);
router.use(newsletterRouter);

// Auth routes first: /admin/auth/login and /admin/auth/logout must stay
// public. Everything else under /admin/* (including image uploads) requires
// a valid session.
router.use(adminAuthRouter);
router.use("/admin", requireAdmin);
router.use(adminRouter);
// Customer management: admin + manager can act (ban/unban), supervisor can
// only view — enforced route-by-route inside adminUsers.ts.
router.use(adminUsersRouter);
// Staff account management is admin-only — a manager/supervisor could
// otherwise grant themselves more access.
router.use("/admin/staff", requireRole("admin"));
router.use(adminStaffRouter);
// Security dashboard (rate-limit events, IP blocking) is admin-only.
router.use("/admin/security", requireRole("admin"));
router.use(adminSecurityRouter);
router.use(adminShippingRouter);
router.use(imagesRouter);

export default router;
