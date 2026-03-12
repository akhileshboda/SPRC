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

        // Hide Sign In button on the login page itself and center the nav links
        if (filename === 'login') {
            const signinBtn = document.getElementById('nav-signin-btn');
            if (signinBtn) signinBtn.style.display = 'none';

            const navLinks = document.querySelector('#mainNav .nav-links');
            if (navLinks) navLinks.classList.add('nav-login-links-centered');
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

                const roleClass   = { ADMIN: 'badge-ADMIN', PARTICIPANT: 'badge-PARTICIPANT', VOLUNTEER: 'badge-VOLUNTEER' }[session.role] || 'bg-secondary';
                const displayName = (session.name || session.email || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const nameEl      = filename === 'dashboard'
                    ? `<span class="nav-user-name">${displayName}</span>`
                    : `<a href="dashboard.html" class="nav-user-name">${displayName}</a>`;

                navRight.innerHTML = `
                    ${nameEl}
                    <span class="badge ${roleClass}">${session.role}</span>
                    <button class="btn-nav-logout js-logout-btn" type="button">
                        <i class="bi bi-box-arrow-right me-1"></i>Logout
                    </button>`;
                navRight.querySelector('.js-logout-btn').addEventListener('click', function () { Auth.logout(); });
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
