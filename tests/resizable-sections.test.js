"use strict";
const assert = require("assert"), fs = require("fs"), path = require("path");
const R = require("../app/resizable-sections.js");
assert.equal(R.clampHeight(80, 120, 900), 120);
assert.equal(R.clampHeight(1200, 120, 900), 900);
assert.equal(R.clampHeight(420, 120, 900), 420);
assert.equal(R.finiteHeight("365"), 365);
assert.equal(R.finiteHeight("bad"), null);
assert.equal(R.pageGroups.length, 3, "Planning, Operations and Analysis have section-resize registries");
for (const group of R.pageGroups) {
  assert(group.selector && group.prefix && group.media, group.prefix + " has selector and responsive contracts");
  assert(group.min < group.max, group.prefix + " has safe height limits");
}
for (const file of ["index.html", "operations.html", "analysis.html"]) {
  const html = fs.readFileSync(path.join(__dirname, "../app", file), "utf8");
  assert.match(html, /resizable-sections\.css\?v=/, file + " loads section-resize CSS");
  assert.match(html, /resizable-sections\.js\?v=/, file + " loads section-resize JS");
}
const js = fs.readFileSync(path.join(__dirname, "../app/resizable-sections.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../app/resizable-sections.css"), "utf8");
for (const contract of [/role", "separator/, /aria-orientation", "horizontal/, /aria-valuemin/, /aria-valuemax/, /aria-valuenow/, /ArrowUp/, /ArrowDown/, /Home/, /End/, /dblclick/, /MutationObserver/, /requestAnimationFrame/, /window\.__app\.sections/]) assert(contract.test(js), "section JS contract: " + contract);
assert.match(css, /touch-action:none/);
assert.match(css, /row-resize/);
assert.match(css, /max-width:1050px/);
const analysisCss = fs.readFileSync(path.join(__dirname, "../app/analysis.css"), "utf8");
assert.match(analysisCss, /\.combo-chart text\{[^}]*font:11px/);
assert.match(analysisCss, /\.bar-row\{[^}]*font-size:11px/);
assert.match(analysisCss, /\.heat-hour,.heat-day\{[^}]*font-size:10px/);
console.log("resizable section and Analysis graph typography contracts passed");
