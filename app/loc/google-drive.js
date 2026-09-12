'use client';

const GIS_SRC='https://accounts.google.com/gsi/client';
const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.appdata';
const API='https://www.googleapis.com/drive/v3';
const UPLOAD='https://www.googleapis.com/upload/drive/v3';

let gisPromise;
let accessToken='';

function loadGis(){
  if(typeof window==='undefined')return Promise.reject(new Error('Google OAuth 只能在瀏覽器使用'));
  if(window.google?.accounts?.oauth2)return Promise.resolve(window.google);
  if(gisPromise)return gisPromise;
  gisPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector(`script[src="${GIS_SRC}"]`);
    const script=existing||document.createElement('script');
    const done=()=>window.google?.accounts?.oauth2?resolve(window.google):reject(new Error('Google Identity Services 載入失敗'));
    script.addEventListener('load',done,{once:true});
    script.addEventListener('error',()=>reject(new Error('Google Identity Services 載入失敗')),{once:true});
    if(!existing){script.src=GIS_SRC;script.async=true;script.defer=true;document.head.appendChild(script)}
  });
  return gisPromise;
}

export function googleDriveConfigured(){
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

export async function authorizeGoogleDrive(){
  if(accessToken)return accessToken;
  const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if(!clientId)throw new Error('尚未設定 NEXT_PUBLIC_GOOGLE_CLIENT_ID');
  const google=await loadGis();
  accessToken=await new Promise((resolve,reject)=>{
    const client=google.accounts.oauth2.initTokenClient({
      client_id:clientId,
      scope:DRIVE_SCOPE,
      callback:response=>response?.access_token?resolve(response.access_token):reject(new Error(response?.error||'Google OAuth 授權失敗'))
    });
    client.requestAccessToken({prompt:''});
  });
  return accessToken;
}

async function driveFetch(url,options={}){
  const token=await authorizeGoogleDrive();
  const response=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...(options.headers||{})}});
  if(response.status===401){accessToken='';throw new Error('Google OAuth 已過期，請重新操作')}
  if(!response.ok)throw new Error(`Google Drive HTTP ${response.status}`);
  return response;
}

async function findAppDataFile(name){
  const q=encodeURIComponent(`name='${String(name).replaceAll("'","\\'")}' and trashed=false`);
  const response=await driveFetch(`${API}/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)&pageSize=1`);
  const data=await response.json();
  return data.files?.[0]||null;
}

export async function saveJsonToGoogleDrive(name,data){
  const existing=await findAppDataFile(name);
  const body=JSON.stringify(data,null,2);
  if(existing){
    await driveFetch(`${UPLOAD}/files/${existing.id}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':'application/json; charset=UTF-8'},body});
    return {id:existing.id,name,updated:true};
  }
  const boundary=`loc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const multipart=[
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8','',
    JSON.stringify({name,parents:['appDataFolder']}),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8','',
    body,
    `--${boundary}--`,''
  ].join('\r\n');
  const response=await driveFetch(`${UPLOAD}/files?uploadType=multipart&fields=id,name`,{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body:multipart});
  return response.json();
}

export async function loadJsonFromGoogleDrive(name){
  const file=await findAppDataFile(name);
  if(!file)throw new Error(`Google Drive 找不到 ${name}`);
  const response=await driveFetch(`${API}/files/${file.id}?alt=media`);
  return response.json();
}

export function clearGoogleDriveSession(){accessToken=''}
