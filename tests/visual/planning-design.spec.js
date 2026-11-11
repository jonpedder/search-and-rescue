const { test, expect } = require("@playwright/test");

test.describe("Planning Assignment & Asset Design", () => {
  test("desktop and mobile expose accessible required-field feedback", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/index.html");
    await page.waitForFunction(() => window.__app?.planningAssignments?.bufferSketch && window.SARValidation);
    await page.fill("#planningAssetName", "");
    await page.click("#drawPlanningAsset");
    await expect(page.locator("#planningAssetName")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#planningAssetName-validation-message")).toContainText("Enter an asset name");
    expect(await page.evaluate(() => document.activeElement?.id)).toBe("planningAssetName");
    expect(await page.evaluate(() => window.__app.planning.state.planningAssets.length)).toBe(0);

    await page.click("#savePlanAssignment");
    await expect(page.locator("#planAssignmentSegment")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#planAssignmentSegment-validation-message")).toContainText("Select a search segment");
    await expect(page.locator("#planningAssignmentPanel")).toContainText("Assignment & Asset Design");
    await expect(page.locator("#planningAssignmentCount")).toHaveText("0");
    await expect(page.locator("#planningAssetCount")).toHaveText("0");
  });

  test("Operations status changes recolor the linked assignment polygon", async ({ page }, testInfo) => {
    test.setTimeout(45000);
    test.skip(testInfo.project.name.includes("mobile"), "Desktop map test covers the shared status renderer.");
    await page.goto("/operations.html");
    await page.waitForFunction(() => window.__esriView?.ready && window.__app?.restore);
    await page.evaluate(() => window.__app.restore({
      incident: { id: "STATUS-COLOR", name: "Status Color" },
      records: [{ id: "S1", kind: "segment", geometry: { type: "polygon", rings: [[[-118.26,34.04],[-118.20,34.04],[-118.20,34.09],[-118.26,34.09],[-118.26,34.04]]], spatialReference: { wkid: 4326 } }, attrs: { name: "SEG-1", status: "Unassigned", priority: "Normal", folder: "Assignments", operationalPeriod: 1, notes: "", created: 1 } }],
      assignments: [{ id: "OP1-201", segment: "SEG-1", team: "Team Alpha", type: "Ground", priority: "Normal", status: "Unassigned", operationalPeriod: 1 }]
    }));
    await page.evaluate(() => { document.getElementById("tab-assignments").hidden = false; document.getElementById("tab-map").hidden = true; document.querySelector('[data-aid="OP1-201"]').click(); });
    await page.selectOption("#assignmentStatus", "Complete");
    await page.click("#saveAssignment");
    await expect(page.locator("#assignmentPOD")).toHaveAttribute("aria-invalid", "true");
    await page.fill("#assignmentPOD", "75");
    await page.selectOption("#assignmentSearchAgain", "No");
    await page.click("#saveAssignment");
    const result = await page.evaluate(() => { const r = window.__app.state.records[0]; return { status: r.attrs.status, outline: r.graphic.symbol.outline.color.toRgba() }; });
    expect(result.status).toBe("Complete");
    expect(result.outline).toEqual([70, 220, 170, 1]);
  });
});
