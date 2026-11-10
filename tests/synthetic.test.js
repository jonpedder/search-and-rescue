"use strict";
const assert = require("assert");
global.window = global;
require("../app/synthetic-data.js");

const data = global.SARSynthetic.build({ total: 5000, seed: 42, now: Date.UTC(2026, 0, 15) });
const total = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
assert.equal(total, 5000, "generator must create the exact requested total");
assert.equal(new Set(data[0].map(f => f.attributes.subject_category)).size, 35, "every subject category must appear");
assert.ok(data[3].length > 0 && data[5].length > 0, "clues and assignments must be generated");
assert.deepEqual(new Set(data[2].map(f => f.attributes.status)), new Set(["Unassigned", "Assigned", "InProgress", "Complete"]));
assert.ok(data[0].every(f => f.attributes.incident_id.startsWith("SYN-")), "incident records must carry the delete-safe prefix");
assert.ok(data[7].every(f => f.attributes.source.startsWith("SYNTHETIC_PLACEHOLDER")), "reference rows must carry the delete-safe source");
assert.ok(data[0].every(f => f.attributes.last_seen <= Date.UTC(2026, 0, 15)), "timestamps must not be in the future");
for (const id of [0, 1, 2, 3, 4]) {
  assert.ok(data[id].every(f => f.geometry && f.geometry.spatialReference && f.geometry.spatialReference.wkid === 4326), `spatial layer ${id} must have WGS84 geometry for every record`);
}
for (const id of [5, 6, 7, 8]) assert.ok(data[id].every(f => !f.geometry), `nonspatial table ${id} must remain related tabular data`);
console.log("ok  synthetic generator creates 5,000 tagged records with complete spatial geometry");
