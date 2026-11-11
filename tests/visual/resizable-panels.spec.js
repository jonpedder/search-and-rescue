const { test, expect } = require("@playwright/test");

const pages = [
  { path: "/index.html", panels: ["planning-left", "planning-right"], map: "#body > main", dynamic: true },
  { path: "/operations.html", panels: ["operations-left", "operations-layers"], map: ".map-shell" },
  { path: "/analysis.html?hosted=off", panels: ["analysis-left", "analysis-right"], map: ".analysis-map" },
  { path: "/settings.html#help", panels: ["settings-help"] }
];

async function useLocalShell(page, definition) {
  await page.route(/^https:\/\//, route => route.abort());
  if (definition.path.includes("index")) await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => setTimeout(() => {
    if (document.getElementById("planningAssignmentPanel")) return;
    const panel = document.createElement("aside"); panel.id = "planningAssignmentPanel"; panel.setAttribute("aria-label", "Assignment and asset design");
    document.getElementById("body")?.appendChild(panel);
  }, 0)));
}

async function ready(page, definition) {
  await page.goto(definition.path, { waitUntil: "domcontentloaded" });
  for (const id of definition.panels) await page.waitForSelector(`[data-resize-panel="${id}"]`, { state: "attached", timeout: 45000 });
  if (definition.path.includes("settings")) await page.waitForFunction(() => !document.getElementById("helpPanel").hidden);
}

for (const definition of pages) {
  test(`${definition.path} sidebars support drag, keyboard, persistence and reset`, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    test.skip(testInfo.project.name.includes("mobile"), "Desktop contract; mobile behavior has a dedicated test.");
    await useLocalShell(page, definition);
    await ready(page, definition);
    for (const id of definition.panels) {
      const handle = page.locator(`[data-resize-panel="${id}"]`);
      await expect(handle).toBeVisible();
      await expect(handle).toHaveAttribute("role", "separator");
      await expect(handle).toHaveAttribute("aria-orientation", "vertical");
      const before = Number(await handle.getAttribute("aria-valuenow"));
      const box = await handle.boundingBox(), rightEdgePanel = id.includes("right") || id.includes("layers");
      const startX = box.x + box.width / 2, startY = box.y + Math.min(80, box.height / 2), endX = startX + (rightEdgePanel ? -30 : 30);
      await handle.dispatchEvent("pointerdown", { pointerId: 7, pointerType: "mouse", button: 0, clientX: startX, clientY: startY });
      await handle.dispatchEvent("pointermove", { pointerId: 7, pointerType: "mouse", button: -1, clientX: endX, clientY: startY });
      await handle.dispatchEvent("pointerup", { pointerId: 7, pointerType: "mouse", button: 0, clientX: endX, clientY: startY });
      const dragged = Number(await handle.getAttribute("aria-valuenow"));
      expect(dragged).not.toBe(before);
      await handle.focus();
      await page.keyboard.press("Shift+ArrowRight");
      expect(Number(await handle.getAttribute("aria-valuenow"))).not.toBe(dragged);
      await page.keyboard.press("Home");
      expect(Number(await handle.getAttribute("aria-valuenow"))).toBe(Number(await handle.getAttribute("aria-valuemin")));
      await page.keyboard.press("End");
      expect(Number(await handle.getAttribute("aria-valuenow"))).toBe(Number(await handle.getAttribute("aria-valuemax")));
      await handle.dblclick({ position: { x: rightEdgePanel ? box.width - 2 : 2, y: Math.min(80, box.height / 2) } });
      const reset = Number(await handle.getAttribute("aria-valuenow"));
      expect(reset).toBeGreaterThan(Number(await handle.getAttribute("aria-valuemin")));
      expect(reset).toBeLessThan(Number(await handle.getAttribute("aria-valuemax")));
      await page.keyboard.press(id.includes("right") || id.includes("layers") ? "ArrowLeft" : "ArrowRight");
      const persisted = Number(await handle.getAttribute("aria-valuenow"));
      await page.reload();
      await page.waitForSelector(`[data-resize-panel="${id}"]`, { state: "visible", timeout: 45000 });
      expect(Number(await page.locator(`[data-resize-panel="${id}"]`).getAttribute("aria-valuenow"))).toBe(persisted);
    }
    await page.evaluate(() => { window.__app.layout.scan(); window.__app.layout.scan(); document.body.appendChild(document.createComment("rescan")); });
    for (const id of definition.panels) await expect(page.locator(`[data-resize-panel="${id}"]`)).toHaveCount(1);
    if (definition.map) {
      const mapBox = await page.locator(definition.map).boundingBox();
      expect(mapBox.width).toBeGreaterThanOrEqual(359);
    }
  });
}

test("malformed and out-of-range saved widths are safely clamped", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop clamping contract.");
  await useLocalShell(page, { path: "/operations.html" });
  await page.addInitScript(() => {
    localStorage.setItem("sar.layout.operations.left.v1", "not-a-number");
    localStorage.setItem("sar.layout.operations.layers.v1", "99999");
  });
  await page.goto("/operations.html");
  const left = page.locator('[data-resize-panel="operations-left"]'), layers = page.locator('[data-resize-panel="operations-layers"]');
  await expect(left).toBeVisible(); await expect(layers).toBeVisible();
  expect(Number(await left.getAttribute("aria-valuenow"))).toBe(390);
  expect(Number(await layers.getAttribute("aria-valuenow"))).toBe(Number(await layers.getAttribute("aria-valuemax")));
});

test("Planning attaches one handle when the assignment panel is created dynamically", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  test.skip(testInfo.project.name.includes("mobile"), "Desktop dynamic attachment contract.");
  await useLocalShell(page, { path: "/index.html" });
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("#planningAssignmentPanel [data-resize-panel='planning-right']"));
  await page.evaluate(() => { window.__app.layout.scan(); window.__app.layout.scan(); });
  await expect(page.locator('#planningAssignmentPanel [data-resize-panel="planning-right"]')).toHaveCount(1);
});

for (const definition of pages) {
  test(`${definition.path} stacked mobile layout hides handles and clears custom widths`, async ({ page }, testInfo) => {
    test.setTimeout(60000);
    test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only responsive contract.");
    await page.route(/^https:\/\//, route => route.abort());
    await page.addInitScript(() => {
      localStorage.setItem("sar.layout.planning.left.v1", "500"); localStorage.setItem("sar.layout.planning.right.v1", "480");
      localStorage.setItem("sar.layout.operations.left.v1", "550"); localStorage.setItem("sar.layout.operations.layers.v1", "450");
      localStorage.setItem("sar.layout.analysis.left.v1", "450"); localStorage.setItem("sar.layout.analysis.right.v1", "500");
      localStorage.setItem("sar.layout.settings.help.v1", "350");
    });
    const mobileDefinition = definition.path.includes("index") ? { ...definition, panels: ["planning-left"] } : definition;
    await ready(page, mobileDefinition);
    for (const id of mobileDefinition.panels) await expect(page.locator(`[data-resize-panel="${id}"]`)).toBeHidden();
    const variables = await page.evaluate(() => [...document.querySelectorAll("[style]")].flatMap(el => [...el.style].filter(name => name.startsWith("--sar-")).map(name => [name, el.style.getPropertyValue(name)])));
    expect(variables).toEqual([]);
    if (definition.path.includes("settings")) expect((await page.locator(".help-layout").boundingBox()).width).toBeLessThanOrEqual(393);
  });
}
