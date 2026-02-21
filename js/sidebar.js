/* Kindred – Sidebar navigation module
   Handles: nav config, sidebar population (desktop + mobile offcanvas),
   section switching, active states, and logout wiring. */

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: 'bi-house-door',  roles: ['ADMIN', 'PARTICIPANT', 'VOLUNTEER'] },
  { id: 'participants', label: 'Participants', icon: 'bi-people',       roles: ['ADMIN'] },
  { id: 'users',        label: 'Users',        icon: 'bi-person-badge', roles: ['ADMIN'] },
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
    PARTICIPANT: 'badge-PARTICIPANT',
    VOLUNTEER: 'badge-VOLUNTEER'
  }[session.role] || 'bg-secondary';

  const displayName = _escHtml(session.name || session.email);

  return `
    <nav class="flex-grow-1 pt-2">${links}</nav>
    <div class="sidebar-user-block">
      <div class="d-flex align-items-center gap-2 mb-1">
        <span class="user-name">${displayName}</span>
        <span class="badge ${roleClass} ms-auto">${session.role}</span>
      </div>
      <div class="user-email mb-2">${_escHtml(session.email)}</div>
      <button class="btn btn-outline-light btn-sm w-100 js-logout-btn" type="button">
        <i class="bi bi-box-arrow-right me-1"></i>Logout
      </button>
    </div>`;
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
}

function navigateTo(sectionId) {
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

  // Scroll the main content area back to the top
  document.getElementById('mainContent').scrollTop = 0;
}
