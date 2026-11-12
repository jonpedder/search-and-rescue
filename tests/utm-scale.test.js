"use strict";
const assert = require("assert"), fs = require("fs"), path = require("path");
const U = require("../app/utm-scale.js");
const eiffel = U.toUtm(48.8583, 2.2945);
assert.equal(eiffel.zone, 31);
assert.equal(eiffel.hemisphere, "N");
assert(Math.abs(eiffel.easting - 448252) < 10, "known UTM easting is accurate");
assert(Math.abs(eiffel.northing - 5411944) < 20, "known UTM northing is accurate");
const sydney = U.toUtm(-33.8568, 151.2153);
assert.equal(sydney.zone, 56);
assert.equal(sydney.hemisphere, "S");
assert(sydney.northing > 6000000 && sydney.northing < 7000000, "southern false northing is applied");
assert.equal(U.toUtm(85, 0), null, "UPS-only latitudes are reported unavailable rather than mislabeled UTM");
assert.equal(U.zoneFor(60, 6), 32, "Norway zone exception is supported");
for (const file of ["index.html", "operations.html", "analysis.html"]) {
  const html = fs.readFileSync(path.join(__dirname, "../app", file), "utf8");
  assert.match(html, /utm-scale\.css\?v=/, file + " loads UTM scale styles");
  assert.match(html, /utm-scale\.js\?v=/, file + " loads UTM scale behavior");
}
const reports = fs.readFileSync(path.join(__dirname, "../app/reports.js"), "utf8");
assert.match(reports, /UTM easting bottom \/ northing right/);
assert.match(reports, /utmBottom/);
assert.match(reports, /utmRight/);
console.log("UTM map and report scale contracts passed");
