import express from "express";
import authRoutes from "./authRoutes.js";
import { authenticateToken } from "../middleware/auth.js";
import { syncTodos, getTodos } from "../controllers/todoController.js";
const router = express.Router();
router.use("/auth", authRoutes);
// Keep the routes exactly the same as the JS version
router.post("/sync", authenticateToken, syncTodos);
router.get("/todos", authenticateToken, getTodos);
export default router;
//# sourceMappingURL=index.js.map