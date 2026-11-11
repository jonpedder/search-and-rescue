const { test, expect } = require("@playwright/test");
test.setTimeout(90000);

const H = 3600000;
function workspaces() {
  const t = Date.UTC(2025, 0, 10, 8);
  return {
    "sar.operations.I-100": { incident: { id: "I-100", name: "Ridge hiker", category: "Hiker", status: "Closed", lastSeen: t, geometry: { type: "point", x: -118.02, y: 34.14, spatialReference: { wkid: 4326 } } }, records: [{ id: "F1", kind: "find", geometry: { type: "point", x: -117.99, y: 34.15, spatialReference: { wkid: 4326 } }, attrs: { name: "Subject located", pointType: "Find", created: t + 8 * H, operationalPeriod: 1 } }, { id: "C1", kind: "clue", geometry: { type: "point", x: -118, y: 34.14, spatialReference: { wkid: 4326 } }, attrs: { created: t + H, operationalPeriod: 1 } }], assignments: [{ id: "T1", status: "Complete", operationalPeriod: 1, created: t + H }] },
    "sar.operations.I-200": { incident: { id: "I-200", name: "Creek subject", category: "Dementia", status: "Active", lastSeen: t + 24 * H, geometry: { type: "point", x: -117.8, y: 34.2, spatialReference: { wkid: 4326 } } }, records: [], assignments: [] }
  };
}
async function seed(page) {
  const rows = workspaces();
  await page.addInitScript(rows => { localStorage.clear(); Object.entries(rows).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v))); }, rows);
}
async function openReady(page) {
  await seed(page);
  await page.goto("/analysis.html?hosted=off", { waitUntil: "load" });
  await page.waitForFunction(() => window.__app?.analysis?.state?.phase === "ready" && window.__esriView?.ready, null, { timeout: 30000 });
}

test("all-incidents and single-incident workflows stay filter-linked", async ({ page }) => {
  await openReady(page);
  await expect(page.locator("#scopeFilter")).toHaveValue("all");
  await expect(page.locator("#metricIncidents")).toHaveText("2");
  await expect(page.locator("#metricLocated")).toHaveText("1");
  await expect(page.locator("#incidentCount")).toContainText("2 visible");
  await page.locator('[data-id="I-100"]').click();
  await expect(page.locator("#scopeFilter")).toHaveValue("I-100");
  await expect(page.locator("#metricIncidents")).toHaveText("1");
  await expect(page.locator('[data-id="I-100"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#operationalSummary")).toContainText("1 local assignments");
  const zoom = await page.evaluate(() => window.__esriView.zoom);
  expect(zoom).toBeGreaterThanOrEqual(10);
  await page.locator("#resetFilters").click();
  await expect(page.locator("#scopeFilter")).toHaveValue("all");
  await expect(page.locator("#metricIncidents")).toHaveText("2");
});

test("located heat mode uses a client FeatureLayer HeatmapRenderer", async ({ page }) => {
  await openReady(page);
  await page.locator('[name="mapMode"][value="heat"]').check();
  await expect.poll(() => page.evaluate(() => ({ visible: window.__esriLayers["Located subject observations"].visible, type: window.__esriLayers["Located subject observations"].renderer.type, incidents: window.__esriLayers["Incident locations"].visible }))).toEqual({ visible: true, type: "heatmap", incidents: false });
});

test("analysis loading, empty and error states are explicit", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/analysis.html?hosted=off&delay=600", { waitUntil: "load" });
  await expect(page.locator("#analysisState")).toHaveClass(/loading/);
  await expect(page.locator("#analysisState")).toContainText("Loading browser workspaces");
  await page.waitForFunction(() => window.__app?.analysis?.state?.phase === "empty", null, { timeout: 30000 });
  await expect(page.locator("#analysisState")).toHaveClass(/empty/);
  await expect(page.locator("#analysisState")).toContainText("No incidents");
  await expect(page.locator("#reloadData")).toBeEnabled();

  await page.goto("/analysis.html?hosted=error", { waitUntil: "load" });
  await page.waitForFunction(() => window.__app?.analysis?.state?.phase === "error", null, { timeout: 30000 });
  await expect(page.locator("#analysisState")).toHaveClass(/error/);
  await expect(page.locator("#analysisState")).toContainText("Hosted ArcGIS data is unavailable");
  await expect(page.locator("#sourceStatus")).toContainText("browser-only fallback");
});

test("desktop and mobile keep map first without horizontal overflow", async ({ page }, testInfo) => {
  await openReady(page);
  const layout = await page.evaluate(() => { const map = document.querySelector(".analysis-map").getBoundingClientRect(), left = document.querySelector(".analysis-left").getBoundingClientRect(), right = document.querySelector(".analysis-right").getBoundingClientRect(); return { width: innerWidth, scroll: document.documentElement.scrollWidth, map, left, right }; });
  expect(layout.scroll).toBeLessThanOrEqual(layout.width + 1);
  if (testInfo.project.name.includes("mobile")) {
    expect(layout.map.top).toBeLessThan(layout.left.top);
    expect(layout.map.height).toBeGreaterThanOrEqual(390);
  } else {
    expect(layout.map.width).toBeGreaterThan(layout.left.width);
    expect(layout.map.height).toBeGreaterThan(500);
  }
});
