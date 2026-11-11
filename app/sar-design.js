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
  function assetFile(value) { return ASSET_FILES[assetType(value)]; }
  function assetIconUrl(value) { return "./assets/napsg/" + assetFile(value); }
  function assetSymbol(value, size = 32) {
    return { type: "picture-marker", url: assetIconUrl(value), width: size + "px", height: size + "px" };
  }
  function createAssetTypeCombobox(select) {
    select = fieldElement(select); if (!select || select.dataset.assetComboboxReady) return select?._assetCombobox || null;
    select.dataset.assetComboboxReady = "true"; select.classList.add("sar-native-select"); select.setAttribute("aria-hidden", "true"); select.tabIndex = -1;
    const root = document.createElement("div"); root.className = "sar-asset-combobox";
    const button = document.createElement("button"); button.type = "button"; button.className = "sar-asset-combobox-button"; button.setAttribute("aria-haspopup", "listbox"); button.setAttribute("aria-expanded", "false");
    const list = document.createElement("div"); list.className = "sar-asset-options"; list.id = select.id + "-listbox"; list.role = "listbox"; list.hidden = true; button.setAttribute("aria-controls", list.id);
    const types = Object.keys(ASSET_FILES); let active = Math.max(0, types.indexOf(assetType(select.value)));
    function icon(type, decorative = true) { const img = document.createElement("img"); img.src = assetIconUrl(type); img.alt = decorative ? "" : type + " NAPSG icon"; if (decorative) img.setAttribute("aria-hidden", "true"); return img; }
    function paintButton() { const type = assetType(select.value); button.replaceChildren(icon(type), document.createTextNode(type)); button.setAttribute("aria-label", "Asset type, " + type); }
    function paintOptions() { [...list.children].forEach((option, index) => { const selected = types[index] === assetType(select.value); option.setAttribute("aria-selected", String(selected)); option.classList.toggle("active", index === active); }); }
    function close(focus = false) { list.hidden = true; button.setAttribute("aria-expanded", "false"); if (focus) button.focus(); }
    function open() { list.hidden = false; button.setAttribute("aria-expanded", "true"); active = Math.max(0, types.indexOf(assetType(select.value))); paintOptions(); list.children[active]?.focus(); }
    function choose(index) { active = (index + types.length) % types.length; select.value = types[active]; select.dispatchEvent(new Event("change", { bubbles: true })); paintButton(); paintOptions(); close(true); }
    types.forEach((type, index) => { const option = document.createElement("button"); option.type = "button"; option.className = "sar-asset-option"; option.role = "option"; option.id = select.id + "-option-" + index; option.tabIndex = -1; option.dataset.value = type; option.append(icon(type), document.createTextNode(type)); option.onclick = () => choose(index); option.onkeydown = event => { if (["ArrowDown", "ArrowRight"].includes(event.key)) { event.preventDefault(); active = (index + 1) % types.length; paintOptions(); list.children[active].focus(); } else if (["ArrowUp", "ArrowLeft"].includes(event.key)) { event.preventDefault(); active = (index - 1 + types.length) % types.length; paintOptions(); list.children[active].focus(); } else if (event.key === "Home") { event.preventDefault(); active = 0; paintOptions(); list.children[active].focus(); } else if (event.key === "End") { event.preventDefault(); active = types.length - 1; paintOptions(); list.children[active].focus(); } else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(index); } else if (event.key === "Escape") { event.preventDefault(); close(true); } else if (event.key === "Tab") close(false); }; list.appendChild(option); });
    button.onclick = () => list.hidden ? open() : close(false);
    button.onkeydown = event => { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); open(); } else if (event.key === "Escape") close(false); };
    select.addEventListener("change", () => { paintButton(); paintOptions(); });
    document.addEventListener("pointerdown", event => { if (!root.contains(event.target)) close(false); });
    select.after(root); root.append(button, list); paintButton(); paintOptions();
    return select._assetCombobox = { root, button, list, open, close, setValue(value) { select.value = assetType(value); select.dispatchEvent(new Event("change", { bubbles: true })); } };
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
  window.SARDesign = { ASSET_FILES, STATUS_COLORS, assignmentStatus, assignmentSymbol, assetType, assetFile, assetIconUrl, assetSymbol, createAssetTypeCombobox };
  window.SARValidation = { required, validate, invalidate, clear };
})();
