These are the most suitable dimensions because Kindred is not just an informational website; it is a role-based service platform for participants, guardians, volunteers, and administrators. The evaluation should therefore focus on whether users understand the service, find the right tasks, read key information clearly, complete forms successfully, and access the system comfortably.

**1. User Experience And Homepage**

This dimension is important because Kindred’s homepage is the first place users form an understanding of the system. Since the platform serves sensitive community needs, users must quickly understand what Kindred does, who it is for, and whether it feels trustworthy. The homepage also explains that events can be browsed publicly while accounts are created through coordinators, so evaluating clarity here is essential.

**2. Navigation And Search**

Kindred has multiple user groups and different workflows for each role. Participants, guardians, volunteers, and administrators all need to reach different sections, such as events, jobs, approvals, profiles, inquiries, and user management. Navigation and search are therefore central to usability because users must be able to locate the right feature without confusion or unnecessary backtracking.

**3. Layout And Content**

Kindred presents many pieces of decision-making information, especially event details, job details, costs, accommodations, participant requirements, approvals, and notifications. If this content is poorly organized, users may miss important details or feel overwhelmed. This dimension is especially suitable because the system depends on users being able to scan information quickly and confidently.

**4. Forms And Error Handling**

A large part of Kindred’s functionality depends on forms: signing in, creating users, publishing events, submitting inquiries, managing job interest, updating profiles, and handling admin records. These tasks must be clear, forgiving, and well-confirmed. Form usability is especially important because mistakes could affect participant records, event information, or communication with families.

**5. Accessibility**

Accessibility is highly relevant because Kindred is designed for individuals with special needs and the people who support them. The system should work well for users with different abilities, devices, and interaction preferences. This includes readable contrast, keyboard navigation, clear labels, touch-friendly controls, and avoiding reliance on color alone. For Kindred, accessibility is not a secondary concern; it is directly tied to the purpose of the platform.

Together, these five dimensions cover the most important usability risks in Kindred: first impressions and trust, finding the right workflow, understanding information, completing key tasks, and ensuring inclusive access.

# Questionnaire

**1. User Experience And Homepage**

| Question | Response Type | Options |
|---|---|---|
| What do you think Kindred is for after viewing the homepage? | Long answer | Open text |
| Who do you think this website is designed to help? | Multiple choice, select all that apply | Individuals with special needs; Guardians/family members; Volunteers; Community organizations; Kindred staff/admins; Not sure; Other |
| Was it clear what you could do without signing in? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Was it clear when an account is required and who creates it? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| What part of the homepage made Kindred feel trustworthy or untrustworthy? | Long answer | Open text |

**2. Navigation And Search**

| Question | Response Type | Options |
|---|---|---|
| How easy was it to find events, jobs, or your dashboard? | Likert scale | Very difficult; Difficult; Neutral; Easy; Very easy |
| Were the navigation labels clear and meaningful? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Did you ever feel unsure where you were in the site? | Multiple choice | Never; Once; A few times; Often; Not sure |
| Was it easy to return to a previous page or section? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Did the search/filter tools help you narrow down events or jobs? | Likert scale + N/A | Strongly disagree; Disagree; Neutral; Agree; Strongly agree; Did not use search/filter |

**3. Layout And Content**

| Question | Response Type | Options |
|---|---|---|
| Was the information presented in an order that made sense? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Were event and job details easy to scan? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Was any page too crowded or visually overwhelming? | Multiple choice | No; Slightly; Moderately; Very; Not sure |
| Were headings, cards, badges, and buttons easy to distinguish? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Was the language clear for participants, guardians, volunteers, and staff? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |

**4. Forms And Error Handling**

| Question | Response Type | Options |
|---|---|---|
| Were form labels clear enough to know what information to enter? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Did the form ask for only necessary information? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Were error messages easy to understand and placed where you expected? | Likert scale + N/A | Strongly disagree; Disagree; Neutral; Agree; Strongly agree; I did not see any errors |
| After submitting a form, was it clear what happened next? | Likert scale + N/A | Strongly disagree; Disagree; Neutral; Agree; Strongly agree; I did not submit a form |
| Were confirmation steps helpful or unnecessary? | Multiple choice | Very helpful; Somewhat helpful; Neutral; Somewhat unnecessary; Very unnecessary; I did not see a confirmation step |

**5. Accessibility**

| Question | Response Type | Options |
|---|---|---|
| Could you use important controls with the keyboard? | Multiple choice + N/A | Yes; Mostly yes; Mostly no; No; I did not try keyboard navigation |
| Were buttons, links, and form fields large enough to click or tap comfortably? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Was the color contrast comfortable to read? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Did icons and colors make sense without relying on color alone? | Likert scale | Strongly disagree; Disagree; Neutral; Agree; Strongly agree |
| Were mobile layouts usable without zooming or horizontal scrolling? | Multiple choice + N/A | Yes; Mostly yes; Mostly no; No; I did not test on mobile |

**Optional Final Questions**

| Question | Response Type | Options |
|---|---|---|
| Overall, how satisfied were you with Kindred? | Likert scale | Very dissatisfied; Dissatisfied; Neutral; Satisfied; Very satisfied |
| How likely would you be to use Kindred again? | Likert scale | Very unlikely; Unlikely; Neutral; Likely; Very likely |
| What is the most important improvement Kindred should make? | Long answer | Open text |
| Is there anything else you would like to share about your experience? | Long answer | Open text |

# Walkthrough Analysis

1. User Experience and Homepage

Strengths: The homepage communicates Kindred’s purpose clearly: it connects individuals with special needs, guardians, volunteers, and organizations. The primary actions, “Browse Events” and “Sign In,” are visible in the hero area, and the notice explains that events can be browsed without an account while participant/guardian accounts are coordinator-created (index.html (line 466), index.html (line 481)).

Weaknesses: Trust signals are limited. The checklist emphasizes credibility, contact information, real people, location, privacy policy, and meaningful images. Kindred has a polished visual identity, but the homepage does not clearly show organization contact details, staff/coordinator identity, privacy policy access, or real community imagery.

Actions: Add a homepage/footer section with coordinator contact info, organization location/service area, privacy policy link, and a short “How accounts are created” trust explanation. Add real or representative event/community imagery instead of relying mostly on abstract cards and icons.

2. Navigation and Search

Strengths: Public navigation is simple and consistent: Home, Events, Jobs, Login (nav.html (line 14)). The dashboard uses role-based sidebar navigation, so users only see sections relevant to their role (js/sidebar.js (line 5)). Hash-based navigation also supports browser back/forward behavior (js/sidebar.js (line 111)).

Weaknesses: Some dashboard labels may be confusing. For example, “Subscribed Events” could be unclear to participants if it means saved, recommended, registered, or approved events (js/sidebar.js (line 21)). The Events page has search and category filters, but the Jobs page has a simpler search/filter experience and less visual hierarchy (jobs.html (line 99)).

Actions: Rename ambiguous labels to user-centered terms like “My Events,” “Saved Events,” or “Recommended Events.” Add consistent search/filter patterns across Events and Jobs. Add breadcrumbs or section titles in dashboard pages so users always know where they are.

3. Layout and Content

Strengths: Kindred uses cards, badges, headings, and spacing consistently. Events use a responsive card grid with category badges and clear visual separation (events.html (line 200)). Participant dashboards prioritize profile, upcoming events, and job opportunities, which matches likely user goals (sections/dashboard.html (line 56)).

Weaknesses: Some admin tables may become dense, especially event management, which includes title, category, date, location, cost, accommodations, date added, and actions in one row (sections/admin/events.html (line 21)). Long accommodation text could reduce scanability.

Actions: Add table filtering/search for admin lists, shorten table previews, and move long details into a detail drawer/modal. For participant-facing content, keep key decision details visible first: date, location, cost, accessibility/accommodations, and action status.

4. Forms and Error Handling

Strengths: Forms generally use clear labels, required validation, inline invalid feedback, and helpful helper text. The login form validates email/password and displays credential errors in an alert (login.html (line 48)). The event form labels cost, category, date/time, location, and accommodations clearly (sections/admin/events.html (line 56)).

Weaknesses: The password reset flow uses browser prompt() and alert(), which feels unfinished and less accessible (login.html (line 118)). Some forms may ask for complex information, such as accommodations, without examples structured enough for staff to enter consistent data.

Actions: Replace prompt/alert flows with an inline reset form and confirmation message. Add structured accommodation fields or guided prompts, such as sensory needs, mobility access, staff support, age requirements, and cost notes. Keep confirmations close to the action that triggered them.

5. Accessibility

Strengths: Many controls have semantic HTML, labels, Bootstrap form feedback, aria-label values on navigation, and responsive layouts. The mobile navbar has an accessible toggle label (nav.html (line 6)), and dashboard sidebar buttons update aria-current (js/sidebar.js (line 101)).

Weaknesses: The interface sometimes relies on color-coded badges and status colors, especially role badges, event categories, job statuses, and urgent alerts. Some icon-only or icon-heavy controls may need more explicit accessible names. Browser prompts/alerts are also a weaker accessibility pattern.

Actions: Ensure every color-coded status includes text, not color alone. Add accessible names or visible text for icon-heavy buttons. Test keyboard navigation through public pages, dashboard sidebar, modals, filters, and forms. Verify contrast for muted text and colored badges, especially on light pastel backgrounds.