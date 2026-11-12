/* Visual Help & How-to walkthroughs and downloadable operator guide. */
(function () {
  "use strict";
  var help = document.getElementById("helpPanel"); if (!help || document.getElementById("helpVisualWalkthroughs")) return;
  var JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  var guides = [
    { title: "Planning workbench", image: "./assets/help/planning-overview.png", callouts: [
      [1, 48, 6, "Select a report and export PDF"], [2, 85, 6, "Sign in and confirm the active user"], [3, 18, 15, "Move between planning sections"],
      [4, 18, 42, "Enter the incident and Initial Planning Point"], [5, 38, 37, "Use native map and sketch tools"], [6, 86, 17, "Search for an address or place"]
    ]},
    { title: "SAR Operations", image: "./assets/help/operations-overview.png", callouts: [
      [1, 17, 14, "Switch between Edit Map, Assignments, Resources and Reports"], [2, 16, 29, "Set the incident ID and load local or ArcGIS records"], [3, 35, 35, "Navigate and inspect the operational map"],
      [4, 87, 30, "Control visibility and zoom from Operational Layers"], [5, 16, 78, "Choose an object type, then draw it on the map"], [6, 69, 6, "Open Planning, Operations or Analysis from the shared header"]
    ]},
    { title: "Incident Analysis", image: "./assets/help/analysis-overview.png", callouts: [
      [1, 48, 27, "Review filter-linked incident and outcome KPIs"], [2, 87, 23, "Apply incident, date, status, category and period filters"], [3, 97, 22, "Collapse or reopen the Analysis filter rail"],
      [4, 24, 58, "Switch hotspot map display and inspect incidents"], [5, 58, 66, "Select weekday/hour cells to cross-filter the dashboard"], [6, 87, 82, "Search and select filter-linked incident details"]
    ]},
    { title: "Settings and administration", image: "./assets/help/settings-overview.png", callouts: [
      [1, 21, 17, "Switch between Configuration and Help & How-to"], [2, 18, 62, "Export or import a reviewed settings template"], [3, 44, 95, "Apply, save, discard or reset configuration"],
      [4, 86, 7, "Sign in and verify the authenticated user"], [5, 65, 7, "Open Planning and Operations from any page"]
    ]}
  ];
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  var visual = document.createElement("section"); visual.id = "helpVisualWalkthroughs"; visual.className = "card help-card";
  visual.innerHTML = '<div class="help-guide-head"><div><h2>Visual walkthroughs</h2><p>Follow the numbered dots in each screenshot. The callouts point to the controls used at each stage of an incident.</p></div><calcite-button id="downloadHelpPdf" icon-start="file-pdf">Download Help PDF</calcite-button></div>' + guides.map(function (g) {
    return '<figure class="help-figure"><h3>' + esc(g.title) + '</h3><div class="help-shot"><img src="' + g.image + '" alt="' + esc(g.title) + ' screenshot with numbered action pointers">' + g.callouts.map(function (c) {
      var side = c[1] > 72 ? "left" : "right"; return '<span class="help-pointer ' + side + '" style="--x:' + c[1] + '%;--y:' + c[2] + '%"><b>' + c[0] + '</b><em>' + esc(c[3]) + '</em></span>';
    }).join("") + '</div><figcaption><ol class="help-callout-list">' + g.callouts.map(function (c) { return '<li><b>' + c[0] + '</b><span>' + esc(c[3]) + '</span></li>'; }).join("") + '</ol></figcaption></figure>';
  }).join("");
  var about = document.getElementById("about"); about.insertAdjacentElement("afterend", visual);
  var nav = help.querySelector(".help-nav"); if (nav) { var a = document.createElement("a"); a.href = "#helpVisualWalkthroughs"; a.textContent = "Visual walkthroughs & PDF"; nav.insertBefore(a, nav.children[1] || null); }

  function loadPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise(function (resolve, reject) {
      var amd = window.define; window.define = undefined; var s = document.createElement("script"); s.src = JSPDF;
      s.onload = function () { window.define = amd; window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error("PDF library did not initialize.")); };
      s.onerror = function () { window.define = amd; reject(new Error("The PDF library could not be loaded.")); }; document.head.appendChild(s);
    });
  }
  function loadImage(src) { return new Promise(function (resolve, reject) { var image = new Image(); image.onload = function () { resolve(image); }; image.onerror = reject; image.src = src; }); }
  function save(blob) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sar-operator-help-guide-" + new Date().toISOString().slice(0, 10) + ".pdf"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); }
  async function buildPdf() {
    var jsPDF = await loadPdf(), doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" }), W = 612, H = 792, M = 40, navy = [0, 59, 92], gold = [242, 169, 0], ink = [25, 35, 45], muted = [95, 110, 122], y = 0;
    function header(title, subtitle) { doc.setFillColor.apply(doc, navy); doc.rect(0, 0, W, 58, "F"); doc.setFillColor.apply(doc, gold); doc.rect(0, 58, W, 3, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(title, M, 29); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor.apply(doc, gold); doc.text(subtitle || "Search & Rescue operator guide", M, 45); y = 82; }
    function next(title) { doc.addPage(); header(title); }
    function need(h, title) { if (y + h > H - 45) next(title || "Help & How-to"); }
    function heading(t, size) { need(28); doc.setFont("helvetica", "bold"); doc.setFontSize(size || 13); doc.setTextColor.apply(doc, navy); doc.text(t, M, y); y += (size || 13) + 8; }
    function para(t, bullet) { if (!t) return; doc.setFont("helvetica", "normal"); doc.setFontSize(9.2); doc.setTextColor.apply(doc, ink); var indent = bullet ? 14 : 0, lines = doc.splitTextToSize(t, W - M * 2 - indent); need(lines.length * 12 + 4); if (bullet) doc.text("•", M + 2, y); doc.text(lines, M + indent, y); y += lines.length * 12 + 5; }
    header("Search & Rescue Help & How-to", "Visual operator guide - generated " + new Date().toLocaleString());
    doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor.apply(doc, navy); doc.text("Operator quick guide", M, 126); y = 154;
    para("This guide explains the current Planning, Operations, Analysis and Settings workspaces. Numbered dots in the screenshots point to the controls used during the workflow.");
    para("Decision support only. Validate model output, map content, assignments and field reports through incident command and current agency procedures.");
    y += 8; heading("Recommended sequence", 15);
    ["Sign in and verify the authenticated ArcGIS user.", "Create or open an incident and set the Initial Planning Point.", "Complete the subject profile and interview; review planning cues.", "Run the model, inspect assumptions and create ranked search segments.", "Use the independent Asset editor to enter a required name, choose a NAPSG icon/type, optionally describe the resource, then place and save it. Select an asset in Assignment & Asset Design to edit details without moving it.", "Prepare assignments separately; an asset never requires or creates an assignment.", "Open SAR Operations, load the incident, create assignments and map clues/tracks.", "Use Analysis filters and weekday/hour cells to review patterns; reconcile the result with incident command.", "Export approved data or reports and preserve incident records in authorized systems."].forEach(function (x) { para(x, true); });

    for (var gi = 0; gi < guides.length; gi++) {
      var g = guides[gi], img = await loadImage(g.image); next(g.title, "Numbered controls and actions");
      var iw = W - M * 2, ih = iw * img.naturalHeight / img.naturalWidth; doc.addImage(img, "PNG", M, y, iw, ih);
      g.callouts.forEach(function (c) { var x = M + iw * c[1] / 100, yy = y + ih * c[2] / 100; doc.setFillColor.apply(doc, gold); doc.circle(x, yy, 8, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor.apply(doc, navy); doc.text(String(c[0]), x, yy + 3, { align: "center" }); });
      y += ih + 18; doc.setFontSize(9); g.callouts.forEach(function (c) { para(c[0] + ". " + c[3], false); });
    }

    var cards = Array.from(help.querySelectorAll(".help-card")).filter(function (s) { return s.id !== "helpVisualWalkthroughs"; });
    next("Detailed help topics");
    cards.forEach(function (section) {
      var title = section.querySelector("h2"); if (title) heading(title.textContent.trim(), 13);
      Array.from(section.querySelectorAll(":scope > p, :scope > ol > li, :scope > ul > li, :scope > .callout")).forEach(function (el) { para(el.textContent.trim(), el.tagName === "LI"); });
    });
    var pages = doc.getNumberOfPages(); for (var p = 1; p <= pages; p++) { doc.setPage(p); doc.setDrawColor(205, 212, 218); doc.line(M, H - 32, W - M, H - 32); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor.apply(doc, muted); doc.text("Search & Rescue Help & How-to", M, H - 20); doc.text("Page " + p + " of " + pages, W - M, H - 20, { align: "right" }); }
    return doc.output("blob");
  }
  document.getElementById("downloadHelpPdf").onclick = async function () { var b = this; b.loading = true; b.disabled = true; try { save(await buildPdf()); } catch (e) { alert("Help PDF could not be created: " + (e.message || e)); } finally { b.loading = false; b.disabled = false; } };
})();
