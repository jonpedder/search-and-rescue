/* Normalize action order across Planning, Operations and Settings. */
(function () {
  "use strict";
  var host = document.querySelector(".status-row") || document.querySelector(".header-actions") || document.querySelector(".header .actions");
  if (!host) return;
  var byHref = function (ending) { return Array.from(host.querySelectorAll("a,calcite-button")).find(function (el) { return (el.getAttribute("href") || "").endsWith(ending); }); };
  function nav(id, href, icon, label) {
    var el = byHref(href.replace("./", "")) || document.getElementById(id);
    if (!el) { el = document.createElement("calcite-button"); el.setAttribute("href", href); el.setAttribute("appearance", "outline-fill"); el.setAttribute("kind", "brand"); el.setAttribute("scale", "m"); }
    el.id = id; el.classList.remove("header-icon-button"); el.setAttribute("icon-start", icon); el.setAttribute("title", label); el.setAttribute("aria-label", label); el.textContent = label; return el;
  }
  var reports = document.getElementById("sarReportsControl");
  var planning = nav("sarPlanningNav", "./index.html", "analysis", "SAR Planning");
  var operations = nav("sarOperationsNav", "./operations.html", "map-pin", "SAR Operations");
  var session = document.getElementById("sarSessionArea");
  var settings = nav("sarSettingsNav", "./settings.html", "gear", "Settings");
  host.querySelectorAll(":scope > .badge").forEach(function (badge) { badge.hidden = true; });
  [reports, planning, operations, session, settings].forEach(function (el) { if (el) host.appendChild(el); });
  host.classList.add("sar-header-actions-ready");
})();
