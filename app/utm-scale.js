/* UTM coordinate scales for the bottom and right edges of every interactive map and report map. */
(function (global) {
  "use strict";

  function zoneFor(lat, lon) {
    var zone = Math.floor((lon + 180) / 6) + 1;
    if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) zone = 32;
    if (lat >= 72 && lat < 84) {
      if (lon >= 0 && lon < 9) zone = 31;
      else if (lon < 21) zone = 33;
      else if (lon < 33) zone = 35;
      else if (lon < 42) zone = 37;
    }
    return Math.max(1, Math.min(60, zone));
  }

  function toUtm(lat, lon) {
    lat = Number(lat); lon = Number(lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -80 || lat > 84 || lon < -180 || lon > 180) return null;
    var a = 6378137, eccSquared = 0.00669438, k0 = 0.9996, zone = zoneFor(lat, lon), longOrigin = (zone - 1) * 6 - 180 + 3;
    var latRad = lat * Math.PI / 180, lonRad = lon * Math.PI / 180, originRad = longOrigin * Math.PI / 180;
    var eccPrimeSquared = eccSquared / (1 - eccSquared), N = a / Math.sqrt(1 - eccSquared * Math.sin(latRad) * Math.sin(latRad));
    var T = Math.tan(latRad) * Math.tan(latRad), C = eccPrimeSquared * Math.cos(latRad) * Math.cos(latRad), A = Math.cos(latRad) * (lonRad - originRad);
    var M = a * ((1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256) * latRad
      - (3 * eccSquared / 8 + 3 * eccSquared * eccSquared / 32 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(2 * latRad)
      + (15 * eccSquared * eccSquared / 256 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(4 * latRad)
      - (35 * eccSquared * eccSquared * eccSquared / 3072) * Math.sin(6 * latRad));
    var easting = k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6 + (5 - 18 * T + T * T + 72 * C - 58 * eccPrimeSquared) * Math.pow(A, 5) / 120) + 500000;
    var northing = k0 * (M + N * Math.tan(latRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 + (61 - 58 * T + T * T + 600 * C - 330 * eccPrimeSquared) * Math.pow(A, 6) / 720));
    if (lat < 0) northing += 10000000;
    return { zone: zone, hemisphere: lat >= 0 ? "N" : "S", easting: easting, northing: northing };
  }

  function pointLatLon(point) {
    if (!point) return null;
    var lat = point.latitude, lon = point.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat: lat, lon: lon };
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 180 || Math.abs(point.y) > 90) return null;
    return { lat: point.y, lon: point.x };
  }

  function label(number) { return Math.round(number).toLocaleString("en-US"); }

  function attach(view, options) {
    options = options || {};
    if (!view || !view.container) return null;
    var root = document.createElement("div");
    root.className = "sar-utm-scale";
    root.setAttribute("aria-label", "UTM coordinate scales along the bottom and right map edges");
    root.innerHTML = '<div class="sar-utm-bottom" aria-hidden="true"></div><div class="sar-utm-right" aria-hidden="true"></div><div class="sar-utm-zone" aria-hidden="true"></div><span class="sr-only sar-utm-description"></span>';
    if (getComputedStyle(view.container).position === "static") view.container.style.position = "relative";
    root.style.width = "100%"; root.style.height = "100%";
    view.container.appendChild(root);
    var bottom = root.querySelector(".sar-utm-bottom"), right = root.querySelector(".sar-utm-right"), zoneNode = root.querySelector(".sar-utm-zone"), description = root.querySelector(".sar-utm-description");
    bottom.style.setProperty("position", "absolute", "important"); bottom.style.setProperty("bottom", "0px", "important"); bottom.style.setProperty("top", "auto", "important");
    right.style.setProperty("position", "absolute", "important"); right.style.setProperty("right", "0px", "important"); right.style.setProperty("left", "auto", "important"); right.style.setProperty("top", "0px", "important"); right.style.setProperty("bottom", "var(--sar-utm-edge-height,23px)", "important");
    zoneNode.style.setProperty("position", "absolute", "important"); zoneNode.style.setProperty("right", "0px", "important"); zoneNode.style.setProperty("left", "auto", "important"); zoneNode.style.setProperty("bottom", "0px", "important"); zoneNode.style.setProperty("top", "auto", "important");
    var frame = 0, handles = [];

    function render() {
      frame = 0;
      if (!view.ready || !view.width || !view.height) return;
      var fractions = options.fractions || [.1, .3, .5, .7, .9], bottomRows = [], rightRows = [];
      fractions.forEach(function (fraction) {
        var lower = pointLatLon(view.toMap({ x: view.width * fraction, y: Math.max(0, view.height - 2) })), side = pointLatLon(view.toMap({ x: Math.max(0, view.width - 2), y: view.height * fraction }));
        var lowerUtm = lower && toUtm(lower.lat, lower.lon), sideUtm = side && toUtm(side.lat, side.lon);
        if (lowerUtm) bottomRows.push('<span style="left:' + (fraction * 100) + '%"><i></i><b>' + label(lowerUtm.easting) + ' E</b></span>');
        if (sideUtm) rightRows.push('<span style="top:' + (fraction * 100) + '%"><i></i><b>' + label(sideUtm.northing) + ' N</b></span>');
      });
      var center = pointLatLon(view.center), centerUtm = center && toUtm(center.lat, center.lon);
      bottom.innerHTML = bottomRows.join(""); right.innerHTML = rightRows.join("");
      zoneNode.textContent = centerUtm ? "UTM " + centerUtm.zone + centerUtm.hemisphere : "UTM unavailable";
      description.textContent = centerUtm ? "Map center UTM zone " + centerUtm.zone + centerUtm.hemisphere + ", easting " + label(centerUtm.easting) + " metres, northing " + label(centerUtm.northing) + " metres." : "UTM coordinates are unavailable outside the supported latitude range.";
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(render); }
    if (view.watch) {
      handles.push(view.watch("stationary", function (stationary) { if (stationary) schedule(); }));
      handles.push(view.watch("size", schedule));
    }
    view.when(schedule);
    return { element: root, update: schedule, destroy: function () { if (frame) cancelAnimationFrame(frame); handles.forEach(function (handle) { handle.remove(); }); root.remove(); } };
  }

  global.SARUtmScale = { toUtm: toUtm, zoneFor: zoneFor, attach: attach, label: label };
  if (typeof module === "object" && module.exports) module.exports = global.SARUtmScale;
})(typeof window !== "undefined" ? window : globalThis);
