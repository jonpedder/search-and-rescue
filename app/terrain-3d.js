(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SARTerrain3D = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function addStyles() {
    if (typeof document === "undefined" || document.getElementById("sarTerrain3DStyles")) return;
    var style = document.createElement("style");
    style.id = "sarTerrain3DStyles";
    style.textContent = ".sar-3d-scene{position:absolute;inset:0;z-index:9;display:none;background:#071824}.sar-3d-scene.active{display:block}.sar-3d-toggle{position:absolute;left:15px;bottom:48px;z-index:12;min-width:104px;border:1px solid var(--app-accent,#f2a900);border-radius:3px;background:var(--app-panel,#0c2231);color:var(--app-text,#fff);padding:8px 11px;font:700 12px var(--calcite-sans-family,Arial,sans-serif);box-shadow:0 2px 8px #0008;cursor:pointer}.sar-3d-toggle:hover,.sar-3d-toggle[aria-pressed=true]{background:var(--app-accent,#f2a900);color:#071824}.sar-3d-toggle:focus-visible{outline:2px solid var(--calcite-color-focus,#8bd3ff);outline-offset:2px}@media(max-width:600px){.sar-3d-toggle{left:8px;bottom:42px;min-width:88px;padding:7px 8px}}";
    document.head.appendChild(style);
  }

  function init(options) {
    options = options || {};
    var map = options.map, mapView = options.view, SceneView = options.SceneView, Legend = options.Legend, Expand = options.Expand;
    if (!map || !mapView || !SceneView || typeof document === "undefined") throw new Error("Map, MapView and SceneView are required.");
    addStyles();
    var viewNode = mapView.container;
    if (typeof viewNode === "string") viewNode = document.getElementById(viewNode);
    if (!viewNode || !viewNode.parentElement) throw new Error("The 2D map container is unavailable.");
    var host = options.host || viewNode.parentElement;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";

    var sceneNode = document.createElement("div");
    sceneNode.className = "sar-3d-scene";
    sceneNode.setAttribute("aria-label", "3D terrain map");
    var button = document.createElement("button");
    button.type = "button";
    button.className = "sar-3d-toggle";
    button.textContent = "3D Terrain";
    button.title = "View operational layers over ArcGIS World Elevation and imagery";
    button.setAttribute("aria-pressed", "false");
    host.append(sceneNode, button);

    var sceneView = null, active = false, originalBasemap = null, topoLayer = null, topoOpacity = null;
    function findTopo() {
      return map.layers && map.layers.find(function (layer) { return layer && layer.title === "USGS Topo"; });
    }
    async function activate() {
      if (active) return;
      active = true;
      button.disabled = true;
      originalBasemap = map.basemap;
      topoLayer = findTopo();
      topoOpacity = topoLayer ? topoLayer.opacity : null;
      map.ground = "world-elevation";
      map.basemap = "hybrid";
      if (topoLayer && topoLayer.visible) topoLayer.opacity = .55;
      sceneNode.classList.add("active");
      if (!sceneView) {
        sceneView = new SceneView({
          container: sceneNode,
          map: map,
          qualityProfile: "high",
          environment: { lighting: { directShadowsEnabled: true, ambientOcclusionEnabled: true }, atmosphereEnabled: true },
          ui: { components: ["zoom", "navigation-toggle", "compass", "attribution"] }
        });
        await sceneView.when();
        if (Legend) {
          var legend = window.SARMapLegend ? window.SARMapLegend.create({ map: map, view: sceneView, Legend: Legend }) : new Legend({ view: sceneView, respectLayerVisibility: true });
          if (Expand) sceneView.ui.add(new Expand({ id: "sarTerrainLegendExpand", view: sceneView, content: legend, expandTooltip: "Legend", expandIcon: "legend", group: "terrain-tools" }), "top-left");
          else sceneView.ui.add(legend, "bottom-right");
        }
      }
      await sceneView.goTo({ target: mapView.center, scale: mapView.scale, tilt: 60, heading: 0 }, { animate: false });
      button.textContent = "2D Map";
      button.title = "Return to the editable 2D operational map";
      button.setAttribute("aria-pressed", "true");
      button.disabled = false;
      if (options.onChange) options.onChange(true, sceneView);
    }
    async function deactivate() {
      if (!active) return;
      active = false;
      button.disabled = true;
      if (sceneView) {
        try { await mapView.goTo({ center: sceneView.center, scale: sceneView.scale }, { animate: false }); } catch (_) {}
      }
      sceneNode.classList.remove("active");
      if (originalBasemap) map.basemap = originalBasemap;
      if (topoLayer && topoOpacity != null) topoLayer.opacity = topoOpacity;
      button.textContent = "3D Terrain";
      button.title = "View operational layers over ArcGIS World Elevation and imagery";
      button.setAttribute("aria-pressed", "false");
      button.disabled = false;
      if (options.onChange) options.onChange(false, mapView);
    }
    button.addEventListener("click", function () { (active ? deactivate() : activate()).catch(function (error) { active = false; sceneNode.classList.remove("active"); button.disabled = false; button.textContent = "3D unavailable"; button.title = error.message; button.setAttribute("aria-pressed", "false"); console.error("3D terrain view failed", error); }); });
    return { button: button, activate: activate, deactivate: deactivate, get active() { return active; }, get sceneView() { return sceneView; } };
  }

  return { init: init };
});
