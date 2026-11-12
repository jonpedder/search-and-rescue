const assert = require("assert");
const fs = require("fs");
const path = require("path");
const A = require("../app/analysis.js");
const H = 3600000, D = 24 * H;
const t0 = Date.UTC(2025, 0, 6, 10);
const pt = (x, y) => ({ x, y, spatialReference: { wkid: 4326 } });
const hosted = {
  incidents: [
    { geometry: pt(-118, 34), attributes: { incident_id: "I-1", incident_name: "Alpha <script>", subject_category: "Hiker", last_seen: t0, status: "Closed" } },
    { geometry: pt(-117, 35), attributes: { incident_id: "I-2", incident_name: "Bravo", subject_category: "Dementia", last_seen: t0 + 10 * D, status: "Active" } },
    { geometry: pt(-117, 35), attributes: { incident_id: "I-2", incident_name: "Bravo duplicate", subject_category: "Dementia", last_seen: t0 + 10 * D, status: "Active" } }
  ],
  keypoints: [
    { geometry: pt(-118, 34), attributes: { incident_id: "I-1", point_type: "IPP", point_time: t0 } },
    { geometry: pt(-117.9, 34), attributes: { incident_id: "I-1", point_type: "Find", point_time: t0 + 8 * H } },
    { geometry: pt(-116.9, 35), attributes: { incident_id: "I-2", point_type: "Find", point_time: t0 + 10 * D - H } }
  ],
  clues: [{ attributes: { incident_id: "I-1", found_time: t0 + H } }],
  tasks: [{ attributes: { incident_id: "I-1", status: "Debriefed", notes: '{"operationalPeriod":2}' } }]
};
const local = [{ key: "sar.operations.I-1", data: { incident: { id: "I-1", name: "Local Alpha" }, records: [{ id: "R1", kind: "clue", geometry: pt(-118, 34), attrs: { operationalPeriod: 2, created: t0 + H } }], assignments: [{ id: "T1", status: "Complete", operationalPeriod: 2, created: t0 + H }] } }, { key: "sar.operations.LOCAL", data: { incident: { id: "LOCAL", name: "Browser only" }, records: [], assignments: [] } }];

const merged = A.mergeData(hosted, local);
assert.equal(merged.incidents.length, 3, "incident_id de-duplicates hosted rows and retains local-only incidents");
const i1 = merged.incidents.find(x => x.id === "I-1");
assert.equal(i1.name, "Local Alpha", "browser workspace name is preserved");
assert.deepEqual(i1.sources.sort(), ["browser", "hosted"]);
assert.equal(i1.localRecords.length, 1);
assert.equal(merged.tasks.filter(x => x.incidentId === "I-1").length, 2, "hosted and local assignments merge");

const filtered = A.applyFilters(merged, { scope: "I-1", status: "Closed", category: "Hiker", operationalPeriod: "2" });
assert.deepEqual(filtered.incidents.map(x => x.id), ["I-1"]);
assert(filtered.keypoints.every(x => x.incidentId === "I-1"));
assert(filtered.tasks.every(x => x.incidentId === "I-1"), "all linked datasets follow the incident filter");
assert.equal(A.applyFilters(merged, { scope: "all", start: "2025-01-10" }).incidents.length, 1, "date filtering is consistent");

const durations = A.locationDurations(merged);
assert.deepEqual(durations.map(x => Math.round(x.hours)), [8], "negative and invalid Find intervals are excluded");
assert.deepEqual(A.durationBins([1, 6, 12, 24, 72, -1, NaN]).map(x => x.count), [1, 1, 1, 1, 1]);
const summary = A.summarize(merged);
assert.equal(summary.locatedObservations, 2, "heat input counts located-point observations");
assert.equal(summary.locatedIncidents, 2);
assert.equal(summary.durations.length, 1);
assert(summary.displacements.length >= 1 && summary.medianKm > 0, "displacement uses incident/IPP to Find geometry");

assert.equal(A.timelineBucket([{ lastSeen: t0 }, { lastSeen: t0 + 20 * D }]), "day");
assert.equal(A.timelineBucket([{ lastSeen: t0 }, { lastSeen: t0 + 100 * D }]), "week");
assert.equal(A.timelineBucket([{ lastSeen: t0 }, { lastSeen: t0 + 400 * D }]), "month");
assert.equal(A.timeline(merged.incidents, "day").reduce((n, x) => n + x.count, 0), 2, "timeline excludes undated local incidents");
const series = A.timelineSeries(merged.incidents, "day");
assert.deepEqual(series.map(x => x.cumulative), [1, 2], "cumulative line advances across the same adaptive timeline buckets");
assert.equal(series.at(-1).cumulative, series.reduce((n, x) => n + x.count, 0), "cumulative endpoint reconciles with bar volume");
const calendar = A.monthDayMatrix([
  { lastSeen: "2024-02-29T12:30:00Z" }, { lastSeen: "2024-02-29T23:59:00Z" },
  { lastSeen: "2025-04-30T00:00:00Z" }, { lastSeen: "2025-02-30T00:00:00Z" }, { lastSeen: "not-a-date" }, { lastSeen: null }
]);
assert.equal(calendar.validCount, 3, "leap day is valid while normalized impossible and invalid timestamps are excluded");
assert.equal(calendar.matrix[1][28], 2, "February 29 is an available leap-day cell");
assert.equal(calendar.matrix[1][29], null, "February 30 is unavailable rather than zero");
assert.equal(calendar.matrix[3][29], 1);
assert.equal(calendar.matrix[3][30], null, "April 31 is unavailable");
const filteredCalendar = A.monthDayMatrix(A.applyFilters(merged, { scope: "I-1" }).incidents);
assert.equal(filteredCalendar.validCount, 1, "month/day analytics accepts the same filtered incident set");
assert.equal(A.timelineSeries(A.applyFilters(merged, { scope: "I-1" }).incidents).at(-1).cumulative, 1, "combo series is filter-linked");
const matrix = A.dayHourMatrix(merged.incidents);
assert.equal(matrix.flat().reduce((a, b) => a + b, 0), 2);
assert.equal(matrix[new Date(t0).getUTCDay()][10], 1);
const mondayHour = new Date(t0).getUTCDay() + "-" + new Date(t0).getUTCHours(), secondHour = new Date(t0 + 10 * D).getUTCDay() + "-" + new Date(t0 + 10 * D).getUTCHours();
const heatFiltered = A.applyDayHourCells(merged, [mondayHour]);
assert.deepEqual(heatFiltered.incidents.map(x => x.id), ["I-1"], "weekday/hour selection filters incidents");
assert(heatFiltered.keypoints.every(x => x.incidentId === "I-1") && heatFiltered.tasks.every(x => x.incidentId === "I-1"), "heat selection cross-filters linked records");
assert.equal(A.applyDayHourCells(merged, [mondayHour, secondHour]).incidents.length, 2, "multiple heat cells are combined as an inclusive selection");

const storage = {
  rows: { "sar.operations.good": JSON.stringify(local[0].data), "sar.operations.bad": "{broken", other: "{}" },
  get length() { return Object.keys(this.rows).length; }, key(i) { return Object.keys(this.rows)[i]; }, getItem(k) { return this.rows[k]; }
};
const parsed = A.localWorkspaces(storage);
assert.equal(parsed.workspaces.length, 1);
assert.equal(parsed.errors.length, 1, "malformed SAR local storage is skipped and surfaced");
assert.equal(A.escapeHtml('<img src=x onerror="boom">'), "&lt;img src=x onerror=&quot;boom&quot;&gt;");

(async () => {
  const fallback = await A.loadMergedData({ storage, loadHosted: async () => { throw new Error("denied"); } });
  assert(fallback.hostedError && /denied/.test(fallback.hostedError.message));
  assert.equal(fallback.data.incidents.length, 1, "hosted failure falls back to browser workspaces");

  let calls = 0;
  const layer = { capabilities: { query: { maxRecordCount: 2 } }, objectIdField: "OBJECTID", load: async () => {}, createQuery: () => ({}), queryFeatures: async q => { calls++; return calls === 1 ? { features: [{ id: 1 }, { id: 2 }], exceededTransferLimit: true } : { features: [{ id: 3 }], exceededTransferLimit: false }; } };
  assert.equal((await A.queryAll(layer, ["incident_id"], true)).length, 3);
  assert.equal(calls, 2, "hosted query paginates queryFeatures until complete");

  const html = fs.readFileSync(path.join(__dirname, "../app/analysis.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../app/analysis.js"), "utf8");
  assert.match(html, /value="all">All incidents/);
  assert.match(html, /analysis\.js/);
  assert.match(js, /window\.__app\.analysis/);
  assert.match(js, /window\.__esriView/);
  assert.match(js, /type: "heatmap"/);
  assert.match(js, /queryFeatures/);
  assert.match(js, /zoomReturnViewpoint/);
  assert.match(js, /pendingReturnViewpoint/);
  assert.match(js, /Select again to return to previous extent/);
  for (const widget of ["LayerList", "BasemapGallery", "Bookmarks", "Measurement", "Zoom", "Home", "Search"]) assert(js.includes(widget), widget + " is available on the Analysis map");
  assert.match(html, /bookmarks\.js\?v=/, "Analysis loads persistent browser bookmarks");
  const css = fs.readFileSync(path.join(__dirname, "../app/analysis.css"), "utf8");
  assert.match(css, /\.map-mode\{position:absolute;left:8px;bottom:34px/, "incident display selector stays in the lower-left away from location search");
  console.log("analysis tests passed");
})().catch(error => { console.error(error); process.exit(1); });
