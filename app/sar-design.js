/* Shared SAR assignment/asset symbology and accessible form validation. */
(function () {
  "use strict";
  const ASSET_FILES = {
    "Ground Team": "asset-ground-team.svg",
    Canine: "asset-canine.svg",
    Air: "asset-air.svg",
    Command: "asset-command.svg",
    Medical: "asset-medical.svg",
    Vehicle: "asset-vehicle.svg",
    Other: "sar.svg"
  };
  const STATUS_COLORS = {
    Unassigned: { fill: [117, 117, 117, 0.28], outline: [205, 205, 205, 1] },
    Assigned: { fill: [0, 114, 178, 0.24], outline: [86, 180, 233, 1] },
    Complete: { fill: [0, 158, 115, 0.26], outline: [70, 220, 170, 1] },
    Abandoned: { fill: [213, 94, 0, 0.25], outline: [255, 166, 77, 1] }
  };
  function assignmentStatus(value) {
    return STATUS_COLORS[value] ? value : "Unassigned";
  }
  function assetType(value) {
    if (value === "Command Post") return "Command";
    return ASSET_FILES[value] ? value : "Other";
  }
  function assetSymbol(value, size = 32) {
    const type = assetType(value);
    return { type: "picture-marker", url: "./assets/napsg/" + ASSET_FILES[type], width: size + "px", height: size + "px" };
  }
  function assignmentSymbol(value, width = 2) {
    const status = assignmentStatus(value), colors = STATUS_COLORS[status];
    return { type: "simple-fill", color: colors.fill.slice(), outline: { color: colors.outline.slice(), width } };
  }

  function fieldElement(field) { return typeof field === "string" ? document.getElementById(field) : field; }
  function errorId(field) { return (field.id || "field") + "-validation-message"; }
  function clear(field) {
    field = fieldElement(field); if (!field) return;
    field.classList.remove("sar-invalid", "sar-invalid-flash");
    field.removeAttribute("aria-invalid");
    const id = errorId(field), described = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(x => x && x !== id);
    if (described.length) field.setAttribute("aria-describedby", described.join(" ")); else field.removeAttribute("aria-describedby");
    document.getElementById(id)?.remove();
  }
  function invalidate(field, message) {
    field = fieldElement(field); if (!field) return false;
    clear(field);
    const error = document.createElement("span"); error.id = errorId(field); error.className = "sar-field-error"; error.setAttribute("role", "alert"); error.textContent = message;
    field.insertAdjacentElement("afterend", error);
    field.classList.add("sar-invalid", "sar-invalid-flash"); field.setAttribute("aria-invalid", "true"); field.setAttribute("aria-describedby", error.id);
    setTimeout(() => field.classList.remove("sar-invalid-flash"), 900);
    return false;
  }
  function validate(rules) {
    rules.forEach(rule => clear(rule.field));
    const invalid = rules.find(rule => !rule.valid(fieldElement(rule.field)));
    if (!invalid) return true;
    const field = fieldElement(invalid.field); invalidate(field, invalid.message); field?.focus({ preventScroll: false }); field?.scrollIntoView({ block: "center", behavior: "smooth" });
    return false;
  }
  function required(field, labelText) {
    field = fieldElement(field); if (!field) return;
    field.setAttribute("aria-required", "true");
    const label = field.closest("label") || (field.id ? document.querySelector('label[for="' + field.id + '"]') : null);
    if (label && !label.querySelector(".sar-required")) {
      const mark = document.createElement("span"); mark.className = "sar-required"; mark.setAttribute("aria-hidden", "true"); mark.title = "Required"; mark.textContent = " *";
      const firstText = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (firstText) firstText.after(mark); else label.prepend(mark);
    }
    if (labelText) field.setAttribute("aria-label", labelText + ", required");
    field.addEventListener("input", () => clear(field)); field.addEventListener("change", () => clear(field));
  }
  window.SARDesign = { ASSET_FILES, STATUS_COLORS, assignmentStatus, assignmentSymbol, assetType, assetSymbol };
  window.SARValidation = { required, validate, invalidate, clear };
})();
