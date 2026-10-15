/* Comanda Padre PWA: ámbito exclusivo de la carpeta publicada desde docs.
   NO almacena credenciales, datos comerciales, API ni respuestas de Supabase.
   Cambiar la versión al publicar recursos estáticos nuevos. */
"use strict";
const CACHE="padre-arquitectura-v1";
const APP_SCOPE=new URL(self.registration.scope);
const ASSETS=[
 "./index.html",
 "./manifest.webmanifest",
 "./pwa.css",
 "./pwa.js",
 "./icons/app-192.png",
 "./icons/app-512.png",
 "./icons/favicon.svg",
 "./icons/apple-touch-icon.png"
].map(x=>new URL(x,APP_SCOPE).href);
const SAFE_PATHS=new Set(ASSETS.map(x=>new URL(x).pathname));
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS);
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(x=>x.startsWith("padre-arquitectura-")&&x!==CACHE).map(x=>caches.delete(x)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||req.url.startsWith("data:"))return;
 const url=new URL(req.url);
 if(url.origin!==APP_SCOPE.origin||!url.pathname.startsWith(APP_SCOPE.pathname))return;
 const isNavigation=req.mode==="navigate";
 if(isNavigation){
  // Navegación únicamente en el mapa: nunca guardar otras páginas o endpoints.
  if(url.pathname!==new URL("./index.html",APP_SCOPE).pathname&&url.pathname!==APP_SCOPE.pathname)return;
  event.respondWith((async()=>{
   try{const response=await fetch(req);
    if(response.ok){const cache=await caches.open(CACHE);await cache.put(new URL("./index.html",APP_SCOPE),response.clone())}
    return response;
   }catch{
    const cache=await caches.open(CACHE);
    return (await cache.match(new URL("./index.html",APP_SCOPE)))||Response.error();
   }
  })());
  return;
 }
 if(!SAFE_PATHS.has(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(req,{ignoreSearch:true});
  if(cached)return cached;
  const response=await fetch(req);
  if(response.ok)await cache.put(req,response.clone());
  return response;
 })());
});
// Preparación de recepción push: no existe suscripción hasta conectar
// exclusivamente el nuevo backend de Padre y el consentimiento del operador.
self.addEventListener("push",event=>{
 let payload={};
 try{payload=event.data?.json()||{}}catch{payload={body:event.data?.text()||""}}
 const title=typeof payload.title==="string"?payload.title.slice(0,100):"Comanda Padre";
 const body=typeof payload.body==="string"?payload.body.slice(0,220):"Hay una nueva notificación";
 const candidate=typeof payload.url==="string"?payload.url:"./index.html";
 const dest=new URL(candidate,APP_SCOPE);
 const safe=dest.origin===APP_SCOPE.origin&&dest.pathname.startsWith(APP_SCOPE.pathname)
  ?dest.href:new URL("./index.html",APP_SCOPE).href;
 event.waitUntil(self.registration.showNotification(title,{
  body,icon:new URL("./icons/app-192.png",APP_SCOPE).href,
  badge:new URL("./icons/app-192.png",APP_SCOPE).href,
  tag:typeof payload.tag==="string"?payload.tag.slice(0,60):"padre-aviso",
  data:{url:safe}
 }));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=event.notification.data?.url||new URL("./index.html",APP_SCOPE).href;
 event.waitUntil((async()=>{
  const windows=await clients.matchAll({type:"window",includeUncontrolled:true});
  for(const w of windows){
   if(w.url.split("?")[0]===target.split("?")[0]){
    await w.focus();return;
   }
  }
  await clients.openWindow(target);
 })());
});
