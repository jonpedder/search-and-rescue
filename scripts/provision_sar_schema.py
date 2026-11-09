#!/usr/bin/env python3
"""
Provision the SAR / Lost Person Behavior data model in ArcGIS Online.

Creates ONE hosted feature service containing:
  layers: Incident(0, point) KeyPoints(1, point) SearchSegment(2, polygon)
          Clue(3, point) TrackLog(4, line)
  tables: Task(5) ModelRun(6) LPB_Stats(7) SurvivabilityCurve(8)

Then seeds LPB_Stats and SurvivabilityCurve from CSV, and creates a web map.

Usage (stand-alone):
    pip install arcgis
    python provision_sar_schema.py --portal https://www.arcgis.com --user YOU \
        --service-name SAR_LPB_Incident_Data --stats data/lpb_stats_seed.csv \
        --surv data/survivability_seed.csv

Usage (ArcGIS Notebook):  python provision_sar_schema.py --portal home

Run it in a scratch folder or developer org first. The password is prompted for,
never passed on the command line.
"""
import argparse
import csv
import getpass
import sys
import time

from arcgis.gis import GIS
from arcgis.features import FeatureLayerCollection

# --------------------------------------------------------------------------
# Domains
# --------------------------------------------------------------------------
def cv(name, values):
    return {
        "type": "codedValue",
        "name": name,
        "codedValues": [{"name": v, "code": v} for v in values],
    }

CATEGORIES = [
    "Abduction", "Aircraft", "Urban Entrapment", "Water",
    "ATV", "Horseback", "Motorcycle", "Mountain Biker", "Vehicle",
    "Autistic", "Dementia", "Despondent", "Intellectual Disability",
    "Mental Illness", "Substance Intoxication",
    "Child 1-3", "Child 4-6", "Child 7-9", "Child 10-12", "Child 13-15",
    "Angler", "Camper", "Caver", "Climber", "Gatherer", "Hiker", "Hunter",
    "Runner", "Skier-Alpine", "Skier-Nordic", "Snowboarder", "Snowmobiler",
    "Snowshoer", "Worker", "Other",
]
DOM_CATEGORY = cv("SubjectCategory", CATEGORIES)
DOM_ENV = cv("EcoDomain", ["Temperate", "Dry", "Urban"])
DOM_TERRAIN = cv("TerrainClass", ["Mountainous", "Flat", "Any"])
DOM_SEASON = cv("Season", ["Winter", "Spring", "Summer", "Fall"])
DOM_LIGHT = cv("LightCondition", ["Day", "Night", "Twilight"])
DOM_INC_STATUS = cv("IncidentStatus", ["Active", "Suspended", "Closed"])
DOM_SEG_STATUS = cv("SegmentStatus", ["Unassigned", "Assigned", "InProgress", "Complete"])
DOM_POINT_TYPE = cv("KeyPointType", ["IPP", "PLS", "LKP", "Find", "Other"])
DOM_CLUE_TYPE = cv("ClueType", ["Footprint", "Item", "Sighting", "Sound", "Scent", "Other"])
DOM_TASK_TYPE = cv("TaskType", ["Hasty", "Grid", "Trackline", "Canine", "Air", "Water", "Investigative", "Other"])
DOM_TASK_STATUS = cv("TaskStatus", ["Planned", "Assigned", "InField", "Debriefed", "Cancelled"])

# --------------------------------------------------------------------------
# Field helpers
# --------------------------------------------------------------------------
def f(name, ftype, alias=None, length=None, nullable=True, domain=None, default=None):
    d = {
        "name": name,
        "type": ftype,
        "alias": alias or name,
        "nullable": nullable,
        "editable": True,
    }
    if ftype == "esriFieldTypeString":
        d["length"] = length or 255
    if domain:
        d["domain"] = domain
    if default is not None:
        d["defaultValue"] = default
    return d

STR, DBL, INT, SINT, DATE = (
    "esriFieldTypeString", "esriFieldTypeDouble", "esriFieldTypeInteger",
    "esriFieldTypeSmallInteger", "esriFieldTypeDate",
)

def system_fields():
    return [
        {"name": "OBJECTID", "type": "esriFieldTypeOID", "alias": "OBJECTID",
         "nullable": False, "editable": False},
        {"name": "GlobalID", "type": "esriFieldTypeGlobalID", "alias": "GlobalID",
         "nullable": False, "editable": False, "length": 38},
    ]

def feature_layer(lid, name, geom, fields, attachments=False):
    return {
        "id": lid,
        "name": name,
        "type": "Feature Layer",
        "geometryType": geom,
        "objectIdField": "OBJECTID",
        "globalIdField": "GlobalID",
        "hasAttachments": attachments,
        "displayField": fields[0]["name"],
        "fields": system_fields() + fields,
        "capabilities": "Query,Create,Update,Delete,Editing,Sync",
    }

def table(tid, name, fields):
    return {
        "id": tid,
        "name": name,
        "type": "Table",
        "objectIdField": "OBJECTID",
        "globalIdField": "GlobalID",
        "displayField": fields[0]["name"],
        "fields": system_fields() + fields,
        "capabilities": "Query,Create,Update,Delete,Editing,Sync",
    }

# --------------------------------------------------------------------------
# Schema
# --------------------------------------------------------------------------
def build_definition():
    inc_id = lambda: f("incident_id", STR, "Incident ID", 50, nullable=False)

    incident = feature_layer(0, "Incident", "esriGeometryPoint", [
        inc_id(),
        f("incident_name", STR, "Incident name", 150),
        f("subject_category", STR, "Subject category", 50, domain=DOM_CATEGORY),
        f("subject_age", SINT, "Subject age"),
        f("subject_sex", STR, "Subject sex", 10),
        f("ecoregion_domain", STR, "Environment", 20, domain=DOM_ENV),
        f("terrain", STR, "Terrain", 20, domain=DOM_TERRAIN),
        f("season", STR, "Season", 10, domain=DOM_SEASON),
        f("light", STR, "Light", 10, domain=DOM_LIGHT),
        f("last_seen", DATE, "Last seen"),
        f("status", STR, "Status", 20, domain=DOM_INC_STATUS, default="Active"),
        f("stat_stratum", STR, "Statistics stratum", 250),
        f("stat_n", INT, "Statistics sample size"),
        f("stat_source", STR, "Statistics source", 100),
        f("weights_json", STR, "Model weights JSON", 2000),
        f("notes", STR, "Notes", 2000),
    ])

    keypoints = feature_layer(1, "KeyPoints", "esriGeometryPoint", [
        inc_id(),
        f("point_type", STR, "Point type", 10, domain=DOM_POINT_TYPE),
        f("point_name", STR, "Name", 100),
        f("point_time", DATE, "Time"),
        f("notes", STR, "Notes", 1000),
    ])

    segments = feature_layer(2, "SearchSegment", "esriGeometryPolygon", [
        inc_id(),
        f("segment_id", STR, "Segment ID", 20),
        f("run_id", STR, "Model run ID", 50),
        f("poa", DBL, "POA (%)"),
        f("pod", DBL, "POD (%)"),
        f("pos", DBL, "POS (%)"),
        f("rank", INT, "Rank"),
        f("status", STR, "Status", 20, domain=DOM_SEG_STATUS, default="Unassigned"),
        f("area_km2", DBL, "Area (km2)"),
        f("assigned_team", STR, "Assigned team", 100),
    ])

    clues = feature_layer(3, "Clue", "esriGeometryPoint", [
        inc_id(),
        f("clue_type", STR, "Clue type", 20, domain=DOM_CLUE_TYPE),
        f("found_time", DATE, "Found time"),
        f("found_by", STR, "Found by", 100),
        f("description", STR, "Description", 1000),
    ], attachments=True)

    tracks = feature_layer(4, "TrackLog", "esriGeometryPolyline", [
        inc_id(),
        f("team_name", STR, "Team", 100),
        f("task_id", STR, "Task ID", 50),
        f("started", DATE, "Started"),
        f("ended", DATE, "Ended"),
    ])

    task = table(5, "Task", [
        inc_id(),
        f("task_id", STR, "Task ID", 50),
        f("segment_id", STR, "Segment ID", 20),
        f("team_name", STR, "Team", 100),
        f("task_type", STR, "Task type", 20, domain=DOM_TASK_TYPE),
        f("assigned_time", DATE, "Assigned"),
        f("completed_time", DATE, "Completed"),
        f("pod_reported", DBL, "POD reported (%)"),
        f("status", STR, "Status", 20, domain=DOM_TASK_STATUS, default="Planned"),
        f("notes", STR, "Notes", 1000),
    ])

    modelrun = table(6, "ModelRun", [
        f("run_id", STR, "Run ID", 50, nullable=False),
        inc_id(),
        f("run_time", DATE, "Run time"),
        f("stat_stratum", STR, "Statistics stratum", 250),
        f("stat_n", INT, "Sample size"),
        f("stat_source", STR, "Statistics source", 100),
        f("inputs_json", STR, "Inputs JSON", 8000),
        f("segments_count", INT, "Segments"),
    ])

    lpb = table(7, "LPB_Stats", [
        f("source", STR, "Source", 100),
        f("category", STR, "Category", 50, nullable=False),
        f("subcategory", STR, "Subcategory", 50),
        f("domain", STR, "Environment", 20, domain=DOM_ENV),
        f("terrain", STR, "Terrain", 20, domain=DOM_TERRAIN),
        f("n", INT, "Sample size"),
        f("dist_km_25", DBL), f("dist_km_50", DBL), f("dist_km_75", DBL), f("dist_km_95", DBL),
        f("uphill_pct", DBL), f("downhill_pct", DBL), f("same_pct", DBL),
        f("disp_deg_25", DBL), f("disp_deg_50", DBL), f("disp_deg_75", DBL), f("disp_deg_95", DBL),
        f("track_m_25", DBL), f("track_m_50", DBL), f("track_m_75", DBL), f("track_m_max", DBL),
        f("mobility_hr_50", DBL),
        f("notes", STR, "Notes", 1000),
    ])

    surv = table(8, "SurvivabilityCurve", [
        f("category", STR, "Category", 50, nullable=False),
        f("a", DBL, "a"),
        f("b", DBL, "b (per day)"),
        f("source", STR, "Source", 500),
    ])

    return {"layers": [incident, keypoints, segments, clues, tracks],
            "tables": [task, modelrun, lpb, surv]}

# --------------------------------------------------------------------------
# CSV seeding
# --------------------------------------------------------------------------
INT_FIELDS = {"n"}
FLOAT_FIELDS = {
    "dist_km_25", "dist_km_50", "dist_km_75", "dist_km_95", "uphill_pct", "downhill_pct",
    "same_pct", "disp_deg_25", "disp_deg_50", "disp_deg_75", "disp_deg_95", "track_m_25",
    "track_m_50", "track_m_75", "track_m_max", "mobility_hr_50", "a", "b",
}

def read_rows(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            attrs = {}
            for k, v in r.items():
                k = (k or "").strip()
                v = (v or "").strip()
                if not k:
                    continue
                if v == "":
                    attrs[k] = None
                elif k in INT_FIELDS:
                    attrs[k] = int(float(v))
                elif k in FLOAT_FIELDS:
                    attrs[k] = float(v)
                else:
                    attrs[k] = v
            rows.append({"attributes": attrs})
    return rows

def seed_table(flc, name, path):
    tbl = next((t for t in flc.tables if t.properties.name == name), None)
    if tbl is None:
        print(f"  ! table {name} not found, skipped")
        return
    rows = read_rows(path)
    for i in range(0, len(rows), 500):
        res = tbl.edit_features(adds=rows[i:i + 500])
        failed = [r for r in res.get("addResults", []) if not r.get("success")]
        if failed:
            print(f"  ! {len(failed)} failed rows in {name}: {failed[0]}")
    print(f"  seeded {name}: {len(rows)} rows")

# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--portal", default="https://www.arcgis.com",
                    help='Portal URL, or "home" inside an ArcGIS Notebook')
    ap.add_argument("--user", help="Username (password is prompted)")
    ap.add_argument("--service-name", default="SAR_LPB_Incident_Data")
    ap.add_argument("--folder", default=None, help="Optional content folder to move items into")
    ap.add_argument("--stats", default="data/lpb_stats_seed.csv")
    ap.add_argument("--surv", default="data/survivability_seed.csv")
    ap.add_argument("--no-webmap", action="store_true")
    args = ap.parse_args()

    if args.portal == "home":
        gis = GIS("home")
    else:
        if not args.user:
            sys.exit("--user is required unless --portal home")
        gis = GIS(args.portal, args.user, getpass.getpass("Password: "))
    print("Signed in as", gis.users.me.username)

    if gis.content.is_service_name_available(args.service_name, "Feature Service") is False:
        args.service_name += "_" + time.strftime("%Y%m%d%H%M")
        print("Name taken, using", args.service_name)

    item = gis.content.create_service(
        name=args.service_name,
        service_description="SAR incident data model for lost-person-behavior planning.",
        has_static_data=False,
        capabilities="Query,Create,Update,Delete,Editing,Sync",
        wkid=4326,
        service_type="featureService",
    )
    item.update(item_properties={
        "tags": "SAR, search and rescue, lost person behavior, POA",
        "snippet": "SAR incident, segment, clue, track and lookup data.",
    })
    print("Created service item", item.id)

    flc = FeatureLayerCollection.fromitem(item)
    result = flc.manager.add_to_definition(build_definition())
    if not result.get("success", True):
        sys.exit(f"add_to_definition failed: {result}")
    print("Schema added")

    item = gis.content.get(item.id)          # refresh
    flc = FeatureLayerCollection.fromitem(item)
    seed_table(flc, "LPB_Stats", args.stats)
    seed_table(flc, "SurvivabilityCurve", args.surv)

    if args.folder:
        item.move(args.folder)

    if not args.no_webmap:
        try:
            from arcgis.mapping import WebMap
            wm = WebMap()
            for lyr in flc.layers:
                wm.add_layer(lyr)
            wm.save({"title": args.service_name + "_Map", "snippet": "SAR incident map",
                     "tags": "SAR, POA"}, folder=args.folder)
            print("Web map created")
        except Exception as exc:      # web map is a convenience, not required
            print("  ! web map step skipped:", exc)

    base = flc.url
    print("\nPaste into CONFIG in index.html:")
    print(f'  incidentLayerUrl: "{base}/0",')
    print(f'  segmentLayerUrl:  "{base}/2",')
    print(f'  modelRunTableUrl: "{base}/6",')
    print("\nDone. Review sharing (group/org) and set editor tracking if you need it.")

if __name__ == "__main__":
    main()
