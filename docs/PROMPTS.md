# Development Prompts

This file records the prompts used to guide the reporting and synthetic-data additions.

## Load the application

> Load this GitHub Pages application: https://jonpedder.github.io/search-and-rescue/index.html

## Add reports

> Create a Reports dropdown in the header. Use https://jonpedder.github.io/resource-asset-management/index.html as the UI example.
>
> Add these PDF reports:
>
> 1. A Clue Log Report.
> 2. An Incident & Subject Profile Report detailing the incident information and subject profile.
>
> Make the shared reports file available to both the Planning and Operations pages.

### Reporting acceptance criteria

- Show a **Reports** dropdown in the header on `index.html` and `operations.html`.
- The **Clue Log Report** reads clues from the live Operations workspace or its browser-saved workspace, sorts them chronologically, and includes incident, operational-period, status, priority, coordinate and description fields.
- Add a clue-placement map to the Clue Log Report. Draw amber numbered markers at each clue location and use the same numbers in the chronological clue table so operators can identify each mapped clue.
- The **Incident & Subject Profile Report** includes the incident, IPP, last-seen time, scenarios, subject category and demographics, environment, terrain, season, light, interview fields and generated planning cues.
- Download reports as PDF files.
- Match the existing navy-and-amber Search & Rescue interface.
- Show an actionable empty-state message instead of creating an empty report.

## Add synthetic data administration

> Until real data is available, create 5,000 synthetic records in the database. Include all subject categories, clues, assignments and other operational record types.
>
> Add a section to the Settings page with controls to generate synthetic data and delete all synthetic data.

### Synthetic-data acceptance criteria

- Generate exactly the requested total, with **5,000** as the default.
- Cover all 35 subject categories.
- Populate Incident, KeyPoints, SearchSegment, Clue, TrackLog, Task, ModelRun, LPB_Stats and SurvivabilityCurve.
- Write validated WGS84 geometry for every record in the spatial Incident, KeyPoints, SearchSegment, Clue and TrackLog layers. Task, ModelRun, LPB_Stats and SurvivabilityCurve remain nonspatial tables because their service schema has no geometry field.
- After generation, open the first generated incident in SAR Operations, load its spatial features and zoom the map to them. Display table records through their segment/incident relationships.
- Include varied incident states, clue types, task types, assignment states, segment states, teams, hazards, facilities and operational assets.
- Clearly label all generated content as synthetic and unsuitable for operational use.
- Tag generated records deterministically:
  - `incident_id LIKE 'SYN-%'` for incident-related records.
  - `source LIKE 'SYNTHETIC_PLACEHOLDER%'` for reference-table records.
- The delete action must target only those tags and must preserve real records and the existing `DEMO-` exercise record.
- Require confirmation before generation and deletion.
- Show a visible determinate progress bar while generating, including the active layer/table, percentage, and completed-versus-total record count; show post-operation counts by layer/table.
- Split ArcGIS edit batches into bounded requests and recursively retry smaller batches if a gateway returns HTTP 400 for an oversized request.
- Surface the first feature-level ArcGIS error instead of reporting false success.

## Add ArcGIS sign-in

> Add a Sign in button and show the authenticated ArcGIS user. Use the Resource & Asset Management application as the example.

### Authentication acceptance criteria

- Show the same session control in the Planning, Operations and Settings headers.
- Keep this control order on every page: **Reports selector**, **PDF**, **SAR Planning**, **SAR Operations**, **authenticated user**, **Sign in/Sign out**, **Settings**.
- Display **Not signed in** or the authenticated user's full name/username.
- Change the action to **Sign out** while authenticated.
- Use ArcGIS Maps SDK `OAuthInfo`, `IdentityManager` and `Portal`; never place a token in source, logs or browser storage.
- Store only the deployment-specific OAuth client ID in browser-local configuration.
- Provide Settings controls for saving or clearing that client ID and list the redirect URLs that must be registered.
- Reuse the authenticated IdentityManager session for private feature-service access and synthetic-data editing.

## Add visual help and downloadable guide

> In Help & How-to, include screenshots and numbered pointers to the available actions and workflow steps. Add a button that downloads the help guide as a PDF.

### Help acceptance criteria

- Include current Planning, Operations and Settings screenshots.
- Overlay numbered callout dots and pointer labels on the screenshots.
- Pair every screenshot with a numbered, readable action legend.
- Restyle procedural lists as connected numbered steps.
- Add a **Download Help PDF** button in Help & How-to.
- Generate a multi-page PDF containing the screenshots, numbered dots, legends, recommended sequence and detailed help topics.
- Keep the walkthrough responsive; on small screens, retain dots and move the complete descriptions into the legend.

## Reorganize Settings & Help

> Use the Resource & Asset Management Settings page as the layout and configuration example: https://jonpedder.github.io/resource-asset-management/settings.html

### Settings acceptance criteria

- Use three top-level tabs: **Settings**, **Configuration**, and **Help & How-to**.
- Keep presentation, map, workspace and model preferences under Settings.
- Move ArcGIS item connections, OAuth configuration, synthetic-data administration and deployment diagnostics under Configuration.
- Show a clear browser-local configuration notice and never store OAuth tokens or secrets.
- Provide diagnostics for portal, client ID, authenticated user, item IDs, service layers/tables, saved overrides and network status.
- Use an application title bar, tabbed surface, collapsible configuration cards and a persistent Save/Reset action bar consistent with the reference application.
- Preserve the visual walkthroughs and downloadable Help PDF under Help & How-to.

## Standardize the application header

> Use the Resource & Asset Management application header as the configuration example: https://jonpedder.github.io/resource-asset-management/index.html

### Header acceptance criteria

- Use one shared header composition on Planning, Operations and Settings.
- Present a linked brand mark, application name and subtitle on the left.
- Keep Reports/PDF, SAR Planning and SAR Operations together as primary navigation.
- Keep authenticated user, Sign in/Sign out and Settings together as a distinct session area.
- Highlight the current page and preserve the required action order.
- Adapt to narrower screens with ordered rows rather than clipping, horizontal scrolling or hidden controls.

## Fix and publish

> Fix the HTTP 400 error, commit the changes, and push them to GitHub.
