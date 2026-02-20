# Kindred — Special Population Resource Connection System

> CNIT 280 Term Project · Purdue University

Kindred is a role-based web application designed to connect special-needs participants with volunteer opportunities and administrative oversight. It provides a secure, session-managed interface where administrators can manage staff accounts, volunteers can access their portal, and participants can view matched opportunities.

---

## Features

- **Secure Login (Frontend Prototype)** — credential validation against localStorage data
- **Session Management** — browser session state via localStorage with protected route checks
- **Role-Based Access Control (RBAC)** — dynamic dashboard content based on user role (`ADMIN`, `VOLUNTEER`, `PARTICIPANT`)
- **Account Management** — administrators can register staff/volunteers with first and last name fields, plus confirmation modal
- **User Table** — live System Users table with role badges, edit (volunteer/participant), and delete actions
- **Participant Records (Req 201)** — administrators can create, edit, and delete participant records with special-needs details
- **Forgot Password** — simulated password reset flow on the login page

---

## Prototype Notes

- This is a frontend-only class prototype.
- User and participant data are stored in localStorage for demo use.
- Do not use real personal or production credentials in this build.

---

## Getting Started

Open directly in your browser:

```text
login.html
```

### Test: Participant Records (Administrator Story 201)

1. Sign in as admin:
   - Email: `admin@kindred.local`
   - Password: `admin123`
2. In the **Management Console**, fill out **Create Participant Record**.
3. Click **Save Participant Record**.
4. Verify the new entry appears in the **Participant Records** table.
5. Click **Edit** to modify the record and save updates.
6. Refresh the page; verify the record is still present (localStorage persistence).

---

## Project Structure

```
SPRC/
├── login.html        # Public entry point
├── dashboard.html    # Protected, role-aware dashboard
├── index.html        # Landing page
├── js/
│   ├── auth.js       # Frontend auth/data module (localStorage)
│   └── admin.js      # Admin panel UI handlers (forms, table, edit/delete)
└── css/
    └── styles.css    # Minimal Bootstrap 5 overrides
```

---

## Tech Stack

- **HTML5 / CSS3**
- **Bootstrap 5.3** (CDN)
- **Vanilla JavaScript**
- **localStorage** (prototype persistence)

---

## Team

| Name |
|---|
| Akhilesh Boda |
| Ken Mori |
| Sannidhi Sangisetti |
| Jayan Srinivasan |
