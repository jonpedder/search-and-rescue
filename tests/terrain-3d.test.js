const assert = require("assert");
const fs = require("fs");
const path = require("path");
const api = require("../app/terrain-3d.js");

assert.equal(typeof api.init, "function");
const moduleSource = fs.readFileSync(path.join(__dirname, "../app/terrain-3d.js"), "utf8");
for (const contract of ["world-elevation", 'map.basemap = "hybrid"', "tilt: 60", "directShadowsEnabled: true", "ambientOcclusionEnabled: true", "sar-3d-toggle", "3D Terrain", "2D Map"]) {
  assert.ok(moduleSource.includes(contract), `3D module must include ${contract}`);
}

const surfaces = ["index.html", "operations.html", "analysis.html"];
for (const file of surfaces) {
  const html = fs.readFileSync(path.join(__dirname, "../app", file), "utf8");
  assert.ok(html.includes("terrain-3d.js"), `${file} must load the shared 3D toggle`);
}
const planning = fs.readFileSync(path.join(__dirname, "../app/index.html"), "utf8");
const operations = fs.readFileSync(path.join(__dirname, "../app/operations.html"), "utf8");
const analysis = fs.readFileSync(path.join(__dirname, "../app/analysis.js"), "utf8");
for (const source of [planning, operations, analysis]) {
  assert.ok(source.includes("SceneView"), "Every interactive map must load SceneView");
  assert.ok(source.includes("SARTerrain3D.init"), "Every interactive map must initialize the terrain toggle");
}
console.log("3D terrain tests passed");
