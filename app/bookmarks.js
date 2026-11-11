/* Persistent, browser-local ArcGIS bookmarks shared by Planning and Operations. */
(function (global) {
  "use strict";

  const VERSION = 1;
  const MAX_BOOKMARKS = 200;
  const MAX_VIEWPOINT_BYTES = 50000;

  function safeName(value) {
    return String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200);
  }

  function safeViewpoint(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    try {
      const json = JSON.parse(JSON.stringify(value));
      return JSON.stringify(json).length <= MAX_VIEWPOINT_BYTES ? json : null;
    } catch (_) {
      return null;
    }
  }

  function storedEntries(storage, storageKey) {
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : parsed && parsed.version === VERSION && Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [];
      return items.slice(0, MAX_BOOKMARKS).map(function (item) {
        const name = safeName(item && item.name);
        const viewpoint = safeViewpoint(item && item.viewpoint);
        return name && viewpoint ? { name: name, viewpoint: viewpoint } : null;
      }).filter(Boolean);
    } catch (error) {
      console.warn("Ignoring malformed saved map bookmarks for " + storageKey + ".", error);
      return [];
    }
  }

  function init(options) {
    const view = options.view;
    const storage = options.storage || global.localStorage;
    const storageKey = options.storageKey;
    const body = document.createElement("div");
    body.className = "esri-widget sar-bookmarks-panel";
    body.style.cssText = "width:320px;max-width:calc(100vw - 80px);background:var(--calcite-color-foreground-1)";
    const instruction = document.createElement("p");
    instruction.className = "sar-bookmarks-help";
    instruction.style.cssText = "margin:0;padding:10px 12px 0;color:var(--calcite-color-text-2);font-size:12px;line-height:1.35";
    instruction.textContent = "Save the current map view, select a bookmark to return to it, or use Edit to rename, reorder, update, and delete bookmarks. Bookmarks stay in this browser.";
    const widgetNode = document.createElement("div");
    body.append(instruction, widgetNode);

    const widget = new options.Bookmarks({
      view: view,
      container: widgetNode,
      editingEnabled: true,
      visibleElements: { time: false }
    });
    const expand = new options.Expand({
      view: view,
      content: body,
      group: options.group,
      expandTooltip: "Bookmarks",
      collapseTooltip: "Close Bookmarks",
      expandIcon: "bookmark"
    });
    view.ui.add(expand, options.position || "top-left");

    const collection = widget.bookmarks || widget.viewModel.bookmarks;
    const watchHandles = new Map();
    let changeHandle = null;
    let saveTimer = 0;
    let restoring = true;

    function serialize() {
      return collection.toArray().slice(0, MAX_BOOKMARKS).map(function (bookmark) {
        const name = safeName(bookmark.name);
        const viewpoint = safeViewpoint(bookmark.viewpoint && bookmark.viewpoint.toJSON ? bookmark.viewpoint.toJSON() : bookmark.viewpoint);
        return name && viewpoint ? { name: name, viewpoint: viewpoint } : null;
      }).filter(Boolean);
    }

    function saveNow() {
      clearTimeout(saveTimer);
      saveTimer = 0;
      if (restoring) return;
      try {
        storage.setItem(storageKey, JSON.stringify({ version: VERSION, bookmarks: serialize() }));
      } catch (error) {
        console.warn("Map bookmarks could not be saved for " + storageKey + ".", error);
      }
    }

    function scheduleSave() {
      if (restoring) return;
      clearTimeout(saveTimer);
      saveTimer = global.setTimeout(saveNow, 200);
    }

    function unwatch(bookmark) {
      const handles = watchHandles.get(bookmark) || [];
      handles.forEach(function (handle) { handle.remove(); });
      watchHandles.delete(bookmark);
    }

    function watch(bookmark) {
      if (!bookmark || watchHandles.has(bookmark)) return;
      const handles = [bookmark.watch("name", scheduleSave), bookmark.watch("viewpoint", scheduleSave)];
      watchHandles.set(bookmark, handles);
    }

    function reconcileWatches() {
      const current = new Set(collection.toArray());
      Array.from(watchHandles.keys()).forEach(function (bookmark) { if (!current.has(bookmark)) unwatch(bookmark); });
      current.forEach(watch);
    }

    function restore() {
      const entries = storedEntries(storage, storageKey);
      entries.forEach(function (entry) {
        try {
          const bookmark = typeof options.Bookmark.fromJSON === "function" ? options.Bookmark.fromJSON(entry) : new options.Bookmark(entry);
          if (bookmark && bookmark.viewpoint) collection.add(bookmark);
        } catch (error) {
          console.warn("Skipping an invalid saved map bookmark for " + storageKey + ".", error);
        }
      });
      reconcileWatches();
      restoring = false;
      changeHandle = collection.on("change", function () {
        reconcileWatches();
        scheduleSave();
      });
    }

    const ready = view.when().then(function () {
      restore();
      return widget;
    });

    return {
      widget: widget,
      expand: expand,
      collection: collection,
      storageKey: storageKey,
      ready: ready,
      saveNow: saveNow,
      Bookmark: options.Bookmark,
      destroy: function () {
        clearTimeout(saveTimer);
        if (changeHandle) changeHandle.remove();
        Array.from(watchHandles.keys()).forEach(unwatch);
        view.ui.remove(expand);
        expand.destroy();
        widget.destroy();
      }
    };
  }

  global.SARBookmarks = { VERSION: VERSION, init: init, safeName: safeName, storedEntries: storedEntries };
})(window);
