/* Shell PWA de Padre: sin APIs de Comanda ni Supabase */
"use strict";
(()=>{
 const btn=document.getElementById("pwaInstall");
 const dialog=document.getElementById("pwaDialog");
 const guide=document.getElementById("pwaGuide");
 const status=document.getElementById("pwaConnection");
 const primary=document.getElementById("pwaPrimary");
 const close=document.getElementById("pwaClose");
 const nav=document.getElementById("pwaBottom");
 const standalone=()=>window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
 const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
 let deferredPrompt=null,returnFocus=null;
 const drawConnection=()=>{
  const online=navigator.onLine;
  status.classList.toggle("offline",!online);
  status.querySelector(".pwa-status-text").textContent=online?"Padre conectado · demostración":"Sin conexión · modo consulta";
 };
 function openGuide(){
  if(!dialog.hidden)return;
  returnFocus=document.activeElement;
  if(standalone()){
    guide.textContent="Padre ya está instalado como aplicación. Puedes utilizar este mapa también sin conexión después de abrirlo al menos una vez en línea.";
    primary.hidden=true;
  }else if(deferredPrompt){
    guide.textContent="Tu navegador permite instalar Padre como aplicación. Pulsa «Instalar» para continuar.";
    primary.hidden=false;primary.textContent="Instalar";
  }else if(ios){
    guide.textContent="En Safari, toca el botón Compartir y elige «Añadir a pantalla de inicio». Después abre Padre desde el icono creado.";
    primary.hidden=true;
  }else{
    guide.textContent="En el navegador, abre el menú de opciones y busca «Instalar aplicación» o «Añadir a pantalla de inicio». La disponibilidad depende del navegador y de que el sitio esté publicado mediante HTTPS.";
    primary.hidden=true;
  }
  dialog.hidden=false;document.body.classList.add("pwa-modal-open");
  close.focus();
 }
 function closeGuide(){
  dialog.hidden=true;document.body.classList.remove("pwa-modal-open");
  if(returnFocus?.focus)returnFocus.focus();
 }
 btn.addEventListener("click",openGuide);
 close.addEventListener("click",closeGuide);
 dialog.addEventListener("click",e=>{if(e.target===dialog)closeGuide()});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!dialog.hidden)closeGuide()});
 primary.addEventListener("click",async()=>{
  if(!deferredPrompt)return;
  const prompt=deferredPrompt;deferredPrompt=null;
  closeGuide();
  try{await prompt.prompt();await prompt.userChoice}catch(err){console.warn("No se pudo solicitar la instalación",err)}
 });
 window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();deferredPrompt=e;
  if(!standalone())btn.hidden=false;
 });
 window.addEventListener("appinstalled",()=>{
  deferredPrompt=null;btn.hidden=true;closeGuide();
 });
 if(standalone())btn.hidden=true;
 function navTo(section){if(section==="home"){document.querySelector(".page-title")?.scrollIntoView({behavior:"smooth",block:"start"});return}if(section==="pedidos")location.assign("./modulos/pedidos.html");if(section==="clientes")location.assign("./modulos/clientes.html")}
 nav.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>navTo(b.dataset.section)));
 drawConnection();
 window.addEventListener("online",drawConnection);
 window.addEventListener("offline",drawConnection);
 // Registrar SW solamente en el ámbito docs publicado. Es una web estática sin datos reales.
 if("serviceWorker" in navigator&&window.isSecureContext){
  window.addEventListener("load",()=>{
   navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(err=>console.warn("PWA: service worker sin registrar",err));
  });
 }
})();
