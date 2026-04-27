/* Kindred – Sidebar navigation module
   Handles: nav config, sidebar population (desktop + mobile offcanvas),
   section switching, active states, and logout wiring. */

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: 'bi-house-door',    roles: ['ADMIN', 'GUARDIAN', 'PARTICIPANT', 'VOLUNTEER'] },
  // ADMIN-only management sections
  { id: 'participants', label: 'Participants', icon: 'bi-people',         roles: ['ADMIN'] },
  { id: 'volunteers',   label: 'Volunteers',   icon: 'bi-heart',          roles: ['ADMIN'] },
  { id: 'events',       label: 'Events',       icon: 'bi-calendar-event', roles: ['ADMIN'] },
  { id: 'jobs',             label: 'Jobs',             icon: 'bi-briefcase',      roles: ['ADMIN'] },
  { id: 'communications', label: 'Communications', icon: 'bi-megaphone',  roles: ['ADMIN'] },
  { id: 'urgent-notifications', label: 'Urgent Alerts', icon: 'bi-bell-fill', roles: ['ADMIN'] },
  { id: 'users',        label: 'Users',        icon: 'bi-person-badge',   roles: ['ADMIN'] },
  // GUARDIAN sections
  { id: 'g-participants', label: 'My Participants', icon: 'bi-people-fill', roles: ['GUARDIAN'] },
  { id: 'g-approvals',  label: 'Approvals', icon: 'bi-shield-check', roles: ['GUARDIAN'] },
  { id: 'g-newsletter', label: 'Newsletter', icon: 'bi-envelope-paper', roles: ['GUARDIAN'] },
  // PARTICIPANT discovery sections
  { id: 'p-profile',    label: 'My Profile', icon: 'bi-person-vcard', roles: ['PARTICIPANT'] },
  { id: 'p-events',     label: 'My saved events', icon: 'bi-calendar-event', roles: ['PARTICIPANT'] },
  { id: 'p-newsletter', label: 'Newsletter', icon: 'bi-envelope-paper', roles: ['PARTICIPANT'] },
  // VOLUNTEER sections
  { id: 'v-profile',    label: 'My Profile',       icon: 'bi-person-circle', roles: ['VOLUNTEER'] },
  { id: 'v-bgcheck',    label: 'Background Check', icon: 'bi-shield-lock', roles: ['VOLUNTEER'] },
  { id: 'v-events',     label: 'Events',       icon: 'bi-calendar-event', roles: ['VOLUNTEER'] },
  { id: 'v-tasks',      label: 'My Tasks',     icon: 'bi-clipboard-check', roles: ['VOLUNTEER'] },
  // ADMIN task management
  { id: 'work-queue',   label: 'Work Queue',   icon: 'bi-kanban',          roles: ['ADMIN'] },
  // PARTICIPANT inquiry
  { id: 'p-inquiries',  label: 'My Inquiries', icon: 'bi-chat-left-text',  roles: ['PARTICIPANT'] },
  { id: 'p-jobs',       label: 'My Job Applications', icon: 'bi-briefcase', roles: ['PARTICIPANT'] },
];

function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _buildSidebarHTML(session) {
  const links = NAV_ITEMS
    .filter(item => item.roles.includes(session.role))
    .map(item => `
      <button class="sidebar-nav-link" data-section="${item.id}" type="button" aria-current="false">
        <i class="bi ${item.icon}"></i> ${item.label}
      </button>`).join('');

  const roleClass = {
    ADMIN: 'badge-ADMIN',
    GUARDIAN: 'badge-GUARDIAN',
    PARTICIPANT: 'badge-PARTICIPANT',
    VOLUNTEER: 'badge-VOLUNTEER'
  }[session.role] || 'bg-secondary';

  return `<nav class="flex-grow-1 py-2">${links}</nav>`;
}

function initSidebar(session) {
  const html = _buildSidebarHTML(session);

  // Stamp into desktop sidebar (after the static .sidebar-brand div)
  document.getElementById('desktopSidebar').insertAdjacentHTML('beforeend', html);

  // Stamp into mobile offcanvas body
  document.querySelector('#sidebarOffcanvas .offcanvas-body').innerHTML = html;

  // Wire nav links (covers both desktop and offcanvas copies)
  document.querySelectorAll('.sidebar-nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.section);
      // Close offcanvas on mobile after navigating (no-op on desktop)
      bootstrap.Offcanvas.getInstance(document.getElementById('sidebarOffcanvas'))?.hide();
    });
  });

  // Wire logout buttons (covers both copies)
  document.querySelectorAll('.js-logout-btn').forEach(btn => {
    btn.addEventListener('click', () => Auth.logout());
  });

  // Honour a deep-link hash on initial load (only if valid for this role)
  const hashId = location.hash.slice(1);
  const validIds = NAV_ITEMS.filter(i => i.roles.includes(session.role)).map(i => i.id);
  navigateTo(validIds.includes(hashId) ? hashId : 'dashboard');
}


function navigateTo(sectionId) {
  if (!sectionId) return;
  const navItem = NAV_ITEMS.find(item => item.id === sectionId);

  // Hide all content sections
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));

  // Show the target section
  document.getElementById(`section-${sectionId}`)?.classList.remove('d-none');

  // Sync active state on all nav link buttons (both sidebar copies)
  document.querySelectorAll('.sidebar-nav-link').forEach(btn => {
    const active = btn.dataset.section === sectionId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  });

  const mobileTitle = document.getElementById('mobileDashboardTitle');
  if (mobileTitle && navItem) {
    mobileTitle.textContent = navItem.label;
  }

  const locTitle = document.getElementById('dashboardLocationTitle');
  if (locTitle && navItem) {
    locTitle.textContent = navItem.label;
  }

  // Scroll the main content area back to the top
  document.getElementById('mainContent').scrollTop = 0;

  // Keep URL hash in sync (only push if it changed to avoid duplicate history entries)
  const newHash = `#${sectionId}`;
  if (location.hash !== newHash) {
    location.hash = newHash;
  }
}

// Handle browser back/forward navigation
window.addEventListener('hashchange', () => {
  const sectionId = location.hash.slice(1);
  if (sectionId) navigateTo(sectionId);
});
