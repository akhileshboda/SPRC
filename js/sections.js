/* Kindred – Section loader
   Fetches role-appropriate HTML section files in parallel, injects them
   into #mainContent, initialises the sidebar, then fires 'sections:ready'
   so role-specific JS modules can safely wire up their handlers. */

const ROLE_SECTIONS = {
  ADMIN: [
    'sections/dashboard.html?v=3',
    'sections/admin/participants.html?v=1',
    'sections/admin/volunteers.html?v=1',
    'sections/admin/events.html?v=1',
    'sections/admin/jobs.html?v=1',
    'sections/admin/communications.html?v=1',
    'sections/admin/urgent-notifications.html?v=1',
    'sections/admin/users.html?v=1',
    'sections/admin/registrations.html?v=1',
    'sections/admin/work-queue.html?v=1',
    'sections/admin/notifications.html?v=1',
  ],
  GUARDIAN: [
    'sections/dashboard.html?v=3',
    'sections/guardian/participants.html?v=1',
    'sections/guardian/approvals.html?v=1',
    'sections/guardian/newsletter.html?v=1',
    'sections/guardian/notifications.html?v=1',
  ],
  PARTICIPANT: [
    'sections/dashboard.html?v=3',
    'sections/participant/profile.html?v=1',
    'sections/participant/events.html?v=1',
    'sections/participant/newsletter.html?v=1',
    'sections/participant/notifications.html?v=1',
    'sections/participant/inquiries.html?v=1',
    'sections/participant/jobs.html?v=1',
  ],
  VOLUNTEER: [
    'sections/dashboard.html?v=3',
    'sections/volunteer/profile.html?v=1',
    'sections/volunteer/bgcheck.html?v=1',
    'sections/volunteer/events.html?v=1',
    'sections/volunteer/newsletter.html?v=1',
    'sections/volunteer/tasks.html?v=1',
    'sections/volunteer/notifications.html?v=1',
  ],
};

document.addEventListener('DOMContentLoaded', async () => {
  const session = await Auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const files = ROLE_SECTIONS[session.role] ?? [];
  const mainContent = document.getElementById('mainContent');

  try {
    const htmlParts = await Promise.all(
      files.map(f => fetch(f).then(r => {
        if (!r.ok) throw new Error(`Failed to load section: ${f} (${r.status})`);
        return r.text();
      }))
    );
    mainContent.innerHTML = [
      `<div id="dashboardLocationBar" class="mb-3 pb-2 border-bottom" style="border-color: var(--k-border, #e2e6f3) !important;" role="navigation" aria-label="Current place in the portal">
        <p class="small text-muted mb-0">
          <span class="visually-hidden">You are in: </span>
          <span>Portal</span>
          <span aria-hidden="true" class="text-muted"> · </span>
          <span class="text-body fw-semibold" id="dashboardLocationTitle">Dashboard</span>
        </p>
      </div>`,
      htmlParts.join('\n')
    ].join('\n');
  } catch (err) {
    mainContent.innerHTML = `
      <div class="alert alert-danger m-4" role="alert">
        <strong>Dashboard failed to load.</strong> ${err.message}
      </div>`;
    return;
  }

  // Set welcome heading (lives inside sections/dashboard.html)
  const heading = document.getElementById('welcomeHeading');
  if (heading) heading.textContent = `Welcome back, ${session.name || session.email}`;

  // Reveal the role-specific panel inside the dashboard section
  document.getElementById(`panel-${session.role}`)?.classList.remove('d-none');
  if (session.role === 'VOLUNTEER') {
    document.getElementById('panel-VOLUNTEER-saved')?.classList.remove('d-none');
    _loadVolunteerSavedEvents();
  }

  // Init sidebar (wires nav links + handles initial hash navigation)
  initSidebar(session);

  // Signal all role-specific modules that the DOM is ready
  document.dispatchEvent(new CustomEvent('sections:ready', { detail: { session } }));
});

function _loadVolunteerSavedEvents() {
  const container = document.getElementById('volunteerSavedEvents');
  if (!container) return;
  container.innerHTML = `
    <p class="text-muted mb-0">
      Volunteer saved events are not part of this linked-identity flow.
      Browse <a href="events.html">events</a> to review current opportunities.
    </p>`;
}
