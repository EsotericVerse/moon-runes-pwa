// First-party React Trace loads MapLibre from the project's pinned npm package.
// Public sample anchors are isolated from Galaxy. Deliberate place-search terms
// go only to the chosen geocoding service; map tiles do not receive article bodies
// or device geolocation. Route demonstrations use sample coordinates only.
import {Map,Marker,Popup,NavigationControl,LngLatBounds,setWorkerUrl} from 'maplibre-gl';

// MapLibre 6 ESM requires a same-origin worker under Next.js Turbopack.
// The official worker URL pattern also works with Next.js webpack builds.
setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs',import.meta.url).toString());

const STYLE='https://tiles.openfreemap.org/styles/liberty';
// Fixed, public example locations: these are NOT the user's Galaxy records.
// Geographic coordinates are approximate station-area anchors, not store doors.
export const EXAMPLE_ANCHORS=Object.freeze([
  {id:'banqiao',name:'板橋車站',lng:121.4638,lat:25.0143,height:125},
  {id:'fuzhong',name:'府中站',lng:121.4592,lat:25.0085,height:165},
  {id:'jiangzicui',name:'江子翠站',lng:121.4724,lat:25.0300,height:100}
]);

function ringAround({lng,lat},meters){
  // Great-circle bearings preserve meters across latitudes; a radius is an
  // approximate query footprint, not a precision claim about check-ins.
  const earthRadius=6371008.8;
  const distance=Math.min(Math.PI,meters/earthRadius);
  const lat0=lat*Math.PI/180;
  const lng0=lng*Math.PI/180;
  const ring=Array.from({length:48},(_,i)=>{
    const bearing=2*Math.PI*i/48;
    const targetLat=Math.asin(Math.sin(lat0)*Math.cos(distance)
      +Math.cos(lat0)*Math.sin(distance)*Math.cos(bearing));
    const targetLng=lng0+Math.atan2(
      Math.sin(bearing)*Math.sin(distance)*Math.cos(lat0),
      Math.cos(distance)-Math.sin(lat0)*Math.sin(targetLat));
    const degrees=targetLng*180/Math.PI;
    return [((degrees+540)%360)-180,targetLat*180/Math.PI];
  });
  ring.push(ring[0]);
  return ring;
}

function pillarGeojson(anchors){
  return {type:'FeatureCollection',features:anchors.map(place=>({
    type:'Feature',
    id:place.id,
    properties:{name:place.name,height:place.height},
    geometry:{type:'Polygon',coordinates:[ringAround(place,45)]}
  }))};
}
function pickedArea(lng,lat,radius){
  return {type:'FeatureCollection',features:Number.isFinite(lng)&&Number.isFinite(lat)?[{
    type:'Feature',properties:{radius_m:radius},geometry:{type:'Polygon',coordinates:[ringAround({lng,lat},radius)]}
  }]:[]};
}
function existingAnchorPoints(anchors){
  return {type:'FeatureCollection',features:(Array.isArray(anchors)?anchors:[])
    .filter(a=>a.trace_type==='anchor'&&Number.isFinite(Number(a.longitude))&&Number.isFinite(Number(a.latitude)))
    .map((a,i)=>({type:'Feature',id:i,properties:{title:String(a.title||''),radius_m:a.radius_m||500},
      geometry:{type:'Point',coordinates:[Number(a.longitude),Number(a.latitude)]}}))};
}
function emptyRoute(){
  return {type:'FeatureCollection',features:[]};
}
function routeGeometry(coordinates){
  return {type:'FeatureCollection',features:[{
    type:'Feature',properties:{kind:'planned'},
    geometry:{type:'LineString',coordinates}
  }]};
}

export function createTraceMap(container,{onStatus=()=>{},onSelect=()=>{},onLocationPick=null,radiusMeters=500,anchors=[]}={}){
  if(!container)throw new Error('找不到地圖容器。');
  const controller=new AbortController();
  let removed=false;
  let loaded=false;
  let routeActive=false;
  let markers=[];
  let pickedMarker=null;
  let pickedPosition=null;
  let radius=Number(radiusMeters)||500;
  let savedAnchors=anchors;
  function refreshRadius(){
    if(loaded&&pickedPosition)map.getSource('loc-trace-picked-area')?.setData(pickedArea(pickedPosition.lng,pickedPosition.lat,radius));
  }
  function setAnchors(next){
    savedAnchors=Array.isArray(next)?next:[];
    if(loaded)map.getSource('loc-trace-saved-anchors')?.setData(existingAnchorPoints(savedAnchors));
  }
  function setRadius(value){
    const n=Number(value);
    if(Number.isFinite(n)&&n>=10&&n<=20000000){radius=n;refreshRadius();}
  }
  const canPickLocation=typeof onLocationPick==='function';
  const map=new Map({
    container,style:STYLE,center:[121.4647,25.0187],
    zoom:12.8,pitch:59,bearing:-23,
    antialias:true,attributionControl:true
  });
  map.addControl(new NavigationControl({showCompass:true,showZoom:true}),'top-right');
  const status=message=>{if(!removed)onStatus(message);};
  // Spatial anchors are explicit user selections, never inferred from device
  // location or demo coordinates. Only the management editor enables picking.
  function pickLocation(lng,lat,name=''){
    if(removed||!canPickLocation||!Number.isFinite(lng)||!Number.isFinite(lat))return;
    if(!pickedMarker){
      pickedMarker=new Marker({color:'#f7ba66',draggable:true})
        .setLngLat([lng,lat]).addTo(map);
      pickedMarker.on('dragend',()=>{
        const position=pickedMarker.getLngLat();
        pickLocation(position.lng,position.lat);
      });
    }else pickedMarker.setLngLat([lng,lat]);
    pickedPosition={lng,lat};
    refreshRadius();
    onLocationPick({lng,lat,...(name?{name}:{})});
    status('locationPicked');
  }
  if(canPickLocation){
    map.on('click',event=>pickLocation(event.lngLat.lng,event.lngLat.lat));
  }
  function focus(id){
    if(removed)return;
    const place=EXAMPLE_ANCHORS.find(item=>item.id===id);
    if(!place)return;
    map.flyTo({center:[place.lng,place.lat],zoom:15.1,pitch:65,bearing:-23,essential:true});
    onSelect(place.id);
    if(canPickLocation)pickLocation(place.lng,place.lat,place.name);
    new Popup({closeButton:true,offset:24})
      .setLngLat([place.lng,place.lat])
      .setText(place.name)
      .addTo(map);
  }
  function focusCoordinates({longitude,latitude,name='',radius_m}={}){
    const lng=Number(longitude),lat=Number(latitude);
    if(removed||!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lng)>180||Math.abs(lat)>90)return;
    if(radius_m!=null)setRadius(radius_m);
    const zoom=Math.max(2,Math.min(16,14.5-Math.log2(Math.max(radius,100)/500)));
    map.flyTo({center:[lng,lat],zoom,pitch:59,bearing:-23,essential:true});
    if(canPickLocation)pickLocation(lng,lat,name);
    else {pickedPosition={lng,lat};refreshRadius();}
    if(!canPickLocation)new Popup({closeButton:true,offset:20}).setLngLat([lng,lat]).setText(name||'搜尋位置').addTo(map);
  }
  function overview(){
    if(removed)return;
    const bounds=new LngLatBounds();
    EXAMPLE_ANCHORS.forEach(place=>bounds.extend([place.lng,place.lat]));
    map.fitBounds(bounds,{padding:68,pitch:59,bearing:-23,maxZoom:13.7,duration:500});
  }

  map.once('load',()=>{
    if(removed)return;
    loaded=true;
    map.addSource('loc-trace-extrusions',{type:'geojson',data:pillarGeojson(EXAMPLE_ANCHORS)});
    map.addLayer({
      id:'loc-trace-3d-anchors',
      type:'fill-extrusion',
      source:'loc-trace-extrusions',
      paint:{
        'fill-extrusion-color':'#b9a6f6',
        'fill-extrusion-opacity':0.8,
        'fill-extrusion-height':['get','height'],
        'fill-extrusion-base':0
      }
    });
    map.addSource('loc-trace-saved-anchors',{type:'geojson',data:existingAnchorPoints(savedAnchors)});
    map.addLayer({id:'loc-trace-saved-point-layer',type:'circle',source:'loc-trace-saved-anchors',
      paint:{'circle-radius':6,'circle-color':'#6ce4ce','circle-opacity':0.95,
        'circle-stroke-width':1.5,'circle-stroke-color':'#153739'}});
    map.addLayer({id:'loc-trace-saved-point-labels',type:'symbol',source:'loc-trace-saved-anchors',
      minzoom:12,layout:{'text-field':['get','title'],'text-size':12,'text-offset':[0,1.2],'text-anchor':'top',
        'text-allow-overlap':false},paint:{'text-color':'#ebfff8','text-halo-color':'#122d39','text-halo-width':1.5}});
    map.addSource('loc-trace-picked-area',{type:'geojson',data:pickedArea(NaN,NaN,radius)});
    map.addLayer({id:'loc-trace-picked-fill',type:'fill',source:'loc-trace-picked-area',
      paint:{'fill-color':'#f7ba66','fill-opacity':0.14}});
    map.addLayer({id:'loc-trace-picked-outline',type:'line',source:'loc-trace-picked-area',
      paint:{'line-color':'#f7ba66','line-width':2,'line-opacity':0.85}});
    refreshRadius();
    map.addSource('loc-trace-route',{type:'geojson',data:emptyRoute()});
    map.addLayer({
      id:'loc-trace-route-line',type:'line',source:'loc-trace-route',
      layout:{'line-cap':'round','line-join':'round'},
      paint:{'line-color':'#f7ba66','line-width':5,'line-opacity':0.95}
    });
    markers=EXAMPLE_ANCHORS.map(place=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='loc-trace-anchor-marker';
      button.textContent=place.name;
      button.setAttribute('aria-label','查看'+place.name+'空間定錨示例');
      button.addEventListener('click',()=>focus(place.id));
      return new Marker({element:button,anchor:'bottom',offset:[0,-13]})
        .setLngLat([place.lng,place.lat]).addTo(map);
    });
    status('ready');
  });
  map.on('error',event=>{
    if(!loaded)status('mapError');
  });

  async function showRoadRoute(){
    if(removed||!loaded)return false;
    if(routeActive){
      map.getSource('loc-trace-route')?.setData(emptyRoute());
      routeActive=false;
      status('routeHidden');
      return false;
    }
    status('routeLoading');
    try{
      // The public OSRM demo is used only after an explicit route click. It
      // receives the three public example coordinates, never user locations.
      const coords=EXAMPLE_ANCHORS.map(p=>p.lng+','+p.lat).join(';');
      const response=await fetch('https://router.project-osrm.org/route/v1/driving/'+coords+'?overview=full&geometries=geojson',{
        signal:controller.signal
      });
      if(!response.ok)throw new Error('路網服務暫時無法使用');
      const payload=await response.json();
      const coordinates=payload.routes?.[0]?.geometry?.coordinates;
      if(!Array.isArray(coordinates)||coordinates.length<2)throw new Error('沒有可用的道路路線');
      if(removed)return false;
      map.getSource('loc-trace-route')?.setData(routeGeometry(coordinates));
      routeActive=true;
      status('routeReady');
      return true;
    }catch(error){
      if(!removed&&error?.name!=='AbortError')status('routeError');
      return false;
    }
  }
  function destroy(){
    if(removed)return;
    removed=true;
    controller.abort();
    markers.forEach(marker=>marker.remove());
    markers=[];
    pickedMarker?.remove();
    pickedMarker=null;
    map.remove();
  }
  return {focus,focusCoordinates,setRadius,setAnchors,overview,showRoadRoute,destroy};
}
