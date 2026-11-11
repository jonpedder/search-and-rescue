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
  await expect(page.locator("#comboChart .volume-bar")).toHaveCount(1);
  await expect(page.locator("#monthDayChart .month-day-cell[class*=purple]")).toHaveCount(1);
  const zoom = await page.evaluate(() => window.__esriView.zoom);
  expect(zoom).toBeGreaterThanOrEqual(10);
  await page.locator("#resetFilters").click();
  await expect(page.locator("#scopeFilter")).toHaveValue("all");
  await expect(page.locator("#metricIncidents")).toHaveText("2");
  await expect(page.locator("#comboChart .volume-bar")).toHaveCount(2);
  await page.locator("#reloadData").click();
  await page.waitForFunction(() => window.__app.analysis.state.phase === "ready" && window.__app.analysis.state.mapAppliedGeneration === window.__app.analysis.state.renderGeneration);
  await expect(page.locator("#incidentCount")).toContainText("2 visible");
  await expect(page.locator("#comboChart .volume-bar")).toHaveCount(2);
});

test("bottom analytics band renders accessible filter-linked combo and month/day charts", async ({ page }) => {
  await openReady(page);
  await expect(page.locator(".analysis-bottom")).toBeVisible();
  await expect(page.locator("#comboChart svg[role=img]")).toBeVisible();
  await expect(page.locator("#comboChart .volume-bar")).toHaveCount(2);
  await expect(page.locator("#comboChart .trend-line")).toHaveCount(1);
  await expect(page.locator("#comboChart")).toContainText("Cumulative incidents");
  await expect(page.locator("#monthDayChart .month-day-cell.purple-5")).toHaveCount(2);
  expect(await page.locator("#monthDayChart .month-day-cell.zero").count()).toBeGreaterThan(0);
  expect(await page.locator("#monthDayChart .month-day-cell.unavailable").count()).toBeGreaterThan(0);
  await expect(page.locator("#monthDayChart .heat-legend")).toContainText("Max 1");

  await page.locator("#statusFilter").selectOption("Active");
  await page.locator("#applyFilters").click();
  await page.waitForFunction(() => window.__app.analysis.state.phase === "ready" && window.__app.analysis.state.mapAppliedGeneration === window.__app.analysis.state.renderGeneration);
  await expect(page.locator("#metricIncidents")).toHaveText("1");
  await expect(page.locator("#incidentCount")).toContainText("1 visible");
  await expect(page.locator("#comboChart .volume-bar")).toHaveCount(1);
  await expect(page.locator("#comboChart .trend-point")).toHaveCount(1);
  await expect(page.locator("#monthDayChart .month-day-cell[class*=purple]")).toHaveCount(1);
  const linked = await page.evaluate(async () => ({
    filtered: window.__app.analysis.state.filtered.incidents.length,
    map: await window.__esriLayers["Incident locations"].queryFeatureCount(),
    bars: document.querySelectorAll("#comboChart .volume-bar").length,
    heat: document.querySelectorAll("#monthDayChart .month-day-cell[class*=purple]").length
  }));
  expect(linked).toEqual({ filtered: 1, map: 1, bars: 1, heat: 1 });
});

test("located heat mode uses a client FeatureLayer HeatmapRenderer", async ({ page }) => {
  await openReady(page);
  await page.locator('[name="mapMode"][value="heat"]').check();
  await expect.poll(() => page.evaluate(() => ({ visible: window.__esriLayers["Located subject observations"].visible, type: window.__esriLayers["Located subject observations"].renderer.type, incidents: window.__esriLayers["Incident locations"].visible }))).toEqual({ visible: true, type: "heatmap", incidents: false });
});

test("analysis loading, empty and error states are explicit", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/analysis.html?hosted=off", { waitUntil: "load" });
  await page.waitForFunction(() => window.__app?.analysis?.state?.phase === "empty", null, { timeout: 30000 });
  const loading = await page.evaluate(() => {
    history.replaceState(null, "", "/analysis.html?hosted=off&delay=3000");
    window.__app.analysis.reload();
    const status = document.getElementById("analysisState");
    return { phase: window.__app.analysis.state.phase, className: status.className, text: status.textContent, busy: document.getElementById("analysisRoot").getAttribute("aria-busy") };
  });
  expect(loading).toEqual({ phase: "loading", className: "analysis-state loading", text: "Loading browser workspaces and hosted ArcGIS records…", busy: "true" });
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
  const layout = await page.evaluate(() => { const map = document.querySelector(".analysis-map").getBoundingClientRect(), heat = document.querySelector(".heat-card").getBoundingClientRect(), left = document.querySelector(".analysis-left").getBoundingClientRect(), right = document.querySelector(".analysis-right").getBoundingClientRect(), bottom = document.querySelector(".analysis-bottom").getBoundingClientRect(); return { width: innerWidth, scroll: document.documentElement.scrollWidth, map, heat, left, right, bottom }; });
  expect(layout.scroll).toBeLessThanOrEqual(layout.width + 1);
  if (testInfo.project.name.includes("mobile")) {
    expect(layout.map.top).toBeLessThan(layout.bottom.top);
    expect(layout.bottom.top).toBeLessThan(layout.left.top);
    expect(layout.map.height).toBeGreaterThanOrEqual(390);
    expect(layout.bottom.width).toBeLessThanOrEqual(layout.width + 1);
  } else {
    expect(layout.map.width).toBeGreaterThan(layout.left.width);
    expect(layout.map.height).toBeGreaterThan(400);
    expect(layout.heat.top).toBeLessThanOrEqual(layout.map.top + 1);
    expect(layout.heat.height).toBeGreaterThanOrEqual(layout.map.height);
    expect(layout.left.left).toBeGreaterThan(layout.heat.right);
    expect(layout.bottom.top).toBeGreaterThanOrEqual(layout.right.bottom - 1);
    expect(Math.abs(layout.bottom.left - layout.map.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(layout.bottom.right - layout.right.right)).toBeLessThanOrEqual(2);
    expect(layout.bottom.height).toBeGreaterThanOrEqual(250);
  }
});
