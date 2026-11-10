const { test, expect } = require("@playwright/test");
test.setTimeout(120000);

test("clue report downloads with a rendered numbered placement map", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "One desktop export covers the PDF map workflow.");
  const warnings = [];
  page.on("console", message => { if (/Clue report map could not be captured/i.test(message.text())) warnings.push(message.text()); });
  await page.goto("/settings.html");
  await page.evaluate(() => localStorage.setItem("sar.operations.report-map-test", JSON.stringify({
    incident: { id: "TEST-001", name: "Clue Map Test", period: 2 },
    records: [
      { kind: "clue", geometry: { type: "point", longitude: -118.25, latitude: 34.05, spatialReference: { wkid: 4326 } }, attrs: { name: "Backpack", created: Date.now() - 10000, status: "Logged", priority: "High", operationalPeriod: 2, notes: "Blue pack" } },
      { kind: "clue", geometry: { type: "point", longitude: -118.20, latitude: 34.08, spatialReference: { wkid: 4326 } }, attrs: { name: "Footprint", created: Date.now(), status: "Verified", priority: "Normal", operationalPeriod: 2, notes: "Northbound print" } }
    ]
  })));
  await page.selectOption("#sarReportType", "clue");
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 90000 }), page.click("#sarExportReportButton")]);
  const stream = await download.createReadStream(); let bytes = 0;
  for await (const chunk of stream) bytes += chunk.length;
  expect(download.suggestedFilename()).toMatch(/^clue-log-report-\d{4}-\d{2}-\d{2}\.pdf$/);
  expect(bytes).toBeGreaterThan(100000);
  expect(warnings).toEqual([]);
});

test("assignment report prompts for a number and downloads mapped tasking", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "One desktop export covers the PDF map workflow.");
  const warnings = [];
  page.on("console", message => { if (/Assignment report map could not be captured/i.test(message.text())) warnings.push(message.text()); });
  await page.goto("/settings.html");
  await page.evaluate(() => localStorage.setItem("sar.operations.assignment-report-test", JSON.stringify({
    incident: { id: "TEST-002", name: "Assignment Map Test", period: 3 },
    assignments: [{ id: "T-101", segment: "S001", team: "Team Alpha", type: "Grid", priority: "High", status: "Assigned", operationalPeriod: 3, teamSize: 4, transport: "Vehicle then foot", expectedHours: 6, radio: "Tactical 2", preparedBy: "Plans", podResponsive: 55, podUnresponsive: 25, podClue: 40, previous: "Hasty team checked trailhead", notes: "Steep terrain; maintain buddy teams", created: Date.now(), synced: true }],
    records: [
      { kind: "segment", geometry: { type: "polygon", rings: [[[-118.26,34.04],[-118.20,34.04],[-118.20,34.09],[-118.26,34.09],[-118.26,34.04]]], spatialReference: { wkid: 4326 } }, attrs: { name: "S001", status: "Assigned", notes: "Assigned to T-101" } },
      { kind: "route", geometry: { type: "polyline", paths: [[[-118.255,34.05],[-118.23,34.07],[-118.205,34.08]]], spatialReference: { wkid: 4326 } }, attrs: { name: "T-101", notes: "Team Alpha route" } }
    ]
  })));
  await page.selectOption("#sarReportType", "assignment");
  page.once("dialog", dialog => { expect(dialog.message()).toContain("Which assignment number"); dialog.accept("T-101"); });
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 90000 }), page.click("#sarExportReportButton")]);
  const stream = await download.createReadStream(); let bytes = 0;
  for await (const chunk of stream) bytes += chunk.length;
  expect(download.suggestedFilename()).toMatch(/^assignment-T-101-\d{4}-\d{2}-\d{2}\.pdf$/);
  expect(bytes).toBeGreaterThan(100000);
  expect(warnings).toEqual([]);
});
