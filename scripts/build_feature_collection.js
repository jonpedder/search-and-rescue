#!/usr/bin/env node
/*
 * Build the SAR data model as an ArcGIS *feature collection* item document.
 *
 * Why: arcctl (and the ArcGIS portal) can publish a hosted feature service from a
 * feature collection, so the whole schema (5 layers + 4 tables, coded-value
 * domains, default symbology, seeded lookup tables) can be provisioned without
 * Python. Same data model as scripts/provision_sar_schema.py.
 *
 *   node scripts/build_feature_collection.js --out build/sar_fc.json [--demo]
 *
 * Then:
 *   arcctl tool call upload_source_item title="..." file_type=featureCollection file_path=build/sar_fc.json --json
 *   arcctl tool call publish_feature_service source_item_id=<id> file_type=featureCollection ... --json
 *
 * --demo adds ONE clearly labelled synthetic exercise incident so the map is not
 * empty. Its incident_id starts with "DEMO-". Delete it with: incident_id LIKE 'DEMO-%'
 *
 * No dependencies. Layer order (ids) matches the Python script:
 *   0 Incident  1 KeyPoints  2 SearchSegment  3 Clue  4 TrackLog
 *   5 Task  6 ModelRun  7 LPB_Stats  8 SurvivabilityCurve
 */
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");

/* ------------------------------------------------------------------ domains */
const cv = (name, values) => ({ type: "codedValue", name, codedValues: values.map(v => ({ name: v, code: v })) });
const CATEGORIES = [
  "Abduction", "Aircraft", "Urban Entrapment", "Water",
  "ATV", "Horseback", "Motorcycle", "Mountain Biker", "Vehicle",
  "Autistic", "Dementia", "Despondent", "Intellectual Disability", "Mental Illness", "Substance Intoxication",
  "Child 1-3", "Child 4-6", "Child 7-9", "Child 10-12", "Child 13-15",
  "Angler", "Camper", "Caver", "Climber", "Gatherer", "Hiker", "Hunter", "Runner",
  "Skier-Alpine", "Skier-Nordic", "Snowboarder", "Snowmobiler", "Snowshoer", "Worker", "Other"
];
const D = {
  category: cv("SubjectCategory", CATEGORIES),
  env: cv("EcoDomain", ["Temperate", "Dry", "Urban"]),
  terrain: cv("TerrainClass", ["Mountainous", "Flat", "Any"]),
  season: cv("Season", ["Winter", "Spring", "Summer", "Fall"]),
  light: cv("LightCondition", ["Day", "Night", "Twilight"]),
  incStatus: cv("IncidentStatus", ["Active", "Suspended", "Closed"]),
  segStatus: cv("SegmentStatus", ["Unassigned", "Assigned", "InProgress", "Complete"]),
  pointType: cv("KeyPointType", ["IPP", "PLS", "LKP", "Find", "Other"]),
  clueType: cv("ClueType", ["Footprint", "Item", "Sighting", "Sound", "Scent", "Other"]),
  taskType: cv("TaskType", ["Hasty", "Grid", "Trackline", "Canine", "Air", "Water", "Investigative", "Other"]),
  taskStatus: cv("TaskStatus", ["Planned", "Assigned", "InField", "Debriefed", "Cancelled"])
};

/* ------------------------------------------------------------------- fields */
const STR = "esriFieldTypeString", DBL = "esriFieldTypeDouble", INT = "esriFieldTypeInteger",
      SINT = "esriFieldTypeSmallInteger", DATE = "esriFieldTypeDate";
function f(name, type, alias, length, o) {
  o = o || {};
  const d = { name, type, alias: alias || name, nullable: o.nullable !== false, editable: true };
  if (type === STR) d.length = length || 255;
  if (o.domain) d.domain = o.domain;
  if (o.def !== undefined) d.defaultValue = o.def;
  return d;
}
const oid = { name: "OBJECTID", type: "esriFieldTypeOID", alias: "OBJECTID", nullable: false, editable: false };
const incId = () => f("incident_id", STR, "Incident ID", 50, { nullable: false });

/* --------------------------------------------------------------- symbology */
const NAVY = [0, 59, 92], GOLD = [242, 169, 0];
const NAPSG = {
  sar: "https://symbology.napsgfoundation.org/symbols/Community_Lifelines/Safety_and_Security/Lifelines_SS_SR_BI_NL.svg",
  ipp: "https://symbology.napsgfoundation.org/symbols/USAR/Search_or_Human_Interactions/USR_SearchHumanInteractions_MissingPersonIPP.svg",
  clue: "https://symbology.napsgfoundation.org/symbols/Incident/Incident_Intelligence/incdnt-comand-white-solid-detail-clue-relevant-known.svg",
  reportingParty: "https://symbology.napsgfoundation.org/symbols/Incident/Incident_Intelligence/incdnt-comand-white-solid-detail-reporting-party.svg"
};
const POA_RAMP = [[255, 238, 168], [253, 184, 99], [241, 116, 58], [194, 54, 47], [110, 17, 70]];
const picture = (url, size) => ({ type:"esriPMS", url, imageData:"", contentType:"image/svg+xml", width:size, height:size, angle:0, xoffset:0, yoffset:0 });
const marker = (style, color, size, outline) => ({
  type: "esriSMS", style, color: color.concat(255), size, angle: 0, xoffset: 0, yoffset: 0,
  outline: { type: "esriSLS", style: "esriSLSSolid", color: (outline || [255, 255, 255]).concat(255), width: 1.5 }
});
const simple = symbol => ({ renderer: { type: "simple", symbol } });
const unique = (field, infos, def) => ({ renderer: {
  type: "uniqueValue", field1: field, defaultSymbol: def, defaultLabel: "Other",
  uniqueValueInfos: infos.map(([value, symbol]) => ({ value, label: value, symbol })) } });
const fill = c => ({ type: "esriSFS", style: "esriSFSSolid", color: c.concat(150),
  outline: { type: "esriSLS", style: "esriSLSSolid", color: [60, 60, 60, 90], width: 0.4 } });
const POA_BREAKS = [0, 0.1, 0.25, 0.5, 1, 100];   // percent of total POA per segment
const poaRenderer = () => ({ renderer: {
  type: "classBreaks", field: "poa", classificationMethod: "esriClassifyManual", minValue: 0,
  classBreakInfos: POA_RAMP.map((c, i) => ({
    classMinValue: POA_BREAKS[i], classMaxValue: POA_BREAKS[i + 1],
    label: i === 4 ? "> " + POA_BREAKS[4] + "% POA" : POA_BREAKS[i] + " to " + POA_BREAKS[i + 1] + "% POA",
    symbol: fill(c) })) } });

/* ------------------------------------------------------------------- schema */
function buildSchema() {
  const layer = (id, name, geom, fields, drawingInfo, attachments) => ({
    id, name, geom, drawingInfo, hasAttachments: !!attachments, fields: [oid].concat(fields), isTable: false });
  const table = (id, name, fields) => ({ id, name, isTable: true, fields: [oid].concat(fields) });
  return [
    layer(0, "Incident", "esriGeometryPoint", [
      incId(),
      f("incident_name", STR, "Incident name", 150),
      f("subject_category", STR, "Subject category", 50, { domain: D.category }),
      f("subject_age", SINT, "Subject age"),
      f("subject_sex", STR, "Subject sex", 10),
      f("ecoregion_domain", STR, "Environment", 20, { domain: D.env }),
      f("terrain", STR, "Terrain", 20, { domain: D.terrain }),
      f("season", STR, "Season", 10, { domain: D.season }),
      f("light", STR, "Light", 10, { domain: D.light }),
      f("last_seen", DATE, "Last seen"),
      f("status", STR, "Status", 20, { domain: D.incStatus, def: "Active" }),
      f("stat_stratum", STR, "Statistics stratum", 250),
      f("stat_n", INT, "Statistics sample size"),
      f("stat_source", STR, "Statistics source", 100),
      f("weights_json", STR, "Model weights JSON", 2000),
      f("notes", STR, "Notes", 2000)
    ], simple(picture(NAPSG.sar, 30))),
    layer(1, "KeyPoints", "esriGeometryPoint", [
      incId(),
      f("point_type", STR, "Point type", 10, { domain: D.pointType }),
      f("point_name", STR, "Name", 100),
      f("point_time", DATE, "Time"),
      f("notes", STR, "Notes", 1000)
    ], unique("point_type", [
      ["IPP", picture(NAPSG.ipp, 30)],
      ["PLS", marker("esriSMSCircle", GOLD, 11, NAVY)],
      ["LKP", marker("esriSMSSquare", GOLD, 10, NAVY)],
      ["Find", picture(NAPSG.clue, 28)]
    ], marker("esriSMSCircle", [175, 195, 207], 8, NAVY))),
    layer(2, "SearchSegment", "esriGeometryPolygon", [
      incId(),
      f("segment_id", STR, "Segment ID", 20),
      f("run_id", STR, "Model run ID", 50),
      f("poa", DBL, "POA (%)"),
      f("pod", DBL, "POD (%)"),
      f("pos", DBL, "POS (%)"),
      f("rank", INT, "Rank"),
      f("status", STR, "Status", 20, { domain: D.segStatus, def: "Unassigned" }),
      f("area_km2", DBL, "Area (km2)"),
      f("assigned_team", STR, "Assigned team", 100)
    ], poaRenderer()),
    layer(3, "Clue", "esriGeometryPoint", [
      incId(),
      f("clue_type", STR, "Clue type", 20, { domain: D.clueType }),
      f("found_time", DATE, "Found time"),
      f("found_by", STR, "Found by", 100),
      f("description", STR, "Description", 1000)
    ], simple(picture(NAPSG.clue, 28)), true),
    layer(4, "TrackLog", "esriGeometryPolyline", [
      incId(),
      f("team_name", STR, "Team", 100),
      f("task_id", STR, "Task ID", 50),
      f("started", DATE, "Started"),
      f("ended", DATE, "Ended")
    ], simple({ type: "esriSLS", style: "esriSLSSolid", color: [0, 121, 193, 230], width: 2.5 })),
    table(5, "Task", [
      incId(),
      f("task_id", STR, "Task ID", 50),
      f("segment_id", STR, "Segment ID", 20),
      f("team_name", STR, "Team", 100),
      f("task_type", STR, "Task type", 20, { domain: D.taskType }),
      f("assigned_time", DATE, "Assigned"),
      f("completed_time", DATE, "Completed"),
      f("pod_reported", DBL, "POD reported (%)"),
      f("status", STR, "Status", 20, { domain: D.taskStatus, def: "Planned" }),
      f("notes", STR, "Notes", 1000)
    ]),
    table(6, "ModelRun", [
      f("run_id", STR, "Run ID", 50, { nullable: false }),
      incId(),
      f("run_time", DATE, "Run time"),
      f("stat_stratum", STR, "Statistics stratum", 250),
      f("stat_n", INT, "Sample size"),
      f("stat_source", STR, "Statistics source", 100),
      f("inputs_json", STR, "Inputs JSON", 8000),
      f("segments_count", INT, "Segments")
    ]),
    table(7, "LPB_Stats", [
      f("source", STR, "Source", 100),
      f("category", STR, "Category", 50, { nullable: false }),
      f("subcategory", STR, "Subcategory", 50),
      f("domain", STR, "Environment", 20, { domain: D.env }),
      f("terrain", STR, "Terrain", 20, { domain: D.terrain }),
      f("n", INT, "Sample size"),
      f("dist_km_25", DBL), f("dist_km_50", DBL), f("dist_km_75", DBL), f("dist_km_95", DBL),
      f("uphill_pct", DBL), f("downhill_pct", DBL), f("same_pct", DBL),
      f("disp_deg_25", DBL), f("disp_deg_50", DBL), f("disp_deg_75", DBL), f("disp_deg_95", DBL),
      f("track_m_25", DBL), f("track_m_50", DBL), f("track_m_75", DBL), f("track_m_max", DBL),
      f("mobility_hr_50", DBL),
      f("notes", STR, "Notes", 1000)
    ]),
    table(8, "SurvivabilityCurve", [
      f("category", STR, "Category", 50, { nullable: false }),
      f("a", DBL, "a"),
      f("b", DBL, "b (per day)"),
      f("source", STR, "Source", 500)
    ])
  ];
}

/* ------------------------------------------------------------------ seeding */
const INT_FIELDS = new Set(["n"]);
const FLOAT_FIELDS = new Set(["dist_km_25", "dist_km_50", "dist_km_75", "dist_km_95", "uphill_pct", "downhill_pct",
  "same_pct", "disp_deg_25", "disp_deg_50", "disp_deg_75", "disp_deg_95", "track_m_25", "track_m_50", "track_m_75",
  "track_m_max", "mobility_hr_50", "a", "b"]);

function loadModel() {
  const html = fs.readFileSync(path.join(root, "app", "index.html"), "utf8");
  const src = html.match(/<script id="lpb-model">([\s\S]*?)<\/script>/)[1];
  return new Function("module", src + "; return LPB;")(undefined);
}
function csvRows(LPB, file) {
  const raw = LPB.parseCSV(fs.readFileSync(path.join(root, "data", file), "utf8"));
  return raw.map(r => {
    const a = {};
    Object.keys(r).forEach(k => {
      const key = k.trim(), v = String(r[k] == null ? "" : r[k]).trim();
      if (!key) return;
      a[key] = v === "" ? null : INT_FIELDS.has(key) ? Math.trunc(Number(v)) : FLOAT_FIELDS.has(key) ? Number(v) : v;
    });
    return a;
  });
}

/* --------------------------------------------------------------- demo data */
// ONE synthetic exercise incident, so the web map has something to show.
function demoData(LPB, statsRows) {
  const LAT = 34.14, LON = -118.03, now = Date.now(), H = 3600e3;
  const incidentId = "DEMO-" + new Date(now).toISOString().slice(0, 10).replace(/-/g, "") + "-EXERCISE";
  const runId = "demo-run-" + now.toString(36);
  const stats = LPB.normStats(LPB.parseCSV(fs.readFileSync(path.join(root, "data", "lpb_stats_seed.csv"), "utf8")));
  const match = LPB.matchStats(stats, { category: "Dementia", domain: "Temperate", terrain: "Mountainous" });
  const out = LPB.runModel({ row: match.row, lat: LAT, lon: LON, n: 20, extentIdx: 2, lines: [],
    scenarios: [{ name: "Primary", prob: 100, bearing: null }],
    weights: { ring: 100, sector: 0, linear: 0, terrain: 0, elev: 0 } });

  let segs = out.cells.map((c, i) => ({ cell: c, poa: out.poa[i], pod: 0, pos: 0 }));
  const byPoa = () => segs.map((s, i) => i).sort((a, b) => segs[b].poa - segs[a].poa);
  let order = byPoa();
  // The highest-POA segment is searched first (POD 30%). Its POA is then
  // redistributed, so the next two segments by the UPDATED rank get tasks.
  const searched = segs[order[0]];
  const pods = segs.map(() => 0); pods[order[0]] = 0.30;
  const upd = LPB.applyPOD(segs.map(s => s.poa), pods);
  segs.forEach((s, i) => { s.pod = pods[i]; s.pos = upd.pos[i]; s.poa = upd.next[i]; });
  order = byPoa();
  order.forEach((idx, r) => { segs[idx].rank = r + 1; });
  const top = [searched, segs[order[0]], segs[order[1]]];
  const status = new Map([[top[0], "Complete"], [top[1], "Assigned"], [top[2], "Unassigned"]]);

  const stratum = [match.row.category, match.row.domain, match.row.terrain].join(" / ");
  const weights = { ring: 100, sector: 0, linear: 0, terrain: 0, elev: 0 };
  const note = "SYNTHETIC EXERCISE DATA. Not a real incident. Delete with incident_id LIKE 'DEMO-%'.";

  const pt = (lon, lat) => ({ x: lon, y: lat, spatialReference: { wkid: 4326 } });
  const c0 = top[0].cell.center, c1 = top[1].cell.center;
  const ringGeom = ring => ({ rings: [ring], spatialReference: { wkid: 4326 } });
  const dLon = 0.0035;   // ~300 m of longitude here, for the synthetic track

  return {
    0: [{ geometry: pt(LON, LAT), attributes: { incident_id: incidentId, incident_name: "DEMO - exercise overdue hiker (synthetic)",
      subject_category: "Dementia", subject_age: 78, subject_sex: "M", ecoregion_domain: "Temperate", terrain: "Mountainous",
      season: "Fall", light: "Day", last_seen: now - 6 * H, status: "Active", stat_stratum: stratum, stat_n: match.row.n,
      stat_source: match.row.source, weights_json: JSON.stringify(weights), notes: note } }],
    1: [{ geometry: pt(LON, LAT), attributes: { incident_id: incidentId, point_type: "IPP", point_name: "Initial planning point",
      point_time: now - 6 * H, notes: note } }],
    2: segs.map(s => ({ geometry: ringGeom(s.cell.ring), attributes: { incident_id: incidentId, segment_id: s.cell.id, run_id: runId,
      poa: +(s.poa * 100).toFixed(4), pod: +(s.pod * 100).toFixed(2), pos: +(s.pos * 100).toFixed(4), rank: s.rank,
      status: status.get(s) || "Unassigned", area_km2: +s.cell.areaKm2.toFixed(4),
      assigned_team: status.get(s) === "Complete" ? "Team Alpha" : status.get(s) === "Assigned" ? "Team Bravo" : null } })),
    3: [{ geometry: pt(c0[0] + 0.0004, c0[1] - 0.0003), attributes: { incident_id: incidentId, clue_type: "Footprint",
      found_time: now - 2 * H, found_by: "Team Alpha", description: "Synthetic demo clue. " + note } }],
    4: [{ geometry: { paths: [[[c0[0] - dLon, c0[1]], [c0[0], c0[1] + 0.0012], [c0[0] + dLon, c0[1] - 0.0004]]],
      spatialReference: { wkid: 4326 } }, attributes: { incident_id: incidentId, team_name: "Team Alpha", task_id: "DEMO-T1",
      started: now - 3 * H, ended: now - 2 * H } }],
    5: [
      { attributes: { incident_id: incidentId, task_id: "DEMO-T1", segment_id: top[0].cell.id, team_name: "Team Alpha", task_type: "Hasty",
        assigned_time: now - 3.5 * H, completed_time: now - 1.5 * H, pod_reported: 30, status: "Debriefed", notes: note } },
      { attributes: { incident_id: incidentId, task_id: "DEMO-T2", segment_id: top[1].cell.id, team_name: "Team Bravo", task_type: "Hasty",
        assigned_time: now - 1 * H, completed_time: null, pod_reported: null, status: "InField", notes: note } },
      { attributes: { incident_id: incidentId, task_id: "DEMO-T3", segment_id: top[2].cell.id, team_name: null, task_type: "Grid",
        assigned_time: null, completed_time: null, pod_reported: null, status: "Planned", notes: note } }
    ],
    6: [{ attributes: { run_id: runId, incident_id: incidentId, run_time: now - 5.5 * H, stat_stratum: stratum, stat_n: match.row.n,
      stat_source: match.row.source, inputs_json: JSON.stringify({ weights, grid: 20, extentIdx: 2, scenarios: [{ name: "Primary", prob: 100, bearing: null }], demo: true }),
      segments_count: segs.length } }]
  };
}

/* --------------------------------------------------------------------- build */
function geomOfRow(g) {
  if (!g) return null;
  if (g.rings) return g.rings[0];
  if (g.paths) return g.paths[0];
  return [[g.x, g.y]];
}
function extentOf(features) {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  features.forEach(ft => geomOfRow(ft.geometry).forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }));
  if (x0 > x1) return { xmin: -125, ymin: 32, xmax: -114, ymax: 42, spatialReference: { wkid: 4326 } };
  const px = Math.max((x1 - x0) * 0.1, 0.01), py = Math.max((y1 - y0) * 0.1, 0.01);
  return { xmin: x0 - px, ymin: y0 - py, xmax: x1 + px, ymax: y1 + py, spatialReference: { wkid: 4326 } };
}

function build(opts) {
  opts = opts || {};
  const LPB = loadModel();
  const schema = buildSchema();
  const seed = { 7: csvRows(LPB, "lpb_stats_seed.csv"), 8: csvRows(LPB, "survivability_seed.csv") };
  const demo = opts.demo ? demoData(LPB) : {};
  const rowsFor = id => (seed[id] || demo[id] || []);

  const defs = schema.map(s => {
    const rows = rowsFor(s.id).map((r, i) => {
      const attributes = Object.assign({ OBJECTID: i + 1 }, r.attributes || r);
      return r.geometry ? { geometry: r.geometry, attributes } : { attributes };
    });
    const layerDefinition = { id: s.id, name: s.name, type: s.isTable ? "Table" : "Feature Layer",
      objectIdField: "OBJECTID", typeIdField: "", displayField: s.fields[1].name, fields: s.fields,
      capabilities: "Query,Create,Update,Delete,Editing", hasAttachments: !!s.hasAttachments };
    const featureSet = { features: rows };
    if (!s.isTable) {
      layerDefinition.geometryType = s.geom;
      layerDefinition.drawingInfo = s.drawingInfo;
      layerDefinition.extent = extentOf(rows);
      layerDefinition.spatialReference = { wkid: 4326 };
      featureSet.geometryType = s.geom;
      featureSet.spatialReference = { wkid: 4326 };
    }
    return { isTable: s.isTable, entry: { layerDefinition, featureSet } };
  });
  return {
    layers: defs.filter(d => !d.isTable).map(d => d.entry),
    tables: defs.filter(d => d.isTable).map(d => d.entry),
    showLegend: true
  };
}

/*
 * Service definition for the admin addToDefinition operation. Unlike a feature
 * collection publish, this keeps the exact layer/table ids above, adds a
 * GlobalID to every layer and table, enables Sync (Field Maps offline) and
 * supports tables. Use it after createService (see docs/GIS_WORKFLOW.md).
 */
function buildServiceDefinition() {
  const globalId = { name: "GlobalID", type: "esriFieldTypeGlobalID", alias: "GlobalID", nullable: false, editable: false, length: 38 };
  const caps = "Query,Create,Update,Delete,Editing,Sync";
  const layers = [], tables = [];
  buildSchema().forEach(s => {
    const def = { id: s.id, name: s.name, type: s.isTable ? "Table" : "Feature Layer", objectIdField: "OBJECTID",
      globalIdField: "GlobalID", displayField: s.fields[1].name, fields: [s.fields[0], globalId].concat(s.fields.slice(1)),
      capabilities: caps, hasAttachments: !!s.hasAttachments };
    if (s.isTable) tables.push(def);
    else { def.geometryType = s.geom; def.drawingInfo = s.drawingInfo; layers.push(def); }
  });
  return { layers, tables };
}
// Lookup-table rows (LPB_Stats = 7, SurvivabilityCurve = 8) from data/*.csv, as applyEdits adds.
function lookupSeed() {
  const LPB = loadModel();
  const wrap = rows => rows.map(attributes => ({ attributes }));
  return { 7: wrap(csvRows(LPB, "lpb_stats_seed.csv")), 8: wrap(csvRows(LPB, "survivability_seed.csv")) };
}

module.exports = { build, buildSchema, buildServiceDefinition, lookupSeed, POA_BREAKS };

if (require.main === module) {
  const args = process.argv.slice(2);
  const get = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const defOut = get("--definition"), seedOut = get("--seed");
  if (defOut || seedOut) {
    if (defOut) { fs.mkdirSync(path.dirname(path.resolve(defOut)), { recursive: true }); fs.writeFileSync(defOut, JSON.stringify(buildServiceDefinition())); console.log("wrote " + defOut); }
    if (seedOut) { fs.mkdirSync(path.dirname(path.resolve(seedOut)), { recursive: true }); fs.writeFileSync(seedOut, JSON.stringify(lookupSeed())); console.log("wrote " + seedOut); }
    process.exit(0);
  }
  const out = get("--out");
  if (!out) { console.error("usage: node scripts/build_feature_collection.js --out FILE [--demo] | --definition FILE | --seed FILE"); process.exit(2); }
  const fc = build({ demo: args.includes("--demo") });
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(fc));
  const n = a => a.map(x => x.layerDefinition.name + "(" + x.featureSet.features.length + ")").join(", ");
  console.log("layers: " + n(fc.layers));
  console.log("tables: " + n(fc.tables));
  console.log("wrote " + out + " (" + fs.statSync(out).size + " bytes)");
}
