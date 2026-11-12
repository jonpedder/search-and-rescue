const { test, expect } = require("@playwright/test");
test.setTimeout(90000);

for (const path of ["/index.html", "/operations.html", "/analysis.html?hosted=off"]) {
  test(`${path} shows UTM easting on bottom and northing on right`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__esriView?.ready && document.querySelector(".sar-utm-scale"), null, { timeout: 45000 });
    await page.waitForFunction(() => document.querySelectorAll(".sar-utm-bottom b").length >= 3 && document.querySelectorAll(".sar-utm-right b").length >= 3, null, { timeout: 15000 });
    await expect(page.locator(".sar-utm-scale")).toHaveCount(1);
    await expect(page.locator(".sar-utm-zone")).toContainText(/UTM \d{1,2}[NS]/);
    const labels = await page.evaluate(() => ({ bottom: [...document.querySelectorAll(".sar-utm-bottom b")].map(el => el.textContent), right: [...document.querySelectorAll(".sar-utm-right b")].map(el => el.textContent) }));
    expect(labels.bottom.every(label => /[\d,]+ E/.test(label))).toBeTruthy();
    expect(labels.right.every(label => /[\d,]+ N/.test(label))).toBeTruthy();
    const edges = await page.evaluate(() => { const map = document.getElementById("viewDiv").getBoundingClientRect(), bottom = document.querySelector(".sar-utm-bottom").getBoundingClientRect(), right = document.querySelector(".sar-utm-right").getBoundingClientRect(); return { map: { right: map.right, bottom: map.bottom }, bottom: { bottom: bottom.bottom }, right: { right: right.right } }; });
    expect(Math.abs(edges.bottom.bottom - edges.map.bottom)).toBeLessThanOrEqual(2);
    expect(Math.abs(edges.right.right - edges.map.right)).toBeLessThanOrEqual(2);
  });
}
