/* Shared ArcGIS sign-in UI for Planning, Operations and Settings. */
(function () {
  "use strict";
  if (document.getElementById("sarSessionArea")) return;
  var PORTAL = "https://publicsafety.maps.arcgis.com";
  var APP_KEY = "sar.oauth.appId";
  var LEGACY_KEY = "sar.synthetic.appId";
  var appId = (localStorage.getItem(APP_KEY) || localStorage.getItem(LEGACY_KEY) || (window.SARSettings && window.SARSettings.OAUTH_CLIENT_ID) || "").trim();
  var host = document.querySelector(".status-row") || document.querySelector(".header-actions") || document.querySelector(".header .actions");
  if (!host) return;

  var area = document.createElement("div");
  area.className = "sar-session-area";
  area.id = "sarSessionArea";
  area.innerHTML = '<div class="sar-user-chip" title="ArcGIS account"><span class="sar-user-dot" id="sarSessionDot"></span><span id="sarSessionUser">Not signed in</span></div>' +
    '<calcite-button id="sarSessionButton" appearance="outline-fill" kind="brand" scale="m" icon-start="user">Sign in</calcite-button>';
  var settingsButton = Array.from(host.querySelectorAll("a,calcite-button")).find(function (el) { return /settings/i.test(el.getAttribute("href") || el.getAttribute("title") || ""); });
  host.insertBefore(area, settingsButton || null);

  var button = document.getElementById("sarSessionButton"), userLabel = document.getElementById("sarSessionUser"), dot = document.getElementById("sarSessionDot");
  var state = { user: null, portal: null, configured: !!appId };
  window.__sarAuth = state;
  function publish() { window.dispatchEvent(new CustomEvent("sar-auth-change", { detail: { user: state.user, portal: state.portal, configured: state.configured } })); }
  function signedOut(message) { state.user = null; state.portal = null; userLabel.textContent = message || "Not signed in"; button.textContent = "Sign in"; button.iconStart = "user"; dot.classList.remove("online"); publish(); }
  function signedIn(portal) {
    state.portal = portal; state.user = portal.user;
    userLabel.textContent = portal.user.fullName || portal.user.username;
    userLabel.title = (portal.user.fullName ? portal.user.fullName + " (" + portal.user.username + ")" : portal.user.username) + " - " + (portal.name || "ArcGIS organization");
    button.textContent = "Sign out"; button.iconStart = "sign-out"; dot.classList.add("online"); publish();
  }
  function configure() {
    if (location.pathname.endsWith("/settings.html")) { document.getElementById("authAppId")?.focus(); document.getElementById("arcgisAuthCard")?.scrollIntoView({ behavior: "smooth", block: "center" }); }
    else location.href = "./settings.html#arcgis-auth";
  }

  if (!appId) {
    userLabel.textContent = "OAuth not configured";
    button.title = "Configure an ArcGIS OAuth app ID in Settings";
    button.onclick = configure;
    publish();
  } else if (typeof window.require !== "function") {
    signedOut("ArcGIS SDK unavailable");
    button.disabled = true;
  } else {
    require(["esri/identity/OAuthInfo", "esri/identity/IdentityManager", "esri/portal/Portal"], function (OAuthInfo, IdentityManager, Portal) {
      var callback = location.origin + location.pathname.replace(/[^/]*$/, "") + "oauth-callback.html";
      var oauthInfo = new OAuthInfo({ appId: appId, portalUrl: PORTAL, popup: false, flowType: "implicit", popupCallbackUrl: callback });
      IdentityManager.registerOAuthInfos([oauthInfo]);
      async function loadUser() { var portal = new Portal({ url: PORTAL, authMode: "immediate" }); await portal.load(); signedIn(portal); }
      button.onclick = async function () {
        if (state.user) { IdentityManager.destroyCredentials(); signedOut(); location.reload(); return; }
        button.loading = true;
        try { await IdentityManager.getCredential(PORTAL + "/sharing"); await loadUser(); }
        catch (error) { signedOut(); if (!/cancel/i.test(error && error.message || "")) alert("ArcGIS sign-in was not completed: " + (error.message || error)); }
        finally { button.loading = false; }
      };
      IdentityManager.checkSignInStatus(PORTAL + "/sharing").then(loadUser).catch(function () { signedOut(); });
      state.IdentityManager = IdentityManager;
    });
  }

  /* Settings owns the OAuth application ID. Keeping it browser-local avoids
     committing a deployment-specific client ID to source control. */
  if (location.pathname.endsWith("/settings.html")) {
    var card = document.createElement("details"); card.className = "card"; card.id = "arcgisAuthCard"; card.open = location.hash === "#arcgis-auth";
    card.innerHTML = '<summary>ArcGIS sign-in</summary><div class="card-body"><p class="help">Register an ArcGIS OAuth application with this site and its <code>oauth-callback.html</code> URL, then save its client ID here. The value stays in this browser and is shared by Planning, Operations and synthetic-data tools.</p>' +
      '<div class="grid"><label class="field">OAuth application client ID<input id="authAppId" autocomplete="off" placeholder="ArcGIS OAuth client ID" value="' + appId.replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }) + '"></label>' +
      '<div class="field"><span>Registered redirect URLs</span><span class="readonly">' + location.origin + location.pathname.replace(/[^/]*$/, "") + '<br>' + location.origin + location.pathname.replace(/[^/]*$/, "") + 'oauth-callback.html</span></div></div>' +
      '<div class="template-tools" style="margin-top:.75rem"><calcite-button id="saveAuthAppId" icon-start="save">Save OAuth client ID</calcite-button><calcite-button id="clearAuthAppId" appearance="outline-fill" icon-start="reset">Use deployment default</calcite-button></div><p class="field-note" id="authConfigStatus"></p></div>';
    var anchor = document.getElementById("syntheticDataCard") || document.querySelector(".action-bar"); anchor.parentNode.insertBefore(card, anchor);
    document.getElementById("saveAuthAppId").onclick = function () {
      var value = document.getElementById("authAppId").value.trim();
      if (!/^[A-Za-z0-9_-]{8,128}$/.test(value)) { document.getElementById("authConfigStatus").textContent = "Enter a valid OAuth client ID."; return; }
      localStorage.setItem(APP_KEY, value); localStorage.setItem(LEGACY_KEY, value); location.reload();
    };
    document.getElementById("clearAuthAppId").onclick = function () { localStorage.removeItem(APP_KEY); localStorage.removeItem(LEGACY_KEY); if (state.IdentityManager) state.IdentityManager.destroyCredentials(); location.reload(); };
  }
})();
