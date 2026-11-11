const { test, expect } = require("@playwright/test");

for (const pageInfo of [
  { name: "Planning", url: "/index.html", key: "sar.bookmarks.planning.v1", otherKey: "sar.bookmarks.operations.v1" },
  { name: "Operations", url: "/operations.html", key: "sar.bookmarks.operations.v1", otherKey: "sar.bookmarks.planning.v1" }
]) {
  test(`${pageInfo.name} bookmarks are editable, scoped, persisted, and restored`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    test.skip(testInfo.project.name.includes("mobile"), "Desktop covers the shared bookmark implementation.");
    await page.addInitScript(({ key }) => { if (!sessionStorage.getItem("bookmark-malformed-seeded")) { localStorage.setItem(key, "{malformed legacy data"); sessionStorage.setItem("bookmark-malformed-seeded", "1"); } }, { key: pageInfo.key });
    await page.goto(pageInfo.url);
    await page.waitForFunction(() => window.__esriView?.ready && window.__app?.bookmarks?.ready);
    await page.evaluate(async () => { await window.__app.bookmarks.ready; return true; });

    const contract = await page.evaluate(() => ({
      editingEnabled: window.__app.bookmarks.widget.editingEnabled,
      expanded: window.__app.bookmarks.expand.expanded,
      key: window.__app.bookmarks.storageKey,
      restoredCount: window.__app.bookmarks.collection.length,
      help: document.querySelector(".sar-bookmarks-help")?.textContent || ""
    }));
    expect(contract.editingEnabled).toBe(true);
    expect(contract.expanded).toBe(false);
    expect(contract.key).toBe(pageInfo.key);
    expect(contract.restoredCount).toBe(0);
    expect(contract.help).toContain("Save the current map view");

    await page.evaluate(() => {
      const state = window.__app.bookmarks;
      state.collection.add(new state.Bookmark({ name: "Command view", viewpoint: window.__esriView.viewpoint.clone() }));
      state.saveNow();
    });
    const saved = await page.evaluate(({ key, otherKey }) => ({
      current: JSON.parse(localStorage.getItem(key)),
      other: localStorage.getItem(otherKey)
    }), { key: pageInfo.key, otherKey: pageInfo.otherKey });
    expect(saved.current.version).toBe(1);
    expect(saved.current.bookmarks).toHaveLength(1);
    expect(saved.current.bookmarks[0].name).toBe("Command view");
    expect(saved.current.bookmarks[0].viewpoint).toBeTruthy();
    expect(saved.current.bookmarks[0].thumbnail).toBeUndefined();
    expect(saved.other).toBeNull();

    await page.reload();
    await page.waitForFunction(() => window.__app?.bookmarks?.collection?.length === 1);
    expect(await page.evaluate(() => window.__app.bookmarks.collection.getItemAt(0).name)).toBe("Command view");
  });
}
