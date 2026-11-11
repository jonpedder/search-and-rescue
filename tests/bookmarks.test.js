"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const app = path.join(__dirname, "../app");
const helper = fs.readFileSync(path.join(app, "bookmarks.js"), "utf8");
const planning = fs.readFileSync(path.join(app, "index.html"), "utf8");
const operations = fs.readFileSync(path.join(app, "operations.html"), "utf8");

for (const [name, html, key] of [
  ["Planning", planning, "sar.bookmarks.planning.v1"],
  ["Operations", operations, "sar.bookmarks.operations.v1"]
]) {
  assert.match(html, /esri\/widgets\/Bookmarks/ , `${name} loads the ArcGIS Bookmarks module`);
  assert.match(html, /esri\/webmap\/Bookmark/, `${name} loads the ArcGIS Bookmark class`);
  assert.match(html, /SARBookmarks\.init\(/, `${name} initializes persistent bookmarks`);
  assert.ok(html.includes(`storageKey:"${key}"`), `${name} uses its scoped localStorage key`);
  assert.match(html, /Expand/, `${name} keeps bookmarks in the existing Expand tool stack`);
  assert.match(html, /goToOverride[\s\S]{0,300}zoom:\s*16/, `${name} preserves address-search point zoom behavior`);
}
assert.match(helper, /editingEnabled:\s*true/);
assert.match(helper, /visibleElements:\s*\{\s*time:\s*false\s*\}/);
assert.match(helper, /collection\.on\("change"/);
assert.match(helper, /bookmark\.watch\("name"/);
assert.match(helper, /bookmark\.watch\("viewpoint"/);
assert.match(helper, /Bookmark\.fromJSON/);
assert.doesNotMatch(helper, /thumbnail/);

const sandbox = { window: { setTimeout, clearTimeout }, console: { warn() {} } };
vm.runInNewContext(helper, sandbox);
const api = sandbox.window.SARBookmarks;
const viewpoint = { targetGeometry: { type: "point", x: -118, y: 34, spatialReference: { wkid: 4326 } }, scale: 25000 };
const storage = {
  value: JSON.stringify({ version: 1, bookmarks: [
    { name: "  Command\u0000 view  ", viewpoint },
    { name: "Missing viewpoint" },
    { name: "Oversized", viewpoint: { value: "x".repeat(50001) } }
  ] }),
  getItem() { return this.value; }
};
const restored = api.storedEntries(storage, "test");
assert.strictEqual(restored.length, 1);
assert.strictEqual(restored[0].name, "Command  view");
assert.deepStrictEqual(JSON.parse(JSON.stringify(restored[0].viewpoint)), viewpoint);
storage.value = "{not json";
assert.deepStrictEqual(Array.from(api.storedEntries(storage, "test")), []);
storage.value = JSON.stringify([{ name: "Legacy", viewpoint }]);
assert.strictEqual(api.storedEntries(storage, "test")[0].name, "Legacy");
console.log("ok  editable Planning and Operations bookmarks are safely scoped and restorable");
