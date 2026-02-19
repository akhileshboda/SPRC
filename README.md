# Kindred — Special Population Resource Connection System

> CNIT 280 Term Project · Purdue University

Kindred is a role-based web application designed to connect special-needs participants with volunteer opportunities and administrative oversight. It provides a secure, session-managed interface where administrators can manage staff accounts, volunteers can access their portal, and participants can view matched opportunities.

---

## Features (Sprint 1)

- **Secure Login** — credential validation against a localStorage user store
- **Session Management** — persistent sessions via `localStorage`, with protected route guards
- **Role-Based Access Control (RBAC)** — dynamic dashboard content based on user role (`ADMIN`, `VOLUNTEER`, `PARTICIPANT`)
- **Account Management** — administrators can register new staff/volunteers with a confirmation modal and simulated welcome email notification
- **User Table** — live System Users table with role badges and per-row delete functionality
- **Forgot Password** — simulated password reset flow on the login page

---

## Test Credentials

| Name | Email | Password | Role |
|---|---|---|---|
| Lisa Williams | `lisawilliams@kindred.com` | `lisa123` | Administrator |
| April Williams | `april@email.com` | `april123` | Participant / Guardian |
| Volunteer Staff | `volunteer@kindred.org` | `vol123` | Volunteer |

> **Note:** User data is stored in `localStorage` under the key `kindred_users`. New accounts created by an administrator are immediately usable for login.

---

## Getting Started

No build tools or server required. Open directly in a browser:

```
login.html
```

1. Open `login.html` in any modern browser
2. Sign in with one of the test credentials above
3. The dashboard will render content specific to that role

To reset all data back to seed users, clear `localStorage` in your browser's DevTools (`Application → Local Storage → Clear`).

---

## Project Structure

```
SPRC/
├── login.html        # Public entry point
├── dashboard.html    # Protected, role-aware dashboard
├── js/
│   ├── auth.js       # Auth module: session, login, user store (IIFE/localStorage)
│   └── admin.js      # Admin panel: register form, users table, toast notifications
└── css/
    └── styles.css    # Minimal Bootstrap 5 overrides
```

---

## Tech Stack

- **HTML5 / CSS3**
- **Bootstrap 5.3** (CDN)
- **Vanilla JavaScript** — no frameworks, no build tools
- **localStorage** — client-side data persistence (mock backend)

---

## Team

| Name |
|---|
| Akhilesh Boda |
| Ken Mori |
| Sannidhi Sangisetti |
| Jayan Srinivasan |
