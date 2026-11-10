/* Settings & Help information architecture based on the Resource & Asset Management settings workspace. */
(function () {
  "use strict";
  var main = document.querySelector("main"), oldPanel = document.getElementById("configurationPanel"), helpPanel = document.getElementById("helpPanel"), tabsWrap = document.querySelector(".tabs-wrap");
  if (!main || !oldPanel || !helpPanel || !tabsWrap || document.getElementById("preferencesPanel")) return;

  oldPanel.id = "preferencesPanel"; oldPanel.setAttribute("role", "tabpanel"); oldPanel.setAttribute("aria-labelledby", "preferencesTab");
  var intro = oldPanel.querySelector(".intro"); if (intro) intro.innerHTML = '<h2>Application settings</h2><p>Configure browser-local presentation, map, workspace and model defaults. Save only after reviewing the draft.</p>';

  var titlebar = document.createElement("div"); titlebar.className = "sar-page-titlebar";
  titlebar.innerHTML = '<div><h1>Settings &amp; Help</h1><p>Manage application preferences, review deployment configuration and follow the operator workflow.</p></div>';
  tabsWrap.parentNode.insertBefore(titlebar, tabsWrap);

  tabsWrap.innerHTML = '<nav id="settingsTabs" class="sar-settings-tabs" role="tablist" aria-label="Settings sections">' +
    '<button id="preferencesTab" class="sar-settings-tab active" type="button" role="tab" aria-selected="true" aria-controls="preferencesPanel">Settings</button>' +
    '<button id="configurationTab" class="sar-settings-tab" type="button" role="tab" aria-selected="false" aria-controls="configurationPanel">Configuration</button>' +
    '<button id="helpTab" class="sar-settings-tab" type="button" role="tab" aria-selected="false" aria-controls="helpPanel">Help &amp; How-to</button></nav>';

  var configPanel = document.createElement("section"); configPanel.id = "configurationPanel"; configPanel.className = "panel sar-configuration-panel"; configPanel.hidden = true; configPanel.setAttribute("role", "tabpanel"); configPanel.setAttribute("aria-labelledby", "configurationTab");
  configPanel.innerHTML = '<div class="intro"><h2>Deployment configuration</h2><p>Review ArcGIS connections, authentication, layer assignments and test-data administration.</p></div>' +
    '<div class="sar-config-callout"><strong>Browser-local overrides:</strong> The OAuth client ID and generated test-data controls use this browser. OAuth tokens and secrets are never stored in application settings.</div>';
  main.insertBefore(configPanel, helpPanel);

  function cardBySummary(text) { return Array.from(oldPanel.querySelectorAll("details.card")).find(function (card) { return card.querySelector("summary")?.textContent.trim() === text; }); }
  var arcgis = cardBySummary("ArcGIS configuration"), auth = document.getElementById("arcgisAuthCard"), synthetic = document.getElementById("syntheticDataCard");
  if (arcgis) { arcgis.querySelector("summary").textContent = "Data connections and layers"; arcgis.open = true; configPanel.appendChild(arcgis); }
  if (auth) { auth.open = true; configPanel.appendChild(auth); }
  if (synthetic) configPanel.appendChild(synthetic);

  var diagnostics = document.createElement("details"); diagnostics.className = "card"; diagnostics.id = "deploymentDiagnostics"; diagnostics.open = true;
  diagnostics.innerHTML = '<summary>Deployment diagnostics</summary><div class="card-body"><dl class="sar-config-list" id="sarConfigList"></dl><div class="template-tools"><calcite-button id="refreshDiagnostics" appearance="outline-fill" icon-start="refresh">Refresh diagnostics</calcite-button></div></div>';
  configPanel.appendChild(diagnostics);
  function diag(label, value) { return '<dt>' + label + '</dt><dd>' + value + '</dd>'; }
  function refreshDiagnostics() {
    var cfg = window.SARSettings || {}, authState = window.__sarAuth || {}, appId = localStorage.getItem("sar.oauth.appId") || cfg.OAUTH_CLIENT_ID || "Not configured";
    var rows = "";
    rows += diag("Portal", "https://publicsafety.maps.arcgis.com");
    rows += diag("OAuth client ID", appId);
    rows += diag("Authenticated user", authState.user ? (authState.user.fullName || authState.user.username) : "Not signed in");
    rows += diag("Web Map item", "5bd5bbf575794e9c9565abcb20feb991");
    rows += diag("Hosted feature service item", "d63935292bb648129cb66ad8f2b45d81");
    rows += diag("Feature service", "SAR_LPB_Incident_Data / FeatureServer");
    rows += diag("Spatial layers", "Incident (0), KeyPoints (1), SearchSegment (2), Clue (3), TrackLog (4)");
    rows += diag("Related tables", "Task (5), ModelRun (6), LPB_Stats (7), SurvivabilityCurve (8)");
    rows += diag("Browser settings", localStorage.getItem(cfg.STORAGE_KEY || "sar-workbench-settings-v1") ? "Saved override present" : "Using deployment defaults");
    rows += diag("Network", navigator.onLine ? "Online" : "Offline");
    document.getElementById("sarConfigList").innerHTML = rows;
  }
  document.getElementById("refreshDiagnostics").onclick = refreshDiagnostics; window.addEventListener("sar-auth-change", refreshDiagnostics); refreshDiagnostics();

  var actionBar = document.querySelector(".action-bar");
  if (actionBar) {
    var apply = document.getElementById("apply"), discard = document.getElementById("discard"), reset = document.getElementById("reset"), save = document.getElementById("save");
    if (apply) apply.hidden = true; if (discard) discard.hidden = true;
    if (reset) { reset.textContent = "Reset to defaults"; reset.iconStart = "reset"; actionBar.appendChild(reset); }
    if (save) { save.textContent = "Save settings"; actionBar.appendChild(save); }
    document.body.appendChild(actionBar);
  }

  function select(name, updateHash) {
    var panels = { settings: oldPanel, configuration: configPanel, help: helpPanel };
    Object.keys(panels).forEach(function (key) { panels[key].hidden = key !== name; });
    Array.from(document.querySelectorAll(".sar-settings-tab")).forEach(function (button) { var active = button.id === (name === "settings" ? "preferencesTab" : name + "Tab"); button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
    if (updateHash !== false) history.replaceState(null, "", name === "settings" ? "#settings" : "#" + name);
    if (name === "configuration") refreshDiagnostics();
  }
  document.querySelectorAll(".sar-settings-tab").forEach(function (button) { button.onclick = function () { select(button.id === "preferencesTab" ? "settings" : button.id.replace("Tab", "")); }; });
  window.addEventListener("hashchange", function () { select(location.hash.startsWith("#help") ? "help" : location.hash.startsWith("#configuration") || location.hash === "#arcgis-auth" ? "configuration" : "settings", false); });
  select(location.hash.startsWith("#help") ? "help" : location.hash.startsWith("#configuration") || location.hash === "#arcgis-auth" ? "configuration" : "settings", false);
})();
