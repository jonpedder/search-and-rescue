const { test, expect } = require("@playwright/test");

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
