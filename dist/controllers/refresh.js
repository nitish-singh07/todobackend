import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
export const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw new AppError("Refresh token is required", 400);
    }
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    }
    catch (err) {
        throw new AppError("Invalid or expired refresh token", 403);
    }
    const userId = decoded.userId;
    // Fetch all active (not expired) hashed tokens for this user
    const tokensQuery = await pool.query("SELECT * FROM refresh_tokens WHERE user_id=$1 AND expires_at > NOW()", [userId]);
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
    // rotation: delete the used refresh token
    await pool.query("DELETE FROM refresh_tokens WHERE id=$1", [matchedToken.id]);
    const user = { id: userId };
    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    // Hash and save the new refresh token
    const hashedToken = await bcrypt.hash(newRefreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await pool.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)", [userId, hashedToken, expiresAt]);
    res.json({ accessToken, refreshToken: newRefreshToken });
});
//# sourceMappingURL=refresh.js.map