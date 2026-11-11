const { test, expect } = require("@playwright/test");
test.setTimeout(90000);

async function openAnalysis(page) {
  const t = Date.UTC(2025, 0, 10, 8);
  await page.addInitScript(({ t }) => {
    localStorage.clear();
    localStorage.setItem("sar.operations.EX-1", JSON.stringify({
      incident: { id: "EX-1", name: "Export test", category: "Hiker", status: "Active", lastSeen: t, geometry: { type: "point", x: -118.02, y: 34.14, spatialReference: { wkid: 4326 } } },
      records: [{ id: "F-1", kind: "find", geometry: { type: "point", x: -118, y: 34.15, spatialReference: { wkid: 4326 } }, attrs: { name: "Located", pointType: "Find", created: t + 3600000, operationalPeriod: 1 } }],
      assignments: []
    }));
  }, { t });
  await page.goto("/analysis.html?hosted=off", { waitUntil: "load" });
  await page.waitForFunction(() => window.__app?.analysis?.state?.phase === "ready", null, { timeout: 30000 });
}

test("analysis charts and lists expose accessible CSV, JSON, and Shapefile menus", async ({ page }) => {
  await openAnalysis(page);
  await expect(page.locator(".sar-export-button")).toHaveCount(8);
  const trigger = page.getByRole("button", { name: "Export Incident timeline" });
  await trigger.click();
  const host = trigger.locator("..");
  await expect(host.getByRole("menuitem", { name: "CSV" })).toBeVisible();
  await expect(host.getByRole("menuitem", { name: "JSON" })).toBeVisible();
  await expect(host.getByRole("menuitem", { name: "Shapefile (.zip)" })).toBeVisible();
  const csvPromise = page.waitForEvent("download");
  await host.getByRole("menuitem", { name: "CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("sar_incident_timeline.csv");
  const csvStream = await csvDownload.createReadStream();
  let csv = ""; for await (const chunk of csvStream) csv += chunk.toString();
  expect(csv).toContain("incident_count");
  expect(csv).toContain("bucket_unit");

  await trigger.click();
  const shpPromise = page.waitForEvent("download");
  await host.getByRole("menuitem", { name: "Shapefile (.zip)" }).click();
  const shpDownload = await shpPromise;
  expect(shpDownload.suggestedFilename()).toBe("sar_incident_timeline.zip");
  const shpStream = await shpDownload.createReadStream();
  let bytes = 0; for await (const chunk of shpStream) bytes += chunk.length;
  expect(bytes).toBeGreaterThan(100);
});

test("Planning and Operations install export controls on their chart and list surfaces", async ({ page }) => {
  await page.goto("/index.html", { waitUntil: "load" });
  await page.waitForFunction(() => window.__app?.planning?.view?.ready && window.__app?.planningAssignments, null, { timeout: 30000 });
  await expect(page.locator(".sar-export-button")).toHaveCount(6);
  for (const label of ["Planning scenarios", "Matched lost-person statistics", "Survivability curve", "Ranked search segments", "Planning assignments", "Planning assets"]) await expect(page.locator(`[aria-label="Export ${label}"]`)).toBeAttached();

  await page.goto("/operations.html", { waitUntil: "load" });
  await page.waitForFunction(() => window.__app?.restore && window.__esriView?.ready, null, { timeout: 30000 });
  await expect(page.locator(".sar-export-button")).toHaveCount(2);
  await expect(page.locator('[aria-label="Export Operational feature list"]')).toBeAttached();
  await expect(page.locator('[aria-label="Export Operational assignment list"]')).toBeAttached();
});
