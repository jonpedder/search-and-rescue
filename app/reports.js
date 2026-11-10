/* Shared Reports selector and PDF export for Planning, Operations and Settings. */
(function () {
  "use strict";
  if (document.getElementById("sarReportsControl")) return;
  var SNAPSHOT = "sar.planning.report.snapshot.v1", JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  var $ = function (id) { return document.getElementById(id); }, planning = !!$("incName"), operations = !!$("incidentId");
  var navy = [0, 59, 92], gold = [242, 169, 0], ink = [25, 35, 45], muted = [95, 110, 122];
  function empty(v) { return v == null || String(v).trim() === ""; }
  function text(v) { return empty(v) ? "Not recorded" : String(v).trim(); }
  function clean(v) { return text(v).replace(/[^\x09\x0a\x20-\xff\u2013\u2014\u2018\u2019\u201c\u201d\u2022]/g, "?"); }
  function date(v) { if (empty(v)) return "Not recorded"; var d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleString(); }
  function label(el) {
    var l = el.id && document.querySelector('label[for="' + el.id + '"]'); if (!l) l = el.closest("label"); if (!l) return el.id || "Field";
    return Array.from(l.childNodes).filter(function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent.trim(); }).join(" ") || el.id;
  }
  function value(el) { if (el.tagName === "SELECT") return el.value ? (el.selectedOptions[0] && el.selectedOptions[0].text || el.value) : ""; return el.value || ""; }
  function collectPlanning() {
    var g = function (id) { return $(id) ? value($(id)) : ""; };
    return {
      savedAt: Date.now(),
      incident: { name: g("incName"), lat: g("lat"), lon: g("lon"), lastSeen: g("lastSeen"), scenarios: Array.from(document.querySelectorAll("#scenTable tbody tr")).map(function (r) { return { name: r.querySelector("[data-k=name]").value, probability: r.querySelector("[data-k=prob]").value, bearing: r.querySelector("[data-k=bearing]").value }; }) },
      subject: { category: g("category"), age: g("age"), sex: g("sex"), environment: g("domain"), terrain: g("terrain"), season: g("season"), light: g("light") },
      interview: Array.from(document.querySelectorAll("details.interview-card")).map(function (d) { return { title: d.querySelector("summary").textContent.trim(), fields: Array.from(d.querySelectorAll("input,select,textarea")).map(function (el) { return { label: label(el), value: value(el), wide: el.tagName === "TEXTAREA" }; }) }; }),
      cues: Array.from(document.querySelectorAll("#interviewPlan li")).map(function (x) { return x.textContent.trim(); })
    };
  }
  function saveSnapshot() { if (planning) localStorage.setItem(SNAPSHOT, JSON.stringify(collectPlanning())); }
  if (planning) {
    var timer, changed = function () { clearTimeout(timer); timer = setTimeout(saveSnapshot, 300); };
    document.addEventListener("input", changed, true); document.addEventListener("change", changed, true); window.addEventListener("pagehide", saveSnapshot); saveSnapshot();
  }
  function planningData() { if (planning) { saveSnapshot(); return collectPlanning(); } try { return JSON.parse(localStorage.getItem(SNAPSHOT) || "null"); } catch (_) { return null; } }
  function clueData() {
    var incident = { id: "", name: "", period: "" }, records = [], source = "";
    if (operations && window.__app && window.__app.state) {
      incident = { id: $("incidentId").value.trim(), name: $("incidentName").value.trim(), period: $("operationalPeriod").value };
      records = window.__app.state.records.filter(function (r) { return r.kind === "clue"; }).map(function (r) { return { attrs: r.attrs || {}, geometry: r.graphic && r.graphic.geometry, graphic: r.graphic, synced: !!r.synced }; });
      source = "Live operations workspace";
    } else {
      var best = null, wanted = planning && $("incName").value.trim().toLowerCase();
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (k.indexOf("sar.operations.") !== 0) continue;
        try {
          var w = JSON.parse(localStorage.getItem(k)), clues = (w.records || []).filter(function (r) { return r.kind === "clue"; }); if (!clues.length) continue;
          var score = clues.length + (wanted && String(w.incident && w.incident.name || "").toLowerCase() === wanted ? 10000 : 0);
          if (!best || score > best.score) best = { score: score, w: w, clues: clues };
        } catch (_) { }
      }
      if (best) { incident = best.w.incident || incident; records = best.clues.map(function (r) { return { attrs: r.attrs || {}, geometry: r.geometry, synced: !!r.synced }; }); source = "Saved operations workspace"; }
    }
    records.sort(function (a, b) { return (+a.attrs.created || 0) - (+b.attrs.created || 0); }); return { incident: incident, records: records, source: source };
  }
  function assignmentWorkspaceData() {
    var incident = { id: "", name: "", period: "" }, assignments = [], records = [], source = "";
    if (operations && window.__app && window.__app.state) {
      incident = { id: $("incidentId").value.trim(), name: $("incidentName").value.trim(), period: $("operationalPeriod").value };
      assignments = window.__app.state.assignments.slice();
      records = window.__app.state.records.map(function (r) { return { kind: r.kind, attrs: r.attrs || {}, geometry: r.graphic && r.graphic.geometry || r.geometry }; });
      source = "Live operations workspace";
    } else {
      var best = null, wanted = planning && $("incName").value.trim().toLowerCase();
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (k.indexOf("sar.operations.") !== 0) continue;
        try {
          var w = JSON.parse(localStorage.getItem(k)), list = w.assignments || []; if (!list.length) continue;
          var score = list.length + (wanted && String(w.incident && w.incident.name || "").toLowerCase() === wanted ? 10000 : 0);
          if (!best || score > best.score) best = { score: score, w: w };
        } catch (_) { }
      }
      if (best) { incident = best.w.incident || incident; assignments = best.w.assignments || []; records = (best.w.records || []).map(function (r) { return { kind: r.kind, attrs: r.attrs || {}, geometry: r.geometry }; }); source = "Saved operations workspace"; }
    }
    return { incident: incident, assignments: assignments, records: records, source: source };
  }
  function ll(g) {
    if (!g) return "Not recorded"; if (g.latitude != null) return g.latitude.toFixed(5) + ", " + g.longitude.toFixed(5);
    var x = g.x, y = g.y; if (x == null) return "Not recorded";
    if (Math.abs(x) > 180) { var R = 6378137; return ((2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI).toFixed(5) + ", " + (x / R * 180 / Math.PI).toFixed(5); }
    return Number(y).toFixed(5) + ", " + Number(x).toFixed(5);
  }
  function amd(modules) { return new Promise(function (resolve, reject) { if (typeof window.require !== "function") return reject(new Error("ArcGIS Maps SDK is unavailable.")); window.require(modules, function () { resolve(Array.from(arguments)); }, reject); }); }
  async function settle(view) { for (var i = 0; i < 40; i++) { if (!view.updating) { await new Promise(function (r) { setTimeout(r, 250); }); if (!view.updating) return; } await new Promise(function (r) { setTimeout(r, 150); }); } }
  async function clueMapImage(records) {
    var located = records.map(function (r, i) { return { geometry: r.geometry, number: i + 1 }; }).filter(function (r) { var g = r.geometry; return g && (g.type === "point" || g.latitude != null || g.x != null); });
    if (!located.length) return null;
    var modules = await amd(["esri/Map", "esri/views/MapView", "esri/layers/GraphicsLayer", "esri/Graphic"]), Map = modules[0], MapView = modules[1], GraphicsLayer = modules[2], Graphic = modules[3];
    var view = operations && window.__esriView && window.__esriView.ready ? window.__esriView : null, owned = !view, host = null, map, oldViewpoint = view && view.viewpoint && view.viewpoint.clone();
    if (owned) {
      host = document.createElement("div"); host.setAttribute("aria-hidden", "true"); host.style.cssText = "position:fixed;left:-10000px;top:0;width:1200px;height:500px;visibility:visible"; document.body.appendChild(host);
      map = new Map({ basemap: "topo-vector" }); view = new MapView({ container: host, map: map, constraints: { snapToZoom: false }, ui: { components: [] } }); await view.when();
    } else map = view.map;
    var layer = new GraphicsLayer({ title: "Clue report numbers", listMode: "hide" }), targets = [];
    located.forEach(function (item) {
      var marker = new Graphic({ geometry: item.geometry, attributes: { clueNumber: item.number }, symbol: { type: "simple-marker", style: "circle", size: 23, color: [242, 169, 0, 0.96], outline: { color: [0, 59, 92, 1], width: 2 } } });
      var number = new Graphic({ geometry: item.geometry, attributes: { clueNumber: item.number }, symbol: { type: "text", text: String(item.number), color: [0, 42, 66, 1], haloColor: [255, 255, 255, 0.9], haloSize: 0.5, font: { family: "Arial", size: 9, weight: "bold" } } });
      layer.addMany([marker, number]); targets.push(marker);
    });
    map.add(layer);
    try {
      if (targets.length === 1) await view.goTo({ target: targets[0].geometry, scale: 18000 }, { animate: false });
      else await view.goTo(targets, { animate: false, padding: 70 });
      await settle(view);
      var shot = await view.takeScreenshot({ format: "png", width: 1440, height: 600 }); return shot.dataUrl;
    } finally {
      map.remove(layer);
      if (owned) { view.destroy(); host.remove(); }
      else if (oldViewpoint) view.goTo(oldViewpoint, { animate: false }).catch(function () { });
    }
  }
  async function assignmentMapImage(workspace, assignment) {
    var aid = String(assignment.id || "").toLowerCase(), segment = String(assignment.segment || "").toLowerCase(), team = String(assignment.team || "").toLowerCase();
    var related = workspace.records.filter(function (r) {
      var name = String(r.attrs && r.attrs.name || "").toLowerCase(), notes = String(r.attrs && r.attrs.notes || "").toLowerCase();
      if (["segment", "area"].includes(r.kind) && segment && name === segment) return true;
      if (["route", "track"].includes(r.kind) && (name === aid || notes.indexOf(aid) >= 0 || team && name.indexOf(team) >= 0)) return true;
      if (["asset", "facility", "lz"].includes(r.kind) && team && name.indexOf(team) >= 0) return true;
      return false;
    }).filter(function (r) { return !!r.geometry; });
    if (!related.length) return null;
    var modules = await amd(["esri/Map", "esri/views/MapView", "esri/layers/GraphicsLayer", "esri/Graphic"]), Map = modules[0], MapView = modules[1], GraphicsLayer = modules[2], Graphic = modules[3];
    var view = operations && window.__esriView && window.__esriView.ready ? window.__esriView : null, owned = !view, host = null, map, oldViewpoint = view && view.viewpoint && view.viewpoint.clone();
    if (owned) { host = document.createElement("div"); host.setAttribute("aria-hidden", "true"); host.style.cssText = "position:fixed;left:-10000px;top:0;width:1200px;height:500px;visibility:visible"; document.body.appendChild(host); map = new Map({ basemap: "topo-vector" }); view = new MapView({ container: host, map: map, constraints: { snapToZoom: false }, ui: { components: [] } }); await view.when(); }
    else map = view.map;
    var layer = new GraphicsLayer({ title: "Assignment report tasking", listMode: "hide" }), targets = [];
    related.forEach(function (item) {
      var type = item.geometry.type, symbol = type === "polygon" ? { type: "simple-fill", color: [242, 169, 0, 0.2], outline: { color: [242, 169, 0, 1], width: 3 } } : type === "polyline" ? { type: "simple-line", color: [242, 169, 0, 1], width: 4 } : { type: "simple-marker", style: "diamond", size: 18, color: [242, 169, 0, 1], outline: { color: [0, 59, 92, 1], width: 2 } };
      var graphic = new Graphic({ geometry: item.geometry, symbol: symbol, attributes: { assignmentId: assignment.id, featureName: item.attrs.name || item.kind } }); layer.add(graphic); targets.push(graphic);
    });
    var first = targets[0], labelPoint = first.geometry.type === "point" ? first.geometry : first.geometry.extent && first.geometry.extent.center;
    if (labelPoint) layer.add(new Graphic({ geometry: labelPoint, symbol: { type: "text", text: String(assignment.id || "Assignment"), color: [255, 255, 255, 1], haloColor: [0, 59, 92, 1], haloSize: 2, yoffset: 16, font: { family: "Arial", size: 11, weight: "bold" } } }));
    map.add(layer);
    try { await view.goTo(targets.length === 1 && targets[0].geometry.type === "point" ? { target: targets[0].geometry, scale: 18000 } : targets, { animate: false, padding: 70 }); await settle(view); var shot = await view.takeScreenshot({ format: "png", width: 1440, height: 600 }); return shot.dataUrl; }
    finally { map.remove(layer); if (owned) { view.destroy(); host.remove(); } else if (oldViewpoint) view.goTo(oldViewpoint, { animate: false }).catch(function () { }); }
  }
  function loadPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise(function (resolve, reject) {
      var amd = window.define; window.define = undefined; var s = document.createElement("script"); s.src = JSPDF;
      s.onload = function () { window.define = amd; window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error("PDF library did not initialize.")); };
      s.onerror = function () { window.define = amd; reject(new Error("Could not load the PDF library.")); }; document.head.appendChild(s);
    });
  }
  function pdfApi(jsPDF, title, subtitle, landscape) {
    var doc = new jsPDF({ unit: "pt", format: "letter", orientation: landscape ? "landscape" : "portrait" }), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40, CW = W - M * 2, y;
    function header() { doc.setFillColor.apply(doc, navy); doc.rect(0, 0, W, 56, "F"); doc.setFillColor.apply(doc, gold); doc.rect(0, 56, W, 3, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255); doc.text(clean(title), M, 28); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor.apply(doc, gold); doc.text(clean(subtitle), M, 44); y = 80; }
    function need(h) { if (y + h > H - 44) { doc.addPage(); header(); return true; } }
    header(); return {
      section: function (s) { need(28); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor.apply(doc, navy); doc.text(clean(s).toUpperCase(), M, y); y += 5; doc.setDrawColor.apply(doc, gold); doc.line(M, y, W - M, y); y += 15; },
      fields: function (pairs, columns) { columns = columns || 2; var cw = CW / columns;
        for (var i = 0; i < pairs.length; i += columns) { var row = pairs.slice(i, i + columns), h = 34; row.forEach(function (p) { h = Math.max(h, doc.splitTextToSize(clean(p[1]), cw - 10).length * 11 + 16); }); need(h); row.forEach(function (p, j) { var x = M + j * cw; doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor.apply(doc, muted); doc.text(clean(p[0]).toUpperCase(), x, y); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor.apply(doc, ink); doc.text(doc.splitTextToSize(clean(p[1]), cw - 10), x, y + 12); }); y += h; }
      },
      paragraph: function (s) { doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor.apply(doc, ink); var lines = doc.splitTextToSize(clean(s), CW); lines.forEach(function (line) { need(12); doc.text(line, M, y); y += 12; }); y += 4; },
      image: function (dataUrl, height, caption) { height = height || 245; need(height + 28); doc.setDrawColor(180, 192, 202); doc.setLineWidth(0.8); doc.rect(M, y, CW, height); doc.addImage(dataUrl, "PNG", M + 1, y + 1, CW - 2, height - 2, undefined, "FAST"); y += height + 11; if (caption) { doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor.apply(doc, muted); doc.text(doc.splitTextToSize(clean(caption), CW), M, y); y += 18; } },
      table: function (heads, widths, rows) { function head() { need(25); doc.setFillColor.apply(doc, navy); doc.rect(M, y - 10, CW, 17, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8); var x = M; heads.forEach(function (h, i) { doc.text(clean(h), x + 4, y + 2); x += widths[i] * CW; }); y += 14; } head(); rows.forEach(function (row, ri) { var cells = row.map(function (v, i) { return doc.splitTextToSize(clean(v), widths[i] * CW - 8); }), h = Math.max.apply(Math, cells.map(function (x) { return x.length; })) * 10 + 8; if (y + h > H - 44) { doc.addPage(); header(); head(); } if (ri % 2 === 0) { doc.setFillColor(241, 245, 248); doc.rect(M, y - 10, CW, h, "F"); } doc.setTextColor.apply(doc, ink); doc.setFont("helvetica", "normal"); doc.setFontSize(8.2); var x = M; cells.forEach(function (c, i) { doc.text(c, x + 4, y + 1); x += widths[i] * CW; }); y += h; }); y += 6; },
      finish: function (note) { var pages = doc.getNumberOfPages(); for (var p = 1; p <= pages; p++) { doc.setPage(p); doc.setDrawColor(200, 208, 214); doc.line(M, H - 34, W - M, H - 34); doc.setFontSize(7.5); doc.setTextColor.apply(doc, muted); doc.text(clean(note), M, H - 22); doc.text("Page " + p + " of " + pages, W - M, H - 22, { align: "right" }); } return doc.output("blob"); }
    };
  }
  function download(blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name + "-" + new Date().toISOString().slice(0, 10) + ".pdf"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); }
  async function incidentReport() {
    var d = planningData(); if (!d) throw new Error("No planning data found. Complete the Incident and Subject sections first."); var js = await loadPdf(), inc = d.incident || {}, sub = d.subject || {}, p = pdfApi(js, "Incident & Subject Profile Report", inc.name || "Unnamed incident", false);
    p.section("Incident information"); p.fields([["Incident name", inc.name], ["Initial planning point", !empty(inc.lat) && !empty(inc.lon) ? inc.lat + ", " + inc.lon : ""], ["Last seen", date(inc.lastSeen)], ["Generated", new Date().toLocaleString()]]);
    p.section("Scenarios"); p.table(["Scenario", "Probability %", "Bearing true"], [.56, .22, .22], (inc.scenarios || []).map(function (s) { return [s.name, s.probability, s.bearing || "None"]; }));
    p.section("Subject profile"); p.fields([["Category", sub.category], ["Age", sub.age], ["Sex", sub.sex || "Unknown"], ["Environment", sub.environment], ["Terrain", sub.terrain], ["Season", sub.season], ["Light", sub.light]]);
    (d.interview || []).forEach(function (group) { p.section("Interview - " + group.title); var rows = group.fields.filter(function (f) { return !empty(f.value); }); if (!rows.length) p.paragraph("No information recorded."); else rows.forEach(function (f) { p.fields([[f.label, f.value]], 1); }); });
    if (d.cues && d.cues.length) { p.section("Planning cues"); d.cues.forEach(function (c) { p.paragraph("• " + c); }); }
    p.paragraph("Sensitive information: restrict this report to personnel who require it for the incident."); return { blob: p.finish("Search & Rescue incident and subject profile"), name: "incident-subject-profile-report" };
  }
  async function clueReport() {
    var d = clueData(); if (!d.records.length) throw new Error("No clues are logged. Add clues in SAR Operations first.");
    /* Capture the ArcGIS map before loading jsPDF: jsPDF temporarily masks AMD's
       global define function, so running both tasks concurrently breaks SDK imports. */
    var mapImage = await clueMapImage(d.records).catch(function (error) { console.warn("Clue report map could not be captured", error); return null; }), js = await loadPdf(), p = pdfApi(js, "Clue Log Report", (d.incident.name || "Unnamed incident") + (d.incident.id ? " | " + d.incident.id : ""), true);
    p.section("Log summary"); p.fields([["Incident ID", d.incident.id], ["Incident name", d.incident.name], ["Operational period", d.incident.period], ["Total clues", d.records.length], ["Data source", d.source], ["Generated", new Date().toLocaleString()]], 3);
    p.section("Clue placement map");
    if (mapImage) p.image(mapImage, 245, "Numbered markers correspond to the chronological clue-log rows below. Basemap and reference data: Esri and data providers.");
    else p.paragraph("A placement map could not be generated. Coordinates remain available in the clue log below.");
    p.section("Clue log (chronological)"); p.table(["#", "Clue", "Found / logged", "Op", "Status", "Priority", "Location", "Description / notes"], [.04, .11, .14, .04, .08, .08, .15, .36], d.records.map(function (r, i) { return [i + 1, r.attrs.name || "Clue", date(r.attrs.created), r.attrs.operationalPeriod || "", r.attrs.status || "", r.attrs.priority || "", ll(r.geometry), r.attrs.notes || "No description"]; }));
    p.paragraph("Preserve and photograph clues in place, record finder and time, and report them through incident command."); return { blob: p.finish("Search & Rescue clue log"), name: "clue-log-report" };
  }
  async function assignmentReport() {
    var d = assignmentWorkspaceData(); if (!d.assignments.length) throw new Error("No assignments are available. Create or load assignments in SAR Operations first.");
    var choices = d.assignments.map(function (a) { return String(a.id || "Unnamed assignment"); }), preferred = operations && window.__app && window.__app.state && window.__app.state.selectedAssignment || choices[0];
    var answer = prompt("Which assignment number should be included in the report?\n\nAvailable assignments: " + choices.join(", "), preferred); if (answer == null) return null; answer = answer.trim();
    var assignment = d.assignments.find(function (a) { return String(a.id || "").toLowerCase() === answer.toLowerCase(); });
    if (!assignment && /^\d+$/.test(answer) && +answer >= 1 && +answer <= d.assignments.length) assignment = d.assignments[+answer - 1];
    if (!assignment) throw new Error("Assignment '" + answer + "' was not found. Available assignments: " + choices.join(", "));
    var mapImage = await assignmentMapImage(d, assignment).catch(function (error) { console.warn("Assignment report map could not be captured", error); return null; }), js = await loadPdf(), p = pdfApi(js, "Assignment Report", String(assignment.id || "Assignment") + (d.incident.name ? " | " + d.incident.name : ""), true);
    p.section("Assignment identification"); p.fields([["Incident ID", d.incident.id], ["Incident name", d.incident.name], ["Assignment number", assignment.id], ["Search segment", assignment.segment], ["Operational period", assignment.operationalPeriod || d.incident.period], ["Status", assignment.status], ["Priority", assignment.priority], ["Data source", d.source], ["Generated", new Date().toLocaleString()]], 3);
    p.section("Assignment tasking map");
    if (mapImage) p.image(mapImage, 245, "Highlighted geometry shows the assigned segment and any linked route, track, facility or team resource found in the Operations workspace. Basemap and reference data: Esri and data providers.");
    else p.paragraph("No linked assignment geometry was found. Confirm that the assignment's segment and route names match mapped Operations objects.");
    p.section("Team and tasking"); p.fields([["Team / resource", assignment.team], ["Task type", assignment.type], ["Team size", assignment.teamSize], ["Transportation", assignment.transport], ["Estimated hours", assignment.expectedHours], ["Radio channel", assignment.radio], ["Prepared by", assignment.preparedBy], ["Created", date(assignment.created)], ["ArcGIS status", assignment.synced ? "Synced" : "Browser workspace / unsynced"]], 3);
    p.section("Probability of detection"); p.fields([["Responsive POD", empty(assignment.podResponsive) ? "" : assignment.podResponsive + "%"], ["Unresponsive POD", empty(assignment.podUnresponsive) ? "" : assignment.podUnresponsive + "%"], ["Clue POD", empty(assignment.podClue) ? "" : assignment.podClue + "%"]], 3);
    p.section("Previous search efforts"); p.paragraph(assignment.previous || "No previous search efforts recorded.");
    p.section("Briefing and safety notes"); p.paragraph(assignment.notes || "No briefing or safety notes recorded.");
    p.paragraph("Brief the assigned team, verify communications and hazards, and obtain incident-command approval before deployment.");
    return { blob: p.finish("Search & Rescue assignment tasking"), name: "assignment-" + String(assignment.id || "report").replace(/[^A-Za-z0-9_-]+/g, "-") };
  }
  var busy = false;
  async function run(kind) { if (busy || !kind) return; busy = true; var button = document.getElementById("sarExportReportButton"); if (button) { button.loading = true; button.disabled = true; } try { var r = kind === "clue" ? await clueReport() : kind === "assignment" ? await assignmentReport() : await incidentReport(); if (r) download(r.blob, r.name); } catch (e) { alert(e.message || "The report could not be generated."); } finally { busy = false; if (button) { button.loading = false; button.disabled = !document.getElementById("sarReportType").value; } } }
  var host = document.querySelector(".status-row") || document.querySelector(".header-actions") || document.querySelector(".header .actions"); if (!host) return;
  var control = document.createElement("div"); control.id = "sarReportsControl"; control.className = "sar-report-group";
  control.innerHTML = '<label for="sarReportType">Reports</label><select id="sarReportType" aria-label="Select report"><option value="">Select a report</option><option value="clue">Clue Log Report</option><option value="assignment">Assignment Report</option><option value="incident">Incident &amp; Subject Profile</option></select><calcite-button id="sarExportReportButton" appearance="outline-fill" icon-start="file-pdf" scale="m" disabled>PDF</calcite-button>';
  var select = control.querySelector("select"), exportButton = control.querySelector("calcite-button");
  select.onchange = function () { exportButton.disabled = !select.value; };
  exportButton.onclick = function () { run(select.value); };
  host.insertBefore(control, host.firstChild);
})();
