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
        xhr.open('GET', 'nav.html', false); // false = synchronous
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

            // Switch the container to a 3-col grid so links sit in the centre
            // column regardless of screen width (logo stays pinned left).
            const container = document.querySelector('#mainNav .container');
            if (container) container.classList.add('nav-login-container');
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
