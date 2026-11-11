"use strict";
const assert = require("assert"), fs = require("fs"), path = require("path");
const R = require("../app/resizable-panels.js");
assert.equal(R.clamp(100, 200, 400), 200);
assert.equal(R.clamp(500, 200, 400), 400);
assert.equal(R.clamp(275, 200, 400), 275);
assert.equal(R.finiteWidth("320"), 320);
assert.equal(R.finiteWidth("not-a-width"), null);
assert.equal(R.pageConfigs.length, 6, "all genuine persistent sidebars share one registry");
assert.equal(new Set(R.pageConfigs.map(x => x.key)).size, 6, "storage keys are panel-specific");
for (const config of R.pageConfigs) {
  assert(config.key.startsWith("sar.layout.") && config.key.endsWith(".v1"), config.id + " has a versioned storage key");
  assert(config.min < config.defaultWidth && config.defaultWidth < config.max, config.id + " has sensible limits");
  assert(config.label && config.media && config.variable, config.id + " has accessibility, responsive and CSS contracts");
}
const expected = {
  "index.html": ["sar.layout.planning.left.v1", "sar.layout.planning.right.v1"],
  "operations.html": ["sar.layout.operations.left.v1", "sar.layout.operations.layers.v1"],
  "analysis.html": ["sar.layout.analysis.left.v1"],
  "settings.html": ["sar.layout.settings.help.v1"]
};
for (const [file, keys] of Object.entries(expected)) {
  const html = fs.readFileSync(path.join(__dirname, "../app", file), "utf8");
  const layoutSource = html + (file === "analysis.html" ? fs.readFileSync(path.join(__dirname, "../app/analysis.css"), "utf8") : "");
  assert.match(html, /resizable-panels\.css\?v=/, file + " loads shared versioned CSS");
  assert.match(html, /resizable-panels\.js\?v=/, file + " loads shared versioned JS");
  for (const config of R.pageConfigs.filter(x => keys.includes(x.key))) assert(layoutSource.includes(config.variable), file + " wires " + config.variable);
}
const js = fs.readFileSync(path.join(__dirname, "../app/resizable-panels.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../app/resizable-panels.css"), "utf8");
for (const contract of [/setPointerCapture/, /releasePointerCapture/, /role", "separator/, /aria-orientation/, /aria-valuemin/, /aria-valuemax/, /aria-valuenow/, /ArrowLeft/, /ArrowRight/, /Home/, /End/, /dblclick/, /MutationObserver/, /requestAnimationFrame/, /window\.__app\.layout/]) assert(contract.test(js), "shared JS contract: " + contract);
assert.match(css, /touch-action:none/);
assert.match(css, /html\.sar-resizing/);
assert.match(css, /var\(--app-accent/);
const help = fs.readFileSync(path.join(__dirname, "../app/settings.html"), "utf8"), readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
assert(help.includes('id="layout-guide"') && /Shift<\/strong> with an arrow/.test(help));
assert(/double-click to reset/i.test(readme));
console.log("resizable panel unit and page contracts passed");
