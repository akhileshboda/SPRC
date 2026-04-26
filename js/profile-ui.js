/**
 * profile-ui.js
 * Shared rendering helpers for all profile workspace screens.
 * Consumed by participant.js, volunteer.js, and admin.js.
 */

/* ── Utilities ────────────────────────────────────────────── */

export function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function roleBadgeClass(role) {
  const map = { PARTICIPANT: 'bg-success', VOLUNTEER: 'bg-info text-dark', ADMIN: 'bg-danger', GUARDIAN: 'bg-primary' };
  return map[String(role).toUpperCase()] || 'bg-secondary';
}

function timeAgo(tsMs) {
  if (!tsMs) return '';
  const diff = Date.now() - tsMs;
  const m = Math.floor(diff / 60000);
  if (m < 2)  return 'just now';
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

/* ── Profile header ───────────────────────────────────────── */

/**
 * Renders the profile header block into `container`.
 * @param {HTMLElement} container
 * @param {{ name: string, role: string, managedBy?: string, lastUpdatedMs?: number }} opts
 */
export function renderProfileHeader(container, { name, role, managedBy, lastUpdatedMs } = {}) {
  const managedChip = managedBy
    ? `<span class="profile-managed-chip"><i class="bi bi-shield-check"></i> ${escHtml(managedBy)}</span>`
    : '';

  const lastUp = lastUpdatedMs
    ? `<span class="profile-last-updated">Last updated: ${timeAgo(lastUpdatedMs)}</span>`
    : '';

  container.innerHTML = `
    <div class="profile-avatar">${escHtml(initials(name))}</div>
    <div class="profile-header-meta">
      <div class="profile-header-name">${escHtml(name || '—')}</div>
      <div class="profile-header-sub">
        <span class="badge ${roleBadgeClass(role)}">${escHtml(role || '')}</span>
        ${managedChip}
        ${lastUp}
      </div>
    </div>
  `;
}

/* ── Interest chip selector ───────────────────────────────── */

export const VOLUNTEER_INTERESTS = [
  'Mentoring',
  'Educational Programs',
  'Community Events',
  'Sports & Recreation',
  'Administrative Support',
  'Job Coaching',
  'Other',
];

export const LANGUAGES = [
  'English', 'Spanish', 'French', 'Mandarin', 'Arabic',
  'Portuguese', 'Russian', 'Hindi', 'Japanese', 'Korean',
  'Vietnamese', 'Tagalog', 'Other',
];

export const PRONOUNS_SUBJECT = ['he', 'she', 'they', 'ze', 'prefer not to say'];
export const PRONOUNS_OBJECT  = ['him', 'her', 'them', 'zir', 'prefer not to say'];

/**
 * Renders a chip-based interest selector into `container`.
 * Returns an object with `getSelected()` and `setSelected(arr)` and `validate()`.
 *
 * @param {HTMLElement} container
 * @param {string[]} allOptions
 * @param {string[]} selected
 * @param {{ required?: boolean, otherLabel?: string }} opts
 */
export function renderInterestChips(container, allOptions, selected = [], opts = {}) {
  const { required = true } = opts;

  const chips = allOptions.map(opt => {
    const isOther = opt === 'Other';
    return `<button type="button"
      class="profile-chip${selected.includes(opt) ? ' is-selected' : ''}"
      data-value="${escHtml(opt)}"
      aria-pressed="${selected.includes(opt)}"
    >${escHtml(opt)}</button>`;
  });

  // Detect pre-existing "Other: …" value
  const otherVal = selected.find(v => v.startsWith('Other:'));
  const otherText = otherVal ? otherVal.replace(/^Other:\s*/i, '') : '';
  const otherSelected = !!otherVal || selected.includes('Other');

  container.innerHTML = `
    <div class="profile-chips-group" role="group" aria-label="Select interests">
      ${chips.join('')}
    </div>
    <div id="${container.id}-other-wrap" class="mt-2${otherSelected ? '' : ' d-none'}">
      <input type="text" class="form-control form-control-sm"
        id="${container.id}-other-text"
        placeholder="Please specify…"
        value="${escHtml(otherText)}"
        aria-label="Other interest details">
    </div>
    <div class="profile-chips-hint">Select all that apply${required ? ' <span class="required-marker" aria-hidden="true">*</span>' : ''}</div>
    ${required ? `<div class="profile-chips-error" id="${container.id}-error">Select at least one interest.</div>` : ''}
  `;

  const chipsGroup  = container.querySelector('.profile-chips-group');
  const otherWrap   = container.querySelector(`#${container.id}-other-wrap`);
  const otherInput  = container.querySelector(`#${container.id}-other-text`);
  const errorEl     = container.querySelector(`#${container.id}-error`);

  chipsGroup.addEventListener('click', e => {
    const chip = e.target.closest('.profile-chip');
    if (!chip) return;
    const val = chip.dataset.value;
    chip.classList.toggle('is-selected');
    chip.setAttribute('aria-pressed', chip.classList.contains('is-selected'));
    if (val === 'Other' && otherWrap) {
      otherWrap.classList.toggle('d-none', !chip.classList.contains('is-selected'));
    }
    if (errorEl) errorEl.classList.remove('visible');
  });

  function getSelected() {
    const vals = [...chipsGroup.querySelectorAll('.profile-chip.is-selected')]
      .map(c => c.dataset.value);
    if (vals.includes('Other') && otherInput?.value.trim()) {
      return vals.map(v => v === 'Other' ? `Other: ${otherInput.value.trim()}` : v);
    }
    return vals;
  }

  function setSelected(arr) {
    const list = Array.isArray(arr) ? arr : [];
    const hasOtherPrefixed = list.some(v => v.startsWith('Other:'));
    chipsGroup.querySelectorAll('.profile-chip').forEach(chip => {
      const val = chip.dataset.value;
      let active = list.includes(val);
      if (val === 'Other' && hasOtherPrefixed) active = true;
      chip.classList.toggle('is-selected', active);
      chip.setAttribute('aria-pressed', active);
    });
    if (hasOtherPrefixed && otherInput) {
      const match = list.find(v => v.startsWith('Other:'));
      otherInput.value = match.replace(/^Other:\s*/i, '').trim();
      otherWrap?.classList.remove('d-none');
    }
  }

  function validate() {
    if (!required) return true;
    const ok = getSelected().length > 0;
    if (errorEl) errorEl.classList.toggle('visible', !ok);
    return ok;
  }

  return { getSelected, setSelected, validate };
}

/* ── Language chip selector (reuses chip pattern) ──────────── */

/**
 * Like renderInterestChips but for a plain string[] without 'Other' text field.
 */
export function renderLanguageChips(container, selected = []) {
  const chips = LANGUAGES.map(lang =>
    `<button type="button"
      class="profile-chip${selected.includes(lang) ? ' is-selected' : ''}"
      data-value="${escHtml(lang)}"
      aria-pressed="${selected.includes(lang)}"
    >${escHtml(lang)}</button>`
  );

  container.innerHTML = `
    <div class="profile-chips-group" role="group" aria-label="Select languages">
      ${chips.join('')}
    </div>
    <div class="profile-chips-hint">Select all that apply</div>
  `;

  const chipsGroup = container.querySelector('.profile-chips-group');

  chipsGroup.addEventListener('click', e => {
    const chip = e.target.closest('.profile-chip');
    if (!chip) return;
    chip.classList.toggle('is-selected');
    chip.setAttribute('aria-pressed', chip.classList.contains('is-selected'));
  });

  function getSelected() {
    return [...chipsGroup.querySelectorAll('.profile-chip.is-selected')].map(c => c.dataset.value);
  }

  function setSelected(arr) {
    const list = Array.isArray(arr) ? arr : [];
    chipsGroup.querySelectorAll('.profile-chip').forEach(chip => {
      const active = list.includes(chip.dataset.value);
      chip.classList.toggle('is-selected', active);
      chip.setAttribute('aria-pressed', active);
    });
  }

  return { getSelected, setSelected };
}

/* ── Read-only panel ──────────────────────────────────────── */

/**
 * Returns HTML string for a locked read-only panel.
 */
export function readOnlyPanelHTML(label, captionText) {
  return `
    <div class="profile-readonly-panel" aria-label="Read only, ${escHtml(captionText)}">
      <i class="bi bi-lock-fill" aria-hidden="true"></i>
      <div>
        <span class="profile-readonly-label">${escHtml(label)}</span>
        <span class="profile-readonly-caption">${escHtml(captionText)}</span>
      </div>
    </div>
  `;
}

/* ── Field attribution badge ──────────────────────────────── */

/** Returns an HTML span for an [Admin] or [Participant] attribution badge. */
export function fieldAttrBadge(who) {
  return `<span class="profile-field-attr">${escHtml(who)}</span>`;
}

/* ── Completeness meter ───────────────────────────────────── */

/**
 * Renders a profile completeness meter into `container`.
 * @param {HTMLElement} container
 * @param {number} pct  0–100
 */
export function renderCompletenessMeter(container, pct) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  container.innerHTML = `
    <div class="profile-completeness">
      <div class="profile-completeness-label">
        <span>Profile Completeness</span>
        <span>${clamped}%</span>
      </div>
      <div class="progress" role="progressbar"
        aria-valuenow="${clamped}" aria-valuemin="0" aria-valuemax="100"
        aria-label="Profile ${clamped}% complete">
        <div class="progress-bar" style="width: ${clamped}%"></div>
      </div>
    </div>
  `;
}

/* ── Linked entity row ────────────────────────────────────── */

/**
 * Returns HTML for a linked-entity row (guardian, account, etc.).
 */
export function linkedRowHTML({ name, role, icon = 'bi-person' } = {}) {
  return `
    <div class="profile-linked-row">
      <div class="profile-linked-icon"><i class="bi ${escHtml(icon)}" aria-hidden="true"></i></div>
      <div>
        <div class="profile-linked-name">${escHtml(name || '—')}</div>
        ${role ? `<div class="profile-linked-role">${escHtml(role)}</div>` : ''}
      </div>
    </div>
  `;
}

/* ── Admin note row ───────────────────────────────────────── */

export function adminNoteHTML(text) {
  return `
    <div class="profile-admin-note">
      <i class="bi bi-info-circle" aria-hidden="true"></i>
      <span>${escHtml(text)}</span>
    </div>
  `;
}

/* ── Completeness calculator ──────────────────────────────── */

/**
 * Calculates profile completeness percentage from a record object.
 * Accepts a flat map of { fieldName: value } and returns 0–100.
 */
export function calcCompleteness(fields) {
  const entries = Object.values(fields);
  if (!entries.length) return 0;
  const filled = entries.filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && String(v).trim() !== '';
  });
  return Math.round((filled.length / entries.length) * 100);
}
