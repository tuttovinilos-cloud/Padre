/* Padre V1 · Módulos independientes, con datos ficticios de prueba.
   No realiza peticiones ni escrituras contra Comanda o Supabase. */
"use strict";
(()=>{
 const data=[{"slug":"seguridad","name":"Seguridad","group":"Base y control","description":"Accesos, usuarios y permisos del sistema.","sections":["Operadores","Permisos por módulo","Inicio de sesión","Auditoría"]},{"slug":"clientes","name":"Clientes","group":"Gestión comercial","description":"Clientes, contactos e historial de relación.","sections":["Listado de clientes","Ficha del cliente","Contactos","Historial"]},{"slug":"dinero","name":"Dinero","group":"Finanzas","description":"Pagos, deudas, saldos y movimientos compartidos.","sections":["Movimientos","Cuentas por cobrar","Abonos y anulaciones","Conciliación"]},{"slug":"pedidos","name":"Pedidos","group":"Operaciones","description":"Registro y seguimiento de trabajos.","sections":["Listado de pedidos","Estados","Archivos","Entregas"]},{"slug":"materiales","name":"Materiales","group":"Operaciones","description":"Catálogo y disponibilidad de materias primas.","sections":["Materiales","Tipos de impresión","Consumos","Disponibilidad"]},{"slug":"cotizaciones","name":"Cotizaciones","group":"Gestión comercial","description":"Presupuestos y cálculos de trabajos.","sections":["Listado de cotizaciones","Cotizador","Estados de negociación","Conversión a pedido"]},{"slug":"produccion","name":"Producción","group":"Operaciones","description":"Procesos y etapas de fabricación.","sections":["Órdenes de producción","Impresión","Corpóreos","Etapas"]},{"slug":"compras","name":"Compras","group":"Operaciones","description":"Proveedores, compras y recepción.","sections":["Listado de compras","Proveedores","Materiales comprados","Movimientos"]},{"slug":"precios","name":"Precios","group":"Gestión comercial","description":"Tarifas, productos, extras y parámetros.","sections":["Tarifas","Productos","Extras","Costos"]},{"slug":"comunicacion","name":"Comunicación","group":"Soporte y análisis","description":"Notificaciones, WhatsApp y avisos.","sections":["Notificaciones","Mensajes","Plantillas","Historial de envíos"]},{"slug":"estadisticas","name":"Estadísticas","group":"Soporte y análisis","description":"Indicadores de operaciones y ventas.","sections":["Pedidos","Clientes","Producción","Finanzas"]},{"slug":"configuracion","name":"Configuración","group":"Base y control","description":"Parámetros y preferencias generales.","sections":["Parámetros generales","Preferencias","Opciones técnicas","Seguridad"]},{"slug":"marketing","name":"Marketing y Gestión Comercial","group":"Gestión comercial","description":"Campañas, prospectos y seguimiento comercial.","sections":["Ideas y contenidos","Campañas","Prospectos","Agenda comercial"]}];
 const slug=document.body.dataset.module;
 const cfg=data.find(x=>x.slug===slug);
 if(!cfg)return;
 const $=id=>document.getElementById(id);
 const root=$("moduleRoot");
 $("areaTitle").textContent=cfg.name;
 $("areaDescription").textContent=cfg.description;
 $("areaBreadcrumb").textContent=cfg.name;
 $("areaGroup").textContent=cfg.group;
 document.title=cfg.name+" · Padre · Tuttovinilos";
 document.querySelectorAll(".bottom a").forEach(a=>{if(a.dataset.module===slug)a.classList.add("active")});
 function mk(tag,text,className){
  const el=document.createElement(tag);
  if(text!==undefined)el.textContent=String(text);
  if(className)el.className=className;
  return el;
 }
 const card=()=>{const el=mk("section",undefined,"panel");return el};
 const heading=(text,klass="section-heading")=>mk("h2",text,klass);
 const statusClasses={"Pendiente":"pending","En proceso":"progress","Listo":"ready","Entregado":"delivered"};
 // Ejemplos genéricos, inventados para mostrar el diseño: NINGÚN cliente o pedido real.
 const DEMO_ORDERS=[
  {id:"DEMO-001",date:"15/10/2026",client:"Cliente de ejemplo A",description:"Impresión de vinil adhesivo",quantity:"8 m²",status:"Pendiente",operator:"Operador de prueba"},
  {id:"DEMO-002",date:"14/10/2026",client:"Cliente de ejemplo B",description:"Letrero corpóreo sin iluminación",quantity:"1 unidad",status:"En proceso",operator:"Operador de prueba"},
  {id:"DEMO-003",date:"14/10/2026",client:"Cliente de ejemplo C",description:"Etiquetas troqueladas",quantity:"500 unidades",status:"Listo",operator:"Operador de prueba"},
  {id:"DEMO-004",date:"13/10/2026",client:"Cliente de ejemplo D",description:"Rotulación de vitrina",quantity:"2 m²",status:"Entregado",operator:"Operador de prueba"},
  {id:"DEMO-005",date:"12/10/2026",client:"Cliente de ejemplo E",description:"Impresión sobre vinil transparente",quantity:"3 m²",status:"En proceso",operator:"Operador de prueba"},
  {id:"DEMO-006",date:"11/10/2026",client:"Cliente de ejemplo F",description:"Calcomanías para productos",quantity:"200 unidades",status:"Pendiente",operator:"Operador de prueba"}
 ];
 const label=(s)=>{const out=mk("span",s,"badge "+(statusClasses[s]||"pending"));return out};
 function showOrder(order){
  const wrapper=$("detailDialog");const dl=$("orderDetails");dl.replaceChildren();
  [["Número",order.id],["Cliente",order.client],["Fecha",order.date],["Descripción",order.description],["Cantidad",order.quantity],["Estado",order.status],["Operador",order.operator]].forEach(([k,v])=>{dl.append(mk("dt",k),mk("dd",v))});
  wrapper.hidden=false;
  $("closeDetails").focus();
 }
 function orders(){
  const panel=card();panel.append(heading("Listado de pedidos"));
  const text=mk("p","Esta es una vista de demostración. No contiene pedidos, clientes ni pagos reales.","mini");panel.append(text);
  const stats=mk("div",undefined,"summary-cards");
  const statDefs=[["Pedidos",DEMO_ORDERS.length],["Pendientes",DEMO_ORDERS.filter(o=>o.status==="Pendiente").length],["En proceso",DEMO_ORDERS.filter(o=>o.status==="En proceso").length],["Listos",DEMO_ORDERS.filter(o=>o.status==="Listo").length]];
  statDefs.forEach(([k,v])=>{const c=mk("div",undefined,"summary-card");c.append(mk("span",k),mk("b",v));stats.append(c)});
  panel.append(stats);
  const toolbar=mk("div",undefined,"toolbox"),search=mk("input",undefined,"search"),sel=mk("select",undefined,"select");
  search.type="search";search.placeholder="Buscar número, cliente o descripción…";search.setAttribute("aria-label","Buscar pedido de demostración");
  ["Todos","Pendiente","En proceso","Listo","Entregado"].forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s==="Todos"?"Todos los estados":s;sel.append(o)});
  sel.setAttribute("aria-label","Filtrar pedidos por estado");
  toolbar.append(search,sel);panel.append(toolbar);
  const counter=mk("p",undefined,"mini");counter.setAttribute("aria-live","polite");panel.append(counter);
  const tablewrap=mk("div",undefined,"tablewrap");
  const tbl=document.createElement("table"),thead=document.createElement("thead"),row=document.createElement("tr");
  ["Número / Fecha","Cliente","Descripción","Cantidad","Estado","Acción"].forEach(x=>row.append(mk("th",x)));thead.append(row);
  const body=document.createElement("tbody");tbl.append(thead,body);tablewrap.append(tbl);panel.append(tablewrap);
  const mobile=mk("div",undefined,"cardlist");panel.append(mobile);
  const filter=()=>{
   const term=search.value.toLocaleLowerCase("es").trim(),state=sel.value;
   const selected=DEMO_ORDERS.filter(o=>(state==="Todos"||o.status===state)&&[o.id,o.client,o.description,o.operator].some(v=>v.toLocaleLowerCase("es").includes(term)));
   counter.textContent="Mostrando "+selected.length+" de "+DEMO_ORDERS.length+" pedidos ficticios";
   body.replaceChildren();mobile.replaceChildren();
   selected.forEach(o=>{
    const tr=document.createElement("tr"),number=mk("td");number.append(mk("strong",o.id),mk("small",o.date));tr.append(number,mk("td",o.client),mk("td",o.description),mk("td",o.quantity));
    const statusCell=mk("td");statusCell.append(label(o.status));tr.append(statusCell);
    const action=mk("td"),button=mk("button","Ver","open-detail");button.type="button";button.addEventListener("click",()=>showOrder(o));action.append(button);tr.append(action);body.append(tr);
    const box=mk("article",undefined,"order-card");
    const top=mk("div",undefined,"row");top.append(mk("strong",o.id,"small"),label(o.status));box.append(top,heading(o.client,"smallhead"),mk("p",o.description));
    const last=mk("div",undefined,"row");last.append(mk("span",o.date+" · "+o.quantity,"small"));
    const open=mk("button","Ver detalles","open-detail");open.type="button";open.addEventListener("click",()=>showOrder(o));last.append(open);box.append(last);mobile.append(box);
   });
   if(!selected.length){const empty=mk("div",undefined,"empty");empty.append(mk("b","Sin resultados"),mk("span","Prueba con otro cliente, número o estado."));mobile.append(empty);const r=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="No se encontraron resultados";r.append(td);body.append(r)}
  };
  search.addEventListener("input",filter);sel.addEventListener("change",filter);filter();
  panel.append(mk("div","Los registros DEMO-001 a DEMO-006 son inventados. La integración con la base propia de Padre se hará después de crearla y probar sus permisos.","demo-note"));
  root.append(panel);
  const dialog=$("detailDialog");
  $("closeDetails").addEventListener("click",()=>{dialog.hidden=true});
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.hidden=true});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")dialog.hidden=true});
 }
 function emptyModule(){
  const panel=card(),head=mk("div",undefined,"row");
  head.append(heading("Página de "+cfg.name),mk("span","Estructura inicial","tag"));panel.append(head);
  panel.append(mk("p","Esta sección ya tiene una página propia dentro de Padre. Sus funciones y listas se implementarán progresivamente sobre la nueva base de datos independiente.","mini"));
  const categories=mk("div",undefined,"category-grid");
  cfg.sections.forEach(s=>{const c=mk("div",s,"category");c.append(mk("small","Pendiente de implementar y conectar en Padre"));categories.append(c)});
  panel.append(categories);
  const emp=mk("div",undefined,"empty");emp.append(mk("b","Todavía no hay registros"),mk("span","Aún no existe un Supabase independiente para Padre. No se mostrará información real de Comanda."));emp.style.marginTop="15px";panel.append(emp);
  root.append(panel);
 }
 if(slug==="pedidos")orders();else emptyModule();
 if("serviceWorker" in navigator&&window.isSecureContext){
  window.addEventListener("load",()=>navigator.serviceWorker.register("../sw.js",{scope:"../"}).catch(()=>{}));
 }
})();
