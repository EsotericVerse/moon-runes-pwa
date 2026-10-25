// MapLibre's official, version-pinned browser ESM distribution is loaded only
// when the Trace demonstration opens. No Galaxy data is sent to this provider.
// A checked-in npm dependency can replace the CDN transport when package-lock
// generation is available, without changing the React interface.
import {Map,Marker,Popup,NavigationControl,LngLatBounds} from 'https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.mjs';

const STYLE='https://tiles.openfreemap.org/styles/liberty';
// Fixed, public example locations: these are NOT the user's Galaxy records.
// Geographic coordinates are approximate station-area anchors, not store doors.
export const EXAMPLE_ANCHORS=Object.freeze([
  {id:'banqiao',name:'板橋車站',lng:121.4638,lat:25.0143,height:125},
  {id:'fuzhong',name:'府中站',lng:121.4592,lat:25.0085,height:165},
  {id:'jiangzicui',name:'江子翠站',lng:121.4724,lat:25.0300,height:100}
]);

function ringAround({lng,lat},meters){
  const segments=18;
  const latStep=meters/111320;
  const lngStep=meters/(111320*Math.cos(lat*Math.PI/180));
  const ring=Array.from({length:segments},(_,i)=>{
    const radians=2*Math.PI*i/segments;
    return [lng+lngStep*Math.cos(radians),lat+latStep*Math.sin(radians)];
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
function emptyRoute(){
  return {type:'FeatureCollection',features:[]};
}
function routeGeometry(coordinates){
  return {type:'FeatureCollection',features:[{
    type:'Feature',properties:{kind:'planned'},
    geometry:{type:'LineString',coordinates}
  }]};
}

export function createTraceMap(container,{onStatus=()=>{},onSelect=()=>{}}={}){
  if(!container)throw new Error('找不到地圖容器。');
  const controller=new AbortController();
  let removed=false;
  let loaded=false;
  let routeActive=false;
  let markers=[];
  const map=new Map({
    container,style:STYLE,center:[121.4647,25.0187],
    zoom:12.8,pitch:59,bearing:-23,
    antialias:true,attributionControl:true
  });
  map.addControl(new NavigationControl({showCompass:true,showZoom:true}),'top-right');
  const status=message=>{if(!removed)onStatus(message);};
  function focus(id){
    if(removed)return;
    const place=EXAMPLE_ANCHORS.find(item=>item.id===id);
    if(!place)return;
    map.flyTo({center:[place.lng,place.lat],zoom:15.1,pitch:65,bearing:-23,essential:true});
    onSelect(place.id);
    new Popup({closeButton:true,offset:24})
      .setLngLat([place.lng,place.lat])
      .setText(place.name)
      .addTo(map);
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
    map.remove();
  }
  return {focus,overview,showRoadRoute,destroy};
}

// Static script entry for the existing Next.js/PWA route. This avoids adding
// an unverified package-lock change to the release-candidate dependency graph.
if(typeof window!=='undefined')window.LOCTraceMapModule={createTraceMap,EXAMPLE_ANCHORS};
