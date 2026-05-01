/**
 * nav.js — Synchronously injects nav.html into #nav-root.
 *
 * Uses a synchronous XMLHttpRequest so the nav is inserted as part of the
 * initial document paint — zero flicker, no async timing issues.
 *
 * Post-injection logic (active link, hide Sign In on login, scroll shadow)
 * runs inside DOMContentLoaded to ensure the rest of the DOM is ready.
 */
(function () {
    const root = document.getElementById('nav-root');
    if (!root) return;

    // ── Synchronous fetch of nav.html ─────────────────────────────────────────
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'nav.html?v=2', false); // false = synchronous; v= busts the cache
        xhr.send(null);
        if (xhr.status === 200 || xhr.status === 0 /* local file */) {
            root.innerHTML = xhr.responseText;
        } else {
            console.warn('[nav.js] nav.html returned status', xhr.status);
            return;
        }
    } catch (err) {
        console.warn('[nav.js] Could not load nav.html:', err);
        return;
    }

    // ── Post-injection setup (runs after DOM is fully parsed) ─────────────────
    document.addEventListener('DOMContentLoaded', function () {
        // Derive page key from filename (e.g. "events" from "events.html").
        const filename = location.pathname.split('/').pop().replace('.html', '') || 'index';

        // Set active link
        document.querySelectorAll('#mainNav [data-nav-page]').forEach(function (link) {
            if (link.dataset.navPage === filename) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });

        // Hide auth CTAs on pages where they'd be redundant
        if (filename === 'login') {
            const signinBtn = document.getElementById('nav-signin-btn');
            if (signinBtn) signinBtn.style.display = 'none';
            const applyBtn = document.getElementById('nav-apply-btn');
            if (applyBtn) applyBtn.style.display = 'none';

            const navLinks = document.querySelector('#mainNav .nav-links');
            if (navLinks) navLinks.classList.add('nav-login-links-centered');
        }

        if (filename === 'register') {
            const applyBtn = document.getElementById('nav-apply-btn');
            if (applyBtn) applyBtn.style.display = 'none';
        }

        // ── Session-aware CTA: same user block on every page ─────────────────
        if (typeof Auth !== 'undefined') {
            Auth.getSession().then(function (session) {
                const signinBtn  = document.getElementById('nav-signin-btn');
                const accountBtn = document.getElementById('nav-account-btn');
                const navRight   = document.getElementById('nav-auth-area');

                if (!session) return; // unauthenticated — keep "Sign In" visible

                if (signinBtn)  signinBtn.style.display  = 'none';
                if (accountBtn) accountBtn.style.display = 'none';

                if (!navRight) return;

                const roleClass   = { ADMIN: 'badge-ADMIN', GUARDIAN: 'badge-GUARDIAN', PARTICIPANT: 'badge-PARTICIPANT', VOLUNTEER: 'badge-VOLUNTEER' }[session.role] || 'bg-secondary';
                const displayName = (session.name || session.email || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const nameEl      = filename === 'dashboard'
                    ? `<span class="nav-user-name">${displayName}</span>`
                    : `<a href="dashboard.html" class="btn-nav-portal" title="Go to your portal"><i class="bi bi-speedometer2"></i>${displayName}<i class="bi bi-chevron-right" style="font-size:0.65rem;opacity:0.55;"></i></a>`;

                const bellPlaceholder = `
                    <div class="dropdown" id="nav-notifications-bell">
                      <button class="btn btn-link position-relative p-1"
                              type="button" id="nav-bell-btn"
                              data-bs-toggle="dropdown" data-bs-auto-close="outside"
                              aria-expanded="false" title="Notifications" aria-label="Open notifications"
                              style="font-size:1.2rem;line-height:1;color:inherit;text-decoration:none;">
                        <i class="bi bi-bell" id="nav-bell-icon" aria-hidden="true"></i>
                        <span id="nav-bell-badge"
                              class="d-none position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                              style="font-size:0.6rem;min-width:1.1em;"></span>
                      </button>
                      <div class="dropdown-menu dropdown-menu-end shadow-lg p-0 border-0"
                           style="min-width:340px;max-width:400px;border-radius:0.6rem;overflow:hidden;">
                        <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-light">
                          <span id="nav-bell-heading" class="fw-semibold" style="font-size:0.9rem;">Notifications</span>
                          <button id="nav-bell-mark-all" class="btn btn-link btn-sm p-0 text-secondary"
                                  style="font-size:0.78rem;" disabled>Mark all read</button>
                        </div>
                        <ul id="nav-bell-list" class="list-unstyled mb-0"
                            style="max-height:340px;overflow-y:auto;">
                          <li class="px-3 py-4 text-muted small text-center">
                            <i class="bi bi-hourglass-split opacity-50 me-1"></i>Loading&hellip;
                          </li>
                        </ul>
                        <div class="border-top bg-light px-3 py-2 text-center">
                          <button id="nav-bell-view-all" class="btn btn-link btn-sm p-0"
                                  style="font-size:0.82rem;">
                            View all notifications <i class="bi bi-arrow-right ms-1"></i>
                          </button>
                        </div>
                      </div>
                    </div>`;

                navRight.innerHTML = `
                    ${nameEl}
                    <span class="badge ${roleClass}">${session.role}</span>
                    ${bellPlaceholder}
                    <button class="btn-nav-logout js-logout-btn" type="button">
                        <i class="bi bi-box-arrow-right me-1"></i>Logout
                    </button>`;
                navRight.querySelector('.js-logout-btn').addEventListener('click', function () { Auth.logout(); });
                document.dispatchEvent(new CustomEvent('kindred:nav-ready', { detail: { session: session } }));
            });
        }

        // Scroll shadow
        const nav = document.getElementById('mainNav');
        if (nav) {
            window.addEventListener('scroll', function () {
                nav.classList.toggle('scrolled', window.scrollY > 12);
            }, { passive: true });
        }
    });
})();
