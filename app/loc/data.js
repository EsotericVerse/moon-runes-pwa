const cache=new Map();

export function fetchLocJson(path){
  if(!cache.has(path)){
    cache.set(path,fetch(path,{cache:'force-cache'}).then(response=>{
      if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
      return response.json();
    }).catch(error=>{cache.delete(path);throw error;}));
  }
  return cache.get(path);
}
