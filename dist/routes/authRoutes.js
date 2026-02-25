import express from "express";
import { googleAuth } from "../controllers/googleAuth.js";
import { appleAuth } from "../controllers/appleAuth.js";
import { signup, login, verifyOTP, resendOTP } from "../controllers/emailAuth.js";
import { refresh } from "../controllers/refresh.js";
const router = express.Router();
router.post("/google", googleAuth);
router.post("/apple", appleAuth);
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/refresh", refresh);
export default router;
//# sourceMappingURL=authRoutes.js.map