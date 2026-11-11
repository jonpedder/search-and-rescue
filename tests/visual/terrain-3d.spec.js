const { test, expect } = require("@playwright/test");
test.setTimeout(90000);

const pages = [
  { name: "planning", path: "/index.html", controller: "planning" },
  { name: "operations", path: "/operations.html", controller: "operations" },
  { name: "analysis", path: "/analysis.html?hosted=off", controller: "analysis" }
];

for (const item of pages) {
  test(`${item.name} toggles operational layers into 3D terrain`, async ({ page }) => {
    await page.goto(item.path, { waitUntil: "load", timeout: 60000 });
    await page.waitForFunction(() => window.__esriView?.ready === true, null, { timeout: 30000 });
    const toggle = page.locator(".sar-3d-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await page.waitForFunction((controller) => {
      const terrain = controller === "planning" ? window.__app?.planning?.terrain3D : controller === "analysis" ? window.__app?.analysisTerrain3D : window.__app?.terrain3D;
      return terrain?.active && terrain.sceneView?.ready;
    }, item.controller, { timeout: 45000 });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".sar-3d-scene")).toHaveClass(/active/);
    const state = await page.evaluate(() => ({
      basemap: window.__esriMap.basemap?.title,
      groundLayers: window.__esriMap.ground?.layers?.length || 0,
      topoOpacity: window.__esriMap.layers.find((layer) => layer.title === "USGS Topo")?.opacity
    }));
    expect(state.groundLayers).toBeGreaterThan(0);
    expect(state.topoOpacity).toBe(.55);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });
}
