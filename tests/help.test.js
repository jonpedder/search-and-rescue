"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const app = path.join(__dirname, "../app");
const settings = fs.readFileSync(path.join(app, "settings.html"), "utf8");
const help = fs.readFileSync(path.join(app, "help-guide.js"), "utf8");
const settingsLayout = fs.readFileSync(path.join(app, "settings-layout.js"), "utf8");
assert.match(settings, /<script src="\.\/help-guide\.js\?v=[^"]+"><\/script>/);
assert.match(help, /downloadHelpPdf/);
assert.match(help, /helpVisualWalkthroughs/);
assert.match(help, /help-pointer/);
assert.match(help, /jspdf/);
assert.match(help, /doc\.addImage/);
for (const id of ["planning-guide", "operations-overview-guide", "analysis-guide"]) assert(settings.includes(`id="${id}"`), `${id} section must exist`);
assert.doesNotMatch(settings, /demo-video-guide/, "the video is no longer duplicated in Help");
assert.match(settingsLayout, /id=\"demoVideoTab\"/);
assert.match(settingsLayout, /demoVideoPanel\.id = \"demo-video-guide\"/);
assert.match(settingsLayout, /#demo-video-guide/);
assert.match(settingsLayout, /Demo Video - Esri Access/);
assert.match(settingsLayout, /esriis-my\.sharepoint\.com/);
for (const current of ["Assignment &amp; Asset Design", "Edit Map, Assignments, Resources and Reports", "Clear time filter", "CSV, JSON"]) assert(settings.includes(current), `current interface help missing: ${current}`);
assert.match(help, /analysis-overview\.png/);
for (const name of ["planning-overview.png", "operations-overview.png", "analysis-overview.png", "settings-overview.png"]) {
  const file = path.join(app, "assets/help", name);
  assert.ok(fs.existsSync(file), `${name} must exist`);
  assert.ok(fs.statSync(file).size > 50000, `${name} must contain a real screenshot`);
}
console.log("ok  Help & How-to includes annotated screenshots and downloadable PDF generation");
