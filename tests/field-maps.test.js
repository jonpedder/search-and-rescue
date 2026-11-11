const assert = require("assert");
const fs = require("fs");
const path = require("path");
const fieldMaps = require("../app/field-maps.js");

const config = {
  portalUrl: "https://publicsafety.maps.arcgis.com",
  webMapItemId: "5bd5bbf575794e9c9565abcb20feb991",
  serviceRoot: "https://services.example.com/arcgis/rest/services/SAR/FeatureServer/"
};

const open = new URL(fieldMaps.openMap(config));
assert.equal(open.origin, "https://fieldmaps.arcgis.app");
assert.equal(open.searchParams.get("referenceContext"), "open");
assert.equal(open.searchParams.get("itemID"), config.webMapItemId);
assert.equal(open.searchParams.get("portalURL"), config.portalUrl);

const clue = new URL(fieldMaps.clue(config, "SAR-2026-001", "Team Alpha", 1234));
assert.equal(clue.searchParams.get("referenceContext"), "addFeature");
assert.equal(clue.searchParams.get("featureSourceURL"), "https://services.example.com/arcgis/rest/services/SAR/FeatureServer/3");
assert.deepEqual(JSON.parse(clue.searchParams.get("defaultAttributes")), {
  incident_id: "SAR-2026-001",
  found_by: "Team Alpha",
  found_time: 1234
});

const track = new URL(fieldMaps.track(config, "SAR-2026-001", "Team Alpha", "OP1-201", 5678));
assert.equal(track.searchParams.get("featureSourceURL"), "https://services.example.com/arcgis/rest/services/SAR/FeatureServer/4");
assert.deepEqual(JSON.parse(track.searchParams.get("defaultAttributes")), {
  incident_id: "SAR-2026-001",
  team_name: "Team Alpha",
  task_id: "OP1-201",
  started: 5678
});

assert.throws(() => fieldMaps.openMap({}), /Web Map item ID is required/);

const operations = fs.readFileSync(path.join(__dirname, "../app/operations.html"), "utf8");
[
  "field-maps.js",
  "openFieldMaps",
  "fieldMapsClue",
  "fieldMapsTrack",
  "refreshFieldActivity",
  "assigned_team:r.attrs.assignedTeam",
  "segUpdates"
].forEach((contract) => assert.ok(operations.includes(contract), `Operations must include ${contract}`));
console.log("Field Maps tests passed");
