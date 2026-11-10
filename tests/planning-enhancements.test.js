const fs = require("fs");
const assert = require("assert");
const index = fs.readFileSync("app/index.html", "utf8");
const enhancements = fs.readFileSync("app/planning-enhancements.js", "utf8");
const reports = fs.readFileSync("app/reports.js", "utf8");
const theme = fs.readFileSync("app/theme.css", "utf8");

[
  ["photo upload and preview", /intPhotoFile/.test(enhancements) && /intPhotoPreview/.test(enhancements)],
  ["model information buttons", /model-info-button/.test(enhancements) && /modelHelp/.test(enhancements)],
  ["default public trail and known-place sources", /National_Park_Service_Trails/.test(enhancements) && /USA_Major_Cities/.test(enhancements)],
  ["precalculated estimated POD", /estimateSegmentPOD/.test(index) && /Est\. POD/.test(index)],
  ["survival fallback for every category", /PLANNING PLACEHOLDER category curve/.test(enhancements)],
  ["search segments planning report", /Search Segments Planning Report/.test(reports) && /searchSegmentsMapImage/.test(reports)],
  ["larger custom cell-site marker", /cell-site\.svg/.test(index) && /width:"30px"/.test(index)],
  ["named incident plan save and retrieval", /Save named plan/.test(enhancements) && /Retrieve plan/.test(enhancements)],
  ["current planning profile survives page navigation", /sar\.planning\.current\.v1/.test(enhancements) && /pagehide/.test(enhancements) && /persistCurrentPlan/.test(enhancements)],
  ["operational period boundary", /next local 12 AM or 12 PM/.test(enhancements) && /planningPeriodEnd/.test(enhancements)],
  ["enhancement styles", /subject-photo-tools/.test(theme) && /incident-plan-tools/.test(theme)]
].forEach(([name, ok]) => { assert.ok(ok, name); console.log("ok ", name); });
