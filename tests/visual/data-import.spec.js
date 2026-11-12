const { test, expect } = require("@playwright/test");
const shpwrite = require("@mapbox/shp-write");
const JSZip = require("jszip");
test.setTimeout(45000);

const csv = "Incident_UUID,Incident Number,Type of Incident,Incident Start Date and Time,Subject Category,x,y\nMRA-1,Imported Hiker,SEARCH,5/10/2021 4:00:00 PM,HIKING,-105.3821,39.0899\nMRA-2,Imported Climber,RESCUE,6/11/2021 2:00:00 PM,CLIMBING,-121.7113,45.3310\n";

test("Configuration imports CSV incident points into Incident Analysis", async ({ page }) => {
  await page.goto("/settings.html", { waitUntil: "load" });
  await page.locator("#referenceDataFile").setInputFiles({ name: "mra-example.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator("#referenceDataStatus")).toContainText("Imported 2 incident point(s)");
  await expect(page.locator("#referenceDataList")).toContainText("mra-example.csv");
  const shapeBase64 = await Promise.resolve(shpwrite.zip({ type: "FeatureCollection", features: [{ type: "Feature", properties: { Incident_N: "SHP-1", Subject_Ca: "HIKING" }, geometry: { type: "Point", coordinates: [-121.5, 47.4] } }] }));
  await page.locator("#referenceDataFile").setInputFiles({ name: "mra-example.zip", mimeType: "application/zip", buffer: Buffer.from(shapeBase64, "base64") });
  await expect(page.locator("#referenceDataStatus")).toContainText("Imported 1 incident point(s)");
  await expect(page.locator("#referenceDataList")).toContainText("mra-example.zip");
  const projectedBase64 = await Promise.resolve(shpwrite.zip({ type: "FeatureCollection", features: [{ type: "Feature", properties: { Incident_N: "UTM-1" }, geometry: { type: "Point", coordinates: [500000, 0] } }] }));
  const projectedZip = await JSZip.loadAsync(Buffer.from(projectedBase64, "base64"));
  const prjName = Object.keys(projectedZip.files).find(name => name.toLowerCase().endsWith(".prj"));
  projectedZip.file(prjName, 'PROJCS["WGS_1984_UTM_Zone_10N",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000],PARAMETER["False_Northing",0],PARAMETER["Central_Meridian",-123],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0],UNIT["Meter",1]]');
  await page.locator("#referenceDataFile").setInputFiles({ name: "utm-example.zip", mimeType: "application/zip", buffer: await projectedZip.generateAsync({ type: "nodebuffer" }) });
  await expect(page.locator("#referenceDataStatus")).toContainText("Imported 1 incident point(s)");
  await page.goto("/analysis.html?hosted=off", { waitUntil: "load" });
  await page.waitForFunction(() => window.__app?.analysis?.state?.phase === "ready", null, { timeout: 30000 });
  await expect.poll(() => page.evaluate(() => window.__app.analysis.state.data.incidents.filter(x => x.sources.includes("imported")).length)).toBe(4);
  await expect(page.locator("#sourceStatus")).toContainText("4 imported incident point(s)");
  expect(await page.evaluate(() => window.__app.analysis.state.data.incidents.find(x => x.id === "MRA-1")?.category)).toBe("HIKING");
  const utmPoint = await page.evaluate(() => window.__app.analysis.state.data.incidents.find(x => x.sourceDataset === "utm-example.zip")?.geometry);
  expect(utmPoint.longitude).toBeCloseTo(-123, 4);
  expect(utmPoint.latitude).toBeCloseTo(0, 4);
});

test("Configuration removes a browser-local reference dataset", async ({ page }) => {
  await page.goto("/settings.html", { waitUntil: "load" });
  await page.locator("#referenceDataFile").setInputFiles({ name: "mra-delete.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator("#referenceDataList")).toContainText("mra-delete.csv");
  await page.locator("details").filter({ has: page.locator("#referenceDataFile") }).evaluate(el => { el.open = true; });
  const remove = page.locator("#referenceDataList calcite-button").first();
  await expect(remove).toBeVisible();
  await Promise.all([page.waitForEvent("dialog").then(dialog => dialog.accept()), remove.click()]);
  await expect(page.locator("#referenceDataStatus")).toContainText("Reference dataset removed");
  await expect(page.locator("#referenceDataList")).toContainText("No browser reference datasets imported");
});
