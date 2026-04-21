/* notifications-ui.js — Shared notification bell + inbox renderer
   Exposes window.NotificationsUI with:
     renderNavBell(config)              – renders the navbar bell dropdown
     renderInbox(containerId, config)   – renders the full notification inbox page

   config shape:
     notificationsSection {string}  – section ID for "View all" / inbox, e.g. 'p-notifications'
     role                 {string}  – 'PARTICIPANT' | 'GUARDIAN' | 'VOLUNTEER' | 'ADMIN'
     eventSection         {string?} – section ID to navigate to for event notifications
     jobSection           {string?} – section ID to navigate to for job notifications

   Depends on globals: Auth (auth.js), navigateTo (sidebar.js), bootstrap */

(function () {
  function _esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function renderNavBell(config) {
    const { notificationsSection = 'p-notifications' } = config || {};

    // Elements are injected by nav.js; wait for them if called before nav resolves
    const iconEl   = document.getElementById('nav-bell-icon');
    const badgeEl  = document.getElementById('nav-bell-badge');
    const headingEl= document.getElementById('nav-bell-heading');
    const listEl   = document.getElementById('nav-bell-list');
    const markAllEl= document.getElementById('nav-bell-mark-all');
    const viewAllEl= document.getElementById('nav-bell-view-all');
    if (!listEl) return; // shell not yet in DOM

    try {
      const notifications = await Auth.getMyNotifications();
      const readIds = Auth.getReadNotificationIds();
      const readSet = new Set(readIds);
      const unreadCount = notifications.filter(n => !readSet.has(n.id)).length;

      // ── Icon ───────────────────────────────────────────────────────────────────
      if (iconEl) {
        iconEl.className = unreadCount > 0 ? 'bi bi-bell-fill text-danger' : 'bi bi-bell';
      }

      // ── Badge ─────────────────────────────────────────────────────────────────
      if (badgeEl) {
        if (unreadCount > 0) {
          badgeEl.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
          badgeEl.classList.remove('d-none');
        } else {
          badgeEl.classList.add('d-none');
        }
      }

      // ── Heading ───────────────────────────────────────────────────────────────
      if (headingEl) {
        headingEl.innerHTML = unreadCount > 0
          ? `Notifications <span class="badge bg-danger ms-1">${unreadCount}</span>`
          : 'Notifications';
      }

      // ── List items ────────────────────────────────────────────────────────────
      if (notifications.length === 0) {
        listEl.innerHTML = `<li class="px-3 py-4 text-muted small text-center">
          <i class="bi bi-bell opacity-50 d-block mb-2" style="font-size:1.5rem;"></i>No notifications yet
        </li>`;
      } else {
        listEl.innerHTML = notifications.slice(0, 10).map(n => {
          const isUnread = !readSet.has(n.id);
          const dot = isUnread
            ? `<span class="flex-shrink-0 rounded-circle bg-danger" style="width:7px;height:7px;margin-top:6px;"></span>`
            : `<span class="flex-shrink-0" style="width:7px;height:7px;margin-top:6px;"></span>`;
          const readToggleTitle = isUnread ? 'Mark as read' : 'Mark as unread';
          const readToggleIcon  = isUnread ? 'bi-check2' : 'bi-arrow-counterclockwise';
          return `
            <li class="d-flex align-items-start gap-2 px-3 py-2 border-bottom${isUnread ? ' bg-danger bg-opacity-10' : ''}" style="min-width:0;">
              <span class="flex-shrink-0 mt-1">${dot}</span>
              <div class="flex-grow-1" style="min-width:0;cursor:pointer;" role="button" tabindex="0"
                   data-bell-nav="${_esc(notificationsSection)}">
                <div class="text-truncate${isUnread ? ' fw-semibold' : ''}" style="font-size:0.83rem;">${_esc(n.subject)}</div>
                <div class="text-muted" style="font-size:0.72rem;">${_esc(n.sentAtLabel)}</div>
              </div>
              <div class="d-flex gap-1 flex-shrink-0 ms-1">
                <button class="btn btn-link p-0 js-bell-toggle-read" data-notif-id="${_esc(n.id)}"
                        title="${readToggleTitle}" style="font-size:0.85rem;color:var(--bs-secondary);">
                  <i class="bi ${readToggleIcon}"></i>
                </button>
                <button class="btn btn-link p-0 js-bell-delete" data-notif-id="${_esc(n.id)}"
                        title="Delete" style="font-size:0.85rem;color:var(--bs-danger);">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            </li>`;
        }).join('');
      }

      // ── Wire list actions (re-attached on every render since innerHTML replaced) ─
      listEl.querySelectorAll('[data-bell-nav]').forEach(el => {
        el.onclick = () => {
          bootstrap.Dropdown.getInstance(document.getElementById('nav-bell-btn'))?.hide();
          navigateTo(el.dataset.bellNav);
        };
        el.onkeydown = e => { if (e.key === 'Enter') el.onclick(); };
      });

      listEl.querySelectorAll('.js-bell-toggle-read').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          Auth.toggleNotificationRead(btn.dataset.notifId);
          await renderNavBell(config);
        };
      });

      listEl.querySelectorAll('.js-bell-delete').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          Auth.deleteMyNotification(btn.dataset.notifId);
          await renderNavBell(config);
        };
      });

      // ── Static button handlers (use .onclick to avoid stacking) ───────────────
      if (markAllEl) {
        markAllEl.disabled = notifications.length === 0;
        markAllEl.onclick = async (e) => {
          e.stopPropagation();
          Auth.markNotificationsRead(notifications.map(n => n.id));
          await renderNavBell(config);
        };
      }

      if (viewAllEl) {
        viewAllEl.onclick = () => {
          bootstrap.Dropdown.getInstance(document.getElementById('nav-bell-btn'))?.hide();
          navigateTo(notificationsSection);
        };
      }
    } catch (error) {
      console.error('Unable to render notifications bell.', error);
      if (headingEl) headingEl.textContent = 'Notifications';
      if (badgeEl) badgeEl.classList.add('d-none');
      if (listEl) {
        listEl.innerHTML = `<li class="px-3 py-4 text-muted small text-center">
          <i class="bi bi-exclamation-circle opacity-50 d-block mb-2" style="font-size:1.5rem;"></i>
          Unable to load notifications right now.
        </li>`;
      }
      if (markAllEl) markAllEl.disabled = true;
    }
  }

  async function renderInbox(containerId, config) {
    const {
      notificationsSection = 'p-notifications',
      role = '',
      eventSection = null,
      jobSection = null
    } = config || {};

    const container = document.getElementById(containerId);
    if (!container) return;

    const isParticipant = role === 'PARTICIPANT';

    const [notifications, readIds, interestedJobIds, interestedEventIds] = await Promise.all([
      Auth.getMyNotifications(),
      Promise.resolve(Auth.getReadNotificationIds()),
      isParticipant ? Auth.getInterestedJobIds() : Promise.resolve([]),
      isParticipant ? Auth.getInterestedEventIds() : Promise.resolve([])
    ]);

    if (!notifications.length) {
      container.innerHTML = `<div class="portal-empty-state"><i class="bi bi-bell"></i><p>No notifications yet. Kindred Administration will send you personalised alerts here when time-sensitive opportunities arise.</p></div>`;
      return;
    }

    const clearAllHtml = `
      <div class="d-flex justify-content-end mb-3">
        <button class="btn btn-outline-secondary btn-sm js-notif-clear-all">
          <i class="bi bi-trash3 me-1"></i>Clear all
        </button>
      </div>`;

    const readSet = new Set(readIds);
    const sorted = [...notifications].sort((a, b) => {
      const aUnread = readSet.has(a.id) ? 1 : 0;
      const bUnread = readSet.has(b.id) ? 1 : 0;
      if (aUnread !== bUnread) return aUnread - bUnread;
      return (b.sentAtMs || 0) - (a.sentAtMs || 0);
    });
    Auth.markNotificationsRead(notifications.map(n => n.id));
    await renderNavBell(config);

    container.innerHTML = clearAllHtml + sorted.map(n => {
      const isUnread = !readSet.has(n.id);
      const headerCls = isUnread ? 'bg-danger text-white' : 'bg-secondary bg-opacity-10 text-secondary';
      const cardBorder = isUnread ? 'border-danger' : 'border-secondary';
      const newBadge = isUnread ? '<span class="badge bg-warning text-dark ms-2">NEW</span>' : '';

      let actionBtns = '';

      if (isParticipant) {
        if (n.opportunityType === 'job' && n.opportunityId) {
          const isInterested = interestedJobIds.includes(String(n.opportunityId));
          actionBtns += `<button class="btn btn-sm js-notif-job-action ${isInterested ? 'btn-outline-secondary' : 'btn-success'}"
            data-job-id="${_esc(n.opportunityId)}" data-job-title="${_esc(n.opportunityTitle)}">
            <i class="bi ${isInterested ? 'bi-x-circle' : 'bi-hand-thumbs-up'} me-1"></i>${isInterested ? 'Remove Interest' : 'Express Interest'}
          </button>`;
        } else if (n.opportunityType === 'event' && n.opportunityId) {
          const isInterested = interestedEventIds.includes(String(n.opportunityId));
          actionBtns += `<button class="btn btn-sm js-notif-event-action ${isInterested ? 'btn-outline-secondary' : 'btn-success'}"
            data-event-id="${_esc(n.opportunityId)}" data-event-title="${_esc(n.opportunityTitle)}">
            <i class="bi ${isInterested ? 'bi-x-circle' : 'bi-calendar-check'} me-1"></i>${isInterested ? 'Remove Interest' : 'Register Interest'}
          </button>`;
        }
      }

      if (n.opportunityType === 'job' && jobSection) {
        actionBtns += `<button class="btn btn-sm btn-outline-primary js-notif-nav" data-nav="${_esc(jobSection)}">
          <i class="bi bi-arrow-right me-1"></i>View in Jobs
        </button>`;
      } else if (n.opportunityType === 'event' && eventSection) {
        actionBtns += `<button class="btn btn-sm btn-outline-primary js-notif-nav" data-nav="${_esc(eventSection)}">
          <i class="bi bi-arrow-right me-1"></i>View in Events
        </button>`;
      }

      return `
        <div class="card shadow-sm mb-3 border ${cardBorder}">
          <div class="card-header d-flex align-items-center justify-content-between ${headerCls}">
            <span class="fw-semibold"><i class="bi bi-bell-fill me-2"></i>${_esc(n.subject)}${newBadge}</span>
            <small class="opacity-75 text-nowrap ms-3">${_esc(n.sentAtLabel)}</small>
          </div>
          <div class="card-body">
            <pre style="white-space:pre-wrap;font-family:'Inter',system-ui,sans-serif;font-size:0.95rem;border:none;background:none;padding:0;margin:0;">${_esc(n.body)}</pre>
          </div>
          <div class="card-footer d-flex align-items-center justify-content-between bg-transparent border-top">
            <small class="text-muted"><i class="bi bi-person-fill me-1"></i>From ${_esc(n.sentByName || 'Kindred Administration')}</small>
            <div class="d-flex gap-2 flex-wrap justify-content-end">
              ${actionBtns}
              <button class="btn btn-sm btn-outline-secondary js-notif-delete" data-notif-id="${_esc(n.id)}" title="Delete">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>
        </div>`;
    }).join('');

    if (isParticipant) {
      container.querySelectorAll('.js-notif-job-action').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          await Auth.toggleJobInterest(btn.dataset.jobId);
          await renderInbox(containerId, config);
        });
      });
      container.querySelectorAll('.js-notif-event-action').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          await Auth.toggleEventInterest(btn.dataset.eventId, btn.dataset.eventTitle);
          await renderInbox(containerId, config);
        });
      });
    }

    container.querySelectorAll('.js-notif-nav').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.nav));
    });

    container.querySelectorAll('.js-notif-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        Auth.deleteMyNotification(btn.dataset.notifId);
        await renderInbox(containerId, config);
        await renderNavBell(config);
      });
    });

    container.querySelector('.js-notif-clear-all')?.addEventListener('click', async () => {
      notifications.forEach(n => Auth.deleteMyNotification(n.id));
      await renderInbox(containerId, config);
      await renderNavBell(config);
    });
  }

  window.NotificationsUI = { renderNavBell, renderInbox };
})();
