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
  [reports, planning, operations].forEach(function (el) { if (el) primary.appendChild(el); });
  if (!session) { session = document.createElement("div"); session.id = "sarSessionArea"; session.className = "sar-session-area"; }
  session.classList.add("sar-session-nav"); session.appendChild(settings);
  header.className = "sar-unified-header"; header.replaceChildren(brand, primary, session);
  document.body.classList.add("sar-header-configured");
})();
