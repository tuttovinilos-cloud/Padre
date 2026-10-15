/* Comanda Padre · Clientes: operaciones reales en proyecto independiente. */
"use strict";
(async()=>{
const U=window.PadreUI;
const context=await U.useAuth("clientes_leer");if(!context)return;
const {api,can,root}=context;
const state={page:0,size:25,total:0,filter:"todos",query:"",rows:[],request:0};
const box=U.h("section",{className:"panel"});root.append(box);
const header=U.h("div",{className:"row"}),title=U.h("h2",{className:"section-heading",text:"Listado de clientes"});
header.append(title);
if(can("clientes_escribir"))header.append(U.btn("＋ Nuevo cliente",()=>editClient()));
box.append(header,U.summary("Gestión de clientes del Supabase de Padre. Los cambios quedan registrados y los clientes con historial no se eliminan: pueden desactivarse."));
const bar=U.h("div",{className:"op-toolbar"});
const search=U.h("input",{className:"op-search",attrs:{type:"search",placeholder:"Buscar por nombre…","aria-label":"Buscar cliente"}});
const status=U.h("select",{className:"op-select",attrs:{"aria-label":"Filtrar actividad"}});
[["todos","Todos"],["activos","Activos"],["inactivos","Inactivos"]].forEach(([v,t])=>status.append(U.h("option",{text:t,attrs:{value:v}})));
const refresh=U.btn("Actualizar",()=>load(),true);
bar.append(search,status,refresh);box.append(bar);
const message=U.h("div");box.append(message);
const counter=U.h("p",{className:"op-muted",text:"Cargando clientes…",attrs:{"aria-live":"polite"}});box.append(counter);
const wrap=U.h("div",{className:"op-tablewrap"}),table=U.h("table",{className:"op-table"}),thead=U.h("thead"),tbody=U.h("tbody"),tr=U.h("tr");
["Nombre","Tipo","Teléfono","Correo","Estado","Acciones"].forEach(x=>tr.append(U.h("th",{text:x})));
thead.append(tr);table.append(thead,tbody);wrap.append(table);box.append(wrap);
const cards=U.h("div",{className:"op-cardlist"});box.append(cards);
const footer=U.h("div",{className:"op-pager"}),pagesText=U.h("span",{className:"op-muted"});
const back=U.btn("← Anterior",()=>{state.page--;load()},true),next=U.btn("Siguiente →",()=>{state.page++;load()},true);
footer.append(pagesText,U.h("div",{className:"op-actions"}));footer.lastChild.append(back,next);box.append(footer);
search.addEventListener("input",()=>{clearTimeout(window._padreClienteSearch);window._padreClienteSearch=setTimeout(()=>{state.page=0;state.query=search.value.trim();load()},300)});
status.addEventListener("change",()=>{state.filter=status.value;state.page=0;load()});
function notify(e,ok=false){U.notice(message,e,ok?"success":"error")}
function badge(active){return U.h("span",{className:"op-chip "+(active?"ok":"off"),text:active?"Activo":"Inactivo"})}
async function load(){
 const req=++state.request;counter.textContent="Consultando clientes…";notify("");
 let qry=api.from("clientes")
 .select("id,nombre,tipo,identificacion,telefono,correo,activo,observaciones,creado_en,actualizado_en,origen_comanda_id,importado_desde_comanda,tipo_cliente_origen,rif_cedula_origen,direccion,naturaleza_cliente,telefono_general,correo_general,precio_especial_origen",{count:"exact"})
 .order("nombre",{ascending:true})
 .range(state.page*state.size,state.page*state.size+state.size-1);
 if(state.filter!=="todos")qry=qry.eq("activo",state.filter==="activos");
 if(state.query)qry=qry.ilike("nombre","%"+state.query.replace(/[%_\\]/g,"")+"%");
 const {data,error,count}=await qry;
 if(req!==state.request)return;
 if(error){state.rows=[];state.total=0;render();notify("No se pudieron obtener los clientes: "+error.message);return}
 state.rows=data||[];state.total=count??0;
 if(!state.rows.length&&state.page>0){state.page--;await load();return}
 render();
}
function render(){
 tbody.replaceChildren();cards.replaceChildren();
 const start=state.total?state.page*state.size+1:0;
 const end=Math.min(state.total,(state.page+1)*state.size);
 counter.textContent=state.total+" clientes encontrados";
 pagesText.textContent=start+"–"+end+" de "+state.total;
 back.disabled=state.page===0;next.disabled=end>=state.total;
 for(const row of state.rows){
  const r=U.h("tr"),open=U.btn("Ver ficha",()=>detail(row),true);
  [row.nombre,row.tipo_cliente_origen||row.tipo,row.telefono||row.telefono_general||"—",row.correo||row.correo_general||"—"].forEach(t=>r.append(U.h("td",{text:t})));
  const st=U.h("td");st.append(badge(row.activo));r.append(st);
  const actions=U.h("td");actions.append(open);if(can("clientes_escribir"))actions.append(U.btn("Editar",()=>editClient(row),true));
  r.append(actions);tbody.append(r);
  const card=U.h("article",{className:"op-rowcard"});
  const top=U.h("div",{className:"row"});top.append(U.h("h3",{text:row.nombre}),badge(row.activo));card.append(top);
  card.append(U.h("p",{text:"Tipo: "+(row.tipo_cliente_origen||row.tipo)+" · Tel.: "+(row.telefono||row.telefono_general||"—")}));
  const action=U.h("div",{className:"op-actions"});action.append(U.btn("Ver ficha",()=>detail(row),true));if(can("clientes_escribir"))action.append(U.btn("Editar",()=>editClient(row),true));card.append(action);
  cards.append(card);
 }
 if(!state.rows.length){cards.append(U.empty("No hay clientes con esos filtros."));const r=U.h("tr"),cell=U.h("td",{text:"No se encontraron registros"});cell.colSpan=6;r.append(cell);tbody.append(r)}
}
function editClient(row=null){
 if(!can("clientes_escribir"))return;
 const modal=U.modal(row?"Editar cliente":"Nuevo cliente");
 const form=U.h("form"),grid=U.h("div",{className:"op-form-grid"}),note=U.h("div"),fields={};
 const defs=[["nombre","Nombre / razón social","text",true],["tipo","Tipo","choice"],["identificacion","RIF / cédula"],["telefono","Teléfono","tel"],["correo","Correo electrónico","email"],["observaciones","Observaciones","textarea"]];
 for(const [key,label,type,required] of defs){
  const obj=type==="choice"?U.choose(label,key,[["normal","Normal"],["especial","Especial"],["empresa","Empresa"]],row?.[key]||"normal"):U.field(label,key,row?.[key]??"",type||"text",required);
  if(type==="textarea")obj.wrapper.classList.add("wide");
  fields[key]=obj.input;grid.append(obj.wrapper);
 }
 form.append(grid,note);
 const save=U.h("button",{text:row?"Guardar cambios":"Registrar cliente",className:"op-btn",attrs:{type:"submit"}});
 save.addEventListener("click",()=>form.requestSubmit());
 modal.footer.append(U.btn("Cancelar",modal.close,true),save);modal.contents.append(form);
 form.addEventListener("submit",async ev=>{
  ev.preventDefault();save.disabled=true;U.notice(note,"");
  const nombre=fields.nombre.value.trim();
  if(nombre.length<2||nombre.length>180){U.notice(note,"El nombre debe tener entre 2 y 180 caracteres.");save.disabled=false;return}
  const payload={nombre,tipo:fields.tipo.value,
   identificacion:fields.identificacion.value.trim()||null,
   telefono:fields.telefono.value.trim()||null,
   correo:fields.correo.value.trim()||null,
   observaciones:fields.observaciones.value.trim()||null};
  const request=row?api.from("clientes").update(payload).eq("id",row.id).select("id").single():
      api.from("clientes").insert(payload).select("id").single();
  const {error}=await request;
  save.disabled=false;
  if(error){U.notice(note,error.code==="23505"?"Ya existe un cliente con esa identificación.":"No se guardó: "+error.message);return}
  modal.close();await load();notify(row?"Cliente actualizado correctamente.":"Cliente registrado correctamente.",true);
 });
}
async function toggle(row,dialog){
 if(!can("clientes_escribir"))return;
 if(!confirm((row.activo?"¿Desactivar":"¿Activar")+" a "+row.nombre+"? Los pedidos existentes permanecerán intactos."))return;
 const {error}=await api.from("clientes").update({activo:!row.activo}).eq("id",row.id).select("id").single();
 if(error){alert("No se pudo cambiar el estado: "+error.message);return}
 dialog?.close();await load();notify("Estado del cliente actualizado.",true);
}
async function detail(row){
 const dialog=U.modal("Ficha del cliente"),content=dialog.contents;
 const grid=U.h("div",{className:"op-detail-grid"});
 for(const [label,key] of [["Nombre","nombre"],["Identificación","rif_cedula_origen"],["Tipo en Comanda","tipo_cliente_origen"],["Tipo en Padre","tipo"],["Teléfono","telefono"],["Correo","correo"],["Teléfono general","telefono_general"],["Correo general","correo_general"],["Dirección","direccion"],["Naturaleza","naturaleza_cliente"],["Estado","activo"],["Observaciones","observaciones"],["Actualizado","actualizado_en"]]){
  const slot=U.h("div");slot.append(U.h("label",{text:label}),U.h("strong",{text:key==="activo"?(row.activo?"Activo":"Inactivo"):(row[key]||"—")}));grid.append(slot);
 }
 content.append(grid);
 if(row.origen_comanda_id)content.append(U.summary("Cliente importado de Comanda · ID original "+row.origen_comanda_id+". Su registro histórico completo está conservado únicamente en Supabase Padre."));
 if(can("clientes_escribir")){
  dialog.footer.append(U.btn("Editar",()=>{dialog.close();editClient(row)},true));
  dialog.footer.append(U.btn(row.activo?"Desactivar":"Reactivar",()=>toggle(row,dialog),true));
 }
 const contacts=U.h("section");contacts.append(U.h("h3",{className:"op-subheading",text:"Contactos"}));
 content.append(U.h("hr",{className:"op-separator"}),contacts);
 async function loadContacts(){
  const {data,error}=await api.from("clientes_contactos").select("id,nombre,cargo,telefono,correo,principal")
   .eq("cliente_id",row.id).order("principal",{ascending:false}).order("nombre").limit(100);
  contacts.replaceChildren(U.h("h3",{text:"Contactos",className:"op-subheading"}));
  if(can("clientes_escribir"))contacts.append(U.btn("＋ Añadir contacto",()=>contactForm(null),true));
  if(error){contacts.append(U.h("p",{text:"No se pudo cargar contactos: "+error.message,className:"op-error"}));return}
  if(!data?.length)contacts.append(U.empty("Este cliente todavía no tiene contactos registrados."));
  for(const contact of data||[]){
   const card=U.h("div",{className:"op-contact"}),top=U.h("div",{className:"row"});
   top.append(U.h("strong",{text:contact.nombre}),U.h("span",{className:"op-muted",text:contact.principal?"Principal":contact.cargo||"Contacto"}));card.append(top);
   card.append(U.h("p",{className:"op-muted",text:[contact.telefono,contact.correo].filter(Boolean).join(" · ")||"Sin datos adicionales"}));
   if(can("clientes_escribir"))card.append(U.btn("Editar contacto",()=>contactForm(contact),true));
   contacts.append(card);
  }
 }
 function contactForm(record){
  const modal=U.modal(record?"Editar contacto":"Nuevo contacto");
  const form=U.h("form"),grid=U.h("div",{className:"op-form-grid"}),note=U.h("div"),inputs={};
  for(const [key,label,typ,req] of [["nombre","Nombre","text",true],["cargo","Cargo"],["telefono","Teléfono","tel"],["correo","Correo","email"]]){
   const {wrapper,input}=U.field(label,key,record?.[key]||"",typ||"text",req);inputs[key]=input;grid.append(wrapper);
  }
  form.append(grid,note);modal.contents.append(form);
  const submit=U.h("button",{className:"op-btn",text:"Guardar contacto",attrs:{type:"submit"}});
  submit.addEventListener("click",()=>form.requestSubmit());
  modal.footer.append(U.btn("Cancelar",modal.close,true),submit);
  form.addEventListener("submit",async e=>{
   e.preventDefault();submit.disabled=true;
   const payload={nombre:inputs.nombre.value.trim(),cargo:inputs.cargo.value.trim()||null,
     telefono:inputs.telefono.value.trim()||null,correo:inputs.correo.value.trim()||null};
   if(!payload.nombre){U.notice(note,"Indica el nombre del contacto.");submit.disabled=false;return}
   const req=record?api.from("clientes_contactos").update(payload).eq("id",record.id).eq("cliente_id",row.id):
    api.from("clientes_contactos").insert({...payload,cliente_id:row.id});
   const {error}=await req;submit.disabled=false;
   if(error){U.notice(note,"No fue posible guardar: "+error.message);return}
   modal.close();await loadContacts();
  });
 }
 await loadContacts();
 if(can("pedidos_leer")){
  const orders=U.h("section");content.append(U.h("hr",{className:"op-separator"}),orders);
  orders.append(U.h("h3",{text:"Pedidos recientes del cliente",className:"op-subheading"}));
  const {data,error}=await api.from("pedidos").select("numero,descripcion,estado,fecha,id")
   .eq("cliente_id",row.id).order("fecha",{ascending:false}).limit(15);
  if(error)orders.append(U.h("p",{text:"No se pudo consultar el historial de pedidos.",className:"op-muted"}));
  else if(!data?.length)orders.append(U.h("p",{className:"op-muted",text:"Este cliente no tiene pedidos en Padre."}));
  else for(const item of data){
   const link=U.h("a",{className:"op-muted-link",text:"#"+item.numero+" · "+item.descripcion+" · "+item.estado,
    attrs:{href:"./pedidos.html?cliente="+encodeURIComponent(row.id)}});const div=U.h("p");div.append(link);orders.append(div);
  }
 }
 const audit=U.h("section");content.append(U.h("hr",{className:"op-separator"}),audit);
 audit.append(U.h("h3",{text:"Historial de modificaciones",className:"op-subheading"}));
 const {data:events,error:auditError}=await api.from("clientes_eventos")
  .select("accion,creado_en").eq("cliente_id",row.id).order("creado_en",{ascending:false}).limit(20);
 if(auditError)audit.append(U.h("p",{className:"op-muted",text:"Historial temporalmente no disponible."}));
 else if(!events?.length)audit.append(U.h("p",{className:"op-muted",text:"Sin eventos registrados."}));
 else {const list=U.h("ul",{className:"op-timeline"});
  events.forEach(ev=>list.append(U.h("li",{text:ev.accion+" · "+new Date(ev.creado_en).toLocaleString("es-VE")})));audit.append(list)}
}
await load();
})();