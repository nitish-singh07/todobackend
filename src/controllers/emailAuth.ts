import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { sendOTP } from "../utils/mail.js";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signup = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    if (!name || !email || !password) {
        throw new AppError("All fields are required (Name, Email, Password)", 400);
    }

    if (!emailRegex.test(email)) {
        throw new AppError("Please provide a valid email address", 400);
    }

    if (password.length < 6) {
        throw new AppError("Password must be at least 6 characters long", 400);
    }

    // Check if user exists
    const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userQuery.rows.length > 0) {
        throw new AppError("An account with this email already exists", 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const otp = generateOTP();
    console.log(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newUser = await pool.query(
        "INSERT INTO users (email, password_hash, name, provider, provider_id, otp, otp_expires_at, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, name",
        [email, passwordHash, name, 'email', email, otp, otpExpires, false]
    );

    await sendOTP(email, otp);

    res.status(201).json({
        message: "OTP sent to your email",
        userId: newUser.rows[0].id
    });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError("Email and password are required", 400);
    }

    if (!emailRegex.test(email)) {
        throw new AppError("Please provide a valid email format", 400);
    }

    const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userQuery.rows.length === 0) {
        throw new AppError("No account found with this email", 404);
    }

    const user = userQuery.rows[0];

    // Check if it's an email auth user
    if (!user.password_hash) {
        throw new AppError("This account uses social login (Google/Apple). Please sign in with that instead.", 400);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new AppError("Incorrect password. Please try again.", 401);
    }

    if (!user.is_verified) {
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query(
            "UPDATE users SET otp = $1, otp_expires_at = $2 WHERE id = $3",
            [otp, otpExpires, user.id]
        );

        await sendOTP(email, otp);

        return res.status(200).json({
            status: "unverified",
            message: "Verify your email to continue",
            userId: user.id
        });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const salt = await bcrypt.genSalt(10);
    const hashedToken = await bcrypt.hash(refreshToken, salt);

    await pool.query(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')",
        [user.id, hashedToken]
    );

    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } });
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        throw new AppError("Missing required fields", 400);
    }

    const userQuery = await pool.query(
        "SELECT * FROM users WHERE id = $1 AND otp = $2 AND otp_expires_at > NOW()",
        [userId, otp]
    );

    if (userQuery.rows.length === 0) {
        throw new AppError("Invalid or expired OTP", 400);
    }

    const user = userQuery.rows[0];

    await pool.query(
        "UPDATE users SET is_verified = true, otp = NULL, otp_expires_at = NULL WHERE id = $1",
        [userId]
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const salt = await bcrypt.genSalt(10);
    const hashedToken = await bcrypt.hash(refreshToken, salt);

    await pool.query(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')",
        [user.id, hashedToken]
    );

    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } });
});

export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;

    if (!userId) {
        throw new AppError("User ID is required", 400);
    }

    const userQuery = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (userQuery.rows.length === 0) {
        throw new AppError("User not found", 404);
    }

    const user = userQuery.rows[0];
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
        "UPDATE users SET otp = $1, otp_expires_at = $2 WHERE id = $3",
        [otp, otpExpires, userId]
    );

    await sendOTP(user.email, otp);

    res.json({ message: "OTP resent successfully" });
});
