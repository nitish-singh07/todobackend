import jwt from "jsonwebtoken";
import type { User } from "../types/index.js";

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets are not defined in environment variables");
}

export const generateAccessToken = (user: User): string => {
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
        expiresIn: "1d", // Increased slightly for better UX
    });
};

export const generateRefreshToken = (user: User): string => {
    return jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET as string, {
        expiresIn: "7d",
    });
};
