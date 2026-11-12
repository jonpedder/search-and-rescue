const { test, expect } = require("@playwright/test");

const pages = [
  { path: "/index.html", container: "#tab-incident", minCount: 5 },
  { path: "/operations.html", container: "#tab-map .card:first-of-type", minCount: 8 },
  { path: "/analysis.html?hosted=off", container: ".analysis-primary", minCount: 5 }
];

for (const definition of pages) {
  test(`${definition.path} content sections resize vertically, persist and reset`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await page.route(/^https:\/\//, route => route.abort());
    await page.goto(definition.path, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(`${definition.container} > [data-resize-section]`, { state: "attached", timeout: 45000 });
    const handles = page.locator("[data-resize-section]");
    expect(await handles.count()).toBeGreaterThanOrEqual(definition.minCount);
    const handle = page.locator(`${definition.container} > [data-resize-section]`);
    await expect(handle).toHaveAttribute("role", "separator");
    await expect(handle).toHaveAttribute("aria-orientation", "horizontal");
    await expect(handle.locator(".sar-section-resize-indicator")).toHaveText("⋯");

    if (testInfo.project.name.includes("mobile")) {
      await expect(handle).toBeHidden();
      const inlineHeights = await page.evaluate(() => [...document.querySelectorAll(".sar-resizable-section")].map(el => el.style.height).filter(Boolean));
      expect(inlineHeights).toEqual([]);
      return;
    }

    await expect(handle).toBeVisible();
    const before = Number(await handle.getAttribute("aria-valuenow"));
    const box = await handle.boundingBox();
    const startX = box.x + Math.min(80, box.width / 2), startY = box.y + box.height / 2;
    await handle.dispatchEvent("pointerdown", { pointerId: 8, pointerType: "mouse", button: 0, clientX: startX, clientY: startY });
    await handle.dispatchEvent("pointermove", { pointerId: 8, pointerType: "mouse", button: -1, clientX: startX, clientY: startY + 35 });
    await handle.dispatchEvent("pointerup", { pointerId: 8, pointerType: "mouse", button: 0, clientX: startX, clientY: startY + 35 });
    expect(Number(await handle.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
    await handle.focus();
    await page.keyboard.press("Shift+ArrowDown");
    const persisted = Number(await handle.getAttribute("aria-valuenow"));
    expect(persisted).toBeGreaterThan(before + 35);
    await page.reload({ waitUntil: "domcontentloaded" });
    const restored = page.locator(`${definition.container} > [data-resize-section]`);
    await expect(restored).toBeVisible({ timeout: 45000 });
    expect(Number(await restored.getAttribute("aria-valuenow"))).toBe(persisted);
    await restored.dblclick();
    expect(await page.locator(definition.container).evaluate(el => el.style.height)).toBe("");
  });
}

test("Analysis command bar keeps its intrinsic height", async ({ page }) => {
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto("/analysis.html?hosted=off", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("sar.layout.section.analysis.incident-analysis-summary.0.v1", "20"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const command = page.locator(".analysis-command");
  await expect(command.locator(".analysis-kicker")).toBeVisible();
  await expect(command.locator("h2")).toBeVisible();
  await expect(command.locator(":scope > [data-resize-section]")).toHaveCount(0);
  expect(await command.evaluate(el => el.style.height)).toBe("");
  expect((await command.boundingBox()).height).toBeGreaterThan(100);
});
