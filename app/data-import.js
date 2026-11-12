(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SARDataImport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DB_NAME = "sar-reference-data-v1", STORE = "datasets", VERSION = 1;
  function key(value) { return String(value == null ? "" : value).trim().toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function valueOf(row, aliases) {
    var index = {};
    Object.keys(row || {}).forEach(function (name) { index[key(name)] = row[name]; });
    for (var i = 0; i < aliases.length; i++) if (index[key(aliases[i])] != null && String(index[key(aliases[i])]).trim() !== "") return index[key(aliases[i])];
    return null;
  }
  function parseCsv(text) {
    text = String(text || "").replace(/^\uFEFF/, "");
    var rows = [], row = [], field = "", quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = "";
        if (row.some(function (v) { return v !== ""; })) rows.push(row);
        row = [];
      } else field += c;
    }
    if (field || row.length) { row.push(field); if (row.some(function (v) { return v !== ""; })) rows.push(row); }
    if (!rows.length) return [];
    var headers = rows.shift().map(function (name, i) { return String(name || "field_" + (i + 1)).trim(); });
    return rows.map(function (values) { var out = {}; headers.forEach(function (name, i) { out[name] = values[i] == null ? "" : values[i]; }); return out; });
  }
  function pointCoordinates(geometry, row) {
    if (geometry && geometry.type === "Point" && Array.isArray(geometry.coordinates)) return geometry.coordinates.slice(0, 2).map(Number);
    var x = Number(valueOf(row, ["x", "longitude", "lon", "long", "lng"])), y = Number(valueOf(row, ["y", "latitude", "lat"]));
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  }
  function dateValue(value) { var n = value == null ? NaN : Date.parse(String(value)); return Number.isFinite(n) ? n : null; }
  function normalizeRecord(row, geometry, index, datasetName) {
    var xy = pointCoordinates(geometry, row);
    if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1]) || xy[0] < -180 || xy[0] > 180 || xy[1] < -90 || xy[1] > 90) return null;
    var rawId = valueOf(row, ["GlobalID", "Incident_UUID", "incident_id", "Incident Number", "ObjectID", "id"]);
    var id = String(rawId == null ? datasetName + "-" + (index + 1) : rawId).trim();
    var incidentNumber = valueOf(row, ["Incident Number", "incident_name", "name", "title"]);
    return {
      id: id,
      name: String(incidentNumber || id),
      category: String(valueOf(row, ["Subject Category", "subject_category", "category"]) || "Not recorded"),
      status: String(valueOf(row, ["Type of Incident", "status", "incident_type"]) || "Not recorded"),
      lastSeen: dateValue(valueOf(row, ["Incident Start Date and Time", "last_seen", "lastSeen", "date", "datetime"])),
      age: valueOf(row, ["Subject 1: Age", "subject_age", "age"]),
      sex: valueOf(row, ["Subject 1: Gender", "subject_sex", "gender", "sex"]),
      environment: valueOf(row, ["Area Type", "ecoregion_domain", "environment"]),
      terrain: valueOf(row, ["Land Ownership", "terrain"]),
      geometry: { type: "point", longitude: xy[0], latitude: xy[1], spatialReference: { wkid: 4326 } },
      sources: ["imported"], sourceDataset: datasetName, localRecords: [], localAssignments: []
    };
  }
  function flattenFeatureCollections(value) {
    if (Array.isArray(value)) return value.reduce(function (all, item) { return all.concat(flattenFeatureCollections(item)); }, []);
    if (value && value.type === "FeatureCollection") return value.features || [];
    if (value && value.type === "Feature") return [value];
    return [];
  }
  function normalizeRows(rows, datasetName) {
    var incidents = [], skipped = 0;
    rows.forEach(function (row, i) { var incident = normalizeRecord(row, null, i, datasetName); if (incident) incidents.push(incident); else skipped++; });
    return { incidents: incidents, skipped: skipped, total: rows.length };
  }
  function normalizeFeatures(features, datasetName) {
    var incidents = [], skipped = 0, index = 0;
    flattenFeatureCollections(features).forEach(function (feature) {
      var geometry = feature && feature.geometry, properties = feature && feature.properties || {};
      if (geometry && geometry.type === "MultiPoint") {
        (geometry.coordinates || []).forEach(function (coordinates) { var incident = normalizeRecord(properties, { type: "Point", coordinates: coordinates }, index++, datasetName); if (incident) incidents.push(incident); else skipped++; });
      } else { var incident = normalizeRecord(properties, geometry, index++, datasetName); if (incident) incidents.push(incident); else skipped++; }
    });
    return { incidents: incidents, skipped: skipped, total: index };
  }
  function openDb() {
    if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = function () { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" }); };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Could not open imported-data storage.")); };
    });
  }
  async function transaction(mode, action) {
    var db = await openDb();
    try { return await new Promise(function (resolve, reject) { var tx = db.transaction(STORE, mode), store = tx.objectStore(STORE), result; try { result = action(store); } catch (error) { reject(error); return; } tx.oncomplete = function () { resolve(result && result.result !== undefined ? result.result : result); }; tx.onerror = function () { reject(tx.error || new Error("Imported-data storage failed.")); }; tx.onabort = tx.onerror; }); }
    finally { db.close(); }
  }
  function datasetId(name) { return key(name).slice(0, 48) + "-" + Date.now().toString(36); }
  async function saveDataset(name, type, normalized) {
    if (!normalized.incidents.length) throw new Error("No valid WGS84 point records were found. CSV files need longitude/x and latitude/y columns; zipped shapefiles need point geometry and a .prj definition when not WGS84.");
    var dataset = { id: datasetId(name), name: name, type: type, importedAt: Date.now(), count: normalized.incidents.length, skipped: normalized.skipped, incidents: normalized.incidents };
    await transaction("readwrite", function (store) { return store.put(dataset); });
    return { id: dataset.id, name: dataset.name, type: type, count: dataset.count, skipped: dataset.skipped, importedAt: dataset.importedAt };
  }
  async function importFile(file, options) {
    options = options || {}; if (!file) throw new Error("Choose a file first.");
    var name = file.name || "Imported dataset", ext = name.split(".").pop().toLowerCase(), normalized;
    if (ext === "csv") normalized = normalizeRows(parseCsv(await file.text()), name);
    else if (ext === "zip") {
      var parseShapefile = options.shp || (typeof globalThis !== "undefined" && globalThis.shp);
      if (typeof parseShapefile !== "function") throw new Error("The zipped-shapefile parser is unavailable.");
      normalized = normalizeFeatures(await parseShapefile(await file.arrayBuffer()), name);
    } else if (ext === "geojson" || ext === "json") normalized = normalizeFeatures(JSON.parse(await file.text()), name);
    else throw new Error("Supported reference-data formats are CSV, zipped shapefile, and GeoJSON.");
    return saveDataset(name, ext === "zip" ? "shapefile" : ext, normalized);
  }
  async function listDatasets() { var rows = await transaction("readonly", function (store) { return store.getAll(); }); return (rows || []).map(function (d) { return { id: d.id, name: d.name, type: d.type, importedAt: d.importedAt, count: d.count, skipped: d.skipped }; }).sort(function (a, b) { return b.importedAt - a.importedAt; }); }
  async function removeDataset(id) { await transaction("readwrite", function (store) { return store.delete(id); }); }
  async function loadAnalysisIncidents() { var rows = await transaction("readonly", function (store) { return store.getAll(); }); return (rows || []).reduce(function (all, d) { return all.concat(d.incidents || []); }, []); }
  return { DB_NAME: DB_NAME, parseCsv: parseCsv, normalizeRows: normalizeRows, normalizeFeatures: normalizeFeatures, importFile: importFile, listDatasets: listDatasets, removeDataset: removeDataset, loadAnalysisIncidents: loadAnalysisIncidents };
});
