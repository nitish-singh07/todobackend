import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { generateAccessToken } from "../utils/jwt.js";
import type { JWTPayload, User } from "../types/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken: string };

    if (!refreshToken) {
        throw new AppError("Refresh token is required", 400);
    }

    const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET as string
    ) as JWTPayload;

    const userId = decoded.userId;

    // Fetch all active (not expired) hashed tokens for this user
    const tokensQuery = await pool.query(
        "SELECT * FROM refresh_tokens WHERE user_id=$1 AND expires_at > NOW()",
        [userId]
    );

    let matchedToken = null;
    for (const row of tokensQuery.rows) {
        const isMatch = await bcrypt.compare(refreshToken, row.token);
        if (isMatch) {
            matchedToken = row;
            break;
        }
    }

    if (!matchedToken) {
        throw new AppError("Invalid refresh token", 403);
    }

    const accessToken = generateAccessToken({
        id: userId
    } as User);

    res.json({ accessToken });
});
