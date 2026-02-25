# MindStash Backend - Local-First Sync Engine

This is the backend server for **MindStash**, a premium local-first task management application. It handles user authentication, data synchronization, and cloud persistence.

## 🚀 Tech Stack

- **Runtime**: Node.js (with `tsx` for TypeScript execution)
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT (Access + Refresh tokens), Google OAuth, Apple Sign-In
- **Email**: Nodemailer (SMTP for OTP delivery)
- **Security**: Helmet, CORS, Express-Rate-Limit, Bcrypt

## ⚙️ Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database

### 2. Environment Setup
Create a `.env` file in the root directory:

```env
PORT=5000
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

# Social Auth
GOOGLE_CLIENT_ID=your_google_client_id
APPLE_CLIENT_ID=your_apple_bundle_id

# Mail Server (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Installation
```bash
npm install
```

### 4. Running the server
```bash
# Development mode (with nodemon)
npm run dev

# Production build
npm run build
npm start
```

## 🔐 Authentication API

All Auth routes are prefixed with `/auth`.

### Email Authentication
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/signup` | `POST` | Create a new account. Sends OTP to email. |
| `/login` | `POST` | Authenticate user. Returns tokens or `unverified` status. |
| `/verify-otp` | `POST` | Verify 6-digit code. Marks user as verified. |
| `/resend-otp` | `POST` | Generate and send a fresh 6-digit code. |

### Social Authentication
- **Google**: `POST /auth/google` (Expects `idToken`)
- **Apple**: `POST /auth/apple` (Expects `identityToken`)

### Session Management
- **Refresh Token**: `POST /auth/refresh` (Expects `refreshToken` in body)
- **Status**: `GET /health` (Public health check)

## 📝 Todos & Sync API

Authenticated routes (Require `Authorization: Bearer <token>`).

### Full Sync Loop
**`POST /sync`**
This is the core of the local-first engine. It handles conflict resolution using a "Client Wins" strategy based on timestamps.

**Request Body:**
```json
{
  "upserts": [ { "id": "uuid", "title": "...", "client_updated_at": "ISO-Date" } ],
  "deleted": [ "uuid-1", "uuid-2" ],
  "lastSyncedAt": "ISO-Date"
}
```

**Response:**
```json
{
  "success": true,
  "changes": [ ...updated_tasks_from_cloud ],
  "serverTime": "ISO-Date"
}
```

### Data Retrieval
- **`GET /todos`**: Retrieve a paginated list of active (non-deleted) tasks. Supports `limit` and `offset` query params.

## 🏗 System Architecture

The backend follows a **Single Source of Truth** pattern for the cloud, but recognizes that the **last updated client** takes precedence for specific rows.

1. **Conflicts**: Resolved by comparing `client_updated_at` timestamps.
2. **Soft Deletes**: Tasks are never physically deleted on the server to ensure they sync accurately across all a user's devices.
3. **Incremental Sync**: The `lastSyncedAt` parameter ensures only changes since the last sync are transmitted, saving bandwidth and battery.
