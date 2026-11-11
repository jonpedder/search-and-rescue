(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SARMapLegend = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function layerInfos(map) {
    if (!map || !map.layers) return [];
    return map.layers.toArray().filter(function (layer) {
      return layer && layer.listMode !== "hide" && layer.legendEnabled !== false;
    }).map(function (layer) {
      return { layer: layer, title: layer.title || "Operational layer" };
    });
  }

  function create(options) {
    options = options || {};
    var map = options.map, view = options.view, Legend = options.Legend;
    if (!map || !view || !Legend) throw new Error("Map, view and Legend are required.");
    var legend = new Legend({
      view: view,
      respectLayerVisibility: true,
      layerInfos: layerInfos(map),
      style: { type: "card", layout: "auto" }
    });
    view.__sarLegend = legend;
    var refresh = function () { legend.layerInfos = layerInfos(map); };
    var handle = map.layers.on("change", refresh);
    legend.sarRefresh = refresh;
    legend.sarDestroy = function () { if (handle) handle.remove(); };
    return legend;
  }

  return { create: create, layerInfos: layerInfos };
});
