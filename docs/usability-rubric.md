# Kindred — Usability evaluation rubric

This document turns the project’s **usability report** (five evaluation dimensions, questionnaire items, and walkthrough analysis) into a **repeatable rubric** for reviews, team self-assessment, or course grading. Use it together with the original report’s questionnaire when collecting participant feedback.

**How to use it**

- Score each **criterion** with the **level** descriptions below (e.g. 4 = Excellent through 1 = Insufficient, or a simple meets / partial / does not meet).
- Record **evidence** (screens, quotes, task times) next to each score.
- The **weight** column is optional: adjust for your assignment (e.g. 20% per dimension for equal weighting).

---

## Scoring scale (suggested)

| Level | Label        | Meaning |
|-------|--------------|---------|
| 4     | Excellent    | Meets intent clearly; no significant gaps for the target users. |
| 3     | Proficient   | Meets most intent; minor gaps or polish needed. |
| 2     | Developing   | Partial meet; users may struggle or miss information in common tasks. |
| 1     | Insufficient | Fails the criterion in ways that block trust, task completion, or access. |
| N/A   | Not observed | Criterion not applicable to the review method (e.g. no mobile test). |

---

## Dimension 1 — User experience and homepage

*Report focus: first impressions, understanding what Kindred is for, who it serves, trustworthiness, and clarity that events/jobs are public while accounts are coordinator-created.*

| Criterion | Weight (optional) | What “good” looks like | Levels 4→1 (summary) |
|-----------|------------------|------------------------|------------------------|
| **A. Purpose and audience** — A new visitor can state what the system does and who it is for. | 25% | Hero and supporting sections name participants, guardians, volunteers, and coordinators/staff; role of the org is clear. | 4: Obvious in under ~1 min. 3: Clear after light scrolling. 2: Vague or jargon-heavy. 1: Confusing or wrong audience. |
| **B. Public vs. account** — It is clear what works **without** signing in and that portal accounts are **not** public self-serve. | 25% | Prominent notice (e.g. hero or footer) matches report language; public browse vs. coordinator-created accounts is explicit. | 4: Unambiguous, repeated in sensible places. 3: Stated once clearly. 2: Implied or easy to miss. 1: Misleading. |
| **C. Trust signals** — Contact path, org/service area, privacy, and “real world” context support credibility. | 25% | Real or clearly labeled placeholder contact; privacy page or policy link; no reliance on stock claims alone. | 4: Strong signals + next step for help. 3: Basic trust (contact + policy). 2: Polished but thin. 1: No trust path. |
| **D. Home journey** — Primary actions (e.g. browse events, sign in) are visible and scannable. | 25% | Clear CTAs, logical order, no dead ends on first screen. | 4: Frictionless. 3: Minor clutter. 2: Buried actions. 1: No clear next step. |

**Questionnaire tie-in (examples)**  
Long answer: “What is Kindred for?” / Likert: clarity without sign-in, clarity of account requirements / Trust: what felt trustworthy or not.

---

## Dimension 2 — Navigation and search

*Report focus: role-appropriate features, getting to events, jobs, dashboard, approvals, profile, and admin without confusion; search/filter usefulness.*

| Criterion | Weight (optional) | What “good” looks like | Levels 4→1 (summary) |
|-----------|------------------|------------------------|------------------------|
| **A. Global / public nav** — Home, events, jobs, login are easy to find and consistent. | 20% | Same mental model on every public page; current page indicated. | 4: Consistent + current location clear. 3: Workable, small inconsistency. 2: User backtracks. 1: Lost. |
| **B. Portal / dashboard** — Each role sees relevant sections; names match user language (“My saved events,” not ambiguous jargon). | 25% | Role-based menu; **where you are** (e.g. section label or breadcrumb) is visible. | 4: Always sure of section. 3: Usually clear. 2: “Subscribed”-style ambiguity. 1: Wrong or missing items. |
| **C. Search and filters (events and jobs)** — Users can narrow lists; patterns feel comparable across pages. | 25% | Search + category/type filters; feedback (counts, empty states) where helpful. | 4: Strong parity and feedback. 3: One page weaker but usable. 2: Shallow filters. 1: None or broken. |
| **D. Recovery** — Return to a previous view (browser back, sidebar, or clear “back” in sub-views) without data dread. | 15% | Hash or nav preserves context; back buttons in admin sub-views. | 4: Predictable. 3: Occasional extra click. 2: Surprising jumps. 1: Data loss or dead ends. |
| **E. Deep links** — URLs or hashes support sharing/bookmarking a section (where intended). | 15% | Dashboard sections addressable. | 4: Yes. 2: Partial. 1: No. |

**Questionnaire tie-in**  
Finding events/jobs/dashboard; label clarity; disorientation frequency; return to previous page; search/filter help + N/A.

---

## Dimension 3 — Layout and content

*Report focus: scannable event/job details, costs, accommodations, requirements, approvals, notifications; not overwhelming; hierarchy.*

| Criterion | Weight (optional) | What “good” looks like | Levels 4→1 (summary) |
|-----------|------------------|------------------------|------------------------|
| **A. Information order** — For each key screen, the most decision-relevant facts appear first (date, place, cost, age/minimums, access needs, status). | 25% | Consistent card/table patterns; long text not dumped in a single scannable field without structure. | 4: Consistent priority order. 3: Good with small overload. 2: Must hunt. 1: Critical info hidden. |
| **B. Event and job scannability** — Cards/rows are easy to compare; badges supplement text, not replace it. | 25% | Status/category labels in **text**; color is redundant coding. | 4: Text + visual encoding. 3: Minor color-only risk. 2: Often color-only. 1: Inaccessible. |
| **C. Density** — No chronic overcrowding; admin tables tamed (truncate, details, or progressive disclosure for long text). | 25% | Reasonable line length, spacing, and optional expand for long accommodations. | 4: Comfortable scan. 3: One dense area. 2: Frequent wall of text. 1: Unreadable. |
| **D. Language** — Wording works for families, staff, and volunteers (plain language, avoid unexplained acronyms in primary UI). | 25% | Form hints and labels match audience; staff-only jargon confined or explained. | 4: Inclusive. 2: Some jargon. 1: Hostile or unclear. |

**Questionnaire tie-in**  
Order of information; event/job scan; crowdedness; distinction of headings/cards/badges; language clarity.

---

## Dimension 4 — Forms and error handling

*Report focus: sign-in, admin publishing, interests, profiles, inquiries; validation, errors, and confirmations.*

| Criterion | Weight (optional) | What “good” looks like | Levels 4→1 (summary) |
|-----------|------------------|------------------------|------------------------|
| **A. Label clarity** — Every required field has a visible label; format expectations appear when needed. | 20% | Labels, `aria-describedby` / help where complex; required markers. | 4: Clear throughout. 2: Ambiguous fields. 1: Missing labels. |
| **B. Necessity** — Only ask for data needed for the task (or explain why it is collected, e.g. DOB for 18+ rules). | 20% | No redundant blocks; trust copy where sensitive. | 4: Frugal and justified. 2: Some bloat. 1: Asks for unrelated data. |
| **C. Errors** — Validation messages are specific, next to the field or in a live region; recoverable. | 25% | No reliance on `alert`/`prompt` for core flows. | 4: Inline, accessible. 2: Generic messages. 1: Silent failure or `alert` only. |
| **D. After submit** — User knows what happened (toast, next step, or redirect). | 20% | Success and failure both visible. | 4: Always clear. 2: Sometimes vague. 1: No feedback. |
| **E. Confirmations** — Destructive or high-impact actions use a confirmation step; not excessive for trivial actions. | 15% | Modals for delete/create where appropriate. | 4: Balanced. 2: Too many or too few. 1: Dangerous one-click. |

**Questionnaire tie-in**  
Labels, necessity, error placement + N/A, post-submit clarity + N/A, confirmation helpfulness + N/A.

---

## Dimension 5 — Accessibility

*Report focus: contrast, keyboard, labels, touch targets, not color-alone, mobile usability.*

| Criterion | Weight (optional) | What “good” looks like | Levels 4→1 (summary) |
|-----------|------------------|------------------------|------------------------|
| **A. Perceivable** — Readable contrast; text size adequate; information not conveyed by color alone. | 25% | Status carries text; muted text still readable. | 4: Passes quick contrast check. 2: Some risk areas. 1: Fails. |
| **B. Operable** — Core paths work with keyboard; focus visible; hit areas ≥ ~44px where practical. | 25% | Skip link to main; focusable main; no keyboard traps in modals. | 4: Full path. 2: Minor gaps. 1: Blocked. |
| **C. Understandable** — Predictable nav; form errors associated with fields; `aria` on icon-only controls. | 25% | `aria-label` on icon buttons; `aria-live` for dynamic results where needed. | 4: Consistent. 2: Gaps in dynamic regions. 1: Missing. |
| **D. Mobile / zoom** — Usable on small viewports without horizontal scroll for core flows. | 25% | Responsive layouts; N/A if not tested. | 4: Clean on phone. 2: Usable with pinch. 1: Broken layout. |

**Questionnaire tie-in**  
Keyboard, tap targets, contrast, color + icons, mobile + N/A.

---

## Optional overall block (satisfaction and open feedback)

| Criterion | Notes |
|----------|--------|
| **Overall satisfaction** | Map to Likert (very dissatisfied → very satisfied). |
| **Return intent** | Map to “likely to use again.” |
| **Top improvement** | One prioritized theme from long answer. |
| **Other comments** | Free text. |

Use these as **qualitative** supplements to the dimension scores, not as a separate weighted grade unless your instructor specifies it.

---

## Walkthrough “actions” (from the report) as a completion checklist

Use this as a **team backlog** or **pre-demo verification**, not as numeric rubric items unless you convert them to criteria above.

| Theme | Action (from report) | Status for reviewers |
|-------|----------------------|------------------------|
| Homepage / trust | Coordinator contact, service area, privacy link, how accounts are created, community imagery if possible | Update placeholders with real org data |
| Navigation | User-centered names; consistent search/filter; section context | Re-verify after content changes |
| Layout | Shorten or disclose long text in admin tables; key details first on participant views | Ongoing with new features |
| Forms | No `prompt`/`alert` for password reset; optional structured/guided fields for accommodations | Review when adding new forms |
| Accessibility | Test keyboard, modals, filters; verify badges include text; contrast on pastel backgrounds | Schedule periodic retest |

---

## Suggested overall grade formula (for courses)

- **Equal weights:** Average the five dimension scores (each dimension = average of its criteria), then average the five dimension scores.
- **Emphasize risk:** Weight dimension 4 (forms) and 5 (accessibility) slightly higher for systems handling PII and diverse users.

Document version: aligned with the Kindred usability report and questionnaire (April 2026). Revise if your course uses different weights or a pass/fail bar.
