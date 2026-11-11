/* Shared, accessible sidebar resizing for Planning, Operations, Analysis and Help. */
(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SARResizablePanels = api;
})(typeof window !== "undefined" ? window : null, function (window) {
  "use strict";

  const clamp = (value, min, max) => Math.min(Math.max(Number(value), min), Math.max(min, max));
  const finiteWidth = value => {
    const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const pageConfigs = [
    { id: "planning-left", selector: "#panel", page: /(?:^|\/)index\.html$|\/$/, side: "left", key: "sar.layout.planning.left.v1", variable: "--sar-planning-left", variableTarget: "#body", container: "#body", peers: ["planning-right"], min: 280, max: 520, defaultWidth: 410, media: "(min-width: 861px)", label: "Resize Planning workflow panel" },
    { id: "planning-right", selector: "#planningAssignmentPanel", page: /(?:^|\/)index\.html$|\/$/, side: "right", key: "sar.layout.planning.right.v1", variable: "--sar-planning-right", variableTarget: "#body", container: "#body", peers: ["planning-left"], min: 280, max: 500, defaultWidth: 360, media: "(min-width: 861px)", label: "Resize Assignment and Asset Design panel" },
    { id: "operations-left", selector: "#body > .panel", page: /operations\.html$/, side: "left", key: "sar.layout.operations.left.v1", variable: "--sar-operations-left", variableTarget: "#body", container: "#body", min: 300, max: 560, defaultWidth: 390, media: "(min-width: 901px)", label: "Resize Operations workflow panel" },
    { id: "operations-layers", selector: "#opsLayerPanel", page: /operations\.html$/, side: "right", key: "sar.layout.operations.layers.v1", variable: "--sar-operations-layers", variableTarget: "#opsLayerPanel", container: ".map-shell", min: 220, max: 460, defaultWidth: 285, media: "(min-width: 901px)", inactiveClass: "collapsed", floating: true, label: "Resize Operational Layers panel" },
    { id: "analysis-left", selector: ".analysis-left", page: /analysis\.html$/, side: "left", key: "sar.layout.analysis.left.v1", variable: "--sar-analysis-left", variableTarget: "#analysisRoot", container: "#analysisRoot", peers: ["analysis-right"], min: 240, max: 460, defaultWidth: 310, media: "(min-width: 651px)", label: "Resize Incident Analysis filters panel" },
    { id: "analysis-right", selector: ".analysis-right", page: /analysis\.html$/, side: "right", key: "sar.layout.analysis.right.v1", variable: "--sar-analysis-right", variableTarget: "#analysisRoot", container: "#analysisRoot", peers: ["analysis-left"], min: 300, max: 520, defaultWidth: 370, media: "(min-width: 1051px)", label: "Resize Incident Analysis analytics panel" },
    { id: "settings-help", selector: ".help-nav", page: /settings\.html$/, side: "left", key: "sar.layout.settings.help.v1", variable: "--sar-settings-help", variableTarget: ".help-layout", container: ".help-layout", min: 190, max: 360, defaultWidth: 230, media: "(min-width: 721px)", label: "Resize Help topics panel" }
  ];

  if (!window || !window.document) return { clamp, finiteWidth, pageConfigs };
  const document = window.document;
  const instances = new Map();
  let observer = null, resizeFrame = 0;

  function storageRead(config) {
    let value = null;
    try { value = finiteWidth(window.localStorage.getItem(config.key)); } catch (_) {}
    return value == null ? config.defaultWidth : clamp(value, config.min, config.max);
  }
  function storageWrite(config, value) {
    try { window.localStorage.setItem(config.key, String(Math.round(value))); } catch (_) {}
  }
  function requestMapResize() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      const view = window.__esriView;
      try { view?.resize?.(); view?.requestRender?.(); } catch (_) {}
      window.dispatchEvent(new CustomEvent("sar-layout-resize"));
    });
  }
  function configActive(config) {
    return window.matchMedia(config.media).matches;
  }
  function effectiveMax(instance) {
    const { config } = instance, container = document.querySelector(config.container);
    let max = config.max;
    if (!container || config.floating) return max;
    const width = container.getBoundingClientRect().width;
    let peerWidths = 0;
    for (const id of config.peers || []) {
      const peer = instances.get(id);
      if (peer?.active) peerWidths += peer.width;
    }
    if (width) max = Math.min(max, width - peerWidths - 360);
    return Math.max(config.min, max);
  }
  function updateAria(instance) {
    const max = effectiveMax(instance);
    instance.handle.setAttribute("aria-valuemin", String(instance.config.min));
    instance.handle.setAttribute("aria-valuemax", String(Math.round(max)));
    instance.handle.setAttribute("aria-valuenow", String(Math.round(instance.width)));
  }
  function applyWidth(instance, requested, persist) {
    const width = clamp(requested, instance.config.min, effectiveMax(instance));
    instance.width = width;
    instance.variableTarget.style.setProperty(instance.config.variable, Math.round(width) + "px");
    updateAria(instance);
    if (persist) storageWrite(instance.config, width);
    requestMapResize();
    return width;
  }
  function clearWidth(instance) {
    instance.variableTarget.style.removeProperty(instance.config.variable);
    requestMapResize();
  }
  function refresh(instance) {
    const inactive = instance.config.inactiveClass && instance.panel.classList.contains(instance.config.inactiveClass);
    instance.active = configActive(instance.config) && !inactive;
    instance.handle.hidden = !instance.active;
    instance.panel.classList.toggle("sar-resizable-panel", instance.active);
    if (instance.active) { if (!instance.dragging) applyWidth(instance, storageRead(instance.config), false); }
    else clearWidth(instance);
  }
  function finishDrag(instance, event) {
    if (!instance.dragging) return;
    instance.dragging = false;
    instance.handle.classList.remove("is-dragging");
    document.documentElement.classList.remove("sar-resizing");
    try { instance.handle.releasePointerCapture(event.pointerId); } catch (_) {}
    storageWrite(instance.config, instance.width);
    requestMapResize();
  }
  function attach(config, panel) {
    const existing = instances.get(config.id);
    if (existing?.panel === panel && existing.handle.isConnected) { refresh(existing); return existing; }
    if (existing) teardown(config.id);
    const variableTarget = document.querySelector(config.variableTarget);
    if (!variableTarget) return null;
    const handle = document.createElement("div");
    handle.className = "sar-resize-handle sar-resize-handle--" + config.side;
    handle.dataset.resizePanel = config.id;
    handle.tabIndex = 0;
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "vertical");
    handle.setAttribute("aria-label", config.label);
    handle.title = "Drag to resize; double-click to reset";
    panel.appendChild(handle);
    const instance = { config, panel, variableTarget, handle, width: storageRead(config), active: false, dragging: false, startX: 0, startWidth: 0 };
    instances.set(config.id, instance);

    handle.addEventListener("pointerdown", event => {
      if (!instance.active || event.button !== 0) return;
      instance.dragging = true; instance.startX = event.clientX; instance.startWidth = instance.width;
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      handle.classList.add("is-dragging"); document.documentElement.classList.add("sar-resizing");
      event.preventDefault();
    });
    handle.addEventListener("pointermove", event => {
      if (!instance.dragging) return;
      const direction = config.side === "left" ? 1 : -1;
      applyWidth(instance, instance.startWidth + direction * (event.clientX - instance.startX), false);
      event.preventDefault();
    });
    handle.addEventListener("pointerup", event => finishDrag(instance, event));
    handle.addEventListener("pointercancel", event => finishDrag(instance, event));
    handle.addEventListener("dblclick", event => { event.preventDefault(); applyWidth(instance, config.defaultWidth, true); });
    handle.addEventListener("keydown", event => {
      if (!instance.active) return;
      const direction = config.side === "left" ? 1 : -1;
      const step = event.shiftKey ? 50 : 10;
      let next = null;
      if (event.key === "ArrowLeft") next = instance.width - direction * step;
      else if (event.key === "ArrowRight") next = instance.width + direction * step;
      else if (event.key === "Home") next = config.min;
      else if (event.key === "End") next = effectiveMax(instance);
      if (next == null) return;
      event.preventDefault(); applyWidth(instance, next, true);
    });
    refresh(instance);
    return instance;
  }
  function teardown(id) {
    const instance = instances.get(id);
    if (!instance) return;
    clearWidth(instance);
    instance.handle.remove();
    instance.panel.classList.remove("sar-resizable-panel");
    instances.delete(id);
  }
  function scan() {
    const path = window.location.pathname;
    for (const config of pageConfigs) {
      if (!config.page.test(path)) continue;
      const panel = document.querySelector(config.selector);
      if (panel) attach(config, panel);
    }
  }
  function reset(id) {
    const targets = id ? [instances.get(id)].filter(Boolean) : [...instances.values()];
    targets.forEach(instance => applyWidth(instance, instance.config.defaultWidth, true));
  }
  function init() {
    scan();
    if (!observer) observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
    window.addEventListener("resize", () => instances.forEach(refresh));
    window.__app = window.__app || {};
    window.__app.layout = { reset, scan, instances, teardown };
    return window.__app.layout;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
  return { clamp, finiteWidth, pageConfigs, init, reset, scan, teardown, instances };
});
