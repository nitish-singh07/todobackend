import jwt from "jsonwebtoken";
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets are not defined in environment variables");
}
export const generateAccessToken = (user) => {
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1d", // Increased slightly for better UX
    });
};
export const generateRefreshToken = (user) => {
    return jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "7d",
    });
};
//# sourceMappingURL=jwt.js.map