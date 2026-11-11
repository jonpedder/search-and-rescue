(function(global){
  "use strict";
  const STORAGE_KEY="sar-workbench-settings-v1";
  const OAUTH_CLIENT_ID="2eURPxapfMdaZiS7";
  const BASE_DEFAULTS={
    version:1,
    branding:{appName:"Search & Rescue",subtitle:"Lost Person Behavior Workbench"},
    map:{basemap:"topo-vector",centerLat:34.14,centerLon:-118.03,zoom:10,coordinateFormat:"dd",showCoordinates:true,autoLoadLivingAtlas:false,towerCoverageKm:5},
    workspace:{startupTab:"incident",operationalPeriodHours:12},
    model:{ringWeight:35,sectorWeight:25,linearWeight:15,terrainWeight:15,elevationWeight:10,resolution:96}
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  const merge=(base,value)=>{
    const out=clone(base);
    if(!value||typeof value!=="object")return out;
    for(const [key,val] of Object.entries(value)){
      if(val&&typeof val==="object"&&!Array.isArray(val)&&out[key]&&typeof out[key]==="object")out[key]=merge(out[key],val);
      else if(key in out)out[key]=val;
    }
    return out;
  };
  function validate(value){
    const v=merge(BASE_DEFAULTS,value),errors=[];
    const text=(x,max,label)=>{x=String(x||"").trim();if(!x)errors.push(label+" is required.");if(x.length>max)errors.push(label+" is too long.");return x.slice(0,max)};
    v.branding.appName=text(v.branding.appName,80,"Application name");
    v.branding.subtitle=text(v.branding.subtitle,120,"Subtitle");
    const basemaps=["topo-vector","streets-vector","satellite","hybrid","gray-vector","dark-gray-vector","oceans","osm"];
    if(!basemaps.includes(v.map.basemap))v.map.basemap=BASE_DEFAULTS.map.basemap;
    const coordinateFormats=["dd","ddm","dms","utm","usng","mgrs"];if(!coordinateFormats.includes(v.map.coordinateFormat))v.map.coordinateFormat=BASE_DEFAULTS.map.coordinateFormat;
    v.map.centerLat=Number(v.map.centerLat);v.map.centerLon=Number(v.map.centerLon);v.map.zoom=Number(v.map.zoom);
    if(!Number.isFinite(v.map.centerLat)||v.map.centerLat < -90||v.map.centerLat > 90)errors.push("Default latitude must be between -90 and 90.");
    if(!Number.isFinite(v.map.centerLon)||v.map.centerLon < -180||v.map.centerLon > 180)errors.push("Default longitude must be between -180 and 180.");
    if(!Number.isFinite(v.map.zoom)||v.map.zoom < 2||v.map.zoom > 20)errors.push("Default zoom must be between 2 and 20.");
    v.map.showCoordinates=!!v.map.showCoordinates;v.map.autoLoadLivingAtlas=!!v.map.autoLoadLivingAtlas;v.map.towerCoverageKm=Number(v.map.towerCoverageKm);if(!Number.isFinite(v.map.towerCoverageKm)||v.map.towerCoverageKm<0.5||v.map.towerCoverageKm>50)errors.push("Tower coverage estimate must be between 0.5 and 50 km.");
    if(!["incident","subject","model","segments","survival"].includes(v.workspace.startupTab))v.workspace.startupTab="incident";
    v.workspace.operationalPeriodHours=Number(v.workspace.operationalPeriodHours);if(!Number.isFinite(v.workspace.operationalPeriodHours)||v.workspace.operationalPeriodHours<1||v.workspace.operationalPeriodHours>72)errors.push("Operational period duration must be between 1 and 72 hours.");
    for(const k of ["ringWeight","sectorWeight","linearWeight","terrainWeight","elevationWeight"]){v.model[k]=Number(v.model[k]);if(!Number.isFinite(v.model[k])||v.model[k]<0||v.model[k]>100)errors.push(k+" must be between 0 and 100.")}
    v.model.resolution=Math.round(Number(v.model.resolution));if(!Number.isFinite(v.model.resolution)||v.model.resolution<32||v.model.resolution>192)errors.push("Model resolution must be between 32 and 192.");
    return{value:v,errors};
  }
  function load(){try{return validate(JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")).value}catch{return clone(BASE_DEFAULTS)}}
  function save(value){const checked=validate(value);if(checked.errors.length)throw new Error(checked.errors.join(" "));localStorage.setItem(STORAGE_KEY,JSON.stringify(checked.value));return clone(checked.value)}
  function reset(){localStorage.removeItem(STORAGE_KEY);return clone(BASE_DEFAULTS)}
  global.SARSettings={STORAGE_KEY,OAUTH_CLIENT_ID,BASE_DEFAULTS:clone(BASE_DEFAULTS),clone,merge,validate,load,save,reset};
})(window);
