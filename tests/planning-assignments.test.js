"use strict";
const assert = require("assert"), fs = require("fs");
const planning = fs.readFileSync("app/planning-assignments.js", "utf8"), index = fs.readFileSync("app/index.html", "utf8"), operations = fs.readFileSync("app/operations.html", "utf8"), reports = fs.readFileSync("app/reports.js", "utf8"), theme = fs.readFileSync("app/theme.css", "utf8");
[
  ["Planning loads a right-side assignment panel", /planningAssignmentPanel/.test(planning) && /grid-template-columns:minmax\(330px,410px\).*minmax\(300px,360px\)/.test(index)],
  ["Plans captures segment, team name and task description", /planAssignmentSegment/.test(planning) && /planAssignmentTeam/.test(planning) && /planAssignmentDescription/.test(planning)],
  ["Planning assignments hand off segments and tasks to Operations", /sar\.operations\./.test(planning) && /segmentRecords/.test(planning) && /autoload=local/.test(planning)],
  ["Selecting a segment zooms and flashes it on the map", /focusSegment/.test(planning) && /geometry\.extent\.expand\(1\.8\)/.test(planning) && /layerView\.highlight\(graphic\)/.test(planning)],
  ["Operations owns Assigned, Complete and Abandoned status", /<option>Assigned<\/option><option>Complete<\/option><option>Abandoned<\/option>/.test(operations)],
  ["Team debrief captures POD and notes", /assignmentPOD/.test(operations) && /assignmentDebrief/.test(operations) && /podPercent/.test(operations)],
  ["Operations records the search-again decision", /assignmentSearchAgain/.test(operations) && /Search this area again/.test(operations) && /searchAgain/.test(operations)],
  ["Completed work requires debrief POD and search-again decision", /Complete the team debrief POD percentage/.test(operations)],
  ["Assignment PDF includes debrief outcome", /Team debrief POD/.test(reports) && /Search area again/.test(reports) && /Team debrief/.test(reports)],
  ["Planning assignment panel uses shared theme", /planning-assignment-head/.test(theme) && /planning-assignment-item/.test(theme)]
].forEach(([name, ok]) => { assert.ok(ok, name); console.log("ok ", name); });
