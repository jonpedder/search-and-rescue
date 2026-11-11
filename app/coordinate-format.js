/* Shared coordinate notation for map readouts and report-grid labels. */
(function (global) {
  "use strict";
  const OPTIONS = [
    { value: "dd", label: "Decimal Degrees" },
    { value: "ddm", label: "Degrees Decimal Minutes" },
    { value: "dms", label: "Degrees Minutes Seconds" },
    { value: "utm", label: "UTM" },
    { value: "usng", label: "USNG" },
    { value: "mgrs", label: "MGRS" }
  ];
  const VALUES = OPTIONS.map(option => option.value);
  let formatterPromise;
  function normalize(value) { return VALUES.includes(value) ? value : "dd"; }
  function hemisphere(value, positive, negative) { return value < 0 ? negative : positive; }
  function parts(value) {
    const absolute = Math.abs(Number(value)), degrees = Math.floor(absolute), minutesFull = (absolute - degrees) * 60, minutes = Math.floor(minutesFull);
    return { degrees, minutes, minutesFull, seconds: (minutesFull - minutes) * 60 };
  }
  function geographic(latitude, longitude, format) {
    format = normalize(format); latitude = Number(latitude); longitude = Number(longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "Coordinate unavailable";
    if (format === "dd") return Math.abs(latitude).toFixed(5) + "° " + hemisphere(latitude, "N", "S") + ", " + Math.abs(longitude).toFixed(5) + "° " + hemisphere(longitude, "E", "W");
    const lat = parts(latitude), lon = parts(longitude);
    if (format === "ddm") return lat.degrees + "° " + lat.minutesFull.toFixed(3) + "′ " + hemisphere(latitude, "N", "S") + ", " + lon.degrees + "° " + lon.minutesFull.toFixed(3) + "′ " + hemisphere(longitude, "E", "W");
    if (format === "dms") return lat.degrees + "° " + lat.minutes + "′ " + lat.seconds.toFixed(1) + "″ " + hemisphere(latitude, "N", "S") + ", " + lon.degrees + "° " + lon.minutes + "′ " + lon.seconds.toFixed(1) + "″ " + hemisphere(longitude, "E", "W");
    return null;
  }
  function loadFormatter() {
    if (formatterPromise) return formatterPromise;
    const loader = new Promise((resolve, reject) => {
      if (typeof global.require !== "function") return reject(new Error("ArcGIS coordinate formatter is unavailable."));
      global.require(["esri/geometry/coordinateFormatter", "esri/geometry/Point"], async function (formatter, Point) {
        try { await formatter.load(); resolve({ formatter, Point }); } catch (error) { reject(error); }
      }, reject);
    });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("ArcGIS coordinate formatter timed out while loading.")), 8000));
    formatterPromise = Promise.race([loader, timeout]);
    return formatterPromise;
  }
  async function format(latitude, longitude, requested) {
    const notation = normalize(requested), local = geographic(latitude, longitude, notation);
    if (local) return { value: local, available: true, format: notation, label: OPTIONS.find(option => option.value === notation).label };
    const label = OPTIONS.find(option => option.value === notation).label;
    try {
      const modules = await loadFormatter(), point = new modules.Point({ longitude: Number(longitude), latitude: Number(latitude), spatialReference: { wkid: 4326 } });
      let value;
      if (notation === "utm") value = modules.formatter.toUtm(point, "north-south-indicators", true);
      else if (notation === "usng" && typeof modules.formatter.toUsng === "function") value = modules.formatter.toUsng(point, 5, true);
      else if (notation === "usng") throw new Error("USNG conversion is not supported by this ArcGIS Maps SDK build.");
      else value = modules.formatter.toMgrs(point, "automatic", 5, true);
      if (!value) throw new Error(label + " conversion returned no value.");
      return { value: String(value), available: true, format: notation, label };
    } catch (error) {
      return { value: label + " unavailable — coordinate formatter could not load", available: false, format: notation, label, message: error && error.message ? error.message : String(error) };
    }
  }
  function label(value) { return OPTIONS.find(option => option.value === normalize(value)).label; }
  global.SARCoordinates = { OPTIONS, normalize, geographic, format, label, loadFormatter };
})(window);
