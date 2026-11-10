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

test("header filters apply incident and operational period state", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  test.skip(testInfo.project.name.includes("mobile"), "Desktop interaction covers the shared filter behavior.");
  await page.goto("/operations.html");
  await page.waitForFunction(() => window.__esriView?.ready && window.__app?.restore && document.querySelector("#sarApplyFilters"));
  await page.evaluate(() => window.__app.restore({
    incident: { id: "FILTER-TEST", name: "Filter Test" },
    records: [
      { id: "P1", kind: "clue", geometry: { type: "point", longitude: -118.25, latitude: 34.05, spatialReference: { wkid: 4326 } }, attrs: { name: "Period One", status: "Planned", priority: "Normal", folder: "Clues", operationalPeriod: 1, notes: "", created: 1 } },
      { id: "P2", kind: "clue", geometry: { type: "point", longitude: -118.20, latitude: 34.08, spatialReference: { wkid: 4326 } }, attrs: { name: "Period Two", status: "Planned", priority: "Normal", folder: "Clues", operationalPeriod: 2, notes: "", created: 2 } }
    ], assignments: [{ id: "T-2", operationalPeriod: 2 }]
  }));
  await expect(page.locator("#sarIncidentFilter")).toHaveValue("FILTER-TEST");
  await expect(page.locator('#sarPeriodFilter option[value="1"]')).toContainText("12 hours");
  await page.selectOption("#sarPeriodFilter", "2");
  await page.click("#sarApplyFilters");
  await page.waitForFunction(() => window.__app.state.activePeriod === "2");
  const state = await page.evaluate(() => ({ visible: window.__app.state.records.filter(r => r.graphic.visible).map(r => r.id), listed: [...document.querySelectorAll("#featureList .record strong")].map(x => x.textContent) }));
  expect(state.visible).toEqual(["P2"]);
  expect(state.listed).toEqual(["Period Two"]);
});

test("incident analysis summarizes a saved Operations workspace", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  test.skip(testInfo.project.name.includes("mobile"), "Desktop interaction covers the shared analysis behavior.");
  await page.addInitScript(() => localStorage.setItem("sar.operations.ANALYSIS-1", JSON.stringify({
    incident: { id: "ANALYSIS-1", name: "Analysis Test" },
    records: [
      { id: "A1", kind: "clue", geometry: { type: "point", longitude: -118.25, latitude: 34.05, spatialReference: { wkid: 4326 } }, attrs: { name: "Clue", status: "Planned", operationalPeriod: 1 } },
      { id: "A2", kind: "segment", geometry: { type: "polygon", rings: [[[-118.26,34.04],[-118.20,34.04],[-118.20,34.09],[-118.26,34.09],[-118.26,34.04]]], spatialReference: { wkid: 4326 } }, attrs: { name: "S001", status: "Complete", operationalPeriod: 2 } }
    ],
    assignments: [{ id: "T-1", status: "Debriefed", operationalPeriod: 2 }]
  })));
  await page.goto("/analysis.html");
  await page.waitForFunction(() => window.__esriView?.ready && document.querySelector("#metricFeatures")?.textContent === "2");
  await expect(page.locator("#sarAnalysisNav")).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#metricFeatures")).toHaveText("2");
  await expect(page.locator("#metricAssignments")).toHaveText("1");
  await expect(page.locator("#metricClues")).toHaveText("1");
  await expect(page.locator("#metricComplete")).toHaveText("1");
  await page.selectOption("#analysisPeriod", "2");
  await expect(page.locator("#metricFeatures")).toHaveText("1");
  await expect(page.locator("#metricAssignments")).toHaveText("1");
});
