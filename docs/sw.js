/* Padre PWA V2. Cache exclusivo de archivos públicos estáticos de Padre: nunca datos reales ni respuestas API. */
"use strict";
const CACHE="padre-modulos-v14";
const SCOPE=new URL(self.registration.scope);
const ASSETS=["./index.html","./arquitectura.html","./manifest.webmanifest","./pwa.css","./pwa.js","./session-controls.js","./page.css","./page.js","./operaciones.css","./operaciones.js","./seguridad.css","./finanzas.css","./modulos/seguridad.js","./cambiar-pin.html","./cambiar-pin.js","./modulos/dinero.js","./modulos/conciliacion.html","./modulos/conciliacion.js","./modulos/clientes.js","./modulos/pedidos.js","./icons/app-192.png","./icons/app-512.png","./icons/favicon.svg","./icons/apple-touch-icon.png","./modulos/seguridad.html","./modulos/clientes.html","./modulos/dinero.html","./modulos/pedidos.html","./modulos/materiales.html","./modulos/cotizaciones.html","./modulos/produccion.html","./modulos/compras.html","./modulos/precios.html","./modulos/comunicacion.html","./modulos/estadisticas.html","./modulos/configuracion.html","./modulos/marketing.html"].map(x=>new URL(x,SCOPE).href);
const SAFE=new Set(ASSETS.map(x=>new URL(x).pathname));
const HOME=new URL("./index.html",SCOPE);
self.addEventListener("install",e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(ASSETS);await self.skipWaiting()})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{const k=await caches.keys();await Promise.all(k.filter(x=>x.startsWith("padre-")&&x!==CACHE).map(x=>caches.delete(x)));await self.clients.claim()})()));
self.addEventListener("fetch",e=>{
 const r=e.request;if(r.method!=="GET")return;
 const u=new URL(r.url);if(u.origin!==SCOPE.origin||!u.pathname.startsWith(SCOPE.pathname))return;
 const home=u.pathname===SCOPE.pathname;
 if(!home&&!SAFE.has(u.pathname))return;
 if(r.mode==="navigate"){
  if(!home&&!u.pathname.endsWith(".html"))return;
  e.respondWith((async()=>{const cache=await caches.open(CACHE);const key=home?HOME.href:u.origin+u.pathname;try{const res=await fetch(r);if(res.ok)await cache.put(key,res.clone());return res}catch{return(await cache.match(key))||Response.error()}})());
  return;
 }
 e.respondWith((async()=>{const cache=await caches.open(CACHE);const found=await cache.match(r,{ignoreSearch:true});if(found)return found;const res=await fetch(r);if(res.ok)await cache.put(r,res.clone());return res})());
});
self.addEventListener("push",e=>{let p={};try{p=e.data?.json()||{}}catch{p={body:e.data?.text()||""}};const url=new URL(typeof p.url==="string"?p.url:"./index.html",SCOPE);const safe=url.origin===SCOPE.origin&&url.pathname.startsWith(SCOPE.pathname)?url.href:HOME.href;e.waitUntil(self.registration.showNotification(typeof p.title==="string"?p.title.slice(0,100):"Comanda Padre",{body:typeof p.body==="string"?p.body.slice(0,220):"Nueva notificación",icon:new URL("./icons/app-192.png",SCOPE).href,data:{url:safe}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil((async()=>{const target=e.notification.data?.url||HOME.href;const all=await clients.matchAll({type:"window",includeUncontrolled:true});for(const c of all){if(c.url.split("?")[0]===target.split("?")[0]){await c.focus();return}}await clients.openWindow(target)})())});
