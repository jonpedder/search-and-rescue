/* Incident Analysis: pure analytics contracts plus the browser controller. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SARAnalysis = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  var SERVICE_ROOT = "https://services6.arcgis.com/SdBwj74JF24xKhpX/arcgis/rest/services/SAR_LPB_Incident_Data/FeatureServer";
  var DAY = 86400000, HOUR = 3600000;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function dateMs(value) {
    if (value == null || value === "") return null;
    var n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n) && n > 0) return n;
    var text = String(value).trim(), match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(text);
    n = Date.parse(text);
    if (!Number.isFinite(n)) return null;
    if (match) {
      var d = new Date(n);
      if (d.getUTCFullYear() !== +match[1] || d.getUTCMonth() + 1 !== +match[2] || d.getUTCDate() !== +match[3]) return null;
    }
    return n;
  }
  function coords(geometry) {
    if (!geometry) return null;
    var x = geometry.longitude != null ? geometry.longitude : geometry.x;
    var y = geometry.latitude != null ? geometry.latitude : geometry.y;
    return Number.isFinite(+x) && Number.isFinite(+y) ? [+x, +y] : null;
  }
  function attrs(feature) { return feature && (feature.attributes || feature.attrs) || {}; }
  function idOf(feature) { var a = attrs(feature); return String(a.incident_id || a.id || "").trim(); }
  function safeJson(value) { try { return JSON.parse(value); } catch (_) { return null; } }
  function opOf(record) {
    var a = attrs(record), notes = typeof a.notes === "string" ? safeJson(a.notes) : null;
    return +(a.operationalPeriod || record.operationalPeriod || (notes && notes.operationalPeriod) || 1);
  }
  function localWorkspaces(storage) {
    var workspaces = [], errors = [];
    if (!storage) return { workspaces: workspaces, errors: errors };
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      if (!key || key.indexOf("sar.operations.") !== 0) continue;
      try {
        var data = JSON.parse(storage.getItem(key));
        if (!data || !data.incident || !String(data.incident.id || "").trim()) throw new Error("missing incident id");
        workspaces.push({ key: key, data: data });
      } catch (error) { errors.push({ key: key, message: error.message }); }
    }
    workspaces.sort(function (a, b) { return String(a.data.incident.id).localeCompare(String(b.data.incident.id)); });
    return { workspaces: workspaces, errors: errors };
  }
  function normalizeHosted(raw) {
    raw = raw || {};
    return {
      incidents: (raw.incidents || []).map(function (f) {
        var a = attrs(f);
        return { id: String(a.incident_id || ""), name: a.incident_name || a.name || a.incident_id || "Unnamed incident",
          category: a.subject_category || a.category || "Not recorded", age: a.subject_age, sex: a.subject_sex,
          environment: a.ecoregion_domain || a.environment, terrain: a.terrain, season: a.season, light: a.light,
          lastSeen: dateMs(a.last_seen), status: a.status || "Not recorded", geometry: f.geometry || null,
          sources: ["hosted"], localRecords: [], localAssignments: [] };
      }).filter(function (x) { return x.id; }),
      keypoints: (raw.keypoints || []).map(function (f) { var a = attrs(f); return { incidentId: String(a.incident_id || ""), pointType: a.point_type, name: a.point_name, time: dateMs(a.point_time), geometry: f.geometry || null, source: "hosted" }; }).filter(function (x) { return x.incidentId; }),
      clues: (raw.clues || []).map(function (f) { var a = attrs(f); return { incidentId: String(a.incident_id || ""), time: dateMs(a.found_time), type: a.clue_type || "Clue", source: "hosted" }; }).filter(function (x) { return x.incidentId; }),
      tasks: (raw.tasks || []).map(function (f) { var a = attrs(f); return { incidentId: String(a.incident_id || ""), assigned: dateMs(a.assigned_time), completed: dateMs(a.completed_time), status: a.status || "Not recorded", pod: a.pod_reported, operationalPeriod: opOf(f), source: "hosted" }; }).filter(function (x) { return x.incidentId; })
    };
  }
  function mergeData(hostedRaw, workspaceRows) {
    var hosted = normalizeHosted(hostedRaw), byId = new Map(), keypoints = hosted.keypoints.slice(), clues = hosted.clues.slice(), tasks = hosted.tasks.slice();
    hosted.incidents.forEach(function (incident) {
      var prior = byId.get(incident.id);
      byId.set(incident.id, prior ? Object.assign(prior, incident, { sources: Array.from(new Set(prior.sources.concat(incident.sources))) }) : incident);
    });
    (workspaceRows || []).forEach(function (row) {
      var w = row.data || row, inc = w.incident || {}, id = String(inc.id || "").trim();
      if (!id) return;
      var current = byId.get(id) || { id: id, name: inc.name || id, category: inc.category || "Not recorded", status: inc.status || "Not recorded", lastSeen: dateMs(inc.last_seen || inc.lastSeen), geometry: inc.geometry || null, sources: [], localRecords: [], localAssignments: [] };
      current.name = inc.name || current.name || id;
      current.category = current.category === "Not recorded" && inc.category ? inc.category : current.category;
      current.status = current.status === "Not recorded" && inc.status ? inc.status : current.status;
      current.lastSeen = current.lastSeen || dateMs(inc.last_seen || inc.lastSeen);
      current.geometry = current.geometry || inc.geometry || null;
      current.sources = Array.from(new Set((current.sources || []).concat("browser")));
      current.localRecords = (current.localRecords || []).concat(w.records || []);
      current.localAssignments = (current.localAssignments || []).concat(w.assignments || []);
      byId.set(id, current);
      (w.records || []).forEach(function (r) {
        var kind = String(r.kind || "").toLowerCase(), pointType = r.attrs && (r.attrs.pointType || r.attrs.point_type);
        if (kind === "find" || String(pointType).toLowerCase() === "find") keypoints.push({ incidentId: id, pointType: "Find", name: r.attrs && r.attrs.name, time: dateMs(r.attrs && r.attrs.created), geometry: r.geometry, source: "browser" });
        if (kind === "clue") clues.push({ incidentId: id, time: dateMs(r.attrs && r.attrs.created), type: "Clue", source: "browser", operationalPeriod: opOf(r) });
      });
      (w.assignments || []).forEach(function (a) { tasks.push({ incidentId: id, assigned: dateMs(a.created || a.assigned_time), completed: dateMs(a.completed_time), status: a.status || "Not recorded", pod: a.podPercent, operationalPeriod: opOf(a), source: "browser" }); });
    });
    return { incidents: Array.from(byId.values()).sort(function (a, b) { return (b.lastSeen || 0) - (a.lastSeen || 0) || a.id.localeCompare(b.id); }), keypoints: keypoints, clues: clues, tasks: tasks };
  }
  function applyFilters(data, filter) {
    filter = filter || {};
    var start = filter.start ? Date.parse(filter.start + "T00:00:00") : null;
    var end = filter.end ? Date.parse(filter.end + "T23:59:59.999") : null;
    var incidents = data.incidents.filter(function (x) {
      return (!filter.scope || filter.scope === "all" || x.id === filter.scope) &&
        (!filter.status || filter.status === "all" || x.status === filter.status) &&
        (!filter.category || filter.category === "all" || x.category === filter.category) &&
        (!start || (x.lastSeen && x.lastSeen >= start)) && (!end || (x.lastSeen && x.lastSeen <= end));
    });
    var ids = new Set(incidents.map(function (x) { return x.id; })), op = filter.operationalPeriod;
    function keep(x) { return ids.has(x.incidentId) && (!op || op === "all" || +x.operationalPeriod === +op || x.operationalPeriod == null); }
    return { incidents: incidents, keypoints: data.keypoints.filter(keep), clues: data.clues.filter(keep), tasks: data.tasks.filter(keep) };
  }
  function locationDurations(data) {
    var seen = new Map(data.incidents.map(function (x) { return [x.id, x.lastSeen]; })), earliest = new Map();
    data.keypoints.filter(function (x) { return String(x.pointType).toLowerCase() === "find"; }).forEach(function (x) {
      if (!x.time) return; var prior = earliest.get(x.incidentId); if (!prior || x.time < prior) earliest.set(x.incidentId, x.time);
    });
    var out = [];
    earliest.forEach(function (found, id) { var start = seen.get(id), hours = start ? (found - start) / HOUR : NaN; if (Number.isFinite(hours) && hours >= 0) out.push({ incidentId: id, hours: hours }); });
    return out;
  }
  function durationBins(values) {
    var bins = [{ label: "<6h", min: 0, max: 6, count: 0 }, { label: "6–12h", min: 6, max: 12, count: 0 }, { label: "12–24h", min: 12, max: 24, count: 0 }, { label: "1–3d", min: 24, max: 72, count: 0 }, { label: ">3d", min: 72, max: Infinity, count: 0 }];
    values.forEach(function (v) { var h = typeof v === "number" ? v : v.hours; if (!Number.isFinite(h) || h < 0) return; var b = bins.find(function (x, i) { return h >= x.min && (h < x.max || i === bins.length - 1); }); if (b) b.count++; });
    return bins;
  }
  function median(values) { var a = values.filter(Number.isFinite).slice().sort(function (x, y) { return x - y; }); if (!a.length) return null; var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function timelineBucket(incidents) {
    var times = incidents.map(function (x) { return x.lastSeen; }).filter(Boolean).sort();
    var span = times.length > 1 ? (times[times.length - 1] - times[0]) / DAY : 0;
    return span <= 45 ? "day" : span <= 240 ? "week" : "month";
  }
  function bucketStart(ms, unit) {
    var d = new Date(ms); d.setUTCHours(0, 0, 0, 0);
    if (unit === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    if (unit === "month") d.setUTCDate(1);
    return d.getTime();
  }
  function timeline(incidents, unit) {
    unit = unit || timelineBucket(incidents); var counts = {};
    incidents.forEach(function (x) { var ms = dateMs(x.lastSeen); if (!ms) return; var k = bucketStart(ms, unit); counts[k] = (counts[k] || 0) + 1; });
    return Object.keys(counts).map(Number).sort().map(function (time) { return { time: time, count: counts[time], unit: unit }; });
  }
  function timelineSeries(incidents, unit) {
    var cumulative = 0;
    return timeline(incidents, unit).map(function (point) { cumulative += point.count; return { time: point.time, count: point.count, cumulative: cumulative, unit: point.unit }; });
  }
  function monthDayMatrix(incidents) {
    var days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var matrix = days.map(function (limit) { return Array.from({ length: 31 }, function (_, i) { return i < limit ? 0 : null; }); });
    var validCount = 0;
    (incidents || []).forEach(function (x) {
      var ms = dateMs(x.lastSeen); if (!ms) return;
      var d = new Date(ms), month = d.getUTCMonth(), day = d.getUTCDate();
      if (month < 0 || month > 11 || day < 1 || matrix[month][day - 1] == null) return;
      matrix[month][day - 1]++; validCount++;
    });
    return { matrix: matrix, validCount: validCount, max: Math.max.apply(null, matrix.flat().filter(function (x) { return x != null; }).concat(0)) };
  }
  function dayHourMatrix(incidents) {
    var matrix = Array.from({ length: 7 }, function () { return Array(24).fill(0); });
    incidents.forEach(function (x) { var ms = dateMs(x.lastSeen); if (!ms) return; var d = new Date(ms); matrix[d.getUTCDay()][d.getUTCHours()]++; });
    return matrix;
  }
  function haversine(a, b) {
    if (!a || !b) return null; var r = 6371, p1 = a[1] * Math.PI / 180, p2 = b[1] * Math.PI / 180, dp = (b[1] - a[1]) * Math.PI / 180, dl = (b[0] - a[0]) * Math.PI / 180;
    var q = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2; return 2 * r * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
  }
  function displacements(data) {
    var base = new Map();
    data.incidents.forEach(function (x) { var c = coords(x.geometry); if (c) base.set(x.id, c); });
    data.keypoints.filter(function (x) { return String(x.pointType).toUpperCase() === "IPP"; }).forEach(function (x) { var c = coords(x.geometry); if (c) base.set(x.incidentId, c); });
    return data.keypoints.filter(function (x) { return String(x.pointType).toLowerCase() === "find"; }).map(function (x) { return { incidentId: x.incidentId, km: haversine(base.get(x.incidentId), coords(x.geometry)) }; }).filter(function (x) { return Number.isFinite(x.km) && x.km >= 0; });
  }
  function topCounts(values, key, limit) {
    var c = {}; values.forEach(function (x) { var k = key(x) || "Not recorded"; c[k] = (c[k] || 0) + 1; });
    return Object.keys(c).map(function (k) { return [k, c[k]]; }).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); }).slice(0, limit || 5);
  }
  function summarize(data) {
    var finds = data.keypoints.filter(function (x) { return String(x.pointType).toLowerCase() === "find"; }), foundIds = new Set(finds.map(function (x) { return x.incidentId; })), durations = locationDurations(data), hours = durations.map(function (x) { return x.hours; }), displacement = displacements(data), kms = displacement.map(function (x) { return x.km; });
    return { incidentCount: data.incidents.length, locatedObservations: finds.length, locatedIncidents: foundIds.size, locatedRate: data.incidents.length ? foundIds.size / data.incidents.length : 0,
      activeCount: data.incidents.filter(function (x) { return String(x.status).toLowerCase() === "active"; }).length,
      durations: durations, medianHours: median(hours), averageHours: hours.length ? hours.reduce(function (a, b) { return a + b; }, 0) / hours.length : null, bins: durationBins(hours),
      displacements: displacement, medianKm: median(kms), averageKm: kms.length ? kms.reduce(function (a, b) { return a + b; }, 0) / kms.length : null,
      categories: topCounts(data.incidents, function (x) { return x.category; }), statuses: topCounts(data.incidents, function (x) { return x.status; }), timeline: timelineSeries(data.incidents), matrix: dayHourMatrix(data.incidents), monthDay: monthDayMatrix(data.incidents) };
  }
  async function queryAll(layer, fields, returnGeometry) {
    await layer.load(); var all = [], start = 0, pageSize = Math.min(layer.capabilities && layer.capabilities.query && layer.capabilities.query.maxRecordCount || 2000, 2000);
    while (true) {
      var q = layer.createQuery(); q.where = "1=1"; q.outFields = fields; q.returnGeometry = !!returnGeometry; q.start = start; q.num = pageSize; q.orderByFields = layer.objectIdField ? [layer.objectIdField] : [];
      var result = await layer.queryFeatures(q), features = result.features || []; all.push.apply(all, features);
      if (!result.exceededTransferLimit && features.length < pageSize) break;
      if (!features.length) break; start += features.length;
    }
    return all;
  }
  async function loadHosted(FeatureLayer, rootUrl) {
    var root = rootUrl || SERVICE_ROOT, defs = [
      ["incidents", 0, ["incident_id", "incident_name", "subject_category", "subject_age", "subject_sex", "ecoregion_domain", "terrain", "season", "light", "last_seen", "status"], true],
      ["keypoints", 1, ["incident_id", "point_type", "point_name", "point_time"], true],
      ["clues", 3, ["incident_id", "clue_type", "found_time"], false],
      ["tasks", 5, ["incident_id", "assigned_time", "completed_time", "status", "pod_reported", "notes"], false]
    ];
    var results = await Promise.all(defs.map(async function (d) { return [d[0], await queryAll(new FeatureLayer({ url: root + "/" + d[1] }), d[2], d[3])]; }));
    var out = {}; results.forEach(function (x) { out[x[0]] = x[1]; }); return out;
  }
  async function loadMergedData(options) {
    options = options || {}; var local = localWorkspaces(options.storage), hosted = {}, error = null;
    try { hosted = options.loadHosted ? await options.loadHosted() : {}; } catch (e) { error = e; }
    return { data: mergeData(hosted, local.workspaces), localErrors: local.errors, hostedError: error };
  }

  function initBrowser() {
    if (typeof document === "undefined" || !document.getElementById("analysisRoot")) return;
    var $ = function (id) { return document.getElementById(id); }, SETTINGS = window.SARSettings && window.SARSettings.load ? window.SARSettings.load() : { map: { basemap: "topo-vector", centerLon: -118.03, centerLat: 34.14, zoom: 4 }, workspace: { operationalPeriodHours: 12 } };
    require(["esri/Map", "esri/views/MapView", "esri/views/SceneView", "esri/layers/FeatureLayer", "esri/layers/TileLayer", "esri/Graphic", "esri/widgets/Home", "esri/widgets/Legend", "esri/widgets/Expand", "esri/widgets/ScaleBar", "esri/widgets/Search"], function (Map, MapView, SceneView, FeatureLayer, TileLayer, Graphic, Home, Legend, Expand, ScaleBar, Search) {
      var state = { phase: "loading", source: "browser", freshness: null, data: { incidents: [], keypoints: [], clues: [], tasks: [] }, filtered: null, summary: null, selectedId: null, mapMode: "combined", hostedError: null, localErrors: [], renderGeneration: 0, mapAppliedGeneration: 0 };
      var incidentLayer = new FeatureLayer({ title: "Incident locations", source: [], objectIdField: "OBJECTID", geometryType: "point", spatialReference: { wkid: 4326 }, fields: [{ name: "OBJECTID", type: "oid" }, { name: "incident_id", type: "string" }, { name: "name", type: "string" }, { name: "status", type: "string" }, { name: "category", type: "string" }], renderer: { type: "simple", symbol: { type: "simple-marker", style: "diamond", size: 10, color: [242, 169, 0, .9], outline: { color: [7, 24, 36, 1], width: 1.5 } } }, popupTemplate: { title: "{name}", content: "<b>{incident_id}</b><br>{status} · {category}" } });
      var findFields = [{ name: "OBJECTID", type: "oid" }, { name: "incident_id", type: "string" }, { name: "name", type: "string" }, { name: "point_time", type: "date" }];
      var heatLayer = new FeatureLayer({ title: "Located subject observations", source: [], objectIdField: "OBJECTID", geometryType: "point", spatialReference: { wkid: 4326 }, fields: findFields, renderer: { type: "heatmap", radius: 22, maxDensity: .04, minDensity: 0, colorStops: [{ ratio: 0, color: [10, 24, 35, 0] }, { ratio: .35, color: [0, 170, 220, .65] }, { ratio: .7, color: [242, 169, 0, .85] }, { ratio: 1, color: [255, 70, 60, 1] }] }, popupEnabled: false });
      var findPointLayer = new FeatureLayer({ title: "Located points", source: [], objectIdField: "OBJECTID", geometryType: "point", spatialReference: { wkid: 4326 }, fields: findFields, renderer: { type: "simple", symbol: { type: "simple-marker", size: 7, color: [0, 190, 230, .8], outline: { color: [255, 255, 255, .9], width: 1 } } }, popupTemplate: { title: "Located subject", content: "Incident {incident_id}<br>{name}" } });
      var usgsTopo = new TileLayer({ title: "USGS Topo", url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer" });
      var map = new Map({ basemap: SETTINGS.map.basemap || "dark-gray-vector", layers: [usgsTopo, heatLayer, incidentLayer, findPointLayer] });
      var view = new MapView({ container: "viewDiv", map: map, center: [SETTINGS.map.centerLon || -98, SETTINGS.map.centerLat || 39], zoom: Math.min(SETTINGS.map.zoom || 4, 6) });
      window.__esriView = view; window.__esriMap = map; window.__esriLayers = { "USGS Topo": usgsTopo, "Incident locations": incidentLayer, "Located subject observations": heatLayer, "Located points": findPointLayer };
      window.__app = window.__app || {}; window.__app.analysisTerrain3D = window.SARTerrain3D.init({ map: map, view: view, SceneView: SceneView, Legend: Legend, Expand: Expand });
      view.ui.add(new Home({ view: view }), "top-left"); view.ui.add(new Search({ view: view }), "top-right"); view.ui.add(new ScaleBar({ view: view, unit: "dual" }), "bottom-left"); view.ui.add(new Expand({ view: view, content: window.SARMapLegend.create({ map: map, view: view, Legend: Legend }), expandTooltip: "Legend", group: "analysis" }), "top-left");
      if (window.SARBookmarks) window.__analysisBookmarks = window.SARBookmarks.init({ view: view, Bookmarks: null, Bookmark: null, Expand: Expand, group: "analysis", position: "top-left", storageKey: "sar.bookmarks.analysis.v1" });

      function setPhase(phase, message) { state.phase = phase; $("analysisRoot").setAttribute("aria-busy", phase === "loading" ? "true" : "false"); $("analysisState").className = "analysis-state " + phase; $("analysisState").textContent = message || ""; $("analysisState").hidden = !message; }
      function unique(field) { return Array.from(new Set(state.data.incidents.map(function (x) { return x[field]; }).filter(Boolean))).sort(); }
      function option(value, label) { return '<option value="' + escapeHtml(value) + '">' + escapeHtml(label == null ? value : label) + "</option>"; }
      function populateFilters() {
        var scope = $("scopeFilter").value || "all";
        $("scopeFilter").innerHTML = option("all", "All incidents") + state.data.incidents.map(function (x) { return option(x.id, x.id + " — " + x.name); }).join("");
        $("scopeFilter").value = state.data.incidents.some(function (x) { return x.id === scope; }) ? scope : "all";
        $("statusFilter").innerHTML = option("all", "All statuses") + unique("status").map(function (x) { return option(x); }).join("");
        $("categoryFilter").innerHTML = option("all", "All categories") + unique("category").map(function (x) { return option(x); }).join("");
        var periods = new Set(); state.data.incidents.forEach(function (x) { (x.localRecords || []).forEach(function (r) { periods.add(opOf(r)); }); (x.localAssignments || []).forEach(function (a) { periods.add(opOf(a)); }); });
        $("periodFilter").innerHTML = option("all", "All operational periods") + Array.from(periods).sort(function (a, b) { return a - b; }).map(function (p) { return option(p, "OP " + p + " · " + (SETTINGS.workspace.operationalPeriodHours || 12) + " hours"); }).join("");
      }
      function filterValue() { return { scope: $("scopeFilter").value, start: $("startDate").value, end: $("endDate").value, status: $("statusFilter").value, category: $("categoryFilter").value, operationalPeriod: $("periodFilter").value }; }
      function fmtDate(ms) { return ms ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(ms) : "Not recorded"; }
      function fmtHours(h) { if (h == null) return "—"; return h < 24 ? h.toFixed(1) + " h" : (h / 24).toFixed(1) + " d"; }
      function barChart(rows, unit) { var max = Math.max.apply(null, rows.map(function (x) { return x[1]; }).concat(1)); return '<div class="bar-chart">' + rows.map(function (x) { return '<div class="bar-row" title="' + escapeHtml(x[0] + ": " + x[1] + " " + unit) + '"><span>' + escapeHtml(x[0]) + '</span><i style="--bar:' + (100 * x[1] / max) + '%"></i><b>' + x[1] + "</b></div>"; }).join("") + "</div>"; }
      function renderHeatMatrix(matrix) {
        var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], max = Math.max.apply(null, matrix.flat().concat(1));
        var cells = '<span></span>' + Array.from({ length: 24 }, function (_, h) { return '<b class="heat-hour">' + (h % 3 === 0 ? h : "") + "</b>"; }).join("");
        matrix.forEach(function (row, d) { cells += '<b class="heat-day">' + days[d] + "</b>" + row.map(function (n, h) { return '<span class="heat-cell" tabindex="0" aria-label="' + days[d] + " " + h + ':00: ' + n + ' incidents" title="' + days[d] + " " + h + ':00 — ' + n + ' incidents" style="--heat:' + (n / max) + '">' + (n || "") + "</span>"; }).join(""); });
        var table = '<details><summary>Accessible day/hour counts</summary><table class="analysis-table"><thead><tr><th>Day</th><th>Hour (UTC)</th><th>Incidents</th></tr></thead><tbody>' + matrix.flatMap(function (row, d) { return row.map(function (n, h) { return n ? "<tr><td>" + days[d] + "</td><td>" + h + ":00</td><td>" + n + "</td></tr>" : ""; }); }).join("") + "</tbody></table></details>";
        return '<div class="heat-matrix" role="img" aria-label="Last-seen incidents by UTC weekday and hour">' + cells + "</div>" + table;
      }
      function comboChart(series) {
        if (!series.length) return '<p class="empty-copy">No valid last-seen timestamps in this filter.</p>';
        var W = 720, H = 170, left = 42, right = 46, top = 12, bottom = 35, pw = W - left - right, ph = H - top - bottom;
        var maxVolume = Math.max.apply(null, series.map(function (x) { return x.count; }).concat(1)), maxCumulative = series[series.length - 1].cumulative || 1, slot = pw / series.length, barWidth = Math.max(2, Math.min(28, slot * .62));
        var dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: series[0].unit === "month" ? undefined : "numeric", year: series[0].unit === "month" ? "2-digit" : undefined, timeZone: "UTC" });
        var grid = Array.from({ length: 5 }, function (_, i) { var y = top + ph * i / 4, volume = Math.round(maxVolume * (4 - i) / 4), cumulative = Math.round(maxCumulative * (4 - i) / 4); return '<line class="grid" x1="' + left + '" y1="' + y + '" x2="' + (W - right) + '" y2="' + y + '"></line><text x="' + (left - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + volume + '</text><text x="' + (W - right + 6) + '" y="' + (y + 3) + '">' + cumulative + "</text>"; }).join("");
        var bars = series.map(function (x, i) { var height = ph * x.count / maxVolume, cx = left + slot * (i + .5), label = dateFormat.format(x.time) + ": " + x.count + " incidents in bucket; " + x.cumulative + " cumulative incidents"; return '<rect class="volume-bar" tabindex="0" role="img" aria-label="' + escapeHtml(label) + '" x="' + (cx - barWidth / 2) + '" y="' + (top + ph - height) + '" width="' + barWidth + '" height="' + height + '"><title>' + escapeHtml(label) + "</title></rect>"; }).join("");
        var points = series.map(function (x, i) { return [left + slot * (i + .5), top + ph * (1 - x.cumulative / maxCumulative), x]; }), path = points.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
        var line = '<path class="trend-line" d="' + path + '"></path>' + points.map(function (p) { var label = dateFormat.format(p[2].time) + ": " + p[2].cumulative + " cumulative incidents"; return '<circle class="trend-point" tabindex="0" role="img" aria-label="' + escapeHtml(label) + '" cx="' + p[0] + '" cy="' + p[1] + '" r="3"><title>' + escapeHtml(label) + "</title></circle>"; }).join("");
        var every = Math.max(1, Math.ceil(series.length / 7)), labels = series.map(function (x, i) { if (i % every && i !== series.length - 1) return ""; var cx = left + slot * (i + .5); return '<text class="axis-label" x="' + cx + '" y="' + (H - 16) + '" text-anchor="middle">' + escapeHtml(dateFormat.format(x.time)) + "</text>"; }).join("");
        var rows = series.map(function (x) { return '<tr><td>' + escapeHtml(dateFormat.format(x.time)) + "</td><td>" + x.count + "</td><td>" + x.cumulative + "</td></tr>"; }).join("");
        return '<div class="chart-legend" aria-hidden="true"><span class="legend-key"><i class="legend-swatch"></i>Incident volume (incidents/bucket)</span><span class="legend-key"><i class="legend-swatch line"></i>Cumulative incidents</span><span>Bucket: ' + escapeHtml(series[0].unit) + ' · UTC</span></div><div class="combo-chart-wrap"><svg class="combo-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-labelledby="comboSvgTitle comboSvgDesc"><title id="comboSvgTitle">Incident volume and cumulative timeline</title><desc id="comboSvgDesc">Bars show filtered incidents per adaptive UTC ' + escapeHtml(series[0].unit) + ' bucket. The purple line shows the cumulative filtered incident count.</desc>' + grid + '<line class="axis" x1="' + left + '" y1="' + (top + ph) + '" x2="' + (W - right) + '" y2="' + (top + ph) + '"></line>' + bars + line + labels + '<text class="axis-label" x="4" y="9">Incidents/bucket</text><text class="axis-label" x="' + (W - 4) + '" y="9" text-anchor="end">Cumulative incidents</text></svg></div><details><summary>Accessible timeline data</summary><table class="analysis-table"><thead><tr><th>UTC bucket</th><th>Incident volume</th><th>Cumulative incidents</th></tr></thead><tbody>' + rows + "</tbody></table></details>";
      }
      function monthDayChart(result) {
        if (!result.validCount) return '<p class="empty-copy">No valid last-seen timestamps in this filter.</p>';
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], max = result.max || 1;
        var header = '<span></span>' + Array.from({ length: 31 }, function (_, i) { return '<b class="month-day-number">' + (i + 1) + "</b>"; }).join("");
        var rows = "", tableRows = "";
        result.matrix.forEach(function (row, m) {
          rows += '<b class="month-day-label">' + months[m] + "</b>" + row.map(function (count, day) {
            if (count == null) return '<span class="month-day-cell unavailable" aria-hidden="true" title="' + months[m] + " " + (day + 1) + ': unavailable calendar date"></span>';
            var level = count ? Math.max(1, Math.ceil(count / max * 5)) : 0, label = months[m] + " " + (day + 1) + ": " + count + " incident last-seen" + (count === 1 ? "" : "s") + " (UTC)";
            if (count) tableRows += "<tr><td>" + months[m] + "</td><td>" + (day + 1) + "</td><td>" + count + "</td></tr>";
            return '<span class="month-day-cell ' + (level ? "purple-" + level : "zero") + '" tabindex="0" role="img" aria-label="' + escapeHtml(label) + '" title="' + escapeHtml(label) + '"></span>';
          }).join("");
        });
        return '<div class="month-day-scroll"><div class="month-day-grid" role="img" aria-label="Filtered incident last-seen count by UTC month and day">' + header + rows + '</div></div><div class="heat-legend" aria-label="Heatmap legend, minimum zero, maximum ' + max + '"><span>0</span><span class="heat-ramp" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span><span>Max ' + max + '</span><span>incidents/day</span></div><details><summary>Accessible nonzero month/day counts</summary><table class="analysis-table"><thead><tr><th>Month (UTC)</th><th>Day</th><th>Incident last-seen count</th></tr></thead><tbody>' + tableRows + "</tbody></table></details>";
      }
      function setAnalyticsLoading() {
        ["timelineChart", "dayHourChart", "durationChart", "spatialSummary", "operationalSummary", "comboChart", "monthDayChart"].forEach(function (id) { $(id).innerHTML = '<p class="empty-copy">Loading filtered analytics…</p>'; });
      }
      function operationalSummary() {
        var incidents = state.filtered.incidents, records = incidents.flatMap(function (x) { return x.localRecords || []; }), assignments = incidents.flatMap(function (x) { return x.localAssignments || []; }), op = $("periodFilter").value;
        if (op !== "all") { records = records.filter(function (x) { return opOf(x) === +op; }); assignments = assignments.filter(function (x) { return opOf(x) === +op; }); }
        var featureRows = topCounts(records, function (x) { return x.kind; }, 6), assignmentRows = topCounts(assignments, function (x) { return x.status; }, 6);
        $("operationalSummary").innerHTML = '<div class="mini-kpis"><span><b>' + records.length + '</b> local features</span><span><b>' + assignments.length + '</b> local assignments</span><span><b>' + records.filter(function (x) { return x.kind === "clue"; }).length + '</b> local clues</span></div>' + (featureRows.length ? barChart(featureRows, "features") : '<p class="empty-copy">No browser-local operational records for this filter.</p>') + (assignmentRows.length ? '<h4>Assignment status</h4>' + barChart(assignmentRows, "assignments") : "");
      }
      function renderAnalytics() {
        var s = state.summary, one = state.filtered.incidents.length === 1 ? state.filtered.incidents[0] : null;
        $("metricIncidents").textContent = s.incidentCount.toLocaleString(); $("metricLocated").textContent = s.locatedIncidents.toLocaleString(); $("metricRate").textContent = (s.locatedRate * 100).toFixed(0) + "%"; $("metricDuration").textContent = fmtHours(s.medianHours); $("metricActive").textContent = s.activeCount.toLocaleString();
        $("kpiContext").textContent = one ? one.id + " · " + one.name : s.incidentCount + " filtered incidents";
        var timelineRows = s.timeline.map(function (x) { return [new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(x.time), x.count]; });
        $("timelineChart").innerHTML = timelineRows.length ? barChart(timelineRows, "incidents") + '<p class="chart-note">Bucket: ' + escapeHtml(s.timeline[0].unit) + '. Last-seen dates, UTC.</p>' : '<p class="empty-copy">No dated incidents in this filter.</p>';
        $("dayHourChart").innerHTML = s.incidentCount ? renderHeatMatrix(s.matrix) : '<p class="empty-copy">No last-seen timestamps in this filter.</p>';
        $("durationChart").innerHTML = s.durations.length ? '<div class="metric-line"><b>Median ' + fmtHours(s.medianHours) + '</b><span>Average ' + fmtHours(s.averageHours) + '</span></div>' + barChart(s.bins.map(function (x) { return [x.label, x.count]; }), "incidents") + '<p class="chart-note">n=' + s.durations.length + ' incidents with a non-negative last-seen → earliest Find interval. Invalid or negative intervals excluded.</p>' : '<p class="empty-copy">No valid last-seen to Find intervals.</p>';
        $("spatialSummary").innerHTML = '<div class="metric-line"><b>Median ' + (s.medianKm == null ? "—" : s.medianKm.toFixed(2) + " km") + '</b><span>Average ' + (s.averageKm == null ? "—" : s.averageKm.toFixed(2) + " km") + '</span></div><p class="chart-note">Straight-line displacement from Incident/IPP to each Find; n=' + s.displacements.length + ' located observations. Incidents and observations are distinct counts.</p><h4>Top subject categories</h4>' + (s.categories.length ? barChart(s.categories, "incidents") : '<p class="empty-copy">No categories.</p>') + '<h4>Incident statuses</h4>' + (s.statuses.length ? barChart(s.statuses, "incidents") : '<p class="empty-copy">No statuses.</p>');
        $("comboChart").innerHTML = comboChart(s.timeline);
        $("monthDayChart").innerHTML = monthDayChart(s.monthDay);
        operationalSummary();
      }
      function renderList() {
        var q = $("incidentSearch").value.trim().toLowerCase(), all = state.filtered.incidents.filter(function (x) { return !q || (x.id + " " + x.name + " " + x.status + " " + x.category).toLowerCase().includes(q); }), shown = all.slice(0, 200);
        $("incidentCount").textContent = all.length.toLocaleString() + " visible" + (all.length > 200 ? " · first 200 rendered" : "");
        $("incidentList").innerHTML = shown.length ? shown.map(function (x) { return '<button class="incident-row' + (state.selectedId === x.id ? " selected" : "") + '" data-id="' + escapeHtml(x.id) + '" aria-pressed="' + (state.selectedId === x.id) + '"><strong>' + escapeHtml(x.id) + " · " + escapeHtml(x.name) + '</strong><span>' + escapeHtml(x.status) + " · " + escapeHtml(x.category) + " · " + escapeHtml(fmtDate(x.lastSeen)) + "</span></button>"; }).join("") : '<p class="empty-copy">No incidents match the active filters and search.</p>';
        $("incidentList").querySelectorAll("[data-id]").forEach(function (button) { button.onclick = function () { controller.selectIncident(button.dataset.id); }; });
      }
      async function replaceSource(layer, graphics) { var old = await layer.queryObjectIds({ where: "1=1" }); await layer.applyEdits({ deleteFeatures: (old || []).map(function (id) { return { objectId: id }; }), addFeatures: graphics }); }
      function applyMapMode() {
        var incidents = state.mapMode !== "heat", located = state.mapMode !== "incidents";
        incidentLayer.visible = incidents; heatLayer.visible = located; findPointLayer.visible = located;
      }
      var refreshTimer, mapRefreshQueue = Promise.resolve();
      function refreshMap(generation) {
        clearTimeout(refreshTimer); refreshTimer = setTimeout(function () {
          var filtered = state.filtered, selectedId = state.selectedId;
          mapRefreshQueue = mapRefreshQueue.then(async function () {
            if (generation !== state.renderGeneration) return;
            var incGraphics = filtered.incidents.map(function (x, i) { return new Graphic({ geometry: x.geometry, attributes: { OBJECTID: i + 1, incident_id: x.id, name: x.name, status: x.status, category: x.category } }); }).filter(function (g) { return !!g.geometry; });
            var finds = filtered.keypoints.filter(function (x) { return String(x.pointType).toLowerCase() === "find" && x.geometry; }), findGraphics = finds.map(function (x, i) { return new Graphic({ geometry: x.geometry, attributes: { OBJECTID: i + 1, incident_id: x.incidentId, name: x.name || "Subject located", point_time: x.time } }); });
            try { await Promise.all([replaceSource(incidentLayer, incGraphics), replaceSource(heatLayer, findGraphics), replaceSource(findPointLayer, findGraphics)]); } catch (error) { console.error("Map source refresh failed", error); }
            if (generation !== state.renderGeneration) return;
            state.mapAppliedGeneration = generation; applyMapMode();
            var graphics = incGraphics.concat(findGraphics); if (graphics.length && !selectedId) view.goTo(graphics, { padding: 60 }).catch(function () {});
          });
        }, 100);
      }
      function apply() {
        var generation = ++state.renderGeneration;
        setPhase("loading", "Applying filters…"); setAnalyticsLoading();
        setTimeout(function () {
          if (generation !== state.renderGeneration) return;
          state.filtered = applyFilters(state.data, filterValue()); state.summary = summarize(state.filtered); state.selectedId = $("scopeFilter").value === "all" ? null : $("scopeFilter").value;
          renderList(); renderAnalytics(); refreshMap(generation);
          if (!state.filtered.incidents.length) setPhase("empty", "No incidents match the active filters. Reset filters or broaden the date range."); else setPhase("ready", "");
        }, 0);
      }
      function reset() { $("scopeFilter").value = "all"; $("startDate").value = ""; $("endDate").value = ""; $("statusFilter").value = "all"; $("categoryFilter").value = "all"; $("periodFilter").value = "all"; $("incidentSearch").value = ""; apply(); }
      async function reload() {
        var reloadToken = ++state.renderGeneration;
        setPhase("loading", "Loading browser workspaces and hosted ArcGIS records…"); setAnalyticsLoading(); $("reloadData").disabled = true;
        var params = new URLSearchParams(location.search), hostedMode = params.get("hosted"), skipHosted = hostedMode === "off", delay = Math.min(3000, Math.max(0, +(params.get("delay") || 0)));
        if (delay) await new Promise(function (resolve) { setTimeout(resolve, delay); });
        var hostedLoader = skipHosted ? null : hostedMode === "error" ? function () { return Promise.reject(new Error("Hosted query unavailable")); } : function () { return loadHosted(FeatureLayer, SERVICE_ROOT); };
        var loaded = await loadMergedData({ storage: localStorage, loadHosted: hostedLoader });
        if (reloadToken !== state.renderGeneration) return;
        state.data = loaded.data; state.hostedError = loaded.hostedError; state.localErrors = loaded.localErrors; state.freshness = Date.now(); state.source = loaded.hostedError || skipHosted ? "Browser workspaces" : "Browser + hosted ArcGIS";
        $("sourceStatus").innerHTML = '<strong>' + escapeHtml(state.source) + '</strong><span>Updated ' + escapeHtml(fmtDate(state.freshness)) + (state.hostedError ? " · Hosted query unavailable; browser-only fallback active." : "") + (loaded.localErrors.length ? " · " + loaded.localErrors.length + " malformed local workspace(s) skipped." : "") + "</span>";
        populateFilters(); $("reloadData").disabled = false;
        if (!state.data.incidents.length) { state.filtered = state.data; state.summary = summarize(state.data); renderList(); renderAnalytics(); refreshMap(reloadToken); setPhase(loaded.hostedError ? "error" : "empty", loaded.hostedError ? "Hosted ArcGIS data is unavailable and no valid browser workspaces were found." : "No incidents are available in the selected sources."); } else apply();
      }
      function selectIncident(id) {
        var incident = state.data.incidents.find(function (x) { return x.id === id; }); if (!incident) return;
        $("scopeFilter").value = id; state.selectedId = id; apply();
        if (incident.geometry) view.goTo({ target: incident.geometry, zoom: 13 }, { duration: 500 }).then(function () { view.openPopup({ features: [], location: incident.geometry, title: incident.name, content: incident.id + " · " + incident.status }); }).catch(function () {});
      }
      var searchTimer; $("incidentSearch").oninput = function () { clearTimeout(searchTimer); searchTimer = setTimeout(renderList, 180); };
      $("applyFilters").onclick = apply; $("resetFilters").onclick = reset; $("reloadData").onclick = reload;
      document.querySelectorAll('[name="mapMode"]').forEach(function (radio) { radio.onchange = function () { if (radio.checked) { state.mapMode = radio.value; applyMapMode(); } }; });
      view.on("click", async function (event) { var hit = await view.hitTest(event, { include: [incidentLayer, findPointLayer] }), graphic = hit.results.map(function (x) { return x.graphic; }).find(function (g) { return g && g.attributes && g.attributes.incident_id; }); if (graphic) selectIncident(graphic.attributes.incident_id); });
      function incidentFeatures() {
        return ((state.filtered && state.filtered.incidents) || []).filter(function (incident) { return !!incident.geometry; }).map(function (incident) { return { geometry: incident.geometry, properties: { incident_id: incident.id, name: incident.name, status: incident.status, category: incident.category, last_seen: incident.lastSeen ? new Date(incident.lastSeen).toISOString() : "", source: (incident.sources || []).join(" + ") } }; });
      }
      function installDataExports() {
        var attach = window.SARDataExport && window.SARDataExport.attach; if (!attach) return;
        var host = function (id) { var node = $(id); return node && (node.closest(".panel-section,.analysis-card,.incident-panel") || node.parentElement); };
        var commonFeatures = function () { return incidentFeatures(); };
        attach({ host: host("incidentList"), label: "Filtered incident list", filename: "sar_incidents", getData: function () { var term = $("incidentSearch").value.trim().toLowerCase(), incidents = ((state.filtered && state.filtered.incidents) || []).filter(function (x) { return !term || (x.id + " " + x.name).toLowerCase().includes(term); }), ids = new Set(incidents.map(function (x) { return x.id; })), rows = incidents.map(function (x) { return { incident_id: x.id, name: x.name, status: x.status, category: x.category, last_seen: x.lastSeen ? new Date(x.lastSeen).toISOString() : "", source: (x.sources || []).join(" + ") }; }); return { rows: rows, features: commonFeatures().filter(function (x) { return ids.has(x.properties.incident_id); }) }; } });
        attach({ host: host("timelineChart"), label: "Incident timeline", filename: "sar_incident_timeline", getData: function () { var series = state.summary && state.summary.timeline || []; return { rows: series.map(function (x) { return { utc_bucket: new Date(x.time).toISOString(), incident_count: x.count, cumulative_count: x.cumulative, bucket_unit: x.unit }; }), features: commonFeatures() }; } });
        attach({ host: host("dayHourChart"), label: "Last seen by weekday and hour", filename: "sar_weekday_hour", getData: function () { var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], matrix = state.summary && state.summary.matrix || []; return { rows: matrix.flatMap(function (row, day) { return row.map(function (count, hour) { return { weekday_utc: days[day], hour_utc: hour, incident_count: count }; }); }), features: commonFeatures() }; } });
        attach({ host: host("durationChart"), label: "Time until subject located", filename: "sar_time_to_locate", getData: function () { var s = state.summary || {}; return { rows: (s.bins || []).map(function (x) { return { duration_bin: x.label, incident_count: x.count, median_hours: s.medianHours, average_hours: s.averageHours }; }), features: commonFeatures() }; } });
        attach({ host: host("spatialSummary"), label: "Spatial displacement summary", filename: "sar_spatial_displacement", getData: function () { var s = state.summary || {}, rows = (s.displacements || []).map(function (x) { return { incident_id: x.incidentId, displacement_km: x.km, median_km: s.medianKm, average_km: s.averageKm }; }), finds = ((state.filtered && state.filtered.keypoints) || []).filter(function (x) { return String(x.pointType).toLowerCase() === "find" && x.geometry; }).map(function (x) { return { geometry: x.geometry, properties: { incident_id: x.incidentId, name: x.name, point_time: x.time ? new Date(x.time).toISOString() : "", point_type: x.pointType } }; }); return { rows: rows, features: finds.length ? finds : commonFeatures() }; } });
        attach({ host: host("operationalSummary"), label: "Operational summary", filename: "sar_operational_summary", getData: function () { var incidents = state.filtered && state.filtered.incidents || [], records = incidents.flatMap(function (x) { return x.localRecords || []; }), assignments = incidents.flatMap(function (x) { return x.localAssignments || []; }), rows = records.map(function (x) { return Object.assign({ record_group: "feature" }, x.attrs || {}, { kind: x.kind }); }).concat(assignments.map(function (x) { return Object.assign({ record_group: "assignment" }, x); })), features = records.filter(function (x) { return !!x.geometry; }).map(function (x) { return { geometry: x.geometry, properties: Object.assign({ kind: x.kind }, x.attrs || {}) }; }); return { rows: rows, features: features }; } });
        attach({ host: host("comboChart"), label: "Incident volume and cumulative timeline", filename: "sar_incident_volume", getData: function () { var series = state.summary && state.summary.timeline || []; return { rows: series.map(function (x) { return { utc_bucket: new Date(x.time).toISOString(), incident_volume: x.count, cumulative_incidents: x.cumulative, bucket_unit: x.unit }; }), features: commonFeatures() }; } });
        attach({ host: host("monthDayChart"), label: "Incident month and day matrix", filename: "sar_month_day", getData: function () { var result = state.summary && state.summary.monthDay || { matrix: [] }, months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return { rows: (result.matrix || []).flatMap(function (row, month) { return row.map(function (count, day) { return count == null ? null : { month_utc: months[month], day_utc: day + 1, incident_count: count }; }).filter(Boolean); }), features: commonFeatures() }; } });
      }
      var controller = { state: state, apply: apply, reset: reset, reload: reload, selectIncident: selectIncident, setMapMode: function (mode) { var radio = document.querySelector('[name="mapMode"][value="' + mode + '"]'); if (radio) { radio.checked = true; radio.onchange(); } }, mergeData: mergeData, applyFilters: applyFilters, summarize: summarize };
      window.__app = window.__app || {}; window.__app.analysis = controller; installDataExports();
      reload().catch(function (error) { console.error(error); $("reloadData").disabled = false; setPhase("error", "Analysis failed to load: " + error.message); });
    });
  }
  if (typeof window !== "undefined") window.addEventListener("DOMContentLoaded", initBrowser);
  return { SERVICE_ROOT: SERVICE_ROOT, escapeHtml: escapeHtml, dateMs: dateMs, localWorkspaces: localWorkspaces, normalizeHosted: normalizeHosted, mergeData: mergeData, applyFilters: applyFilters, locationDurations: locationDurations, durationBins: durationBins, timelineBucket: timelineBucket, timeline: timeline, timelineSeries: timelineSeries, monthDayMatrix: monthDayMatrix, dayHourMatrix: dayHourMatrix, haversine: haversine, displacements: displacements, summarize: summarize, queryAll: queryAll, loadHosted: loadHosted, loadMergedData: loadMergedData };
});
