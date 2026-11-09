// Run with: node tests/model.test.js   (no dependencies)
const fs = require("fs"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "app", "index.html"), "utf8");
const src = html.match(/<script id="lpb-model">([\s\S]*?)<\/script>/)[1];
const LPB = new Function("module", src + "; return LPB;")(undefined);
const stats = LPB.normStats(LPB.parseCSV(fs.readFileSync(path.join(root, "data", "lpb_stats_seed.csv"), "utf8")));

let passed = 0;
function test(name, fn){ try{ fn(); passed++; console.log("ok  " + name); } catch(e){ console.error("FAIL " + name + "\n    " + e.message); process.exitCode = 1; } }
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || "") + " expected " + b + " +/- " + tol + ", got " + a);
const sum = a => Array.from(a).reduce((x, y) => x + y, 0);
const grid = (n, R, fn) => { const s = 2*R/n, z = new Float64Array(n*n); for(let j=0;j<n;j++) for(let i=0;i<n;i++) z[j*n+i] = fn(-R+(i+.5)*s, -R+(j+.5)*s); return {z, s}; };

const LAT = 34.14, LON = -118.03;
const dem = LPB.matchStats(stats, {category:"Dementia", domain:"Temperate", terrain:"Mountainous"});
const base = {row: dem.row, lat: LAT, lon: LON, n: 28, extentIdx: 2, lines: [], scenarios: [{name:"A", prob:100, bearing:null}]};

test("seed CSV parses and Dementia rows carry n and percentiles", () => {
  assert.ok(stats.length >= 5);
  assert.strictEqual(dem.row.n, 95);
  assert.deepStrictEqual(dem.row.dist, [0.3, 0.8, 1.9, 8.3]);
});
test("stat lookup: exact, fallback tiers, none", () => {
  assert.strictEqual(dem.tier, 0);
  assert.strictEqual(LPB.matchStats(stats, {category:"Dementia", domain:"Urban", terrain:"Mountainous"}).tier, 0);
  const fb = LPB.matchStats(stats, {category:"Hiker", domain:"Dry", terrain:"Flat"});
  assert.ok(fb.tier > 0 && fb.warnings.some(w => /TEST DATA/.test(w)));
  assert.strictEqual(LPB.matchStats(stats, {category:"Caver", domain:"Dry", terrain:"Flat"}), null);
});
test("small sample is flagged", () => {
  assert.ok(LPB.matchStats(stats, {category:"Dementia", domain:"Dry", terrain:"Mountainous"}).warnings.some(w => /Small sample/.test(w)));
});
test("ring model: POA sums to 1 and tracks percentile bands", () => {
  const o = LPB.runModel({...base, n: 32, weights:{ring:100, sector:0, linear:0, terrain:0, elev:0}});
  close(sum(o.poa), 1, 1e-9);
  let w08 = 0; o.cells.forEach((c, i) => { if(c.distKm <= 0.8) w08 += o.poa[i]; });
  close(w08, 0.667, 0.03, "mass within 50% ring (renormalised to 75% area)");
});
test("sector layer favours the bearing; linear layer favours a nearby line", () => {
  const sec = LPB.runModel({...base, scenarios:[{name:"A", prob:100, bearing:90}], weights:{ring:20, sector:80, linear:0}});
  let e = 0, w = 0; sec.cells.forEach((c, i) => { if(c.cx > 0) e += sec.poa[i]; else w += sec.poa[i]; });
  assert.ok(e > 1.5*w, "east " + e + " west " + w);
  const line = [[LON + 0.0044, LAT - 0.05], [LON + 0.0044, LAT + 0.05]];
  const lin = LPB.runModel({...base, lines:[line], weights:{ring:20, sector:0, linear:80}});
  let near = 0; lin.cells.forEach((c, i) => { if(Math.abs(c.cx - 400) < 150) near += lin.poa[i]; });
  assert.ok(near > 0.25, "mass near line " + near);
  assert.ok(lin.usedLayers.includes("linear"));
});
test("scenario blend sums to 1; missing dispersion stats skip the sector layer with a note", () => {
  const o = LPB.runModel({...base, scenarios:[{name:"A", prob:70, bearing:90}, {name:"B", prob:30, bearing:null}], weights:{ring:50, sector:25, linear:0}});
  close(sum(o.poa), 1, 1e-9);
  const u = LPB.matchStats(stats, {category:"Dementia", domain:"Urban", terrain:"Flat"});
  const o2 = LPB.runModel({...base, row:u.row, scenarios:[{name:"A", prob:100, bearing:45}], weights:{ring:50, sector:50, linear:0}});
  assert.ok(!o2.usedLayers.includes("sector") && o2.notes.some(n => /dispersion/.test(n)));
});
test("POD update redistributes POA and conserves probability", () => {
  const r = LPB.applyPOD([0.5, 0.3, 0.2], [0.8, 0, 0]);
  close(r.total, 0.4, 1e-12); close(sum(r.next), 1, 1e-12);
  assert.ok(r.next[0] < 0.5/1 && r.next[1] > 0.3);
});
test("survival curve matches the deck fit", () => close(LPB.survival(1.0042, 0.264, 31.5), 0.710, 0.002));
test("cost surface: flat ground within 3% of straight-line time at flat Tobler speed", () => {
  const n = 121, R = 2000, g = grid(n, R, () => 100), t = LPB.costSurface(g.z, n, g.s);
  for(const [x, y] of [[1000,0],[0,-1500],[700,700],[-1200,500]]){
    const exp = Math.hypot(x, y)/1000/LPB.FLAT_KMH; close(LPB.sampleGrid(t, n, R, x, y)/exp, 1, 0.03);
  }
});
test("cost surface: uphill slower than downhill, matching Tobler", () => {
  const n = 121, R = 2000, g = grid(n, R, x => 100 + 0.10*x), t = LPB.costSurface(g.z, n, g.s);
  const up = LPB.sampleGrid(t, n, R, 1000, 0), down = LPB.sampleGrid(t, n, R, -1000, 0), f = Math.hypot(1, .1);
  close(up, f/LPB.toblerKmh(.1), 0.01); close(down, f/LPB.toblerKmh(-.1), 0.01); assert.ok(up > down);
});
test("cost surface: a ridge with a gap forces a detour", () => {
  const n = 121, R = 2000, g = grid(n, R, (x, y) => (Math.abs(y - 800) < 100 && Math.abs(x) > 200) ? 700 : 100);
  const t = LPB.costSurface(g.z, n, g.s, {maxSlopeDeg: 50});
  assert.ok(LPB.sampleGrid(t, n, R, 800, 1400) > Math.hypot(800, 1400)/1000/LPB.FLAT_KMH*1.04);
});
test("DEM layers: elevation bias shifts probability downhill; POA still sums to 1", () => {
  const n2 = 100, R2 = dem.row.dist[2]*1000, g = grid(n2, R2, x => 100 + 0.08*x);
  const d = {n: n2, rMax: R2, z: g.z, times: LPB.costSurface(g.z, n2, g.s)};
  const o = LPB.runModel({...base, dem: d, weights:{ring:30, sector:0, linear:0, terrain:40, elev:20}});
  close(sum(o.poa), 1, 1e-9); assert.ok(o.usedLayers.includes("terrain") && o.usedLayers.includes("elev"));
  let e = 0, w = 0; o.cells.forEach((c, i) => { if(c.cx > 0) e += o.poa[i]; else w += o.poa[i]; });
  assert.ok(w > e, "west (downhill) " + w + " should exceed east " + e);
});
test("hillshade stays within 0-255", () => {
  const g = grid(50, 1000, (x, y) => 100 + 50*Math.sin(x/200)); const h = LPB.hillshade(g.z, 50, g.s);
  assert.ok(Math.min(...h) >= 0 && Math.max(...h) <= 255);
});
console.log("\n" + passed + " passed" + (process.exitCode ? ", with failures" : ""));
