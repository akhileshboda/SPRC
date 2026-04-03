# Kindred — Special Population Resource Connection System

> CNIT 280 Term Project · Purdue University

Kindred is a role-based web application designed to connect special-needs participants, their guardians, volunteers, and administrators through a linked-identity support model. It provides a secure, session-managed interface where administrators manage records and links, guardians oversee linked participants, volunteers access their portal, and participants use self-service features.

---

## Features

- **Secure Login (Frontend Prototype)** — credential validation against localStorage data
- **Session Management** — browser session state via localStorage with protected route checks
- **Role-Based Access Control (RBAC)** — dynamic dashboard content based on user role (`ADMIN`, `GUARDIAN`, `PARTICIPANT`, `VOLUNTEER`)
- **Linked Identity Model** — participant records link directly to participant logins and one or more guardian logins
- **Account Management** — administrators can register guardians, participants, and volunteers with first and last name fields, plus confirmation modal
- **User Table** — live System Users table with role badges, edit actions, and guarded delete rules for linked accounts
- **Participant Records** — administrators can create, edit, and delete participant records with support notes, participant interests, and explicit guardian links
- **Volunteer Self-Registration (Story 402)** — volunteers can register personal information, select interests from a dropdown multi-select checklist, and update availability so they can be matched and contacted for relevant opportunities
- **Guardian Approval Workflow** — participant-submitted job interests create pending approvals that guardians can approve or reject
- **Public Job Board + Participant Interest Saving** — anyone can browse `Jobs` from the top navigation, participants can submit interest, and guardians can register on behalf of linked participants
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

### Test Accounts

- Admin: `lisawilliams@kindred.org` / `lisa123`
- Guardian: `grace.guardian@kindred.org` / `grace123`
- Participant: `april@email.com` / `april123`
- Volunteer: `janew@kindred.org` / `jane123`

### Test: Linked Participant Records

1. Sign in as admin.
2. In the **Management Console**, fill out **Create Participant Record**.
3. Choose a participant login and one or more guardian logins.
4. Click **Save Participant Record**.
5. Verify the new entry appears in the **Participant Records** table with linked login details.
6. Click **Edit** to modify the record and save updates.
7. Refresh the page; verify the record is still present (localStorage persistence).

### Test: Volunteer Self-Registration (Volunteer Story 402)

1. Sign in as volunteer.
2. In the **Volunteer Registration** card on the dashboard, fill in personal information.
3. Open the **Interests** dropdown and check one or more interests.
4. (Optional) Check **Other** and type a custom interest.
5. Click **Save My Volunteer Profile**.
6. Refresh and confirm the profile values are preloaded for editing.

### Test: Guardian Approval Flow

1. Sign in as participant and open `jobs.html`.
2. Register interest in a job opportunity.
3. Verify the participant dashboard shows the job as `PENDING`.
4. Sign in as the linked guardian and open the dashboard.
5. Open **Approvals** and approve or reject the pending request.
6. Verify the participant dashboard and admin job summary reflect the updated status.

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
