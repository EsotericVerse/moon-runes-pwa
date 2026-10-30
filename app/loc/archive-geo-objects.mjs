// Extract Facebook's source place objects without interpreting authored prose.
import {repairMojibakeText} from './content-policy.js';
import {importGeoPoint,importGeoKey} from './import-geocoordinates.mjs';

const CONTAINERS=['attachments','data','array','media','photos','videos','items','label_values','dict'];
const text=value=>repairMojibakeText(String(value??'').trim());

export function extractFacebookGeoObjects(raw){
  if(!raw||typeof raw!=='object')return [];
  const found=new Map(),visited=new WeakSet();let examined=0;
  function visit(node,depth){
    if(!node||typeof node!=='object'||depth>9||examined++>6000||visited.has(node))return;
    visited.add(node);
    if(Array.isArray(node)){
      for(const item of node.slice(0,1200))visit(item,depth+1);
      return;
    }
    const place=node.place&&typeof node.place==='object'?node.place:
      node.name&&node.coordinate&&typeof node.coordinate==='object'?node:null;
    if(place){
      const title=text(place.name||place.place_name||place.title);
      const coordinate=place.coordinate||place.coordinates;
      const point=importGeoPoint(coordinate?.latitude,coordinate?.longitude);
      const key=importGeoKey(point);
      if(key&&title&&title.length<=120&&!/[\u0000-\u001f]/u.test(title)&&!found.has(key))
        found.set(key,{location:title,__importCoordinates:point});
    }
    for(const field of CONTAINERS)visit(node[field],depth+1);
  }
  visit(raw,0);
  return [...found.values()];
}
