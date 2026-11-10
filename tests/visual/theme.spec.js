const { test, expect } = require("@playwright/test");

const pages = [
  { name: "planning", path: "/index.html", map: true },
  { name: "operations", path: "/operations.html", map: true },
  { name: "analysis", path: "/analysis.html", map: true },
  { name: "settings", path: "/settings.html", map: false }
];

async function stabilize(page, item) {
  await page.goto(item.path, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => customElements.get("calcite-button"), null, { timeout: 20000 });
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}" });
  await page.evaluate(() => {
    localStorage.clear();
    const utc = document.getElementById("utc"), local = document.getElementById("localTime");
    if (utc) utc.textContent = "12:00:00";
    if (local) local.textContent = "12:00:00";
    document.querySelectorAll("calcite-alert").forEach(x => x.open = false);
  });
  if (item.map) await page.waitForFunction(() => window.__esriView?.ready === true, null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

for (const item of pages) {
  test(`${item.name} shared theme visual`, async ({ page }) => {
    await stabilize(page, item);
    const masks = [];
    if (item.map) masks.push(page.locator("#viewDiv"));
    for (const id of ["#utc", "#localTime"]) if (await page.locator(id).count()) masks.push(page.locator(id));
    await expect(page).toHaveScreenshot(`theme-${item.name}.png`, { mask: masks, maskColor: "#071824", fullPage: false });
  });

  test(`${item.name} token and mobile layout audit`, async ({ page }, testInfo) => {
    await stabilize(page, item);
    const audit = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const ownedButtons = [...document.querySelectorAll("calcite-button")].filter(b => !b.closest("#viewDiv,.esri-widget"));
      return {
        tokens: Object.fromEntries(["--app-bg", "--app-panel", "--app-panel-2", "--app-accent", "--app-text", "--app-muted", "--calcite-color-brand"].map(k => [k, root.getPropertyValue(k).trim()])),
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        buttonViolations: ownedButtons.filter(b => b.getClientRects().length).map(b => ({ id: b.id, appearance: b.appearance || "solid", kind: b.kind || "brand", height: b.getBoundingClientRect().height })).filter(b => !["solid", "outline-fill"].includes(b.appearance) || b.height < 23),
        headerOverflow: (() => { const h = document.querySelector(".app-header,.header"); return h ? h.scrollWidth > h.clientWidth + 1 : false; })()
      };
    });
    expect(audit.tokens).toEqual({
      "--app-bg": "#071824", "--app-panel": "#0C2231", "--app-panel-2": "#123247", "--app-accent": "#F2A900", "--app-text": "#F4F7F9", "--app-muted": "#AFC3CF", "--calcite-color-brand": "#F2A900"
    });
    expect(audit.scrollWidth, `${item.name} horizontal overflow at ${audit.viewport}px`).toBeLessThanOrEqual(audit.viewport + 1);
    expect(audit.headerOverflow, `${item.name} header overflow`).toBe(false);
    expect(audit.buttonViolations, `${item.name} button hierarchy`).toEqual([]);

    if (testInfo.project.name.includes("mobile")) {
      if (item.name === "operations") await expect(page.locator("#opsLayerPanel")).toHaveClass(/collapsed/);
      if (item.name === "settings") await expect(page.locator(".theme-preview-body")).toHaveCSS("grid-template-columns", `${await page.locator(".theme-preview-body").evaluate(e => e.clientWidth)}px`);
    }
  });
}

test("settings Calcite theme preview visual", async ({ page }) => {
  const item = pages.find(x => x.name === "settings");
  await stabilize(page, item);
  await expect(page.locator("#themePreview")).toBeVisible();
  await expect(page.locator("#themePreview")).toHaveScreenshot("settings-theme-preview.png");
});
