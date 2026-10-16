/* Padre: administración de jerarquías. Toda escritura se valida en Supabase Padre. */
"use strict";
(async()=>{
const U=window.PadreUI;
const context=await U.useAuth("seguridad_leer");
if(!context)return;
const {api,op,root}=context;
const state={operators:[],roles:[],permissions:[],memberships:[],rolePermissions:[],events:[],pins:[],selected:null,search:""};
const wrap=U.h("section",{className:"panel"});
root.append(wrap);
wrap.append(U.h("h2",{className:"section-heading",text:"Operadores, jerarquías y permisos"}));
wrap.append(U.summary("Los permisos de Padre se aplican en el servidor. Solo Roberto puede activar o restablecer el PIN provisional 0000. Debe cambiarse por uno personal antes de utilizar los módulos. Por seguridad, el PIN provisional vence a las 24 horas."));
const message=U.h("div"), toolbar=U.h("div",{className:"op-toolbar"}),search=U.h("input",{
 className:"op-search",attrs:{type:"search",placeholder:"Buscar operador…","aria-label":"Buscar operador"}
});
const refresh=U.btn("Actualizar datos",()=>load(),true);
toolbar.append(search,refresh);
if(op.nombre==="Roberto")toolbar.append(U.btn("Activar operadores sin PIN",activatePending,true));
toolbar.append(U.btn("Cambiar mi PIN",()=>location.assign("../cambiar-pin.html"),true));
wrap.append(toolbar,message);
const counter=U.h("div",{className:"sg-summary"}),listing=U.h("div",{className:"sg-operators"});
wrap.append(counter,listing);
const audit=U.h("section",{className:"sg-audit"});
wrap.append(audit);
const error=(msg,ok=false)=>U.notice(message,msg,ok?"success":"error");
const H=(tag,text,className)=>U.h(tag,{text,className});
const isAdmin=()=>{
 const assignments=state.memberships.filter(x=>x.operador_id===op.id);
 return assignments.some(x=>state.roles.some(r=>r.id===x.rol_id&&r.codigo==="administrador"));
};
const isTargetAdmin=id=>state.memberships.some(x=>x.operador_id===id &&state.roles.some(r=>r.id===x.rol_id&&r.codigo==="administrador"));
const effective=id=>{
 const ids=new Set(state.memberships.filter(x=>x.operador_id===id).map(x=>x.rol_id));
 return new Set(state.rolePermissions.filter(x=>ids.has(x.rol_id)).map(x=>x.permiso_codigo));
};
const humanArea=area=>({
 seguridad:"Seguridad y jerarquías",clientes:"Clientes",pedidos:"Pedidos",
 dinero:"Dinero y contabilidad",compras:"Compras y proveedores",
 cotizaciones:"Cotizaciones",materiales:"Materiales",precios:"Precios",
 produccion:"Producción",estadisticas:"Estadísticas",comunicacion:"Comunicación",
 configuracion:"Configuración",marketing:"Marketing",etiquetas:"Etiquetas"
})[area]||area;
const nicePerm=p=>p.descripcion||p.codigo.replace(/_/g," ");
function showCounts(){
 counter.replaceChildren();
 const active=state.operators.filter(x=>x.activo).length;
 const linked=state.operators.filter(x=>!!x.auth_user_id).length;
 const stats=[["Operadores",state.operators.length],["Activos",active],["Con acceso vinculado",linked],["Permisos definidos",state.permissions.length]];
 for(const [label,n] of stats){
  const card=U.h("div",{className:"sg-stat"});
  card.append(H("strong",String(n)),H("span",label));
  counter.append(card);
 }
}
function operatorRoles(id){
 return state.memberships.filter(x=>x.operador_id===id).map(x=>state.roles.find(r=>r.id===x.rol_id)?.nombre).filter(Boolean).join(" · ")||"Sin rol";
}
function render(){
 listing.replaceChildren();showCounts();
 const current=state.operators.filter(x=>x.nombre.toLocaleLowerCase().includes(state.search.toLocaleLowerCase()));
 if(!current.length)listing.append(U.empty("No se encontraron operadores."));
 for(const person of current){
  const card=U.h("article",{className:"sg-person"});
  const top=U.h("div",{className:"sg-person-header"});
  const labels=U.h("div",{className:"sg-person-name"});
  labels.append(H("strong",person.nombre));
  labels.append(H("small",operatorRoles(person.id)));
  top.append(labels);
  const stateChip=U.h("span",{className:"op-chip "+(person.activo?"ok":"off"),text:person.activo?"Activo":"Inactivo"});
  top.append(stateChip);card.append(top);
  const pin=state.pins.find(x=>x.operador_id===person.id);
  const pinText=pin?.pin_configurado
   ?(person.auth_user_id?"PIN configurado · Cuenta vinculada":"PIN configurado · Falta primera entrada")
   :"PIN sin configurar · No puede iniciar sesión";
  const extra=U.h("p",{className:"op-muted",text:pinText+" · "+effective(person.id).size+" permisos"});
  card.append(extra);
  if(isAdmin()&&!isTargetAdmin(person.id)){
   card.append(U.btn("Configurar permisos",()=>openEditor(person),true));
  }else if(isTargetAdmin(person.id)){
   card.append(U.h("p",{className:"sg-protected",text:"Perfil administrador protegido"}));
  }else {
   card.append(U.btn("Ver permisos",()=>openEditor(person),true));
  }
  if(isAdmin()&&op.nombre==="Roberto"&&person.activo&&person.id!==op.id){
   card.append(U.btn(pin?.pin_configurado?"Restablecer PIN provisional":"Asignar PIN provisional",()=>openPinEditor(person),true));
  }
  listing.append(card);
 }
 renderAudit();
}
function renderAudit(){
 audit.replaceChildren();
 audit.append(H("h3","Historial de seguridad","op-subheading"));
 if(!isAdmin()){
  audit.append(U.summary("El historial de cambios de jerarquía está reservado al administrador."));
  return;
 }
 if(!state.events.length){audit.append(U.empty("Todavía no se han modificado perfiles desde este panel."));return;}
 const list=U.h("ol",{className:"op-timeline"});
 for(const evt of state.events.slice(0,30)){
  const actor=state.operators.find(x=>x.id===evt.actor_id)?.nombre||"Administrador";
  const target=state.operators.find(x=>x.id===evt.operador_id)?.nombre||"Operador";
  const oldStatus=evt.datos?.activo_anterior;
  const newStatus=evt.datos?.activo_nuevo;
  const stateChange=oldStatus!==newStatus?" · estado actualizado":"";
  list.append(H("li",new Date(evt.creado_en).toLocaleString("es-VE")+" · "+actor+" actualizó a "+target+stateChange));
 }
 audit.append(list);
}
async function load(){
 refresh.disabled=true;error("");
 try{
  const [a,b,c,d,e]=await Promise.all([
   api.from("operadores").select("id,nombre,activo,auth_user_id,origen").order("nombre"),
   api.from("roles").select("id,codigo,nombre").order("nombre"),
   api.from("permisos").select("codigo,descripcion").order("codigo"),
   api.from("operadores_roles").select("operador_id,rol_id"),
   api.from("roles_permisos").select("rol_id,permiso_codigo")
  ]);
  const all=[a,b,c,d,e];
  if(all.some(x=>x.error))throw (all.find(x=>x.error).error);
  state.operators=a.data||[];state.roles=b.data||[];
  state.permissions=c.data||[];state.memberships=d.data||[];
  state.rolePermissions=e.data||[];
  const selfAdmin=isAdmin();
  state.events=[];state.pins=[];
  if(selfAdmin){
   const pins=await api.rpc("padre_seguridad_estado_pines");
   if(pins.error)error("No se pudo consultar el estado de los PIN: "+pins.error.message);
   else state.pins=pins.data||[];
   const hist=await api.from("seguridad_eventos").select("actor_id,operador_id,accion,datos,creado_en").order("creado_en",{ascending:false}).limit(30);
   if(hist.error)error("Se cargaron los operadores, pero el historial no está disponible: "+hist.error.message);
   else state.events=hist.data||[];
  }
  render();
 }catch(e){
  listing.replaceChildren(U.h("div",{className:"op-error",text:"No fue posible cargar la administración de Padre: "+(e?.message||"Error desconocido")}));
 }finally{refresh.disabled=false}
}
function openEditor(person){
 const manage=isAdmin()&&!isTargetAdmin(person.id);
 const modal=U.modal((manage?"Configurar":"Consultar")+" · "+person.nombre);
 const notice=U.h("div");
 const form=U.h("form");
 const grid=U.h("div",{className:"op-form-grid"});
 const name=U.field("Nombre del operador","sg_nombre",person.nombre,"text",true);
 const enabled=U.choose("Estado","sg_activo",[["true","Activo"],["false","Inactivo"]],String(person.activo));
 name.input.disabled=!manage;enabled.input.disabled=!manage;
 grid.append(name.wrapper,enabled.wrapper);
 form.append(grid);
 const hint=U.summary("La selección de permisos crea un perfil individual para este operador. No modifica los permisos de otros empleados. Desactivar un operador bloquea sus operaciones en Padre, sin borrar su historial.");
 form.append(hint);
 const sections=U.h("div",{className:"sg-permissions"});
 const enabledSet=effective(person.id);
 const chosen=new Set(enabledSet);
 const groups=new Map();
 for(const p of state.permissions){
  const area=p.codigo.split("_")[0];
  if(!groups.has(area))groups.set(area,[]);
  groups.get(area).push(p);
 }
 for(const [area,permissions] of groups){
  const block=U.h("section",{className:"sg-group"});
  const header=H("h3",humanArea(area),"sg-group-title");
  block.append(header);
  for(const permission of permissions){
   const reserved=permission.codigo==="seguridad_gestionar";
   const row=U.h("label",{className:"sg-permission"});
   const checkbox=U.h("input",{attrs:{type:"checkbox"}});
   checkbox.checked=chosen.has(permission.codigo);
   checkbox.disabled=!manage||reserved;
   checkbox.addEventListener("change",()=>{
    if(checkbox.checked)chosen.add(permission.codigo);
    else chosen.delete(permission.codigo);
   });
   const description=U.h("span",{className:"sg-permission-copy"});
   description.append(H("strong",nicePerm(permission)),H("small",permission.codigo+(reserved?" · Solo administrador":"")));
   row.append(checkbox,description);
   if(permission.codigo==="dinero_anular")row.append(U.h("span",{className:"sg-highrisk",text:"Alto riesgo"}));
   block.append(row);
  }
  sections.append(block);
 }
 form.append(sections,notice);modal.contents.append(form);
 const cancel=U.btn("Cerrar",modal.close,true);
 modal.footer.append(cancel);
 if(manage){
  const save=U.h("button",{text:"Guardar cambios",className:"op-btn",attrs:{type:"submit"}});
  save.addEventListener("click",()=>form.requestSubmit());
  modal.footer.append(save);
  form.addEventListener("submit",async event=>{
   event.preventDefault();
   const fullname=name.input.value.trim();
   if(fullname.length<2||fullname.length>120){U.notice(notice,"El nombre debe tener entre 2 y 120 caracteres.");return}
   const requested=[...chosen].filter(x=>x!=="seguridad_gestionar").sort();
   const initiallyHad=enabledSet.has("dinero_anular");
   if(requested.includes("dinero_anular")&&!initiallyHad){
    if(!confirm("Estás concediendo a "+fullname+" permiso para ANULAR PAGOS en el futuro núcleo de Contabilidad. ¿Confirmas este acceso de alto riesgo?"))return;
   }
   if(enabled.input.value==="false"&&person.activo){
    if(!confirm("¿Desactivar el acceso operativo de "+fullname+"? No se borrarán sus pedidos ni su historial."))return;
   }
   save.disabled=true;U.notice(notice,"");
   try{
    const {error:rpcError}=await api.rpc("padre_seguridad_guardar_perfil",{
     p_operador_id:person.id,p_nombre:fullname,p_activo:enabled.input.value==="true",
     p_permisos:requested
    });
    if(rpcError)throw rpcError;
    modal.close();
    await load();
    error("Permisos y estado de "+fullname+" guardados con auditoría.",true);
   }catch(e){U.notice(notice,"No se pudieron guardar los permisos: "+(e?.message||"Error desconocido"))}
   finally{save.disabled=false}
  });
 }
}
async function openPinEditor(person){
 if(!isAdmin()||op.nombre!=="Roberto"||!person.activo||person.id===op.id)return;
 if(!confirm("¿Asignar a "+person.nombre+" el PIN provisional 0000? Debe cambiarlo antes de usar Padre y vence en 24 horas. El PIN anterior dejará de funcionar."))return;
 try{
  const {data,error:rpcError}=await api.rpc("padre_seguridad_configurar_pin",{
   p_operador_id:person.id,p_pin:"0000"
  });
  if(rpcError||data!==true)throw rpcError||new Error("No se confirmó la operación");
  await load();
  error("PIN provisional preparado para "+person.nombre+". Debe ingresar y cambiarlo antes de 24 horas.",true);
 }catch(e){error("No fue posible asignar el PIN: "+(e?.message||"Error inesperado"))}
}
async function activatePending(){
 if(!isAdmin()||op.nombre!=="Roberto")return;
 if(!confirm("¿Configurar 0000 para TODOS los operadores activos sin PIN? Cada uno deberá crear su PIN personal antes de usar Padre. Los PIN temporales caducan en 24 horas."))return;
 try{
  const {data,error:rpcError}=await api.rpc("padre_seguridad_activar_pendientes");
  if(rpcError)throw rpcError;
  await load();
  error("PIN provisional asignado a "+Number(data||0)+" operador(es). Deben cambiarlo antes de 24 horas.",true);
 }catch(e){error("No fue posible activar operadores: "+(e?.message||"Error inesperado"))}
}
search.addEventListener("input",()=>{state.search=search.value;render()});
await load();
})();