import express from "express";
import { syncTodos, getTodos } from "../controllers/todoController.js";

const router = express.Router();

router.post("/sync", syncTodos);
router.get("/", getTodos);

export default router;
