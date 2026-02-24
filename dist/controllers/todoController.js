import { pool } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
export const syncTodos = asyncHandler(async (req, res) => {
    const { upserts, deleted, lastSyncedAt } = req.body;
    if (!req.user) {
        throw new AppError("Unauthorized", 401);
    }
    const userId = req.user.userId;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // 1. Bulk Upsert
        if (upserts && upserts.length > 0) {
            await client.query(`INSERT INTO user_todos (id, user_id, title, description, completed, deleted, client_updated_at, server_updated_at)
         SELECT 
            (val->>'id')::UUID, 
            $2, 
            val->>'title', 
            COALESCE(val->>'description', ''), 
            (val->>'completed')::BOOLEAN, 
            false, 
            (val->>'client_updated_at')::TIMESTAMP WITH TIME ZONE, 
            NOW()
         FROM jsonb_array_elements($1::jsonb) AS val
         ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            completed = EXCLUDED.completed,
            deleted = EXCLUDED.deleted,
            client_updated_at = EXCLUDED.client_updated_at,
            server_updated_at = NOW()
         WHERE user_todos.client_updated_at < EXCLUDED.client_updated_at`, [JSON.stringify(upserts), userId]);
        }
        // 2. Bulk Delete
        if (deleted && deleted.length > 0) {
            await client.query(`UPDATE user_todos SET deleted = true, server_updated_at = NOW() 
         WHERE user_id = $1 AND id = ANY($2::UUID[])`, [userId, deleted]);
        }
        // 3. Pull incremental changes
        const syncTimestamp = lastSyncedAt || '1970-01-01T00:00:00Z';
        const result = await client.query(`SELECT id, title, description, completed, deleted, client_updated_at
       FROM user_todos
       WHERE user_id = $1 
       AND server_updated_at > $2`, [userId, syncTimestamp]);
        const timeResult = await client.query("SELECT NOW() as server_time");
        const serverTime = timeResult.rows[0].server_time;
        await client.query("COMMIT");
        res.json({
            success: true,
            changes: result.rows,
            serverTime: serverTime
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
});
export const getTodos = asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new AppError("Unauthorized", 401);
    }
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const result = await pool.query(`SELECT id, title, description, completed, deleted, client_updated_at 
     FROM user_todos 
     WHERE user_id = $1 AND deleted = false
     ORDER BY client_updated_at DESC
     LIMIT $2 OFFSET $3`, [userId, limit, offset]);
    res.json({ todos: result.rows });
});
//# sourceMappingURL=todoController.js.map