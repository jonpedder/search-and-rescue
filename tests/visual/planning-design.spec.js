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

  test("asset icons, keyboard choice, independent handoff and editing", async ({ page }, testInfo) => {
    test.setTimeout(60000);
    test.skip(testInfo.project.name.includes("mobile"), "Desktop interaction covers the shared asset editor.");
    await page.goto("/index.html");
    await page.waitForFunction(() => window.__app?.planningAssignments?.bufferSketch && window.__esriView?.ready);

    const picker = page.locator(".sar-asset-combobox");
    await expect(picker.locator(".sar-asset-combobox-button img")).toHaveAttribute("src", /asset-ground-team\.svg$/);
    await picker.locator(".sar-asset-combobox-button").press("ArrowDown");
    await expect(picker.locator('[role="option"]')).toHaveCount(7);
    await expect(picker.locator('[role="option"] img')).toHaveCount(7);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator("#planningAssetType")).toHaveValue("Canine");
    await expect(picker.locator(".sar-asset-combobox-button img")).toHaveAttribute("src", /asset-canine\.svg$/);

    await page.fill("#planningAssetName", "K9 <Alpha>");
    await page.fill("#planningAssetDescription", "Trailing team <script>alert(1)</script>");
    await page.evaluate(() => window.__app.planningAssignments.createPlanningAsset(window.__esriView.center));
    const created = await page.evaluate(() => {
      const state = window.__app.planning.state, ops = JSON.parse(localStorage.getItem("sar.operations." + (state.incidentId || "draft")));
      return { assignments: state.planningAssignments.length, assets: state.planningAssets.length, opsAssignments: ops.assignments.length, attrs: ops.records[0].attrs, popupType: state.planningAssets[0] && window.__app.planning.layers.planningAssets.graphics.getItemAt(0).popupTemplate.content[0].type };
    });
    expect(created.assignments).toBe(0);
    expect(created.assets).toBe(1);
    expect(created.opsAssignments).toBe(0);
    expect(created.attrs.description).toContain("<script>");
    expect(created.attrs.notes).toContain("<script>");
    expect(created.popupType).toBe("fields");
    await expect(page.locator("#planningAssetList")).toContainText("K9 <Alpha>");
    await expect(page.locator("#planningAssetList script")).toHaveCount(0);
    await page.reload();
    await page.waitForFunction(() => window.__app?.planningAssignments?.bufferSketch && window.__app.planning.state.planningAssets.length === 1);
    await page.click("#planningAssetList [data-asset-id]");
    await expect(page.locator("#planningAssetDescription")).toHaveValue("Trailing team <script>alert(1)</script>");

    await page.evaluate(() => { const key = "sar.operations." + (window.__app.planning.state.incidentId || "draft"), ops = JSON.parse(localStorage.getItem(key)); ops.assignments.push({ id: "KEEP-ME", segment: "SEG-X" }); localStorage.setItem(key, JSON.stringify(ops)); });
    await page.fill("#planningAssetName", "K9 Bravo");
    await page.fill("#planningAssetDescription", "Updated capabilities");
    await page.locator(".sar-asset-combobox-button").click();
    await page.locator('[role="option"][data-value="Vehicle"]').click();
    await page.click("#savePlanningAsset");
    const edited = await page.evaluate(() => {
      const state = window.__app.planning.state, asset = state.planningAssets[0], graphic = window.__app.planning.layers.planningAssets.graphics.getItemAt(0), ops = JSON.parse(localStorage.getItem("sar.operations." + (state.incidentId || "draft")));
      return { name: asset.name, type: asset.assetType, description: asset.description, symbol: graphic.symbol.url, records: ops.records.filter(r => r.kind === "asset").length, assignmentIds: ops.assignments.map(a => a.id) };
    });
    expect(edited).toMatchObject({ name: "K9 Bravo", type: "Vehicle", description: "Updated capabilities", records: 1, assignmentIds: ["KEEP-ME"] });
    expect(edited.symbol).toContain("asset-vehicle.svg");
    await page.click("#deletePlanningAsset");
    const removed = await page.evaluate(() => { const state = window.__app.planning.state, ops = JSON.parse(localStorage.getItem("sar.operations." + (state.incidentId || "draft"))); return { assets: state.planningAssets.length, assignments: ops.assignments.map(a => a.id), records: ops.records.filter(r => r.kind === "asset").length }; });
    expect(removed).toEqual({ assets: 0, assignments: ["KEEP-ME"], records: 0 });
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
