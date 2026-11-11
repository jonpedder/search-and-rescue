(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SARDataExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function addStyles() {
    if (typeof document === "undefined" || document.getElementById("sarDataExportStyles")) return;
    var style = document.createElement("style");
    style.id = "sarDataExportStyles";
    style.textContent = ".sar-export-host{position:relative!important}.sar-export-button{position:absolute;right:5px;top:5px;z-index:6;width:27px;height:27px;display:grid;place-items:center;border:1px solid var(--app-border,#28495b);border-radius:3px;background:var(--app-panel-2,#123247);color:var(--app-accent,#f2a900);cursor:pointer}.sar-export-button:hover,.sar-export-button[aria-expanded=true]{border-color:var(--app-accent,#f2a900);background:var(--app-panel-3,#173d55)}.sar-export-button:focus-visible{outline:2px solid var(--calcite-color-focus,#8bd3ff);outline-offset:2px}.sar-export-menu{position:absolute;right:5px;top:35px;z-index:20;display:none;min-width:126px;padding:4px;background:var(--app-panel,#0c2231);border:1px solid var(--app-border,#28495b);border-radius:3px;box-shadow:0 5px 16px #0009}.sar-export-menu.open{display:grid}.sar-export-menu button{border:0;background:transparent;color:var(--app-text,#fff);padding:7px 9px;text-align:left;font:inherit;font-size:12px;cursor:pointer}.sar-export-menu button:hover,.sar-export-menu button:focus{background:var(--app-panel-2,#123247);color:var(--app-accent,#f2a900);outline:none}";
    document.head.appendChild(style);
  }

  function safeName(value) {
    return String(value || "data").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "data";
  }
  function cleanValue(value) {
    if (value == null) return "";
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") return JSON.stringify(value);
    return value;
  }
  function cleanRow(row) {
    var out = {};
    Object.keys(row || {}).forEach(function (key) {
      if (key === "geometry" || key === "graphic") return;
      out[key] = cleanValue(row[key]);
    });
    return out;
  }
  function rowsFromTable(table) {
    if (!table) return [];
    var headers = Array.from(table.querySelectorAll("thead th")).map(function (cell, index) { return cell.textContent.trim() || "field_" + (index + 1); });
    return Array.from(table.querySelectorAll("tbody tr")).map(function (tr) {
      var row = {};
      Array.from(tr.querySelectorAll("td,th")).forEach(function (cell, index) {
        var input = cell.querySelector("input,select,textarea"), key = headers[index] || "field_" + (index + 1);
        row[key] = input ? input.value : cell.textContent.trim();
      });
      return row;
    });
  }
  function csv(rows) {
    rows = (rows || []).map(cleanRow);
    var fields = Array.from(new Set(rows.flatMap(function (row) { return Object.keys(row); })));
    var quote = function (value) { return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"'; };
    return [fields.map(quote).join(",")].concat(rows.map(function (row) { return fields.map(function (field) { return quote(row[field]); }).join(","); })).join("\r\n");
  }
  function mercatorToLonLat(x, y) {
    var lon = x / 20037508.34 * 180, lat = y / 20037508.34 * 180;
    lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
    return [lon, lat];
  }
  function geometryToGeoJSON(input) {
    if (!input) return null;
    var geometry = typeof input.toJSON === "function" ? input.toJSON() : input;
    if (geometry.type && geometry.coordinates) return geometry;
    var sr = geometry.spatialReference || input.spatialReference || {}, webMercator = sr.isWebMercator || [3857, 102100, 102113].includes(sr.wkid || sr.latestWkid);
    var point = function (coordinate) { return webMercator ? mercatorToLonLat(coordinate[0], coordinate[1]) : [coordinate[0], coordinate[1]]; };
    if (geometry.type === "point" || geometry.x != null || geometry.longitude != null) {
      var x = geometry.longitude != null ? geometry.longitude : geometry.x, y = geometry.latitude != null ? geometry.latitude : geometry.y;
      return { type: "Point", coordinates: point([x, y]) };
    }
    if (geometry.type === "polyline" || geometry.paths) {
      var paths = (geometry.paths || []).map(function (path) { return path.map(point); });
      return { type: paths.length > 1 ? "MultiLineString" : "LineString", coordinates: paths.length > 1 ? paths : (paths[0] || []) };
    }
    if (geometry.type === "polygon" || geometry.rings) return { type: "Polygon", coordinates: (geometry.rings || []).map(function (ring) { return ring.map(point); }) };
    return null;
  }
  function feature(input, fallbackProperties) {
    if (!input) return null;
    if (input.type === "Feature") return { type: "Feature", geometry: geometryToGeoJSON(input.geometry), properties: cleanRow(input.properties || fallbackProperties || {}) };
    var geometry = input.geometry || input.graphic && input.graphic.geometry || fallbackProperties && fallbackProperties.geometry;
    var properties = input.properties || input.attributes || input.graphic && input.graphic.attributes || fallbackProperties || {};
    var converted = geometryToGeoJSON(geometry);
    return converted ? { type: "Feature", geometry: converted, properties: cleanRow(properties) } : null;
  }
  function normalize(data, table) {
    if (Array.isArray(data)) return { rows: data.map(cleanRow), features: [] };
    data = data || {};
    var rows = (data.rows || rowsFromTable(table)).map(cleanRow);
    var features = (data.features || []).map(function (item, index) { return feature(item, rows[index]); }).filter(Boolean);
    if (!features.length && data.contextGeometry) features = rows.map(function (row) { return feature({ geometry: data.contextGeometry, properties: row }); }).filter(Boolean);
    return { rows: rows, features: features };
  }
  function download(name, value, type) {
    var blob = value instanceof Blob ? value : new Blob([value], { type: type });
    var link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = name; link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function attach(options) {
    options = options || {};
    var host = typeof options.host === "string" ? document.querySelector(options.host) : options.host;
    if (!host || host.dataset.sarExportAttached) return null;
    addStyles(); host.dataset.sarExportAttached = "true"; host.classList.add("sar-export-host");
    var label = options.label || "data", stem = safeName(options.filename || label);
    var button = document.createElement("button"); button.type = "button"; button.className = "sar-export-button"; button.title = "Export " + label; button.setAttribute("aria-label", "Export " + label); button.setAttribute("aria-expanded", "false"); button.innerHTML = '<calcite-icon icon="export" scale="s" aria-hidden="true"></calcite-icon>';
    var menu = document.createElement("div"); menu.className = "sar-export-menu"; menu.setAttribute("role", "menu");
    [["csv", "CSV"], ["json", "JSON"], ["shp", "Shapefile (.zip)"]].forEach(function (item) { var control = document.createElement("button"); control.type = "button"; control.dataset.format = item[0]; control.textContent = item[1]; control.setAttribute("role", "menuitem"); menu.appendChild(control); });
    host.append(button, menu);
    function close() { menu.classList.remove("open"); button.setAttribute("aria-expanded", "false"); }
    button.addEventListener("click", function (event) { event.stopPropagation(); var open = menu.classList.toggle("open"); button.setAttribute("aria-expanded", String(open)); });
    document.addEventListener("click", function (event) { if (!host.contains(event.target)) close(); });
    menu.addEventListener("click", async function (event) {
      var format = event.target.dataset.format; if (!format) return; close();
      try {
        var raw = options.getData ? await options.getData() : null, data = normalize(raw, options.table || host.querySelector("table"));
        if (format === "csv") return download(stem + ".csv", "\ufeff" + csv(data.rows), "text/csv;charset=utf-8");
        if (format === "json") return download(stem + ".json", JSON.stringify({ name: label, exportedAt: new Date().toISOString(), rows: data.rows, featureCollection: { type: "FeatureCollection", features: data.features } }, null, 2), "application/json");
        if (!data.features.length) throw new Error("No spatial geometry is available for this dataset. Use CSV or JSON for tabular-only data.");
        if (!window.shpwrite || typeof window.shpwrite.zip !== "function") throw new Error("The Shapefile exporter is unavailable.");
        var blob = await window.shpwrite.zip({ type: "FeatureCollection", features: data.features }, { folder: stem, outputType: "blob", compression: "STORE", types: { point: stem + "_points", polyline: stem + "_lines", polygon: stem + "_polygons" } });
        download(stem + ".zip", blob, "application/zip");
      } catch (error) { console.error(error); alert("Export failed: " + error.message); }
    });
    return { host: host, button: button, menu: menu };
  }

  return { attach: attach, rowsFromTable: rowsFromTable, csv: csv, geometryToGeoJSON: geometryToGeoJSON, normalize: normalize, safeName: safeName };
});
