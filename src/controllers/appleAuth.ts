import type { Request, Response } from "express";
import appleSigninAuth from "apple-signin-auth";
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import type { User } from "../types/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const appleAuth = asyncHandler(async (req: Request, res: Response) => {
    const { identityToken } = req.body as { identityToken: string };

    if (!identityToken) {
        throw new AppError("Missing identity token", 400);
    }

    const appleUser = await appleSigninAuth.verifyIdToken(identityToken, {
        audience: process.env.APPLE_CLIENT_ID as string,
    });

    const { sub, email } = appleUser;

    const userQuery = await pool.query(
        "SELECT id, provider, provider_id, email, name FROM users WHERE provider=$1 AND provider_id=$2",
        ["apple", sub]
    );

    let user: User;

    if (userQuery.rows.length === 0) {
        // Check if a user with this email already exists
        const emailCheck = await pool.query("SELECT id, provider, provider_id, email, name FROM users WHERE email = $1", [email]);

        if (emailCheck.rows.length > 0) {
            // Found existing account by email, use it to login
            user = emailCheck.rows[0];
        } else {
            // New user, insert them
            const newUser = await pool.query(
                "INSERT INTO users (provider, provider_id, email) VALUES ($1, $2, $3) RETURNING id, provider, provider_id, email, name",
                ["apple", sub, email]
            );
            user = newUser.rows[0];
        }
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
