# FlowDesk - Professional Task Management System

FlowDesk is a robust, full-featured Task Management System built for professional teams. It features a modern dark/light mode UI, real-time Kanban boards using Socket.io, role-based access control (RBAC), and a completely separate RESTful API layer.

## Technology Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose ODM
- **Authentication:** Passport.js (Local Strategy), JWT, Express Sessions
- **Real-time:** Socket.io
- **Frontend:** EJS (Server-Side Rendering), Vanilla CSS (CSS Variables), Vanilla JavaScript
- **Security:** Helmet, Express Rate Limit, bcryptjs

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd flowdesk
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/flowdesk
   SESSION_SECRET=your_super_secret_session_key
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=30d
   CLIENT_URL=http://localhost:3000
   ```

4. **Seed the Database:**
   Populate the database with sample users, projects, and tasks:
   ```bash
   npm run seed
   ```

5. **Start the Application:**
   ```bash
   npm run dev
   ```

## Default Credentials (from Seeder)
- **Admin:** `admin@flowdesk.com` / `Admin@123`
- **Manager:** `manager@flowdesk.com` / `Manager@123`
- **Employee:** `employee@flowdesk.com` / `Employee@123`

## Features Mapped to Concepts
1. **HTTP Module & Node.js fundamentals:** Configured in `server.js` with graceful shutdown.
2. **Express.js & Middleware Stack:** Robust application flow in `app.js` using Morgan, Helmet, CORS, and centralized error handling.
3. **MongoDB & Mongoose:** Schema design with references, sub-documents, virtuals, and indexes.
4. **Mongoose pre-save hooks:** Automatic password hashing via `bcryptjs`.
5. **Passport.js:** Session-based authentication for the web interface.
6. **JWT Authentication:** Token generation and verification for the distinct `/api/v1` routes.
7. **Role-based Access Control:** `requireRole` middleware locking down sensitive routes (e.g., project deletion).
8. **Real-time Collaboration:** `Socket.io` integration for instant Kanban board updates and typing indicators.
9. **Server-Side Rendering:** Clean separation of concerns using EJS partials and layouts.
10. **File Streams:** `utils/fileHelper.js` implementing non-blocking I/O for activity logs.
11. **REST API Design:** Consistent JSON response structures across the API.
12. **Dynamic UI Generation:** LocalStorage memory for Kanban/List toggles, responsive CSS Variables for theme toggling.

## API Endpoints (JSON Layer)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Returns JWT Token |
| GET | `/api/v1/tasks` | Get all tasks (supports filtering) |
| GET | `/api/v1/tasks/export/csv` | Stream Task data to CSV |
| GET | `/api/v1/projects` | Get all projects |
| GET | `/api/v1/users/me` | Get logged-in user profile |

## Folder Structure
```
flowdesk/
├── config/           # Database, Passport, and Socket initialization
├── controllers/      # Route handlers housing business logic
├── logs/             # Generated access and activity logs
├── middleware/       # Custom Express middleware (Auth, Error, Upload)
├── models/           # Mongoose schemas
├── public/           # Static assets (CSS, JS, Uploads)
├── routes/           # Express routing definitions (SSR and API separated)
├── utils/            # Helper functions (Async handlers, JWT, File I/O, Seeder)
├── views/            # EJS Templates (Layouts, Partials, Auth, Dashboard, Tasks)
├── app.js            # Express application initialization
└── server.js         # HTTP server entry point
```
