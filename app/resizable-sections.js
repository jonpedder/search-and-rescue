/* Accessible, persistent vertical resizing for workspace content sections. */
(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SARResizableSections = api;
})(typeof window !== "undefined" ? window : null, function (window) {
  "use strict";

  const clampHeight = (value, min, max) => Math.min(Math.max(Number(value), min), Math.max(min, max));
  const finiteHeight = value => {
    const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const pageGroups = [
    { page: /(?:^|\/)index\.html$|\/$/, selector: "#panel .pane", prefix: "planning", media: "(min-width: 861px)", min: 160, max: 1400 },
    { page: /operations\.html$/, selector: "#body > .panel .card", prefix: "operations", media: "(min-width: 901px)", min: 130, max: 1200 },
    { page: /analysis\.html$/, selector: ".analysis-command,.analysis-primary,.analysis-right,.analysis-bottom,.analysis-left .panel-section", prefix: "analysis", media: "(min-width: 1051px)", min: 110, max: 900 }
  ];

  if (!window || !window.document) return { clampHeight, finiteHeight, pageGroups };
  const document = window.document;
  const instances = new Map();
  let observer = null, resizeFrame = 0;

  function slug(value) {
    return String(value || "section").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "section";
  }
  function sectionName(element, index) {
    const heading = element.querySelector(":scope > h1,:scope > h2,:scope > h3,.card-title h3,.list-head h3");
    return slug(element.id || element.getAttribute("aria-label") || heading?.textContent || `section-${index + 1}`);
  }
  function requestLayout() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      try { window.__esriView?.resize?.(); window.__esriView?.requestRender?.(); } catch (_) {}
      window.dispatchEvent(new CustomEvent("sar-layout-resize"));
    });
  }
  function read(key, min, max) {
    let value = null;
    try { value = finiteHeight(window.localStorage.getItem(key)); } catch (_) {}
    return value == null ? null : clampHeight(value, min, max);
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, String(Math.round(value))); } catch (_) {}
  }
  function remove(key) {
    try { window.localStorage.removeItem(key); } catch (_) {}
  }
  function maxFor(instance) {
    return Math.max(instance.group.min, Math.min(instance.group.max, Math.max(360, window.innerHeight * 1.35)));
  }
  function measuredHeight(instance) {
    return clampHeight(instance.element.getBoundingClientRect().height || instance.group.min, instance.group.min, maxFor(instance));
  }
  function updateAria(instance) {
    const value = instance.height == null ? measuredHeight(instance) : instance.height;
    instance.handle.setAttribute("aria-valuemin", String(instance.group.min));
    instance.handle.setAttribute("aria-valuemax", String(Math.round(maxFor(instance))));
    instance.handle.setAttribute("aria-valuenow", String(Math.round(value)));
  }
  function apply(instance, value, persist) {
    const height = clampHeight(value, instance.group.min, maxFor(instance));
    instance.height = height;
    instance.element.style.height = Math.round(height) + "px";
    updateAria(instance);
    if (persist) write(instance.key, height);
    requestLayout();
    return height;
  }
  function reset(instance) {
    instance.height = null;
    instance.element.style.removeProperty("height");
    remove(instance.key);
    updateAria(instance);
    requestLayout();
  }
  function refresh(instance) {
    instance.active = window.matchMedia(instance.group.media).matches;
    instance.handle.hidden = !instance.active;
    instance.element.classList.toggle("sar-resizable-section", instance.active);
    if (!instance.active) {
      instance.element.style.removeProperty("height");
      instance.height = null;
    } else if (!instance.dragging) {
      const saved = read(instance.key, instance.group.min, maxFor(instance));
      if (saved != null) apply(instance, saved, false);
      else updateAria(instance);
    }
  }
  function finish(instance, event) {
    if (!instance.dragging) return;
    instance.dragging = false;
    instance.handle.classList.remove("is-dragging");
    document.documentElement.classList.remove("sar-resizing-vertical");
    try { instance.handle.releasePointerCapture(event.pointerId); } catch (_) {}
    write(instance.key, instance.height);
    requestLayout();
  }
  function attach(group, element, key, label) {
    const existing = instances.get(key);
    if (existing?.element === element && existing.handle.isConnected) { refresh(existing); return; }
    if (existing) existing.handle.remove();
    const handle = document.createElement("div");
    handle.className = "sar-section-resize-handle";
    handle.dataset.resizeSection = key;
    handle.tabIndex = 0;
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "horizontal");
    handle.setAttribute("aria-label", `Resize ${label} section`);
    handle.title = "Drag to resize section; double-click to fit content";
    const indicator = document.createElement("span");
    indicator.className = "sar-section-resize-indicator";
    indicator.setAttribute("aria-hidden", "true");
    indicator.textContent = "⋯";
    handle.appendChild(indicator);
    element.appendChild(handle);
    const instance = { group, element, handle, key, height: null, active: false, dragging: false, startY: 0, startHeight: 0 };
    instances.set(key, instance);

    handle.addEventListener("pointerdown", event => {
      if (!instance.active || event.button !== 0) return;
      instance.dragging = true;
      instance.startY = event.clientY;
      instance.startHeight = instance.height == null ? measuredHeight(instance) : instance.height;
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      handle.classList.add("is-dragging");
      document.documentElement.classList.add("sar-resizing-vertical");
      event.preventDefault();
    });
    handle.addEventListener("pointermove", event => {
      if (!instance.dragging) return;
      apply(instance, instance.startHeight + event.clientY - instance.startY, false);
      event.preventDefault();
    });
    handle.addEventListener("pointerup", event => finish(instance, event));
    handle.addEventListener("pointercancel", event => finish(instance, event));
    handle.addEventListener("dblclick", event => { event.preventDefault(); reset(instance); });
    handle.addEventListener("keydown", event => {
      if (!instance.active) return;
      const current = instance.height == null ? measuredHeight(instance) : instance.height;
      const step = event.shiftKey ? 50 : 10;
      let next = null;
      if (event.key === "ArrowUp") next = current - step;
      else if (event.key === "ArrowDown") next = current + step;
      else if (event.key === "Home") next = group.min;
      else if (event.key === "End") next = maxFor(instance);
      if (next == null) return;
      event.preventDefault();
      apply(instance, next, true);
    });
    refresh(instance);
  }
  function scan() {
    const path = window.location.pathname;
    for (const group of pageGroups) {
      if (!group.page.test(path)) continue;
      document.querySelectorAll(group.selector).forEach((element, index) => {
        const name = sectionName(element, index);
        attach(group, element, `sar.layout.section.${group.prefix}.${name}.${index}.v1`, name.replace(/-/g, " "));
      });
    }
  }
  function resetAll() { instances.forEach(reset); }
  function init() {
    scan();
    if (!observer) observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("resize", () => instances.forEach(refresh));
    window.__app = window.__app || {};
    window.__app.sections = { scan, reset: resetAll, instances };
    return window.__app.sections;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
  return { clampHeight, finiteHeight, pageGroups, init, scan, reset: resetAll, instances };
});
