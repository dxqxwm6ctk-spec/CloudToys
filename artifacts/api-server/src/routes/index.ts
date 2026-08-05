import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import ordersRouter from "./orders";
import shippingRouter from "./shipping";
import newsletterRouter from "./newsletter";
import adminAuthRouter from "./adminAuth";
import adminRouter from "./admin";
import adminUsersRouter from "./adminUsers";
import adminSecurityRouter from "./adminSecurity";
import adminShippingRouter from "./adminShipping";
import imagesRouter from "./images";
import { requireAdmin } from "../middleware/requireAdmin";

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
router.use(adminUsersRouter);
router.use(adminSecurityRouter);
router.use(adminShippingRouter);
router.use(imagesRouter);

export default router;
