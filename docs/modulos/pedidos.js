/* Comanda Padre · Pedidos: listados, formularios, trazabilidad y cálculos en servidor */
"use strict";
(async()=>{
const U=window.PadreUI;
const ctx=await U.useAuth("pedidos_leer");if(!ctx)return;
const {api,can,root}=ctx;
const state={page:0,size:25,total:0,search:"",filter:"todos",clientId:new URLSearchParams(location.search).get("cliente")||"",rows:[],request:0};
let clients=[],operators=[];
const box=U.h("section",{className:"panel"});root.append(box);
const head=U.h("div",{className:"row"});
head.append(U.h("h2",{className:"section-heading",text:"Listado de pedidos"}));
if(can("pedidos_escribir"))head.append(U.btn("＋ Nuevo pedido",()=>edit(null)));
box.append(head,U.summary("Pedidos exclusivos de Padre. Los conceptos determinan el total en el servidor; los cambios quedan registrados en el historial. Pagos y anulaciones financieras están separados."));
const stats=U.h("div",{className:"op-stats"});box.append(stats);
const tools=U.h("div",{className:"op-toolbar"}),search=U.h("input",{className:"op-search",attrs:{type:"search",placeholder:"Buscar número o descripción…","aria-label":"Buscar pedidos"}}),status=U.h("select",{className:"op-select",attrs:{"aria-label":"Filtrar por estado"}}),clientFilter=U.h("select",{className:"op-select",attrs:{"aria-label":"Filtrar por cliente"}});
[["todos","Todos los estados"],["pendiente","Pendiente"],["en_proceso","En proceso"],["listo","Listo"],["entregado","Entregado"],["anulado","Anulado"]].forEach(([v,t])=>status.append(U.h("option",{text:t,attrs:{value:v}})));
clientFilter.append(U.h("option",{text:"Todos los clientes",attrs:{value:""}}));
tools.append(search,status,clientFilter,U.btn("Actualizar",()=>reload(),true));box.append(tools);
const notice=U.h("div");box.append(notice);
const count=U.h("p",{className:"op-muted",text:"Cargando pedidos…",attrs:{"aria-live":"polite"}});box.append(count);
const wrap=U.h("div",{className:"op-tablewrap"}),table=U.h("table",{className:"op-table"}),thead=U.h("thead"),tbody=U.h("tbody"),tr=U.h("tr");
["Número","Fecha","Cliente","Descripción","Estado","Entrega","Total USD","Acciones"].forEach(x=>tr.append(U.h("th",{text:x})));
thead.append(tr);table.append(thead,tbody);wrap.append(table);box.append(wrap);
const cards=U.h("div",{className:"op-cardlist"});box.append(cards);
const pager=U.h("div",{className:"op-pager"}),pageText=U.h("span",{className:"op-muted"}),buttons=U.h("div",{className:"op-actions"});
const previous=U.btn("← Anterior",()=>{state.page--;reload()},true),next=U.btn("Siguiente →",()=>{state.page++;reload()},true);
buttons.append(previous,next);pager.append(pageText,buttons);box.append(pager);
const notify=(text,success=false)=>U.notice(notice,text,success?"success":"error");
const statuses={pendiente:"Pendiente",en_proceso:"En proceso",listo:"Listo",entregado:"Entregado",anulado:"Anulado"};
const badge=code=>U.h("span",{className:"op-chip "+(code==="entregado"?"ok":code==="anulado"?"off":"warning"),text:statuses[code]||code});
const money=U.fmtMoney;
async function loadLookups(){
 const [a,b]=await Promise.all([
  api.rpc("padre_clientes_nombres_pedidos"),
  api.rpc("padre_responsables_seleccion")
 ]);
 if(a.error)notify("No fue posible obtener los clientes: "+a.error.message);else clients=a.data||[];
 if(b.error)notify("No fue posible obtener los responsables: "+b.error.message);else operators=b.data||[];
 clientFilter.replaceChildren(U.h("option",{text:"Todos los clientes",attrs:{value:""}}));
 clients.forEach(c=>clientFilter.append(U.h("option",{text:c.nombre,attrs:{value:c.id}})));
 if(state.clientId&&clients.some(c=>c.id===state.clientId))clientFilter.value=state.clientId;
 else state.clientId="";
}
const clientName=id=>clients.find(x=>x.id===id)?.nombre||"Cliente no disponible";
const operatorName=id=>operators.find(x=>x.id===id)?.nombre||"Sin responsable";
search.addEventListener("input",()=>{clearTimeout(window._padrePedidoTimer);window._padrePedidoTimer=setTimeout(()=>{state.search=search.value.trim();state.page=0;reload()},350)});
status.addEventListener("change",()=>{state.filter=status.value;state.page=0;reload()});
clientFilter.addEventListener("change",()=>{state.clientId=clientFilter.value;state.page=0;reload()});
async function reload(){
 const current=++state.request;notify("");count.textContent="Consultando pedidos…";
 let query=api.from("pedidos")
  .select("id,numero,cliente_id,descripcion,responsable_id,fecha,fecha_entrega,estado,total_usd,moneda_deuda,creado_en",{count:"exact"})
  .order("numero",{ascending:false})
  .range(state.page*state.size,state.page*state.size+state.size-1);
 if(state.filter!=="todos")query=query.eq("estado",state.filter);
 if(state.clientId)query=query.eq("cliente_id",state.clientId);
 const text=state.search;
 if(text){
  if(/^#?\d+$/.test(text))query=query.eq("numero",Number(text.replace("#","")));
  else query=query.ilike("descripcion","%"+text.replace(/[%_\\]/g,"")+"%");
 }
 const {data,error,count:total}=await query;
 if(current!==state.request)return;
 if(error){state.rows=[];state.total=0;render();notify("No se pudieron consultar los pedidos: "+error.message);return}
 state.rows=data||[];state.total=total??0;
 if(!state.rows.length&&state.page>0){state.page--;await reload();return}
 render();
}
function render(){
 tbody.replaceChildren();cards.replaceChildren();
 let start=state.total?state.page*state.size+1:0,end=Math.min(state.total,(state.page+1)*state.size);
 count.textContent=state.total+" pedidos encontrados";pageText.textContent=start+"–"+end+" de "+state.total;
 previous.disabled=state.page===0;next.disabled=end>=state.total;
 stats.replaceChildren();
 const blocks=[["Pedidos visibles",state.rows.length],["Pendientes",state.rows.filter(x=>x.estado==="pendiente").length],["En proceso",state.rows.filter(x=>x.estado==="en_proceso").length]];
 blocks.forEach(([title,val])=>{const b=U.h("div",{className:"op-stat"});b.append(U.h("strong",{text:val}),U.h("span",{text:title+" (página actual)"}));stats.append(b)});
 for(const row of state.rows){
  const tr=U.h("tr");
  for(const text of ["#"+row.numero,U.shortDate(row.fecha),clientName(row.cliente_id),row.descripcion]){
   tr.append(U.h("td",{text}));
  }
  const st=U.h("td");st.append(badge(row.estado));tr.append(st);
  tr.append(U.h("td",{text:U.shortDate(row.fecha_entrega)}),U.h("td",{text:money(row.total_usd)}));
  const td=U.h("td");td.append(U.btn("Ver ficha",()=>detail(row),true));tr.append(td);tbody.append(tr);
  const card=U.h("article",{className:"op-rowcard"}),top=U.h("div",{className:"row"});
  top.append(U.h("strong",{text:"#"+row.numero+" · "+clientName(row.cliente_id)}),badge(row.estado));card.append(top);
  card.append(U.h("h3",{text:row.descripcion}),U.h("p",{text:"Entrega: "+U.shortDate(row.fecha_entrega)+" · "+money(row.total_usd)}));
  card.append(U.btn("Ver ficha",()=>detail(row),true));cards.append(card);
 }
 if(!state.rows.length){cards.append(U.empty("No hay pedidos para esos filtros."));const tr=U.h("tr"),td=U.h("td",{text:"No hay resultados"});td.colSpan=8;tr.append(td);tbody.append(tr)}
}
function lineEditor(items=[]){
 const wrapper=U.h("div"),lines=U.h("div"),total=U.h("div",{className:"op-total",text:money(0)});
 wrapper.append(U.h("h3",{text:"Conceptos del pedido",className:"op-subheading"}),lines);
 const fields=[];
 function add(item={descripcion:"",cantidad:1,unidad:"unidad",precio_unitario_usd:0}){
  if(fields.length>=50)return;
  const row=U.h("div",{className:"op-line"}),grid=U.h("div",{className:"op-line-grid"});
  const desc=U.field("Descripción","desc"+fields.length,item.descripcion,"text",true);
  const qty=U.field("Cantidad","qty"+fields.length,item.cantidad,"number",true);
  const unit=U.field("Unidad","unit"+fields.length,item.unidad,"text",true);
  const price=U.field("Precio unitario USD","price"+fields.length,item.precio_unitario_usd,"number",true);
  const entry={row,desc:desc.input,qty:qty.input,unit:unit.input,price:price.input};
  for(const f of [desc,qty,unit,price]){grid.append(f.wrapper);f.input.addEventListener("input",compute)}
  const remove=U.btn("Quitar",()=>{row.remove();fields.splice(fields.indexOf(entry),1);compute()},true);grid.append(remove);row.append(grid);lines.append(row);fields.push(entry);compute();
 }
 const addButton=U.btn("＋ Añadir concepto",()=>add(),true);wrapper.append(addButton,total);
 function compute(){
  let sum=0;
  fields.forEach(f=>sum+=(Number(f.qty.value)||0)*(Number(f.price.value)||0));
  total.textContent="Total estimado: "+money(sum);
 }
 function values(){
  return fields.map(f=>({descripcion:f.desc.value.trim(),cantidad:f.qty.value,unidad:f.unit.value.trim()||"unidad",precio_unitario_usd:f.price.value}));
 }
 if(items.length)items.forEach(add);else add();
 return {wrapper,values};
}
async function edit(row=null){
 if(!can("pedidos_escribir"))return;
 if(!row&&!clients.length){notify("Primero registra un cliente activo en Padre.");return}
 const dialog=U.modal(row?"Editar pedido #"+row.numero:"Nuevo pedido");
 const form=U.h("form"),grid=U.h("div",{className:"op-form-grid"}),message=U.h("div"),fields={};
 const findClient=U.choose("Cliente","cliente_id",[
  ["","Seleccionar cliente"],...clients.map(c=>[c.id,c.nombre])
 ],row?.cliente_id||state.clientId);findClient.input.required=true;
 fields.cliente=findClient.input;grid.append(findClient.wrapper);
 const desc=U.field("Descripción general","descripcion",row?.descripcion||"","textarea",true);
 fields.description=desc.input;desc.wrapper.classList.add("wide");grid.append(desc.wrapper);
 const delivery=U.field("Fecha prevista de entrega","fecha_entrega",row?.fecha_entrega||"","date");
 fields.delivery=delivery.input;grid.append(delivery.wrapper);
 const ops=U.choose("Responsable","responsable_id",[["","Sin asignar"],...operators.map(o=>[o.id,o.nombre])],row?.responsable_id||"");
 fields.owner=ops.input;grid.append(ops.wrapper);
 let stateInput=null;
 if(row){const s=U.choose("Estado","estado",Object.entries(statuses),row.estado);stateInput=s.input;grid.append(s.wrapper)}
 form.append(grid);
 let line=null;
 if(!row){line=lineEditor();form.append(U.h("hr",{className:"op-separator"}),line.wrapper)}
 form.append(message);
 const submit=U.h("button",{className:"op-btn",text:row?"Guardar cambios":"Crear pedido",attrs:{type:"submit"}});
 dialog.footer.append(U.btn("Cancelar",dialog.close,true),submit);dialog.contents.append(form);
 form.addEventListener("submit",async event=>{
  event.preventDefault();submit.disabled=true;U.notice(message,"");
  const description=fields.description.value.trim();
  if(description.length<3||description.length>1200){U.notice(message,"La descripción debe tener entre 3 y 1200 caracteres.");submit.disabled=false;return}
  if(!row&&!fields.cliente.value){U.notice(message,"Selecciona un cliente.");submit.disabled=false;return}
  if(row&&fields.owner.value!==String(row.responsable_id||"")&&!can("pedidos_responsable_editar")){
   U.notice(message,"No tienes permiso para cambiar el responsable.");submit.disabled=false;return;
  }
  try{
   let result;
   if(row){
    result=await api.rpc("padre_actualizar_pedido",{
     p_pedido_id:row.id,p_descripcion:description,p_fecha_entrega:fields.delivery.value||null,
     p_estado:stateInput.value,p_responsable_id:fields.owner.value||null
    });
   }else{
    const lines=line.values();
    if(!lines.length||lines.some(x=>x.descripcion.length<2||!(Number(x.cantidad)>0)||Number(x.precio_unitario_usd)<0)){
     U.notice(message,"Revisa los conceptos, cantidades y precios.");submit.disabled=false;return;
    }
    result=await api.rpc("padre_crear_pedido",{
     p_cliente_id:fields.cliente.value,p_descripcion:description,
     p_fecha_entrega:fields.delivery.value||null,p_responsable_id:fields.owner.value||null,
     p_lineas:lines
    });
   }
   if(result.error)throw result.error;
   dialog.close();await reload();notify(row?"Pedido actualizado correctamente.":"Pedido creado con su total calculado.",true);
  }catch(err){U.notice(message,"No se pudo guardar: "+(err?.message||"Error desconocido"))}
  finally{submit.disabled=false}
 });
}
async function detail(row){
 const modal=U.modal("Ficha del pedido #"+row.numero),body=modal.contents;
 const grid=U.h("div",{className:"op-detail-grid"});
 const info=[
  ["Cliente",clientName(row.cliente_id)],["Descripción",row.descripcion],
  ["Fecha",U.shortDate(row.fecha)],["Entrega",U.shortDate(row.fecha_entrega)],
  ["Estado",statuses[row.estado]||row.estado],["Responsable",operatorName(row.responsable_id)],
  ["Total",money(row.total_usd)],["Moneda de deuda",row.moneda_deuda||"USD"]
 ];
 for(const [label,value]of info){const el=U.h("div");el.append(U.h("label",{text:label}),U.h("strong",{text:value}));grid.append(el)}
 body.append(grid);
 if(can("pedidos_escribir")&&row.estado!=="anulado"&&row.estado!=="entregado"){
  modal.footer.append(U.btn("Editar pedido",()=>{modal.close();edit(row)},true));
 }
 body.append(U.h("hr",{className:"op-separator"}),U.h("h3",{className:"op-subheading",text:"Conceptos y cantidades"}));
 const itemBox=U.h("div",{className:"op-loading",text:"Consultando conceptos…"});body.append(itemBox);
 const {data:lines,error:itemError}=await api.from("pedido_items")
  .select("id,descripcion,cantidad,unidad,precio_unitario_usd")
  .eq("pedido_id",row.id).order("descripcion",{ascending:true}).limit(50);
 itemBox.replaceChildren();
 if(itemError)itemBox.append(U.h("p",{className:"op-error",text:itemError.message}));
 else if(!lines?.length)itemBox.append(U.empty("No hay conceptos registrados."));
 else for(const item of lines){
  itemBox.append(U.h("div",{className:"op-line",text:item.descripcion+" · "+item.cantidad+" "+item.unidad+
    " × "+money(item.precio_unitario_usd)+" = "+money(item.cantidad*item.precio_unitario_usd)}));
 }
 if(can("pedidos_escribir")&&can("pedidos_cantidad_editar")&&lines?.length&&
   row.estado!=="entregado"&&row.estado!=="anulado"){
  modal.footer.append(U.btn("Modificar conceptos",()=>changeLines(row,lines,modal),true));
 }
 body.append(U.h("hr",{className:"op-separator"}),U.h("h3",{className:"op-subheading",text:"Historial de cambios"}));
 const history=U.h("div",{className:"op-loading",text:"Cargando historial…"});body.append(history);
 const {data:events,error:eventsError}=await api.from("pedido_eventos")
  .select("accion,creado_en,datos").eq("pedido_id",row.id).order("creado_en",{ascending:false}).limit(80);
 history.replaceChildren();
 if(eventsError)history.append(U.h("p",{className:"op-error",text:"No se pudo cargar el historial."}));
 else if(!events?.length)history.append(U.empty("Sin historial disponible."));
 else{
  const ul=U.h("ul",{className:"op-timeline"});
  events.forEach(event=>ul.append(U.h("li",{text:new Date(event.creado_en).toLocaleString("es-VE")+" · "+event.accion})));
  history.append(ul);
 }
}
function changeLines(row,lines,parent){
 const dialog=U.modal("Modificar conceptos · Pedido #"+row.numero);
 const form=U.h("form"),editor=lineEditor(lines),note=U.h("div");
 form.append(U.h("p",{className:"op-note",text:"El total se calculará en el servidor. Si el pedido tiene pagos activos, Padre bloqueará esta operación."}));
 form.append(editor.wrapper,note);dialog.contents.append(form);
 const submit=U.h("button",{className:"op-btn",text:"Guardar conceptos",attrs:{type:"submit"}});
 dialog.footer.append(U.btn("Cancelar",dialog.close,true),submit);
 form.addEventListener("submit",async e=>{
  e.preventDefault();submit.disabled=true;U.notice(note,"");
  try{
   const payload=editor.values();
   if(!payload.length||payload.some(x=>x.descripcion.length<2||!(Number(x.cantidad)>0)||Number(x.precio_unitario_usd)<0))throw new Error("Revisa la cantidad, precio y descripción de cada concepto.");
   const {error}=await api.rpc("padre_reemplazar_items_pedido",{p_pedido_id:row.id,p_lineas:payload});
   if(error)throw error;
   dialog.close();parent.close();await reload();notify("Conceptos actualizados y total recalculado.",true);
  }catch(err){U.notice(note,err.message||"No se pudieron guardar conceptos.")}
  finally{submit.disabled=false}
 });
}
await loadLookups();await reload();
})();