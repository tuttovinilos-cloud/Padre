/* Comanda Padre · interfaz operativa protegida por Auth y RLS.
   Ninguna consulta a Comanda. Los datos son del nuevo Supabase de Padre. */
"use strict";
(async()=>{
 const load=src=>new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error("No se pudo cargar "+src));
  document.head.append(script);
 });
 try{
  if(!window.supabase?.createClient)await load("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0");
  if(!window.PadreConfig)await load("../padre-config.js?v=3");
  if(!window.PadreAuth)await load("../auth.js?v=3");
 }catch(e){console.error("Padre: componentes de conexión",e)}
const metadata=[{"slug":"seguridad","name":"Seguridad","group":"Base y control","description":"Accesos, usuarios y permisos del sistema.","sections":["Operadores","Permisos por módulo","Inicio de sesión","Auditoría"]},{"slug":"clientes","name":"Clientes","group":"Gestión comercial","description":"Clientes, contactos e historial de relación.","sections":["Listado de clientes","Ficha del cliente","Contactos","Historial"]},{"slug":"dinero","name":"Dinero","group":"Finanzas","description":"Pagos, deudas, saldos y movimientos compartidos.","sections":["Movimientos","Cuentas por cobrar","Abonos y anulaciones","Conciliación"]},{"slug":"pedidos","name":"Pedidos","group":"Operaciones","description":"Registro y seguimiento de trabajos.","sections":["Listado de pedidos","Estados","Archivos","Entregas"]},{"slug":"materiales","name":"Materiales","group":"Operaciones","description":"Catálogo y disponibilidad de materias primas.","sections":["Materiales","Tipos de impresión","Consumos","Disponibilidad"]},{"slug":"cotizaciones","name":"Cotizaciones","group":"Gestión comercial","description":"Presupuestos y cálculos de trabajos.","sections":["Listado de cotizaciones","Cotizador","Estados de negociación","Conversión a pedido"]},{"slug":"produccion","name":"Producción","group":"Operaciones","description":"Procesos y etapas de fabricación.","sections":["Órdenes de producción","Impresión","Corpóreos","Etapas"]},{"slug":"compras","name":"Compras","group":"Operaciones","description":"Proveedores, compras y recepción.","sections":["Listado de compras","Proveedores","Materiales comprados","Movimientos"]},{"slug":"precios","name":"Precios","group":"Gestión comercial","description":"Tarifas, productos, extras y parámetros.","sections":["Tarifas","Productos","Extras","Costos"]},{"slug":"comunicacion","name":"Comunicación","group":"Soporte y análisis","description":"Notificaciones, WhatsApp y avisos.","sections":["Notificaciones","Mensajes","Plantillas","Historial de envíos"]},{"slug":"estadisticas","name":"Estadísticas","group":"Soporte y análisis","description":"Indicadores de operaciones y ventas.","sections":["Pedidos","Clientes","Producción","Finanzas"]},{"slug":"configuracion","name":"Configuración","group":"Base y control","description":"Parámetros y preferencias generales.","sections":["Parámetros generales","Preferencias","Opciones técnicas","Seguridad"]},{"slug":"marketing","name":"Marketing y Gestión Comercial","group":"Gestión comercial","description":"Campañas, prospectos y seguimiento comercial.","sections":["Ideas y contenidos","Campañas","Prospectos","Agenda comercial"]}];
const module=document.body.dataset.module;
const info=metadata.find(x=>x.slug===module);
if(!info)return;
const $=id=>document.getElementById(id);
$("areaTitle").textContent=info.name;
$("areaDescription").textContent=info.description;
$("areaBreadcrumb").textContent=info.name;
$("areaGroup").textContent=info.group;
document.title=info.name+" · Comanda Padre";
document.querySelectorAll(".bottom a").forEach(a=>a.classList.toggle("active",a.dataset.module===module));
const root=$("moduleRoot");root.replaceChildren();
const elem=(tag,value,klass)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=String(value);if(klass)el.className=klass;return el};
const panel=()=>elem("section",undefined,"panel");
const fmt=v=>v===null||v===undefined||v===""?"—":typeof v==="boolean"?(v?"Sí":"No"):String(v);
const models={
 clientes:{table:"clientes",read:"clientes_leer",write:"clientes_escribir",columns:["nombre","tipo","telefono","correo","activo"],fields:[["nombre","Nombre","text",true],["tipo","Tipo de cliente","select:normal|especial|empresa"],["telefono","Teléfono","tel"],["correo","Correo","email"]]},
 pedidos:{table:"pedidos",read:"pedidos_leer",write:"pedidos_escribir",columns:["numero","fecha","cliente_id","descripcion","estado","total_usd"],fields:[["cliente_id","Cliente","client",true],["descripcion","Descripción del pedido","text",true],["total_usd","Total USD","number",true]],editStatus:true},
 materiales:{table:"materiales",read:"materiales_leer",write:"materiales_escribir",columns:["nombre","unidad","costo_usd","precio_usd","activo"],fields:[["nombre","Material","text",true],["unidad","Unidad","text"],["costo_usd","Costo USD","number"],["precio_usd","Precio USD","number"]]},
 cotizaciones:{table:"cotizaciones",read:"cotizaciones_leer",columns:["numero","fecha","estado","subtotal_usd","total_usd"]},
 dinero:{table:"pagos",read:"dinero_leer",columns:["fecha","moneda","monto_recibido","monto_usd","metodo","estado"],financial:true},
 compras:{table:"compras",read:"compras_leer",columns:["fecha","proveedor_id","estado","total_usd"]},
 produccion:{table:"produccion_tareas",read:"produccion_leer",columns:["nombre","pedido_id","estado","fecha_prevista"]},
 marketing:{table:"marketing_ideas",read:"marketing_leer",write:"marketing_escribir",columns:["titulo","estado","fecha_prevista"],fields:[["titulo","Título","text",true],["descripcion","Descripción","text"]]},
 comunicacion:{table:"notificaciones",read:"comunicacion_leer",columns:["titulo","mensaje","creado_en","leida_en"]},
 configuracion:{table:"configuracion",read:"configuracion_leer",columns:["clave","valor","actualizado_en"]},
 seguridad:{table:"operadores",read:"seguridad_leer",columns:["nombre","activo","creado_en"]},
 precios:{table:"materiales",read:"materiales_leer",columns:["nombre","costo_usd","precio_usd","unidad"]},
 estadisticas:{read:"estadisticas_leer",stats:true}
};
const cfg=models[module];
const introBadge=document.querySelector(".intro .tag");
if(introBadge)introBadge.textContent="DESARROLLO · PADRE";
const message=(title,description)=>{
 root.replaceChildren();const p=panel();p.append(elem("h2",title,"section-heading"),elem("p",description,"mini"));root.append(p);
};
if(!window.PadreAuth?.configured){
 message("Falta activar la conexión","El nuevo Supabase de Padre ya tiene sus tablas protegidas. Falta configurar su clave publicable y habilitar el primer administrador. No se muestran datos de Comanda.");
 return;
}
let auth;
try{auth=await window.PadreAuth.authorize();if(!auth)return}
catch(e){message("No fue posible verificar los permisos",e?.message||"Intenta iniciar sesión de nuevo.");return}
const {api,op,can}=auth;
if(!cfg){message("Módulo en construcción","Se desarrollará exclusivamente en Padre.");return}
const who=elem("div","Operador: "+op.nombre,"mini");root.append(who);
const signout=elem("button","Cerrar sesión","open-detail");
signout.type="button";signout.addEventListener("click",()=>window.PadreAuth.signOut());who.append(" · ",signout);
if(!can(cfg.read)){
 message("Acceso restringido","Tu operador no tiene permiso para consultar esta sección.");
 return;
}
let records=[];
const errorBox=elem("div",undefined,"mini");errorBox.style.color="#a32020";errorBox.setAttribute("role","alert");
const title=panel(),top=elem("div",undefined,"row");
top.append(elem("h2","Listado de "+info.name,"section-heading"));
const createButton=elem("button","Nuevo registro","open-detail");createButton.type="button";
if(cfg.fields&&can(cfg.write))top.append(createButton);
title.append(top);
const guide=cfg.financial?"Consulta protegida de pagos. Los registros, aplicaciones y anulaciones financieras no se gestionan desde este listado.":("Mostrando como máximo 100 registros de Padre. No hay datos de Comanda.");
title.append(elem("p",guide,"mini"));
const bar=elem("div",undefined,"toolbox"),input=elem("input",undefined,"search");
input.type="search";input.placeholder="Buscar en este listado…";input.setAttribute("aria-label","Buscar registros");
bar.append(input);title.append(bar,errorBox);
const total=elem("p","","mini");total.setAttribute("aria-live","polite");title.append(total);
const desktop=elem("div",undefined,"tablewrap"),table=elem("table"),thead=elem("thead"),trow=elem("tr");
const columns=cfg.columns||[];
for(const c of columns)trow.append(elem("th",c.replaceAll("_"," ")));
if(cfg.editStatus&&can(cfg.write))trow.append(elem("th","Acciones"));
thead.append(trow);const tbody=elem("tbody");table.append(thead,tbody);desktop.append(table);title.append(desktop);
const cards=elem("div",undefined,"cardlist");title.append(cards);root.append(title);
const display=v=>typeof v==="object"&&v!==null?JSON.stringify(v):fmt(v);
function render(){
 const query=input.value.toLocaleLowerCase("es").trim();
 const visible=records.filter(row=>columns.some(c=>display(row[c]).toLocaleLowerCase("es").includes(query)));
 total.textContent=visible.length+" registros visibles";
 tbody.replaceChildren();cards.replaceChildren();
 for(const row of visible){
  const tr=elem("tr");
  for(const key of columns)tr.append(elem("td",display(row[key])));
  if(cfg.editStatus&&can(cfg.write)){
   const td=elem("td"),b=elem("button","Cambiar estado","open-detail");
   b.addEventListener("click",()=>changeStatus(row));td.append(b);tr.append(td);
  }
  tbody.append(tr);
  const item=elem("article",undefined,"order-card");
  const h=elem("h3",fmt(row[columns[0]]));item.append(h);
  for(const key of columns.slice(1))item.append(elem("p",key.replaceAll("_"," ")+": "+display(row[key])));
  if(cfg.editStatus&&can(cfg.write)){
    const b=elem("button","Cambiar estado","open-detail");b.addEventListener("click",()=>changeStatus(row));item.append(b);
  }
  cards.append(item);
 }
 if(!visible.length){
  const empty=elem("div",undefined,"empty");empty.append(elem("b","No se encontraron registros"),elem("span","Puedes cambiar el filtro o agregar registros cuando tengas permisos."));cards.append(empty);
  const tr=elem("tr"),td=elem("td","No se encontraron registros");td.colSpan=columns.length+(cfg.editStatus?1:0);tr.append(td);tbody.append(tr);
 }
}
input.addEventListener("input",render);
async function reload(){
 errorBox.textContent="";
 const {data,error}=await api.from(cfg.table).select("*").limit(100);
 if(error){records=[];render();errorBox.textContent="Error de consulta: "+error.message;return}
 records=data||[];
 if(cfg.table!=="configuracion"&&cfg.table!=="monedas"){
 const dateKey=records.length&&("creado_en" in records[0])?"creado_en":"fecha";
 if(dateKey)records.sort((a,b)=>String(b[dateKey]||"").localeCompare(String(a[dateKey]||"")));
 }
 render();
}
async function changeStatus(row){
 const options=["pendiente","en_proceso","listo","entregado","anulado"];
 const promptText="Nuevo estado para pedido "+row.numero+": "+options.join(", ");
 const selected=window.prompt(promptText,row.estado||"pendiente");
 if(selected===null)return;
 if(!options.includes(selected)){errorBox.textContent="Estado inválido.";return}
 const {error}=await api.from("pedidos").update({estado:selected}).eq("id",row.id);
 if(error){errorBox.textContent="No se pudo cambiar el estado: "+error.message;return}
 await reload();
}
async function createRecord(){
 if(!cfg.fields||!can(cfg.write))return;
 errorBox.textContent="";
 const form=elem("form",undefined,"padre-form");
 const modal=elem("div",undefined,"modal-wrap");
 const dialog=elem("div",undefined,"modal");dialog.append(elem("h2","Nuevo registro · "+info.name));
 let clients=[];
 if(cfg.fields.some(x=>x[2]==="client")){
  if(!can("clientes_leer")){errorBox.textContent="No tienes permiso para seleccionar clientes.";return}
  const result=await api.from("clientes").select("id,nombre").eq("activo",true).order("nombre").limit(200);
  if(result.error){errorBox.textContent=result.error.message;return}
  clients=result.data||[];
  if(!clients.length){errorBox.textContent="Primero registra al menos un cliente activo.";return}
 }
 const inputs=[];
 for(const [key,label,type,required] of cfg.fields){
  const field=elem("label",label);field.style.display="block";field.style.marginTop="12px";field.style.fontWeight="700";
  let input;
  if(type==="client"||type?.startsWith("select:")){
   input=document.createElement("select");
   let options=type==="client"?clients.map(c=>[c.id,c.nombre]):type.slice(7).split("|").map(c=>[c,c]);
   const start=document.createElement("option");start.value="";start.textContent="Seleccionar";input.append(start);
   for(const [v,text] of options){const opt=document.createElement("option");opt.value=v;opt.textContent=text;input.append(opt)}
  }else{input=document.createElement("input");input.type=type||"text";if(type==="number"){input.step="0.01";input.min="0"}}
  input.name=key;input.required=!!required;input.style.width="100%";input.style.padding="10px";input.style.border="1px solid #cbd3e6";input.style.borderRadius="8px";
  field.append(input);form.append(field);inputs.push({key,type,input});
 }
 const save=elem("button","Guardar registro","pwa-primary");save.type="submit";save.style.marginTop="18px";save.style.width="100%";
 const cancel=elem("button","Cancelar","pwa-secondary");cancel.type="button";cancel.style.marginTop="8px";cancel.style.width="100%";cancel.addEventListener("click",()=>modal.remove());
 form.append(save,cancel);dialog.append(form);modal.append(dialog);document.body.append(modal);
 form.addEventListener("submit",async e=>{
  e.preventDefault();save.disabled=true;
  try{
   const payload={};
   for(const {key,type,input} of inputs){
    const value=input.value.trim();
    if(!value)continue;
    payload[key]=type==="number"?Number(value):value;
   }
   if(cfg.table==="pedidos"){payload.total_usd=Number(payload.total_usd||0);payload.creado_por=op.id}
   const {error}=await api.from(cfg.table).insert(payload);
   if(error)throw error;
   modal.remove();await reload();
  }catch(err){errorBox.textContent="No fue posible guardar: "+(err.message||"Error desconocido")}
  finally{save.disabled=false}
 });
}
createButton.addEventListener("click",createRecord);
if(cfg.stats){
 root.replaceChildren(who);
 const box=panel();box.append(elem("h2","Indicadores iniciales","section-heading"));
 box.append(elem("p","Estas cifras se consultan directamente del Supabase de Padre, respetando los permisos del operador.","mini"));
 const statistics=[["Clientes","clientes","clientes_leer"],["Pedidos","pedidos","pedidos_leer"],["Pagos","pagos","dinero_leer"],["Cotizaciones","cotizaciones","cotizaciones_leer"]];
 const grid=elem("div",undefined,"summary-cards");
 for(const [title,table,permission] of statistics){
  const card=elem("div",undefined,"summary-card");card.append(elem("span",title));
  if(!can(permission))card.append(elem("b","Restringido"));
  else{
   const {count,error}=await api.from(table).select("id",{count:"exact",head:true});
   card.append(elem("b",error?"—":count??0));
  }
  grid.append(card);
 }
 box.append(grid);root.append(box);return;
}
await reload();
})();