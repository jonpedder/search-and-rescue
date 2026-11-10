const { test, expect } = require("@playwright/test");

test("second feature click restores the pre-zoom viewpoint", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  test.skip(testInfo.project.name.includes("mobile"), "Desktop interaction covers the shared map behavior.");
  await page.goto("/operations.html");
  await page.waitForFunction(() => window.__esriView?.ready && window.__app?.restore);
  await page.evaluate(() => window.__app.restore({
    incident: { id: "ZOOM-TEST", name: "Zoom Test" },
    records: [
      { id: "R1", kind: "clue", geometry: { type: "point", longitude: -118.25, latitude: 34.05, spatialReference: { wkid: 4326 } }, attrs: { name: "Clue One", status: "Planned", priority: "Normal", folder: "Clues", operationalPeriod: 1, notes: "", created: 1 } },
      { id: "R2", kind: "facility", geometry: { type: "point", longitude: -117.85, latitude: 34.20, spatialReference: { wkid: 4326 } }, attrs: { name: "Staging Two", status: "Planned", priority: "Normal", folder: "Resources", operationalPeriod: 1, notes: "", created: 2 } }
    ], assignments: []
  }));
  await page.waitForFunction(() => !window.__esriView.updating);
  const before = await page.evaluate(() => ({ scale: window.__esriView.scale, x: window.__esriView.center.x, y: window.__esriView.center.y }));
  await page.click('.record[data-id="R1"]');
  await page.waitForFunction(() => window.__app.state.zoomRecordId === "R1" && !window.__esriView.updating);
  const zoomed = await page.evaluate(() => window.__esriView.scale);
  expect(zoomed).toBeLessThan(before.scale / 5);
  await expect(page.locator('.record[data-id="R1"] small')).toContainText("Click again to return to extent");
  await page.click('.record[data-id="R1"]');
  await page.waitForFunction(() => window.__app.state.zoomRecordId === null && !window.__esriView.updating);
  const after = await page.evaluate(() => ({ scale: window.__esriView.scale, x: window.__esriView.center.x, y: window.__esriView.center.y }));
  expect(Math.abs(after.scale / before.scale - 1)).toBeLessThan(0.001);
  expect(Math.abs(after.x - before.x)).toBeLessThan(1);
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
});
