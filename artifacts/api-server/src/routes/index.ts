import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import imagesRouter from "./images";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(ordersRouter);
router.use(adminRouter);
router.use(imagesRouter);

export default router;
