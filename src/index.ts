import express from "express";
import type { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import morgan from "morgan";
import routes from "./routes/index.js";
import { pool } from "./config/db.js";

dotenv.config();

const app = express();

// Trust the first proxy (e.g. ngrok, heroku) for accurate rate limiting
app.set('trust proxy', 1);

/* =============================
   ENV VALIDATION
============================= */
const requiredEnv = [
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "GOOGLE_CLIENT_ID",
    "DATABASE_URL",
];

requiredEnv.forEach((key) => {
    if (!process.env[key]) {
        console.error(`Missing env variable: ${key}`);
        process.exit(1);
    }
});

/* =============================
   SECURITY
============================= */
app.use(helmet());
app.use(cors());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});

app.use("/auth", limiter);
app.use(express.json({ limit: "10kb" }));
app.use(morgan("combined"));

/* =============================
   HEALTH CHECK
============================= */
app.get("/health", async (req: Request, res: Response) => {
    try {
        await pool.query("SELECT 1");
        res.status(200).json({ status: "OK" });
    } catch {
        res.status(500).json({ status: "DB Error" });
    }
});

/* =============================
   ROUTES
============================= */
app.use(routes);

import { AppError } from "./utils/AppError.js";

/* =============================
   ERROR HANDLER
============================= */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: "fail",
            error: err.message,
        });
    }

    console.error("UNEXPECTED ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
});


/* =============================
   START SERVER
============================= */
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

/* =============================
   GRACEFUL SHUTDOWN
============================= */
process.on("SIGTERM", async () => {
    server.close(async () => {
        await pool.end();
        process.exit(0);
    });
});
