/* Shared header composition modeled on Resource & Asset Management. */
(function () {
  "use strict";
  var header = document.querySelector("header.app-header") || document.querySelector("header.header");
  var oldHost = document.querySelector(".status-row") || document.querySelector(".header-actions") || document.querySelector(".header .actions");
  if (!header || !oldHost || header.classList.contains("sar-unified-header")) return;
  function findHref(ending) { return Array.from(header.querySelectorAll("a,calcite-button")).find(function (el) { return (el.getAttribute("href") || "").endsWith(ending); }); }
  function nav(id, href, icon, label) {
    var el = findHref(href.replace("./", "")) || document.getElementById(id);
    if (!el) el = document.createElement("calcite-button");
    el.id = id; el.classList.remove("header-icon-button"); el.setAttribute("href", href); el.setAttribute("kind", "brand"); el.setAttribute("scale", "m");
    el.setAttribute("icon-start", icon); el.setAttribute("title", label); el.setAttribute("aria-label", label); el.textContent = label;
    var file = location.pathname.split("/").pop() || "index.html", active = file === href.replace("./", "");
    el.setAttribute("appearance", active ? "solid" : "outline-fill"); if (active) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current"); return el;
  }
  var reports = document.getElementById("sarReportsControl");
  var planning = nav("sarPlanningNav", "./index.html", "analysis", "SAR Planning");
  var operations = nav("sarOperationsNav", "./operations.html", "map-pin", "SAR Operations");
  var analysis = nav("sarAnalysisNav", "./analysis.html", "graph-bar", "Incident Analysis");
  var settings = nav("sarSettingsNav", "./settings.html", "gear", "Settings");
  var session = document.getElementById("sarSessionArea");
  var shield = header.querySelector(".shield");
  if (!shield) { shield = document.createElement("span"); shield.className = "shield"; shield.textContent = "SAR"; }
  shield.classList.add("sar-brand-mark");
  var appSettings = window.SARSettings && window.SARSettings.load ? window.SARSettings.load() : null;
  var brand = document.createElement("a"); brand.className = "sar-brand"; brand.href = "./index.html"; brand.setAttribute("aria-label", "Search & Rescue home");
  var copy = document.createElement("span"); copy.className = "sar-brand-copy";
  copy.innerHTML = '<strong>' + (appSettings?.branding?.appName || "Search & Rescue") + '</strong><span>' + (appSettings?.branding?.subtitle || "Lost Person Behavior Workbench") + '</span>';
  brand.append(shield, copy);
  var primary = document.createElement("nav"); primary.className = "sar-primary-nav"; primary.setAttribute("aria-label", "Primary navigation");
  [reports, planning, operations, analysis].forEach(function (el) { if (el) primary.appendChild(el); });
  if (!session) { session = document.createElement("div"); session.id = "sarSessionArea"; session.className = "sar-session-area"; }
  session.classList.add("sar-session-nav"); session.appendChild(settings);
  var filterBar = null;
  if ((location.pathname.split("/").pop() || "") === "operations.html") {
    var hours = appSettings?.workspace?.operationalPeriodHours || 12;
    filterBar = document.createElement("div"); filterBar.className = "sar-header-filters"; filterBar.setAttribute("aria-label", "Incident and operational period filters");
    filterBar.innerHTML = '<label>Incident number<input id="sarIncidentFilter" list="sarIncidentOptions" placeholder="Enter or find incident"><datalist id="sarIncidentOptions"></datalist></label>' +
      '<label>Operational period<select id="sarPeriodFilter"><option value="all">All operational periods</option><option value="1">OP 1 · ' + hours + ' hours</option></select></label>' +
      '<label class="sar-extent-filter"><input id="sarExtentFilter" type="checkbox"> Current map extent</label>' +
      '<button id="sarFindIncidents" type="button">Find incidents</button><button id="sarApplyFilters" class="primary" type="button">Apply filters</button><span id="sarFilterStatus" role="status"></span>';
    var incidentInput = filterBar.querySelector("#sarIncidentFilter"), periodInput = filterBar.querySelector("#sarPeriodFilter"), extentInput = filterBar.querySelector("#sarExtentFilter"), status = filterBar.querySelector("#sarFilterStatus");
    function applyFilters() { window.dispatchEvent(new CustomEvent("sar-operations-filter", { detail: { incidentId: incidentInput.value.trim(), operationalPeriod: periodInput.value, extentOnly: extentInput.checked } })); }
    filterBar.querySelector("#sarApplyFilters").onclick = applyFilters; incidentInput.onkeydown = function (event) { if (event.key === "Enter") applyFilters(); };
    filterBar.querySelector("#sarFindIncidents").onclick = function () { status.textContent = "Finding incidents..."; window.dispatchEvent(new CustomEvent("sar-find-incidents", { detail: { extentOnly: extentInput.checked } })); };
    window.addEventListener("sar-incident-options", function (event) {
      var detail = event.detail || {}, options = detail.incidents || [], periods = detail.periods || [];
      filterBar.querySelector("#sarIncidentOptions").innerHTML = options.map(function (x) { return '<option value="' + String(x.id || "").replace(/"/g, "&quot;") + '">' + String(x.name || x.status || "") + '</option>'; }).join("");
      if (detail.incidentId) incidentInput.value = detail.incidentId;
      var selected = periodInput.value; periodInput.innerHTML = '<option value="all">All operational periods</option>' + periods.map(function (p) { return '<option value="' + p + '">OP ' + p + ' · ' + hours + ' hours</option>'; }).join(""); periodInput.value = periods.map(String).includes(selected) || selected === "all" ? selected : "all";
      status.textContent = detail.message || (options.length ? options.length + " incident" + (options.length === 1 ? "" : "s") + " found" : "");
    });
  }
  header.className = "sar-unified-header" + (filterBar ? " sar-has-filters" : ""); header.replaceChildren(brand, primary, session); if (filterBar) { header.appendChild(filterBar); setTimeout(function () { window.dispatchEvent(new CustomEvent("sar-request-filter-state")); }, 0); }
  document.body.classList.add("sar-header-configured");
})();
