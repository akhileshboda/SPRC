# Kindred — Special Population Resource Connection System

> CNIT 280 Term Project · Purdue University

Kindred is a role-based web application designed to connect special-needs participants with volunteer opportunities and administrative oversight. It provides a secure, session-managed interface where administrators can manage staff accounts, volunteers can access their portal, and participants can view matched opportunities.

---

## Features

- **Secure Login** — credential validation through a backend API with password hashing (`bcrypt`)
- **Session Management** — server-side sessions via secure `httpOnly` cookies
- **Role-Based Access Control (RBAC)** — dynamic dashboard content based on user role (`ADMIN`, `VOLUNTEER`, `PARTICIPANT`)
- **Account Management** — administrators can register new staff/volunteers with a confirmation modal and simulated welcome email notification
- **User Table** — live System Users table with role badges and per-row delete functionality
- **Participant Records (Req 201)** — administrators can create, edit, and delete participant records with special-needs details
- **Forgot Password** — simulated password reset flow on the login page

---

## Security Notes

- Passwords are not stored in frontend files or `localStorage`.
- Passwords are hashed in SQLite using `bcrypt`.
- Sessions are managed on the server (`express-session`) using `httpOnly` cookies.
- Database file is stored under `data/kindred.db` (ignored via `.gitignore`).

---

## Getting Started (Secure Version)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start server:
   ```bash
   npm start
   ```
3. Open:
   - `http://localhost:3000/login.html`

### Initial admin account

On the first run, the server seeds one admin account and prints credentials in the terminal.

- Default email: `admin@kindred.local` (or `ADMIN_EMAIL` if set)
- Password:
  - Uses `ADMIN_PASSWORD` from your environment, or
  - Auto-generated once on first DB creation and printed to terminal

If you want fixed credentials, set these before running:

```powershell
$env:ADMIN_EMAIL="your_admin@email.com"
$env:ADMIN_PASSWORD="YourStrongPassword!"
$env:SESSION_SECRET="your-long-random-secret"
npm start
```

### Test: Participant Records (Administrator Story 201)

1. Sign in as admin (seeded account shown in server terminal output).
2. In the **Management Console**, fill out **Create Participant Record**.
3. Click **Save Participant Record**.
4. Verify the new entry appears in the **Participant Records** table.
5. Click **Edit** to modify the record and save updates.
6. Refresh the page; verify the record is still present (SQLite persistence).

---

## Project Structure

```
SPRC/
├── server.js         # Express server + API + SQLite initialization
├── data/             # SQLite database location (generated at runtime)
├── login.html        # Public entry point
├── dashboard.html    # Protected, role-aware dashboard
├── js/
│   ├── auth.js       # Frontend API client for auth/users/participants
│   └── admin.js      # Admin panel UI handlers (forms, table, edit/delete)
└── css/
    └── styles.css    # Minimal Bootstrap 5 overrides
```

---

## Tech Stack

- **HTML5 / CSS3**
- **Bootstrap 5.3** (CDN)
- **Vanilla JavaScript** (frontend)
- **Node.js + Express** (backend API/server)
- **SQLite3** (database)
- **bcryptjs** (password hashing)
- **express-session** (server-side sessions)

---

## Team

| Name |
|---|
| Akhilesh Boda |
| Ken Mori |
| Sannidhi Sangisetti |
| Jayan Srinivasan |
