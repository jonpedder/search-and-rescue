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
- Show progress and post-operation counts by layer/table.
- Split ArcGIS edit batches into bounded requests and recursively retry smaller batches if a gateway returns HTTP 400 for an oversized request.
- Surface the first feature-level ArcGIS error instead of reporting false success.

## Add ArcGIS sign-in

> Add a Sign in button and show the authenticated ArcGIS user. Use the Resource & Asset Management application as the example.

### Authentication acceptance criteria

- Show the same session control in the Planning, Operations and Settings headers.
- Display **Not signed in** or the authenticated user's full name/username.
- Change the action to **Sign out** while authenticated.
- Use ArcGIS Maps SDK `OAuthInfo`, `IdentityManager` and `Portal`; never place a token in source, logs or browser storage.
- Store only the deployment-specific OAuth client ID in browser-local configuration.
- Provide Settings controls for saving or clearing that client ID and list the redirect URLs that must be registered.
- Reuse the authenticated IdentityManager session for private feature-service access and synthetic-data editing.

## Fix and publish

> Fix the HTTP 400 error, commit the changes, and push them to GitHub.
