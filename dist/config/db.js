import pkg from "pg";
const { Pool } = pkg;
import { config } from "dotenv";
config();
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables");
}
console.log("DATABASE_URL:", process.env.DATABASE_URL);
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
});
//# sourceMappingURL=db.js.map