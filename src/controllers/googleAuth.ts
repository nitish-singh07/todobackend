import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import type { User } from "../types/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
    const { idToken } = req.body as { idToken: string };
    console.log(idToken);
    if (!idToken) {
        throw new AppError("Missing ID token", 400);
    }

    // VERIFY WITH GOOGLE
    const ticket = await client.verifyIdToken({
        idToken,
        audience: [process.env.GOOGLE_CLIENT_ID as string],
    });

    const payload = ticket.getPayload();
    if (!payload) {
        throw new AppError("Invalid token payload", 401);
    }
    console.log(payload);
    const { sub, email, name } = payload;

    console.log(sub, email, name);

    const userQuery = await pool.query(
        "SELECT id, provider, provider_id, email, name FROM users WHERE provider=$1 AND provider_id=$2",
        ["google", sub]
    );

    let user: User;

    if (userQuery.rows.length === 0) {
        const newUser = await pool.query(
            "INSERT INTO users (provider, provider_id, email, name) VALUES ($1, $2, $3, $4) RETURNING id, provider, provider_id, email, name",
            ["google", sub, email, name]
        );
        user = newUser.rows[0];
    } else {
        user = userQuery.rows[0];
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const salt = await bcrypt.genSalt(10);
    const hashedToken = await bcrypt.hash(refreshToken, salt);

    await pool.query(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')",
        [user.id, hashedToken]
    );

    res.json({ accessToken, refreshToken, user });
});
