/* Padre · Conciliación histórica documental: NO asienta pagos ni altera saldos */
"use strict";
(async()=>{
 const U=window.PadreUI;
 const ctx=await U.useAuth("dinero_leer");if(!ctx)return;
 const {api,can,root}=ctx;
 const isManager=can("seguridad_gestionar");
 const state={page:0,status:"todos",search:"",rows:[],total:0,resumen:null,fuentes:null,loading:false,request:0};
 const labels={sin_revisar:"Sin revisar",en_revision:"En revisión",requiere_soporte:"Requiere soporte",documentacion_recibida:"Documentación recibida"};
 const fmtNum=x=>new Intl.NumberFormat("es-VE").format(Number(x)||0);
 const historicMoney=(value,moneda)=>{
  if(value===null||value===undefined)return "Sin importe original";
  const n=Number(value);
  if(!Number.isFinite(n))return "Importe no verificable";
  const amount=new Intl.NumberFormat("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  return (moneda==="BS"||moneda==="VES"?"Bs. ":moneda==="USD"?"US$ ":"")+amount;
 };
 const section=U.h("section",{className:"panel"});root.append(section);
 const head=U.h("div",{className:"row"});
 head.append(U.h("h2",{className:"section-heading",text:"Conciliación histórica · revisión"}));
 const back=U.h("a",{className:"op-muted-link",text:"← Volver a Contabilidad",attrs:{href:"./dinero.html"}});
 head.append(back);section.append(head);
 section.append(U.summary("Solo revisión documental de pedidos importados. Ni guardar notas ni recibir soporte significa que un pedido esté pagado o conciliado. Los pagos de Comanda no se copian al libro de cobros de Padre y no se recalculan deudas."));
 const message=U.h("div"),summary=U.h("div",{className:"op-stats"});
 section.append(message,summary);
 const sources=U.h("div",{className:"op-note"});
 section.append(sources);
 const filters=U.h("div",{className:"op-toolbar"});
 const search=U.h("input",{className:"op-search",attrs:{type:"search","aria-label":"Buscar pedido histórico",placeholder:"Número, nombre del cliente o descripción…"}});
 const status=U.h("select",{className:"op-select",attrs:{"aria-label":"Filtrar revisión"}});
 [["todos","Todos"],...Object.entries(labels)].forEach(([value,text])=>status.append(U.h("option",{text,attrs:{value}})));
 const refresh=U.btn("Actualizar",()=>load(),true);
 filters.append(search,status,refresh);
 section.append(U.h("h3",{className:"op-subheading",text:"Pedidos históricos"}),filters);
 const counter=U.h("p",{className:"op-muted",text:"Cargando pedidos…",attrs:{"aria-live":"polite"}});
 const tableArea=U.h("div"),cards=U.h("div",{className:"op-cardlist"}),pagination=U.h("div",{className:"op-pager"});
 const pageCaption=U.h("span",{className:"op-muted"});
 const actions=U.h("div",{className:"op-actions"});
 const prev=U.btn("← Anterior",()=>{state.page--;load()},true);
 const next=U.btn("Siguiente →",()=>{state.page++;load()},true);
 actions.append(prev,next);pagination.append(pageCaption,actions);
 section.append(counter,tableArea,cards,pagination);
 const alert=(text,ok=false)=>U.notice(message,text,ok?"success":"error");
 function renderStats(){
  summary.replaceChildren();
  if(!state.resumen)return;
  const r=state.resumen;
  const items=[
   ["Pedidos históricos",r.total_historicos],
   ["Sin revisar",r.sin_revisar],
   ["Requieren soporte",r.requiere_soporte],
   ["No conciliados",r.no_conciliados],
   ["Sin cliente vinculado",r.sin_cliente],
   ["Documentación recibida",r.documentacion_recibida]
  ];
  for(const [label,val] of items){
   const b=U.h("div",{className:"op-stat"});
   b.append(U.h("strong",{text:fmtNum(val)}),U.h("span",{text:label}));
   summary.append(b);
  }
  const f=state.fuentes||{};
  const count=Number(f.total_fuentes)||0;
  const referenceCount=Number(f.total_origen_referencias)||0;
  const missing=Number(f.pendientes_copia)||0;
  const complete=f.copia_completa===true;
  sources.replaceChildren();
  sources.append(U.h("strong",{text:complete
   ?"Copia documental completada por cantidad · falta conciliar"
   :"Copia documental INCOMPLETA · prohibido calcular saldos"}));
  if(referenceCount){
   sources.append(U.h("p",{text:fmtNum(count)+" de "+fmtNum(referenceCount)+
    " registros de referencia copiados · pendientes: "+fmtNum(missing)+
    ". No son "+fmtNum(referenceCount)+" transacciones únicas: algunas fuentes documentan el mismo cobro."}));
  }else{
   sources.append(U.h("p",{text:"Todavía no se pudo comprobar la cantidad de los registros originales."}));
  }
  const sourceNames={
   pedidos_pagos:"Pagos asociados a pedidos",
   clientes_pagos:"Pagos registrados por cliente",
   prod_pedidos_pagos:"Pagos de producción",
   contabilidad_pagos:"Pagos de contabilidad"
  };
  if(Array.isArray(f.detalle_fuentes)){
   const perSource=U.h("ul",{className:"op-timeline"});
   for(const item of f.detalle_fuentes){
    const label=sourceNames[item.fuente]||item.fuente;
    perSource.append(U.h("li",{text:label+": "+fmtNum(item.copiados)+
     " / "+fmtNum(item.total_origen)+" registros; "+
     fmtNum(item.anulados_copiados)+" / "+fmtNum(item.anulados_origen)+" anulados documentados."}));
   }
   sources.append(perSource);
  }
  sources.append(U.h("p",{text:"Pedidos distintos con referencias copiadas: "+
   fmtNum(f.pedidos_distintos_referenciados)+
   ". Referencias a pedidos inexistentes en Padre: "+
   fmtNum(f.pedidos_referenciados_no_encontrados)+
   ". Registros sin fecha original: "+fmtNum(f.referencias_sin_fecha)+"."}));
  sources.append(U.h("p",{text:"La copia es puntual, no se sincroniza automáticamente con Comanda. "+
   "Las referencias pueden estar duplicadas o anuladas. Ni una copia completa por cantidad "+
   "ni un estado original «Pagado» validan una deuda o un ingreso. Los saldos históricos siguen sin conciliar."}));
 }
 function render(){
  tableArea.replaceChildren();cards.replaceChildren();
  const rangeStart=state.total?state.page*30+1:0;
  const rangeEnd=Math.min(state.total,(state.page+1)*30);
  counter.textContent=fmtNum(state.total)+" pedidos encontrados";
  pageCaption.textContent=rangeStart+"–"+rangeEnd+" de "+fmtNum(state.total);
  prev.disabled=state.page===0;next.disabled=rangeEnd>=state.total;
  const table=U.h("table",{className:"op-table"}),th=U.h("thead"),tr=U.h("tr"),body=U.h("tbody");
  for(const heading of ["# origen","Cliente","Descripción","Importe original","Pago original","Revisión","Acciones"])tr.append(U.h("th",{text:heading}));
  th.append(tr);table.append(th,body);
  const wrap=U.h("div",{className:"op-tablewrap"});wrap.append(table);tableArea.append(wrap);
  for(const item of state.rows){
   const row=U.h("tr");
   const cells=["#"+item.numero_origen,item.cliente,item.descripcion,
     historicMoney(item.precio_original,item.moneda_original),item.estado_pago_original||"No indicado",
     labels[item.estado_revision]||"Sin revisar"];
   for(const value of cells)row.append(U.h("td",{text:value}));
   const td=U.h("td");td.append(U.btn("Revisar",()=>detail(item),true));row.append(td);body.append(row);
   const card=U.h("article",{className:"op-rowcard"});
   card.append(U.h("strong",{text:"#"+item.numero_origen+" · "+item.cliente}),
     U.h("p",{text:item.descripcion}),
     U.h("p",{text:historicMoney(item.precio_original,item.moneda_original)+" · "+(item.estado_pago_original||"Pago no indicado")}),
     U.h("p",{text:"Revisión: "+(labels[item.estado_revision]||"Sin revisar")}));
   card.append(U.btn("Revisar",()=>detail(item),true));cards.append(card);
  }
  if(!state.rows.length){cards.append(U.empty("No hay pedidos con esos criterios."));
   const r=U.h("tr"),cell=U.h("td",{text:"No se encontraron pedidos"});cell.colSpan=7;r.append(cell);body.append(r)}
 }
 async function load(){
  if(state.loading)return;
  const id=++state.request;state.loading=true;refresh.disabled=true;alert("");
  try{
   const [a,b,c]=await Promise.all([
    api.rpc("padre_conciliacion_resumen"),
    api.rpc("padre_conciliacion_listar",{p_pagina:state.page,p_estado:state.status,p_busqueda:state.search}),
    api.rpc("padre_conciliacion_fuentes_resumen")
   ]);
   if(a.error||b.error||c.error)throw a.error||b.error||c.error;
   if(!a.data||!Array.isArray(b.data)||!c.data)throw new Error("No se recibió la revisión completa");
   if(id!==state.request)return;
   state.resumen=a.data;state.rows=b.data;state.fuentes=c.data;
   state.total=Number(b.data[0]?.total_encontrados)||0;
   if(!state.rows.length&&state.page>0){state.page--;state.loading=false;await load();return}
   renderStats();render();
  }catch(e){alert("No fue posible cargar la revisión: "+(e.message||"Error desconocido"))}
  finally{state.loading=false;refresh.disabled=false}
 }
 async function detail(item){
  const dialog=U.modal("Pedido histórico #"+item.numero_origen);
  const content=dialog.contents;
  const facts=U.h("div",{className:"op-detail-grid"});
  const details=[["Cliente",item.cliente],["Fecha del pedido",U.shortDate(item.fecha_pedido)],
   ["Descripción",item.descripcion],["Moneda y precio originales",historicMoney(item.precio_original,item.moneda_original)],
   ["Estado de pago en Comanda",item.estado_pago_original||"No indicado"],
   ["Estado de revisión",labels[item.estado_revision]||"Sin revisar"]];
  for(const [key,value] of details){
   const b=U.h("div");b.append(U.h("label",{text:key}),U.h("strong",{text:value}));facts.append(b);
  }
  content.append(facts,U.summary("Información histórica: los comprobantes se muestran como referencias, incluidos los que puedan estar anulados. La copia es parcial y no se suman abonos ni se cambian deudas o pagos."));
  const evidence=U.h("section"),history=U.h("section");
  content.append(U.h("hr",{className:"op-separator"}),evidence,U.h("hr",{className:"op-separator"}),history);
  evidence.append(U.h("h3",{className:"op-subheading",text:"Comprobantes asociados · referencia"}));
  history.append(U.h("h3",{className:"op-subheading",text:"Historial de revisión"}));
  const [sources,eventList]=await Promise.all([
   api.rpc("padre_conciliacion_evidencias",{p_pedido_id:item.pedido_id}),
   api.from("conciliacion_eventos").select("estado_anterior,estado_nuevo,observaciones,creado_en").eq("pedido_id",item.pedido_id).order("creado_en",{ascending:false}).limit(25)
  ]);
  if(sources.error)evidence.append(U.h("p",{className:"op-muted",text:"No se pudieron consultar las referencias."}));
  else if(!sources.data?.length)evidence.append(U.h("p",{className:"op-muted",text:"Este pedido no tiene comprobantes en la copia documental PARCIAL de Padre. Eso NO demuestra que no tenga pagos en Comanda."}));
  else for(const p of sources.data){
   const line=U.h("article",{className:"op-contact"});
   const received=historicMoney(p.monto_recibido,p.moneda);
   line.append(U.h("strong",{text:"Pago de origen #"+p.registro_origen_id+" · "+(p.estado_original||"Estado no indicado")}),
    U.h("p",{className:"op-muted",text:U.shortDate(p.fecha)+" · "+received+" · "+(p.metodo||"Método no indicado")}));
   evidence.append(line);
  }
  if(eventList.error)history.append(U.h("p",{className:"op-muted",text:"Historial no disponible."}));
  else if(!eventList.data?.length)history.append(U.h("p",{className:"op-muted",text:"Sin revisiones anteriores."}));
  else{
   const l=U.h("ul",{className:"op-timeline"});
   for(const e of eventList.data)l.append(U.h("li",{text:new Date(e.creado_en).toLocaleString("es-VE")+" · "+(labels[e.estado_nuevo]||e.estado_nuevo)+(e.observaciones?" · "+e.observaciones:"")}));
   history.append(l);
  }
  if(!isManager)return;
  const edit=U.h("form"),stateField=U.choose("Estado de revisión documental","revision_estado",[
    ["en_revision","En revisión"],["requiere_soporte","Requiere soporte"],["documentacion_recibida","Documentación recibida"]
  ],item.estado_revision==="sin_revisar"?"en_revision":item.estado_revision);
  const note=U.field("Observaciones de revisión (sin datos bancarios sensibles)","revision_nota",item.observaciones||"","textarea");
  note.input.maxLength=1000;
  const warn=U.h("div");
  edit.append(U.h("hr",{className:"op-separator"}),U.h("h3",{className:"op-subheading",text:"Documentar revisión (administrador)"}),
   stateField.wrapper,note.wrapper,warn);
  content.append(edit);
  const save=U.h("button",{className:"op-btn",text:"Guardar revisión",attrs:{type:"submit"}});
  save.addEventListener("click",()=>edit.requestSubmit());
  dialog.footer.append(save);
  edit.addEventListener("submit",async e=>{
   e.preventDefault();save.disabled=true;U.notice(warn,"");
   try{
    const {error}=await api.rpc("padre_conciliacion_guardar_revision",{
     p_pedido_id:item.pedido_id,p_estado:stateField.input.value,p_observaciones:note.input.value.trim()
    });
    if(error)throw error;
    dialog.close();await load();alert("Revisión documental registrada; no se modificaron importes ni deudas.",true);
   }catch(err){U.notice(warn,"No se pudo guardar la revisión: "+(err.message||"Error"))}
   finally{save.disabled=false}
  });
 }
 let searchTimer=null;
 search.addEventListener("input",()=>{
   clearTimeout(searchTimer);
   searchTimer=setTimeout(()=>{state.search=search.value.trim();state.page=0;load()},350);
 });
 status.addEventListener("change",()=>{state.status=status.value;state.page=0;load()});
 await load();
})();