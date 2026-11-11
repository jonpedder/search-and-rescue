# ArcGIS Field Maps companion workflow

The SAR Operations Web Map is the mobile companion map:

- **Web Map:** `SAR Incident Operations Map`
- **Item ID:** `5bd5bbf575794e9c9565abcb20feb991`
- **Hosted service:** `SAR Incident Data`
- **Mobile edits:** Clues (layer 3) and Track Logs (layer 4)
- **Assignment context:** Search Segments (layer 2), using `assigned_team` and `status`

The Operations **Resources** tab provides deep links that open this Web Map, start a clue form, or start a field-progress line. Incident, team and task values are prefilled when available.

## Field workflow

1. Sign in to ArcGIS Field Maps with the agency account that belongs to the restricted SAR response group.
2. Open **SAR Incident Operations Map** from **My maps**, or use **Open Field Maps** in SAR Operations.
3. Open a Search Segment to review `segment_id`, `assigned_team`, status, POA/POD and the incident ID. Use the map and device location for field navigation; authoritative turn-by-turn routing still depends on the organization's configured network services and access conditions.
4. Use **Record clue** in SAR Operations, or add a feature to **Clues** in Field Maps. Complete the clue type, found time, found by and description, then add one or more photographs in **Attachments** before submitting.
5. Use **Record progress line**, or add a line to **Track Logs**. Confirm the team and task, collect the line while moving, and submit it. Online submissions become queryable by SAR Operations immediately; offline edits appear after the device syncs.
6. In SAR Operations, use **Refresh field activity** to reload assignments, clue points and submitted progress lines.

## Required Field Maps Designer configuration

Before an operational deployment, the item owner should review the Web Map in Field Maps Designer:

1. **Sharing and privileges**
   - Keep the Web Map and hosted feature service private or shared only to a restricted SAR response group.
   - Give field accounts a role that can add Clues and Track Logs and update the assignment status fields the agency permits.
   - Do not share sensitive subject or responder data publicly.
2. **Forms**
   - Search Segments: expose `segment_id`, `assigned_team`, `status`, `poa`, `pod`, `pos`, `area_km2` and `incident_id`.
   - Clues: require operationally appropriate values for `incident_id`, `clue_type`, `found_time`, `found_by` and `description`; keep attachments visible and test camera/gallery upload.
   - Track Logs: expose `incident_id`, `team_name`, `task_id`, `started` and `ended`.
3. **Assignments**
   - Use `assigned_team` and `status` to identify the segment assigned to each team.
   - For strict per-team visibility, publish restricted hosted feature-layer views or team-specific Web Map copies. A client-side map filter improves usability but is not a security boundary.
4. **Offline use**
   - Sync is enabled on the hosted service. Enable offline use for the Web Map, verify every reference layer supports offline use, and create map areas for likely search regions before deployment.
   - Download the map area while connected. Test clue attachments and progress-line synchronization in airplane mode and after reconnecting.
5. **Update interval**
   - Online feature submissions are available to the web application as soon as the service accepts them. SAR Operations intentionally refreshes on command so it does not discard unsaved browser work.
   - Offline updates are not near real time until the device reconnects and completes synchronization.

## GPS tracking distinction

A Track Log line is an operational progress feature in this application's hosted service. It is not the same as the ArcGIS organization-wide Location Tracking service.

- Use **Track Logs** when teams should submit a line that appears in this Web Map and SAR Operations without additional services.
- Use ArcGIS **Location Sharing / My Tracks** when the organization has licensed and enabled native Field Maps location sharing and requires background tracking. Exposing those tracks in command applications requires the organization's tracking service, permissions and retention policy; it is not automatically written to layer 4.

## Deployment test

Run one device exercise before an incident:

- open the shared map;
- locate the assigned segment;
- create and submit a clue with a photograph;
- create and submit a progress line;
- switch offline, repeat, reconnect and sync;
- refresh SAR Operations and confirm incident IDs, timestamps, photos, line geometry and assignment status;
- confirm an account outside the restricted group cannot open the map or service.
