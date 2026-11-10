/* SAR synthetic data generator. Writes/deletes tagged test records in the SAR_LPB_Incident_Data feature service.
   API: SARSynthetic.generate({post,total,seed,onProgress}), .counts({post}), .deleteAll({post}), .build({total,seed}).
   post(url, params) must POST form params to the ArcGIS REST endpoint (with auth) and resolve parsed JSON. */
(function (global) {
  "use strict";
  var ROOT = "https://services6.arcgis.com/SdBwj74JF24xKhpX/arcgis/rest/services/SAR_LPB_Incident_Data/FeatureServer";
  var PREFIX = "SYN-";                       // incident_id prefix that marks every synthetic record
  var STATS_SOURCE = "SYNTHETIC_PLACEHOLDER"; // source prefix for synthetic LPB_Stats / SurvivabilityCurve rows
  var NOTE = "SYNTHETIC DATA. Not a real incident. Delete with incident_id LIKE 'SYN-%'.";
  var L = { incident: 0, keypoints: 1, segment: 2, clue: 3, track: 4, task: 5, modelrun: 6, stats: 7, surv: 8 };
  var LABELS = { 0: "Incident", 1: "KeyPoints", 2: "SearchSegment", 3: "Clue", 4: "TrackLog", 5: "Task", 6: "ModelRun", 7: "LPB_Stats", 8: "SurvivabilityCurve" };

  /* median 50th-percentile distance (km) per category: synthetic, shaped like LPB behaviour, not licensed data */
  var CATS = {
    "Abduction": 3.0, "Aircraft": 4.5, "Urban Entrapment": 0.4, "Water": 1.2, "ATV": 6.0, "Horseback": 5.0, "Motorcycle": 6.5,
    "Mountain Biker": 5.5, "Vehicle": 8.0, "Autistic": 0.7, "Dementia": 0.8, "Despondent": 1.4, "Intellectual Disability": 1.0,
    "Mental Illness": 1.6, "Substance Intoxication": 1.1, "Child 1-3": 0.3, "Child 4-6": 0.5, "Child 7-9": 0.9, "Child 10-12": 1.6,
    "Child 13-15": 2.4, "Angler": 1.5, "Camper": 1.8, "Caver": 0.5, "Climber": 2.2, "Gatherer": 1.7, "Hiker": 2.4, "Hunter": 2.9,
    "Runner": 3.1, "Skier-Alpine": 1.6, "Skier-Nordic": 3.4, "Snowboarder": 1.4, "Snowmobiler": 7.0, "Snowshoer": 2.2, "Worker": 1.3, "Other": 2.0
  };
  var CAT_NAMES = Object.keys(CATS);
  var AGE = {
    "Child 1-3": [1, 3], "Child 4-6": [4, 6], "Child 7-9": [7, 9], "Child 10-12": [10, 12], "Child 13-15": [13, 15], "Dementia": [62, 95],
    "Autistic": [4, 40], "Intellectual Disability": [8, 60], "Mental Illness": [18, 65], "Despondent": [16, 70], "Substance Intoxication": [18, 60],
    "Hunter": [22, 78], "Gatherer": [30, 80], "Angler": [25, 80], "Worker": [20, 65], "Runner": [18, 60], "Climber": [18, 60], "Caver": [18, 55], "Abduction": [3, 15]
  };
  var REGIONS = [
    { n: "San Gabriel Mtns, CA", lon: -118.03, lat: 34.14, dom: "Temperate", ter: "Mountainous" },
    { n: "Sierra Nevada, CA", lon: -119.30, lat: 37.20, dom: "Temperate", ter: "Mountainous" },
    { n: "North Cascades, WA", lon: -121.60, lat: 47.55, dom: "Temperate", ter: "Mountainous" },
    { n: "Front Range, CO", lon: -105.70, lat: 39.90, dom: "Temperate", ter: "Mountainous" },
    { n: "Blue Ridge, VA", lon: -78.50, lat: 38.40, dom: "Temperate", ter: "Mountainous" },
    { n: "Sonoran Desert, AZ", lon: -111.80, lat: 33.60, dom: "Dry", ter: "Flat" },
    { n: "Mojave Desert, NV", lon: -115.10, lat: 36.20, dom: "Dry", ter: "Flat" },
    { n: "Canyonlands, UT", lon: -110.50, lat: 38.60, dom: "Dry", ter: "Mountainous" },
    { n: "Central Florida", lon: -81.40, lat: 28.50, dom: "Temperate", ter: "Flat" },
    { n: "Great Plains, KS", lon: -97.30, lat: 38.30, dom: "Temperate", ter: "Flat" },
    { n: "Phoenix metro, AZ", lon: -112.07, lat: 33.45, dom: "Urban", ter: "Flat" },
    { n: "Chicago metro, IL", lon: -87.65, lat: 41.85, dom: "Urban", ter: "Flat" }
  ];
  var TEAMS = ["Team Alpha", "Team Bravo", "Team Charlie", "Team Delta", "Team Echo", "Team Foxtrot", "K9 Team 1", "K9 Team 2", "Air Ops 1", "Mounted Unit 1", "Dive Team 1", "ATV Team 1"];
  var FINDERS = ["Team Alpha", "Team Bravo", "Team Charlie", "Team Delta", "K9 Team 1", "Deputy Ruiz", "Volunteer M. Chen", "Hasty Team 2", "Air Ops 1", "Family member"];
  var CLUES = {
    Footprint: ["Partial boot print, size 9, heading downslope.", "Child-size shoe print in soft soil.", "Single track of tread matching reported footwear.", "Prints crossing wash, direction uncertain."],
    Item: ["Water bottle matching description.", "Single glove, outdoor brand.", "Candy wrapper on trail edge.", "Hat caught in brush.", "Jacket found draped over rock."],
    Sighting: ["Hiker reports seeing a person matching description.", "Motorist saw subject near trailhead at dusk.", "Resident reports figure on ridge at dawn.", "Unconfirmed sighting from air crew."],
    Sound: ["Faint whistle heard to the northeast.", "Possible voice response to calling.", "Repeated shouting heard, source not located."],
    Scent: ["K9 alert on scent article at trail junction.", "Dog showed interest in drainage, no trail."],
    Other: ["Disturbed vegetation consistent with passage.", "Fire ring, cold, age unknown.", "Cell phone ping cluster noted by dispatch."]
  };
  var ASSETS = ["Command post", "Staging area", "Drone team", "Hasty team", "Medical unit", "Air support"];
  var HAZARDS = ["Steep cliff band", "Fast water crossing", "Unstable slope", "Active wildlife", "Power lines", "Abandoned mine"];

  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }

  function offset(lon, lat, kmE, kmN) { return [lon + kmE / (111.32 * Math.cos(lat * Math.PI / 180)), lat + kmN / 111.32]; }
  function pol(lon, lat, kmW, kmH) {
    var a = offset(lon, lat, -kmW / 2, -kmH / 2), b = offset(lon, lat, kmW / 2, kmH / 2);
    return { rings: [[[a[0], a[1]], [a[0], b[1]], [b[0], b[1]], [b[0], a[1]], [a[0], a[1]]]], spatialReference: { wkid: 4326 } };
  }
  function pt(lon, lat) { return { x: lon, y: lat, spatialReference: { wkid: 4326 } }; }

  function build(opts) {
    var total = opts.total || 5000, R = rng(opts.seed == null ? (Date.now() & 0xffffffff) : opts.seed);
    var rnd = function (a, b) { return a + R() * (b - a); }, ri = function (a, b) { return Math.floor(rnd(a, b + 1)); }, pick = function (arr) { return arr[Math.floor(R() * arr.length)]; };
    var now = opts.now || Date.now(), DAY = 86400000, HR = 3600000;
    var data = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
    var fixed = CAT_NAMES.length * 2, budget = total - fixed, used = 0, n = 0, order = CAT_NAMES.slice();
    for (var s = order.length - 1; s > 0; s--) { var j = Math.floor(R() * (s + 1)), t = order[s]; order[s] = order[j]; order[j] = t; }
    var plans = [];
    while (true) {
      var p = { segs: ri(8, 12), clues: ri(6, 12), tasks: ri(5, 9), tracks: ri(2, 4), runs: ri(1, 2), assets: ri(1, 2), hazards: ri(1, 2) };
      p.tasks = Math.min(p.tasks, p.segs); p.core = 3; // IPP, PLS, LKP
      p.size = 1 + p.core + 1 + p.assets + p.hazards + 2 + p.segs + p.clues + p.tasks + p.tracks + p.runs; // +Find(1)+CELL(1)+LZ,FAC => use below
      p.size = 1 + 3 + 1 /*find*/ + 1 /*cell ping*/ + 1 /*LZ*/ + 1 /*facility*/ + p.assets + p.hazards + p.segs + p.clues + p.tasks + p.tracks + p.runs;
      if (used + p.size > budget && plans.length >= CAT_NAMES.length) break;
      if (used + p.size > budget) { break; }
      plans.push(p); used += p.size;
    }
    var extra = budget - used; // top up with clues so the total is exact

    plans.forEach(function (p, k) {
      var cat = order[k % order.length], reg = pick(REGIONS);
      if (cat === "Urban Entrapment") reg = pick(REGIONS.filter(function (r) { return r.dom === "Urban"; }));
      var dom = reg.dom, ter = (cat === "Water" ? "Any" : reg.ter);
      var id = PREFIX + pad(k + 1, 4), r50 = CATS[cat] * rnd(0.7, 1.5);
      var statusRoll = R(), status = statusRoll < 0.22 ? "Active" : statusRoll < 0.36 ? "Suspended" : "Closed";
      var lastSeen = status === "Active" ? now - rnd(4, 60) * HR : now - rnd(2, 900) * DAY;
      var ippc = offset(reg.lon, reg.lat, rnd(-18, 18), rnd(-18, 18)), lon = ippc[0], lat = ippc[1];
      var ageR = AGE[cat] || [18, 75], age = ri(ageR[0], ageR[1]);
      var month = new Date(lastSeen).getUTCMonth(), season = month < 2 || month === 11 ? "Winter" : month < 5 ? "Spring" : month < 8 ? "Summer" : "Fall";
      var light = pick(["Day", "Day", "Night", "Twilight"]), stratum = cat + " / " + dom + " / " + ter, runId = "SYN-RUN-" + pad(k + 1, 4);
      var closedAt = status === "Closed" ? Math.min(lastSeen + rnd(1, 6) * DAY, now - HR) : null;
      var tEnd = closedAt || now;
      var w = { ring: 100, sector: 0, linear: 0, terrain: 0, elev: 0 };
      if (R() < 0.4) w = { ring: 35, sector: 25, linear: 15, terrain: 15, elev: 10 };
      data[0].push({ geometry: pt(lon, lat), attributes: { incident_id: id, incident_name: "SYN " + cat + " - " + reg.n + " #" + (k + 1), subject_category: cat, subject_age: age, subject_sex: R() < (cat === "Hunter" ? 0.9 : 0.5) ? "M" : "F", ecoregion_domain: dom, terrain: ter, season: season, light: light, last_seen: Math.round(lastSeen), status: status, stat_stratum: stratum, stat_n: ri(20, 400), stat_source: STATS_SOURCE, weights_json: JSON.stringify(w), notes: NOTE } });

      /* key points */
      var kp = function (type, name, c, time, notes) { data[1].push({ geometry: pt(c[0], c[1]), attributes: { incident_id: id, point_type: type, point_name: name, point_time: Math.round(Math.min(time, now)), notes: notes || NOTE } }); };
      kp("IPP", "Initial planning point", [lon, lat], lastSeen);
      kp("PLS", "Place last seen", offset(lon, lat, rnd(-0.1, 0.1), rnd(-0.1, 0.1)), lastSeen);
      kp("LKP", "Last known point", offset(lon, lat, rnd(-0.3, 0.3), rnd(-0.3, 0.3)), lastSeen - rnd(0.5, 3) * HR);
      var bearing = rnd(0, 2 * Math.PI), fd = r50 * rnd(0.4, 2.2);
      kp("Find", status === "Closed" ? "Subject located" : "Projected find (exercise)", offset(lon, lat, Math.sin(bearing) * fd, Math.cos(bearing) * fd), tEnd, NOTE);
      kp("Other", "CELL PING:Last ping", offset(lon, lat, rnd(-r50, r50), rnd(-r50, r50)), lastSeen + rnd(0.2, 4) * HR, JSON.stringify({ name: "Last ping", kind: "ping", pingRadius: +rnd(0.5, 4).toFixed(1), pingBearing: ri(0, 359), pingWidth: ri(60, 180), synthetic: true }));
      kp("Other", "LZ:Landing zone " + ri(1, 3), offset(lon, lat, rnd(-2, 2), rnd(-2, 2)), lastSeen + rnd(1, 8) * HR, JSON.stringify({ name: "Landing zone", kind: "lz", synthetic: true }));
      kp("Other", "FACILITY:Incident command post", offset(lon, lat, rnd(-1.5, 1.5), rnd(-1.5, 1.5)), lastSeen + rnd(1, 4) * HR, JSON.stringify({ name: "Incident command post", kind: "facility", synthetic: true }));
      for (var a = 0; a < p.assets; a++) kp("Other", "ASSET:" + pick(ASSETS), offset(lon, lat, rnd(-2, 2), rnd(-2, 2)), lastSeen + rnd(2, 12) * HR, JSON.stringify({ name: pick(ASSETS), kind: "asset", assetType: "Team", synthetic: true }));
      for (var h = 0; h < p.hazards; h++) kp("Other", "HAZARD:" + pick(HAZARDS), offset(lon, lat, rnd(-r50 * 1.5, r50 * 1.5), rnd(-r50 * 1.5, r50 * 1.5)), lastSeen + rnd(0.5, 6) * HR, JSON.stringify({ name: pick(HAZARDS), kind: "hazard", synthetic: true }));

      /* segments: grid around the IPP, POA from a distance-decay surface */
      var cols = 4, rows = Math.ceil(p.segs / cols), cell = Math.max(0.12, r50 * 0.5), cells = [];
      for (var i = 0; i < p.segs; i++) {
        var cx = (i % cols - (cols - 1) / 2) * cell, cy = (Math.floor(i / cols) - (rows - 1) / 2) * cell, d = Math.sqrt(cx * cx + cy * cy);
        cells.push({ idx: i, cx: cx, cy: cy, w: Math.exp(-(d * d) / (2 * Math.pow(r50, 2))) + 0.01 * R() });
      }
      var sum = cells.reduce(function (s, c) { return s + c.w; }, 0);
      cells.forEach(function (c) { c.poa = c.w / sum; });
      var ranked = cells.slice().sort(function (x, y) { return y.poa - x.poa; });
      ranked.forEach(function (c, r) { c.rank = r + 1; });

      /* tasks on the highest-ranked segments; segment status follows the task */
      var taskFor = {}, nT = Math.min(p.tasks, ranked.length);
      for (var tI = 0; tI < nT; tI++) {
        var seg = ranked[tI], tid = id + "-T" + pad(tI + 1, 2), tstat;
        var tr = R();
        if (status === "Closed") tstat = tr < 0.88 ? "Debriefed" : "Cancelled";
        else if (status === "Suspended") tstat = tr < 0.65 ? "Debriefed" : tr < 0.85 ? "Assigned" : "Cancelled";
        else tstat = tr < 0.35 ? "Debriefed" : tr < 0.6 ? "InField" : tr < 0.85 ? "Assigned" : "Planned";
        var team = TEAMS[tI % TEAMS.length], ttype = pick(["Hasty", "Grid", "Trackline", "Canine", "Air", "Water", "Investigative", "Other"]);
        var aT = Math.min(lastSeen + rnd(2, 24) * HR, now - 2 * HR), cT = (tstat === "Debriefed") ? Math.max(aT, Math.min(aT + rnd(2, 9) * HR, tEnd)) : null, pod = tstat === "Debriefed" ? ri(20, 95) : null;
        taskFor[seg.idx] = { id: tid, stat: tstat, team: team, pod: pod, aT: aT, cT: cT, type: ttype };
        data[5].push({ attributes: { incident_id: id, task_id: tid, segment_id: "S" + pad(seg.idx + 1, 3), team_name: team, task_type: ttype, assigned_time: Math.round(aT), completed_time: cT ? Math.round(cT) : null, pod_reported: pod, status: tstat,
          notes: JSON.stringify({ priority: pick(["Normal", "High", "Low"]), operationalPeriod: ri(1, 3), teamSize: ri(2, 8), transport: pick(["Foot", "ATV", "Helicopter", "Vehicle", "Horse"]), expectedHours: ri(2, 10), radio: "CH " + ri(1, 8), preparedBy: "Synthetic generator", podResponsive: pod, podUnresponsive: pod ? Math.max(5, pod - ri(10, 30)) : null, podClue: pod ? Math.max(5, pod - ri(5, 20)) : null, previous: "", notes: "SYNTHETIC. Not a real assignment." }) } });
      }
      cells.forEach(function (c) {
        var tk = taskFor[c.idx], segStat = "Unassigned", pod = 0;
        if (tk) { segStat = tk.stat === "Debriefed" ? "Complete" : tk.stat === "InField" ? "InProgress" : tk.stat === "Assigned" ? "Assigned" : "Unassigned"; pod = tk.pod ? tk.pod / 100 : 0; }
        c.status = segStat; c.pod = pod;
        var cen = offset(lon, lat, c.cx, c.cy);
        data[2].push({ geometry: pol(cen[0], cen[1], cell, cell), attributes: { incident_id: id, segment_id: "S" + pad(c.idx + 1, 3), run_id: runId, poa: +c.poa.toFixed(4), pod: +pod.toFixed(2), pos: +(c.poa * pod).toFixed(4), rank: c.rank, status: segStat, area_km2: +(cell * cell).toFixed(4), assigned_team: tk ? tk.team : null } });
      });

      /* tracks: walks inside the tasked segments, plus planned routes */
      var tasked = ranked.slice(0, nT);
      for (var tk2 = 0; tk2 < p.tracks; tk2++) {
        var sg = tasked[tk2 % Math.max(1, tasked.length)] || ranked[0], info = taskFor[sg.idx], x = sg.cx - cell / 2 + rnd(0, cell), y = sg.cy - cell / 2 + rnd(0, cell), path = [];
        for (var st = 0; st < 8; st++) { var q = offset(lon, lat, x, y); path.push([q[0], q[1]]); x += rnd(-cell / 4, cell / 4); y += rnd(-cell / 4, cell / 4); }
        var planned = tk2 === p.tracks - 1 && p.tracks > 1;
        data[4].push({ geometry: { paths: [path], spatialReference: { wkid: 4326 } }, attributes: { incident_id: id, team_name: planned ? "Planned route" : (info ? info.team : "Team Alpha"), task_id: planned ? "ROUTE-" + (k + 1) : (info ? info.id : id + "-T01"), started: info ? Math.round(info.aT) : Math.round(lastSeen + 3 * HR), ended: info && info.cT ? Math.round(info.cT) : null } });
      }

      /* clues */
      var nClues = p.clues + (k === plans.length - 1 ? 0 : 0);
      p._id = id; p._lon = lon; p._lat = lat; p._r50 = r50; p._last = lastSeen; p._end = tEnd; p._clues = nClues;

      /* model runs */
      for (var m = 0; m < p.runs; m++) {
        data[6].push({ attributes: { run_id: runId + (p.runs > 1 && m < p.runs - 1 ? "-" + (m + 1) : ""), incident_id: id, run_time: Math.round(lastSeen + (m + 1) * rnd(1, 6) * HR), stat_stratum: stratum, stat_n: ri(20, 400), stat_source: STATS_SOURCE,
          inputs_json: JSON.stringify({ weights: w, grid: 20, extentIdx: 2, scenarios: [{ name: "Primary", prob: 100, bearing: null }], synthetic: true }), segments_count: p.segs } });
      }
    });

    function addClue(p) {
      var type = pick(Object.keys(CLUES)), c = offset(p._lon, p._lat, rnd(-p._r50 * 1.6, p._r50 * 1.6), rnd(-p._r50 * 1.6, p._r50 * 1.6));
      data[3].push({ geometry: pt(c[0], c[1]), attributes: { incident_id: p._id, clue_type: type, found_time: Math.round(rnd(p._last + HR, Math.max(p._last + 2 * HR, p._end))), found_by: pick(FINDERS), description: pick(CLUES[type]) + " SYNTHETIC." } });
    }
    plans.forEach(function (p) { for (var c = 0; c < p.clues; c++) addClue(p); });
    for (var e = 0; e < extra; e++) addClue(plans[e % plans.length]);

    /* reference tables: one row per category */
    CAT_NAMES.forEach(function (cat, i) {
      var m50 = CATS[cat], reg = REGIONS[i % REGIONS.length];
      data[7].push({ attributes: { source: STATS_SOURCE, category: cat, subcategory: null, domain: reg.dom, terrain: reg.ter, n: ri(20, 400), dist_km_25: +(m50 * 0.4).toFixed(2), dist_km_50: +m50.toFixed(2), dist_km_75: +(m50 * 2.2).toFixed(2), dist_km_95: +(m50 * 5.5).toFixed(2), uphill_pct: ri(10, 40), downhill_pct: ri(20, 50), same_pct: ri(20, 50), disp_deg_25: ri(8, 20), disp_deg_50: ri(20, 40), disp_deg_75: ri(50, 80), disp_deg_95: ri(70, 120), track_m_25: ri(3, 10), track_m_50: ri(10, 40), track_m_75: ri(40, 120), track_m_max: ri(200, 800), mobility_hr_50: +rnd(0.2, 2).toFixed(2), notes: "SYNTHETIC test row. Not real data. Replace with licensed ISRID/LPB values." } });
      data[8].push({ attributes: { category: cat, a: +rnd(0.9, 1.1).toFixed(4), b: +rnd(0.05, 0.6).toFixed(4), source: STATS_SOURCE + " exponential curve, not real data." } });
    });

    /* Only layers 0-4 are spatial in the hosted schema. Tables 5-8 cannot store
       geometry, so their tasks/model/reference rows are displayed through their
       incident/segment relationships. Refuse to upload if any spatial feature is
       missing a geometry or a WGS84 spatial reference. */
    [0, 1, 2, 3, 4].forEach(function (id) {
      data[id].forEach(function (feature, index) {
        var g = feature.geometry, sr = g && g.spatialReference;
        if (!g || !sr || sr.wkid !== 4326) throw new Error(LABELS[id] + " record " + index + " is missing WGS84 geometry.");
      });
    });
    return data;
  }

  function chunks(arr, n) { var out = []; for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }
  function post(ctx, url, params) {
    params.f = "json";
    return ctx.post(url, params).then(function (r) { if (r && r.error) throw new Error(r.error.message + (r.error.details ? " " + r.error.details.join(" ") : "")); return r; });
  }
  function generate(ctx) {
    var progress = ctx.onProgress || function () { };
    var data = build(ctx), plan = Object.keys(data).map(Number), grand = plan.reduce(function (s, k) { return s + data[k].length; }, 0), done = 0;
    var summary = { total: grand, firstIncidentId: data[0][0] && data[0][0].attributes.incident_id, spatialRecords: data[0].length + data[1].length + data[2].length + data[3].length + data[4].length, tableRecords: data[5].length + data[6].length + data[7].length + data[8].length, layers: {} }, chain = Promise.resolve();
    function addBatch(id, batch, res) {
      return post(ctx, ROOT + "/" + id + "/applyEdits", { adds: JSON.stringify(batch), rollbackOnFailure: false }).then(function (r) {
        var results = r.addResults || [];
        if (!results.length && batch.length) throw new Error("ArcGIS returned no add results for " + LABELS[id] + ".");
        results.forEach(function (x) {
          if (x.success) res.added++;
          else {
            res.failed++;
            if (!res.firstError && x.error) res.firstError = x.error.description || x.error.message || JSON.stringify(x.error);
          }
        });
        done += batch.length; progress({ done: done, total: grand, layer: LABELS[id] });
      }).catch(function (error) {
        /* ArcGIS gateways can reject a large form body as HTTP 400. Split it until
           the failing feature is isolated, avoiding the original oversized request. */
        if (batch.length > 1) {
          var mid = Math.ceil(batch.length / 2);
          return addBatch(id, batch.slice(0, mid), res).then(function () { return addBatch(id, batch.slice(mid), res); });
        }
        res.failed++; done++;
        if (!res.firstError) res.firstError = error && error.message ? error.message : String(error);
        progress({ done: done, total: grand, layer: LABELS[id] });
      });
    }
    plan.forEach(function (id) {
      chain = chain.then(function () {
        var feats = data[id], res = { added: 0, failed: 0, firstError: "" };
        summary.layers[LABELS[id]] = res;
        return chunks(feats, 75).reduce(function (p, batch) {
          return p.then(function () { return addBatch(id, batch, res); });
        }, Promise.resolve());
      });
    });
    return chain.then(function () { return summary; });
  }
  function counts(ctx) {
    var out = {}, chain = Promise.resolve();
    Object.keys(LABELS).forEach(function (id) {
      chain = chain.then(function () {
        var where = id >= 7 ? "source LIKE '" + STATS_SOURCE + "%'" : "incident_id LIKE '" + PREFIX + "%'";
        return post(ctx, ROOT + "/" + id + "/query", { where: where, returnCountOnly: true }).then(function (r) { out[LABELS[id]] = r.count; });
      });
    });
    return chain.then(function () { out.total = Object.keys(out).reduce(function (s, k) { return s + out[k]; }, 0); return out; });
  }
  function deleteAll(ctx) {
    var out = {}, chain = Promise.resolve(), progress = ctx.onProgress || function () { };
    Object.keys(LABELS).forEach(function (id) {
      chain = chain.then(function () {
        var where = id >= 7 ? "source LIKE '" + STATS_SOURCE + "%'" : "incident_id LIKE '" + PREFIX + "%'";
        return post(ctx, ROOT + "/" + id + "/deleteFeatures", { where: where, rollbackOnFailure: false }).then(function (r) {
          out[LABELS[id]] = (r.deleteResults || []).filter(function (x) { return x.success; }).length; progress({ layer: LABELS[id] });
        });
      });
    });
    return chain.then(function () { out.total = Object.keys(out).reduce(function (s, k) { return s + out[k]; }, 0); return out; });
  }
  global.SARSynthetic = { ROOT: ROOT, PREFIX: PREFIX, build: build, generate: generate, counts: counts, deleteAll: deleteAll };
})(window);
