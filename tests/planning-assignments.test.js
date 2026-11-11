"use strict";
const assert = require("assert"), fs = require("fs");
const planning = fs.readFileSync("app/planning-assignments.js", "utf8"), index = fs.readFileSync("app/index.html", "utf8"), operations = fs.readFileSync("app/operations.html", "utf8"), reports = fs.readFileSync("app/reports.js", "utf8"), theme = fs.readFileSync("app/theme.css", "utf8"), design = fs.readFileSync("app/sar-design.js", "utf8");
[
  ["Planning loads a right-side assignment panel", /planningAssignmentPanel/.test(planning) && /--sar-planning-left/.test(index) && /--sar-planning-right/.test(index)],
  ["Plans captures segment, team name and task description", /planAssignmentSegment/.test(planning) && /planAssignmentTeam/.test(planning) && /planAssignmentDescription/.test(planning)],
  ["Planning assignments hand off segments and tasks to Operations", /sar\.operations\./.test(planning) && /segmentRecords/.test(planning) && /autoload=local/.test(planning)],
  ["Selecting a segment zooms and flashes it on the map", /focusSegment/.test(planning) && /geometry\.extent\.expand\(1\.8\)/.test(planning) && /layerView\.highlight\(graphic\)/.test(planning)],
  ["Assignment Buffer supports point-to-point and freehand line drawing", /drawAssignmentBufferClick/.test(planning) && /drawAssignmentBufferFreehand/.test(planning) && /mode === "freehand"/.test(planning)],
  ["Assignment Buffer options are labelled and collapsed by default", /<details class="assignment-tool-options"><summary>Assignment Buffer<\/summary>/.test(planning) && !/<details class="assignment-tool-options" open>/.test(planning)],
  ["Assignment Buffer converts feet or meters to a polygon", /assignmentBufferDistance/.test(planning) && /distance \* 0\.3048/.test(planning) && /geodesicBuffer/.test(planning) && /simple-fill/.test(planning)],
  ["Assignment buffer polygons persist and hand off to Operations", /assignmentBuffers/.test(planning) && /sourceLine/.test(planning) && /Assignment buffer/.test(planning) && /assignmentBuffers/.test(fs.readFileSync("app/planning-enhancements.js", "utf8"))],
  ["Editing palette includes direct assignment polygons", /Assignment editing palette/.test(planning) && /drawAssignmentPolygon/.test(planning) && /createAssignmentPolygon/.test(planning) && /assignmentPolygons/.test(planning)],
  ["Dedicated editor places independent named asset points", /Asset editor/.test(planning) && /Place &amp; save asset/.test(planning) && /planningAssetName/.test(planning) && /planningAssetType/.test(planning) && /planningAssetDescription/.test(planning) && /createPlanningAsset/.test(planning)],
  ["Asset type combobox renders local icons with accessible keyboard options", /createAssetTypeCombobox/.test(design) && /role = "option"/.test(design) && /aria-expanded/.test(design) && /assetIconUrl/.test(design) && /event\.key === "Escape"/.test(design)],
  ["Asset save and handoff are independent from assignments", /syncAssetToOperations/.test(planning) && /existing\.assignments = existing\.assignments \|\| \[\]/.test(planning) && /savePlanningAsset/.test(planning) && /Assignments were not changed/.test(planning)],
  ["Asset description persists in records and safe field popups", /description: a\.description/.test(planning) && /fieldName: "description"/.test(planning) && /type: "fields"/.test(planning) && /notes: a\.description/.test(planning)],
  ["Asset edits update NAPSG symbols without moving geometry", /graphic\.symbol = design\.assetSymbol\(entry\.assetType\)/.test(planning) && /without moving the point/.test(planning)],
  ["Assignment polygons and assets persist with the incident", /assignmentPolygons/.test(fs.readFileSync("app/planning-enhancements.js", "utf8")) && /planningAssets/.test(fs.readFileSync("app/planning-enhancements.js", "utf8"))],
  ["Operations owns Unassigned, Assigned, Complete and Abandoned status", /<option>Unassigned<\/option><option>Assigned<\/option><option>Complete<\/option><option>Abandoned<\/option>/.test(operations)],
  ["new assignments safely default to Unassigned", /planAssignmentStatus[\s\S]*<option>Unassigned<\/option>/.test(planning) && /assignmentStatus\"\)\.value=\"Unassigned\"/.test(operations)],
  ["assignment polygons use shared status colors", /STATUS_COLORS/.test(design) && /assignmentSymbol\(a\.status\)/.test(operations) && /updateAssignmentGeometryStatus/.test(planning)],
  ["official local NAPSG assets map by asset type", ["ground-team","canine","air","command","medical","vehicle"].every(name => fs.existsSync(`app/assets/napsg/asset-${name}.svg`)) && /assetSymbol\(a\?\.assetType\)/.test(operations) && /design\.assetSymbol\(assetType\)/.test(planning)],
  ["Assignment and Asset Design lists assignments and assets", /Assignment &amp; Asset Design/.test(planning) && /planningAssetList/.test(planning) && /planningAssetCount/.test(planning) && /focusAsset/.test(planning)],
  ["required planning fields use accessible reusable validation", /SARValidation/.test(design) && /aria-invalid/.test(design) && /sar-invalid-flash/.test(theme) && /validation\.required/.test(planning)],
  ["Team debrief captures POD and notes", /assignmentPOD/.test(operations) && /assignmentDebrief/.test(operations) && /podPercent/.test(operations)],
  ["Operations records the search-again decision", /assignmentSearchAgain/.test(operations) && /Search this area again/.test(operations) && /searchAgain/.test(operations)],
  ["Completed work requires debrief POD and search-again decision", /Enter a team debrief POD from 0 to 100/.test(operations) && /Choose whether this area should be searched again/.test(operations)],
  ["Assignment PDF includes debrief outcome", /Team debrief POD/.test(reports) && /Search area again/.test(reports) && /Team debrief/.test(reports)],
  ["Planning assignment panel uses shared theme", /planning-assignment-head/.test(theme) && /planning-assignment-item/.test(theme)]
].forEach(([name, ok]) => { assert.ok(ok, name); console.log("ok ", name); });
