import express from "express";
import { googleAuth } from "../controllers/googleAuth.js";
import { appleAuth } from "../controllers/appleAuth.js";
import { refresh } from "../controllers/refresh.js";
const router = express.Router();
router.post("/google", googleAuth);
router.post("/apple", appleAuth);
router.post("/refresh", refresh);
export default router;
//# sourceMappingURL=authRoutes.js.map