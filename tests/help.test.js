"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const app = path.join(__dirname, "../app");
const settings = fs.readFileSync(path.join(app, "settings.html"), "utf8");
const help = fs.readFileSync(path.join(app, "help-guide.js"), "utf8");
assert.match(settings, /<script src="\.\/help-guide\.js"><\/script>/);
assert.match(help, /downloadHelpPdf/);
assert.match(help, /helpVisualWalkthroughs/);
assert.match(help, /help-pointer/);
assert.match(help, /jspdf/);
assert.match(help, /doc\.addImage/);
for (const name of ["planning-overview.png", "operations-overview.png", "settings-overview.png"]) {
  const file = path.join(app, "assets/help", name);
  assert.ok(fs.existsSync(file), `${name} must exist`);
  assert.ok(fs.statSync(file).size > 50000, `${name} must contain a real screenshot`);
}
console.log("ok  Help & How-to includes annotated screenshots and downloadable PDF generation");
