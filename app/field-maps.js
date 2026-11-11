(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SARFieldMaps = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var APP_URL = "https://fieldmaps.arcgis.app/";

  function requireValue(value, label) {
    var clean = String(value || "").trim();
    if (!clean) throw new Error(label + " is required.");
    return clean;
  }

  function base(config, referenceContext) {
    config = config || {};
    var url = new URL(APP_URL);
    url.searchParams.set("referenceContext", referenceContext);
    url.searchParams.set("itemID", requireValue(config.webMapItemId, "Web Map item ID"));
    url.searchParams.set("portalURL", requireValue(config.portalUrl, "Portal URL"));
    return url;
  }

  function openMap(config) {
    return base(config, "open").toString();
  }

  function addFeature(config, layerId, attributes) {
    var url = base(config, "addFeature");
    var serviceRoot = requireValue(config && config.serviceRoot, "Feature service URL").replace(/\/$/, "");
    url.searchParams.set("featureSourceURL", serviceRoot + "/" + Number(layerId));
    if (attributes && Object.keys(attributes).length) {
      var safe = {};
      Object.keys(attributes).forEach(function (key) {
        var value = attributes[key];
        if (value !== undefined && value !== null && value !== "") safe[key] = value;
      });
      if (Object.keys(safe).length) url.searchParams.set("defaultAttributes", JSON.stringify(safe));
    }
    return url.toString();
  }

  function clue(config, incidentId, foundBy, foundTime) {
    return addFeature(config, 3, {
      incident_id: String(incidentId || "").trim(),
      found_by: String(foundBy || "").trim(),
      found_time: foundTime || Date.now()
    });
  }

  function track(config, incidentId, teamName, taskId, started) {
    return addFeature(config, 4, {
      incident_id: String(incidentId || "").trim(),
      team_name: String(teamName || "").trim(),
      task_id: String(taskId || "").trim(),
      started: started || Date.now()
    });
  }

  return { APP_URL: APP_URL, openMap: openMap, addFeature: addFeature, clue: clue, track: track };
});
