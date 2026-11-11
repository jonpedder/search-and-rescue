/* Settings > "Synthetic test data" card. Requires ./synthetic-data.js (window.SARSynthetic).
   Add to settings.html before </body>:
     <script src="./synthetic-data.js"></script>
     <script src="./settings-synthetic.js"></script>                                              */
(function () {
  "use strict";
  if (document.getElementById("syntheticDataCard")) return;
  var PORTAL = "https://publicsafety.maps.arcgis.com", SDK = "https://js.arcgis.com/4.31/@arcgis/core/", APP_KEY = "sar.oauth.appId", LEGACY_APP_KEY = "sar.synthetic.appId";
  var $ = function (id) { return document.getElementById(id); };
  var inProwork = !!(window.__esriAuthCtx && window.__esriAuthCtx.authenticated);

  var card = document.createElement("details");
  card.className = "card"; card.id = "syntheticDataCard";
  card.innerHTML =
    '<summary>Synthetic test data</summary><div class="card-body">' +
    '<p class="help">Placeholder data for demos and testing until real data is available. Generation writes to the hosted <b>SAR Incident Data</b> service: incidents across all 35 subject categories, key points, search segments, clues, assignments (tasks), track logs, model runs and LPB reference rows. Every spatial record is validated with WGS84 geometry before upload. Tasks, model runs and reference rows are nonspatial tables and appear through their incident or segment relationships. Every record is tagged (<code>incident_id</code> starting <code>SYN-</code>, reference rows with source <code>SYNTHETIC_PLACEHOLDER</code>) so <b>Delete all synthetic data</b> removes only generated records.</p>' +
    '<div class="callout warning" style="margin:.5rem 0"><strong>Edits the live ArcGIS service.</strong> Requires sign-in with an account that can edit the service. Synthetic records must not be used operationally.</div>' +
    '<div class="grid">' +
    '<label class="field">Total records to generate <span class="field-note">1,500 to 20,000. Default 5,000.</span><input id="synTotal" type="number" min="1500" max="20000" step="100" value="5000"></label>' +
    '</div>' +
    '<div class="template-tools" style="margin-top:.75rem">' +
    '<calcite-button id="synGenerate" icon-start="map-pin">Generate data &amp; open map</calcite-button>' +
    '<calcite-button id="synCount" appearance="outline-fill" icon-start="refresh">Check counts</calcite-button>' +
    '<calcite-button id="synDelete" appearance="outline-fill" kind="danger" icon-start="trash">Delete all synthetic data</calcite-button>' +
    '</div>' +
    '<div id="synProgressPanel" class="syn-progress-panel" hidden role="status" aria-live="polite">' +
    '<div class="syn-progress-head"><span id="synProgressLabel">Preparing synthetic records...</span><strong id="synProgressPercent">0%</strong></div>' +
    '<calcite-progress id="synProgress" type="determinate" value="0" text="Synthetic data generation progress"></calcite-progress>' +
    '<div id="synProgressDetail" class="field-note">0 of 0 records</div></div>' +
    '<p id="synStatus" role="status" aria-live="polite" class="field-note" style="margin-top:.5rem"></p>' +
    '<div id="synCounts"></div></div>';
  var anchor = document.querySelector(".action-bar");
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor); else document.querySelector("main").appendChild(card);
  var busy = false;
  function status(msg, kind) { var s = $("synStatus"); s.textContent = msg; s.style.color = kind === "error" ? "#ff9aaa" : kind === "ok" ? "#6fdcae" : ""; }
  function setBusy(b) { busy = b; ["synGenerate", "synCount", "synDelete"].forEach(function (id) { $(id).disabled = b; }); }
  function progress(p) {
    var panel = $("synProgressPanel"), bar = $("synProgress"), done = Number(p.done || 0), total = Number(p.total || 0), ratio = total ? Math.max(0, Math.min(1, done / total)) : 0, percent = Math.round(ratio * 100);
    panel.hidden = false;
    if (total) { bar.type = "determinate"; bar.value = ratio; bar.setAttribute("aria-valuenow", String(percent)); $("synProgressPercent").textContent = percent + "%"; $("synProgressDetail").textContent = done.toLocaleString() + " of " + total.toLocaleString() + " records"; }
    else { bar.type = "indeterminate"; $("synProgressPercent").textContent = ""; $("synProgressDetail").textContent = "Working..."; }
    $("synProgressLabel").textContent = p.label || (p.layer ? "Writing " + p.layer : "Preparing synthetic records...");
  }
  function completeProgress(label, total) { var bar = $("synProgress"); $("synProgressPanel").hidden = false; bar.type = "determinate"; bar.value = 1; bar.setAttribute("aria-valuenow", "100"); $("synProgressLabel").textContent = label; $("synProgressPercent").textContent = "100%"; $("synProgressDetail").textContent = Number(total || 0).toLocaleString() + " records processed"; }
  function table(obj) {
    var rows = Object.keys(obj).filter(function (k) { return k !== "total"; }).map(function (k) { return "<tr><td>" + k + "</td><td style=\"text-align:right\">" + Number(obj[k]).toLocaleString() + "</td></tr>"; }).join("");
    $("synCounts").innerHTML = '<table class="scen" style="margin-top:.5rem;max-width:380px"><thead><tr><th>Layer / table</th><th style="text-align:right">Synthetic records</th></tr></thead><tbody>' + rows + '<tr><td><b>Total</b></td><td style="text-align:right"><b>' + Number(obj.total || 0).toLocaleString() + "</b></td></tr></tbody></table>";
  }

  var ctxPromise = null;
  function getCtx() {
    if (ctxPromise) return ctxPromise;
    ctxPromise = (async function () {
      var appId = (localStorage.getItem(APP_KEY) || localStorage.getItem(LEGACY_APP_KEY) || (window.SARSettings && window.SARSettings.OAUTH_CLIENT_ID) || "").trim();
      if (!inProwork && !appId) throw new Error("Configure the ArcGIS OAuth client ID in the ArcGIS sign-in section first.");
      if (appId) { localStorage.setItem(APP_KEY, appId); localStorage.setItem(LEGACY_APP_KEY, appId); }
      if (inProwork && window.__esriAuthReady) await window.__esriAuthReady;
      var req = (await import(SDK + "request.js")).default;
      if (appId) {
        var OAuthInfo = (await import(SDK + "identity/OAuthInfo.js")).default, IM = (await import(SDK + "identity/IdentityManager.js")).default;
        IM.registerOAuthInfos([new OAuthInfo({ appId: appId, portalUrl: PORTAL, popup: true })]);
      }
      return { post: function (url, params) { return req(url, { method: "post", query: params, responseType: "json" }).then(function (r) { return r.data; }); }, onProgress: progress };
    })();
    ctxPromise.catch(function () { ctxPromise = null; });
    return ctxPromise;
  }
  async function run(label, fn) {
    if (busy) return; setBusy(true);
    try { await fn(); } catch (e) { var m = e && e.message ? e.message : String(e); status(label + " failed: " + m, "error"); }
    finally { setBusy(false); setTimeout(function () { $("synProgressPanel").hidden = true; }, 4000); }
  }
  async function refresh() { var c = await SARSynthetic.counts(await getCtx()); table(c); return c; }

  $("synCount").onclick = function () { run("Count", async function () { status("Counting synthetic records..."); progress({ label: "Counting synthetic records" }); var c = await refresh(); completeProgress("Count complete", c.total); status(c.total ? c.total.toLocaleString() + " synthetic records in the service." : "No synthetic records in the service.", "ok"); }); };
  $("synGenerate").onclick = function () {
    var total = Math.round(Number($("synTotal").value));
    if (!(total >= 1500 && total <= 20000)) return status("Enter a total between 1,500 and 20,000.", "error");
    run("Generate", async function () {
      var ctx = await getCtx(), before = await SARSynthetic.counts(ctx);
      if (before.total && !confirm(before.total.toLocaleString() + " synthetic records already exist. Generate " + total.toLocaleString() + " more?")) return;
      if (!confirm("Write " + total.toLocaleString() + " synthetic records to the live SAR Incident Data service?")) return;
      status("Generating " + total.toLocaleString() + " records...");
      progress({ label: "Preparing synthetic records", done: 0, total: total });
      var res = await SARSynthetic.generate(Object.assign({}, ctx, { total: total }));
      var failed = Object.keys(res.layers).reduce(function (s, k) { return s + res.layers[k].failed; }, 0);
      await refresh();
      completeProgress(failed ? "Generation completed with errors" : "Synthetic data generation complete", res.total);
      if (failed) return status("Generated " + (res.total - failed).toLocaleString() + " records; " + failed + " were rejected. The map was not opened. " + (Object.values(res.layers).find(function (x) { return x.firstError; }) || {}).firstError, "error");
      status("Generated " + res.total.toLocaleString() + " records: " + res.spatialRecords.toLocaleString() + " spatial features plus " + res.tableRecords.toLocaleString() + " related table rows. Opening " + res.firstIncidentId + " on the map...", "ok");
      localStorage.setItem("sar.synthetic.lastIncident", res.firstIncidentId);
      setTimeout(function () { location.href = "./operations.html?incident=" + encodeURIComponent(res.firstIncidentId) + "&autoload=1"; }, 700);
    });
  };
  $("synDelete").onclick = function () {
    run("Delete", async function () {
      var ctx = await getCtx(), before = await SARSynthetic.counts(ctx);
      if (!before.total) { table(before); return status("No synthetic data to delete.", "ok"); }
      if (!confirm("Permanently delete " + before.total.toLocaleString() + " synthetic records? Real and DEMO records are not affected.")) return;
      status("Deleting synthetic data..."); progress({ label: "Deleting synthetic records" });
      var res = await SARSynthetic.deleteAll(ctx), after = await SARSynthetic.counts(ctx);
      completeProgress("Synthetic data deletion complete", res.total); table(after);
      status("Deleted " + res.total.toLocaleString() + " synthetic records. " + after.total + " remain.", after.total ? "error" : "ok");
    });
  };
})();
