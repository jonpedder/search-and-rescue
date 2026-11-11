const assert = require("assert");
const fs = require("fs");
const path = require("path");
const legendApi = require("../app/map-legend.js");

const visible = { title: "Search segments" };
const hiddenFromLegend = { title: "Labels", listMode: "hide" };
const disabled = { title: "Internal", legendEnabled: false };
const untitled = {};
const infos = legendApi.layerInfos({ layers: { toArray: () => [visible, hiddenFromLegend, disabled, untitled] } });
assert.deepEqual(infos.map((info) => info.title), ["Search segments", "Operational layer"]);
assert.strictEqual(infos[0].layer, visible);

for (const file of ["index.html", "operations.html", "analysis.html"]) {
  const source = fs.readFileSync(path.join(__dirname, "../app", file), "utf8");
  assert.ok(source.includes("map-legend.js"), `${file} must load the shared dynamic legend`);
}
for (const file of ["index.html", "operations.html", "analysis.js"]) {
  const source = fs.readFileSync(path.join(__dirname, "../app", file), "utf8");
  assert.ok(source.includes("SARMapLegend.create"), `${file} must build its legend from current layers`);
}
const terrain = fs.readFileSync(path.join(__dirname, "../app/terrain-3d.js"), "utf8");
assert.ok(terrain.includes("SARMapLegend.create"));
assert.ok(terrain.includes('expandTooltip: "Legend"'));
const reports = fs.readFileSync(path.join(__dirname, "../app/reports.js"), "utf8");
assert.ok(reports.includes("USGS Topo reference"));
console.log("map legend tests passed");
