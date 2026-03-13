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
- **Volunteer Self-Registration (Story 402)** — volunteers can register personal information, select interests from a dropdown multi-select checklist, and update availability so they can be matched and contacted for relevant opportunities
- **Public Job Board + Participant Interest Saving** — anyone can browse `Jobs` from the top navigation, while signed-in participants can register interest in job opportunities
- **Weekly Newsletter Generation** — administrators can generate a weekly newsletter draft that summarizes current events and job opportunities for participants and families
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
   - Email: `lisawilliams@kindred.org`
   - Password: `lisa123`
2. In the **Management Console**, fill out **Create Participant Record**.
3. Click **Save Participant Record**.
4. Verify the new entry appears in the **Participant Records** table.
5. Click **Edit** to modify the record and save updates.
6. Refresh the page; verify the record is still present (localStorage persistence).

### Test: Volunteer Self-Registration (Volunteer Story 402)

1. Sign in as volunteer:
   - Email: `volunteer@kindred.org`
   - Password: `vol123`
2. In the **Volunteer Registration** card on the dashboard, fill in personal information.
3. Open the **Interests** dropdown and check one or more interests.
4. (Optional) Check **Other** and type a custom interest.
5. Click **Save My Volunteer Profile**.
6. Refresh and confirm the profile values are preloaded for editing.

### Test: Weekly Newsletter Generation (Administrator Story)

1. Sign in as admin:
   - Email: `lisawilliams@kindred.org`
   - Password: `lisa123`
2. From the dashboard, click **Generate This Week's Newsletter** or open **Newsletters** from the sidebar.
3. Click **Generate Newsletter**.
4. Verify the archive shows a new entry for the current week and the preview includes a subject, audience, and body.
5. Click **Copy Text** to copy the generated draft for email or messaging tools.

---

## Project Structure

```
SPRC/
├── login.html        # Public entry point
├── dashboard.html    # Protected, role-aware dashboard
├── index.html        # Landing page
├── jobs.html         # Public jobs board (participant interest actions require sign-in)
├── js/
│   ├── auth.js       # Frontend auth/data module (localStorage)
│   ├── admin.js      # Admin panel UI handlers (forms, table, edit/delete)
│   ├── volunteer.js  # Volunteer self-registration handlers (profile + interests)
│   └── sidebar.js    # Sidebar navigation and section switching
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
