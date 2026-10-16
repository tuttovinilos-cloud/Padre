/* Padre · núcleo Contabilidad v1. Histórico de Comanda sólo consulta, sin fingir deudas. */
"use strict";
(async()=>{
 const U=window.PadreUI;
 const ctx=await U.useAuth("dinero_leer");if(!ctx)return;
 const {api,can,root}=ctx;
 const state={resumen:null,abiertos:[],movimientos:[],busy:false,search:""};
 const box=U.h("section",{className:"panel"});root.append(box);
 const heading=U.h("div",{className:"row"});
 heading.append(U.h("h2",{className:"section-heading",text:"Núcleo central de Contabilidad"}));
 if(can("dinero_registrar"))heading.append(U.btn("＋ Registrar abono",()=>openPayment()));
 box.append(heading);
 box.append(U.summary("Contabilidad central de Padre · Solo se calculan deudas de pedidos nuevos y conciliados. Los pedidos importados de Comanda mantienen sus estados originales, pero sus pagos todavía NO están conciliados. No se debe cobrar en base a esos históricos."));
 const notice=U.h("div"),stats=U.h("div",{className:"op-stats"}),links=U.h("div",{className:"fn-links"});
 box.append(notice,stats,links);
 function section(title,description){
   const section=U.h("section",{className:"fn-section"});
   section.append(U.h("h3",{className:"op-subheading",text:title}));
   if(description)section.append(U.h("p",{className:"op-muted",text:description}));
   box.append(section);
   return section;
 }
 const pendingBox=section("Cuentas por cobrar · Solo Padre","Estos saldos se calculan exclusivamente para pedidos NUEVOS de Padre, en dólares y con importes verificados.");
 const pendingList=U.h("div"),pendingText=U.h("p",{className:"op-muted"});
 pendingBox.append(pendingText,pendingList);
 const movementsBox=section("Movimientos y anulaciones","Un pago anulado continúa visible para auditoría, pero ya no reduce el saldo del pedido.");
 const filters=U.h("div",{className:"op-toolbar"}),search=U.h("input",{className:"op-search",attrs:{type:"search",placeholder:"Filtrar cliente, método o referencia…","aria-label":"Buscar movimientos"}}),refresh=U.btn("Actualizar",()=>load(),true);
 filters.append(search,refresh);movementsBox.append(filters);
 const movements=U.h("div");movementsBox.append(movements);
 const historical=section("Pendiente: conciliación de históricos","Los importes originales de Comanda no se incorporan a las deudas de Padre hasta verificar pagos, tasas BCV/DIVISA y saldos a favor.");
 historical.append(U.summary("Se conserva la información histórica por cliente y pedido. No se han transferido movimientos bancarios ni pagos originales; tampoco hay conversión automática de bolívares a dólares."));
 const note=(message,success=false)=>U.notice(notice,message,success?"success":"error");
 const money=U.fmtMoney;
 const quantity=n=>new Intl.NumberFormat("es-VE").format(Number(n)||0);
 const summaryCard=(label,n,small)=>{
  const item=U.h("div",{className:"op-stat"});item.append(U.h("strong",{text:String(n)}),U.h("span",{text:label}));
  if(small)item.append(U.h("div",{className:"op-muted",text:small}));return item;
 };
 function renderSummary(){
  stats.replaceChildren();
  const r=state.resumen||{};
  const due=state.abiertos.reduce((sum,x)=>sum+Number(x.saldo_usd||0),0);
  for(const [label,n,small] of [
   ["Pendiente USD · Pedidos Padre",money(due),"Solo pedidos nuevos, saldo verificado"],
   ["Cobros vigentes",money(r.cobros_usd),"Pagos registrados en Padre"],
   ["Pedidos históricos",quantity(r.pedidos_historicos),"No conciliados: "+quantity(r.historicos_sin_conciliar)],
   ["Pagos anulados",quantity(r.cobros_anulados),"Se conservan para auditoría"],
   ["Compras registradas",quantity(r.compras_registradas),"Consulta: Compras"],
   ["Pedidos nuevos",quantity(r.nuevos_pedidos),"Total nominal "+money(r.nuevos_pedidos_usd)]
  ])stats.append(summaryCard(label,n,small));
  links.replaceChildren();
  const link=(title,href)=>{const a=U.h("a",{className:"fn-link",text:title,attrs:{href}});links.append(a)};
  link("Clientes","./clientes.html");
  link("Pedidos","./pedidos.html");
  link("Compras","./compras.html");
  link("Conciliación histórica","./conciliacion.html");
 }
 const makeTable=(headings)=>{
  const table=U.h("table",{className:"op-table"}),th=U.h("thead"),tr=U.h("tr"),tbody=U.h("tbody");
  headings.forEach(h=>tr.append(U.h("th",{text:h})));
  th.append(tr);table.append(th,tbody);
  const shell=U.h("div",{className:"op-tablewrap"});shell.append(table);
  return {shell,tbody};
 };
 function renderPending(){
  pendingList.replaceChildren();
  const rows=state.abiertos;
  pendingText.textContent=rows.length+" pedido(s) con saldo pendiente en Padre · Hasta 500, ordenados por número";
  if(!rows.length){pendingList.append(U.empty("No hay cuentas por cobrar en pedidos nuevos de Padre."));return}
  const {shell,tbody}=makeTable(["Pedido","Cliente","Descripción","Total","Abonado","Saldo","Acción"]);
  for(const row of rows){
   const tr=U.h("tr");
   for(const value of ["#"+row.numero,row.cliente,row.descripcion,money(row.total_usd),money(row.abonado_usd),money(row.saldo_usd)])tr.append(U.h("td",{text:value}));
   const td=U.h("td");
   if(can("dinero_registrar"))td.append(U.btn("Registrar abono",()=>openPayment(row),true));
   tr.append(td);tbody.append(tr);
  }
  pendingList.append(shell);
  const list=U.h("div",{className:"op-cardlist"});
  for(const p of rows){
   const item=U.h("article",{className:"op-rowcard"});
   item.append(U.h("strong",{text:"#"+p.numero+" · "+p.cliente}),U.h("p",{text:p.descripcion}),U.h("p",{text:"Saldo "+money(p.saldo_usd)+" de "+money(p.total_usd)}));
   if(can("dinero_registrar"))item.append(U.btn("Registrar abono",()=>openPayment(p),true));
   list.append(item);
  }
  pendingList.append(list);
 }
 function renderMovements(){
  movements.replaceChildren();
  const query=state.search.toLocaleLowerCase().trim();
  const all=state.movimientos.filter(x=>[x.cliente,x.metodo,x.referencia,x.pedido_numero].some(v=>String(v??"").toLocaleLowerCase().includes(query)));
  if(!all.length){movements.append(U.empty("No hay movimientos con ese filtro."));return}
  const {shell,tbody}=makeTable(["Fecha","Cliente / Pedido","Monto recibido","Equivalente USD","Método","Estado","Acciones"]);
  const cards=U.h("div",{className:"op-cardlist"});
  for(const row of all){
   const p=U.h("tr");
   const amount=(row.moneda==="VES"?"Bs. ":"US$ ")+new Intl.NumberFormat("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(row.monto_recibido));
   const vals=[U.shortDate(row.fecha),row.cliente+(row.pedido_numero?" · #"+row.pedido_numero:""),amount,money(row.monto_usd),row.metodo,row.estado];
   vals.forEach(v=>p.append(U.h("td",{text:v})));
   const td=U.h("td");if(can("dinero_anular")&&row.estado==="registrado")td.append(U.btn("Anular",()=>annul(row),true));
   p.append(td);tbody.append(p);
   const item=U.h("article",{className:"op-rowcard"});item.append(U.h("strong",{text:row.cliente+" · Pedido #"+(row.pedido_numero??"—")}),
    U.h("p",{text:U.shortDate(row.fecha)+" · "+amount+" / "+money(row.monto_usd)}),
    U.h("p",{text:row.metodo+" · "+row.estado}));
   if(row.estado==="anulado"&&row.motivo_anulacion)item.append(U.h("p",{text:"Motivo: "+row.motivo_anulacion}));
   if(can("dinero_anular")&&row.estado==="registrado")item.append(U.btn("Anular pago",()=>annul(row),true));
   cards.append(item);
  }
  movements.append(shell,cards);
 }
 async function load(){
  if(state.busy)return;
  state.busy=true;refresh.disabled=true;note("");
  try{
   const [a,b,c]=await Promise.all([
    api.rpc("padre_finanzas_resumen"),
    api.rpc("padre_finanzas_pedidos_abiertos"),
    api.rpc("padre_finanzas_movimientos")
   ]);
   if(a.error||b.error||c.error)throw a.error||b.error||c.error;
   if(!a.data||!Array.isArray(b.data)||!Array.isArray(c.data))throw new Error("Datos financieros incompletos o sin autorización");
   state.resumen=a.data;state.abiertos=b.data;state.movimientos=c.data;
   renderSummary();renderPending();renderMovements();
  }catch(e){note("No se pudo consultar Contabilidad: "+(e.message||"Intenta más tarde"))}
  finally{state.busy=false;refresh.disabled=false}
 }
 function openPayment(initial=null){
  if(!can("dinero_registrar"))return;
  if(!state.abiertos.length){note("No hay pedidos nuevos con saldo para registrar abonos.");return}
  const modal=U.modal("Registrar abono · Padre"),form=U.h("form"),noteDiv=U.h("div"),grid=U.h("div",{className:"op-form-grid"});
  const select=U.choose("Pedido nuevo de Padre","fn_pedido",[
   ["","Selecciona el pedido"],...state.abiertos.map(x=>[x.id,"#"+x.numero+" · "+x.cliente+" · saldo "+money(x.saldo_usd)])
  ],initial?.id||"");
  select.input.required=true;
  const dt=new Date();const dateText=dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0");
  const fecha=U.field("Fecha del pago","fn_fecha",dateText,"date",true);
  const currency=U.choose("Moneda recibida","fn_moneda",[["USD","USD · divisas"],["VES","VES · bolívares"]],"USD");
  const amount=U.field("Monto recibido","fn_monto","","number",true);amount.input.step="0.01";amount.input.min="0.01";
  const kind=U.choose("Tipo de tasa","fn_tipo",[["","No aplica"],["BCV","BCV"],["DIVISA","Divisa"]],"");
  const rate=U.field("Tasa Bs por USD","fn_tasa","","number");
  rate.input.step="0.000001";rate.input.min="0.000001";
  const method=U.choose("Método","fn_metodo",[
   ["Zelle","Zelle"],["Transferencia","Transferencia"],["Pago móvil","Pago móvil"],["Efectivo","Efectivo"],["Punto de venta","Punto de venta"],["Otro","Otro"]
  ],"Zelle");
  const reference=U.field("Referencia (opcional)","fn_ref","");
  const comments=U.field("Nota (opcional)","fn_nota","","textarea");
  const fields=[select,fecha,currency,amount,kind,rate,method,reference,comments];
  fields.forEach(f=>grid.append(f.wrapper));
  comments.wrapper.classList.add("wide");
  const estimate=U.h("div",{className:"op-note"});
  const compute=()=>{
    const converted=Number(amount.input.value),exchange=Number(rate.input.value);
    const value=currency.input.value==="USD"?converted:exchange>0?converted/exchange:0;
    estimate.textContent="Equivalente estimado: "+money(value)+". La conversión final y la comprobación del saldo se realizan en el servidor.";
    kind.input.disabled=currency.input.value==="USD";
    rate.input.disabled=currency.input.value==="USD";
  };
  [currency.input,amount.input,rate.input].forEach(e=>e.addEventListener("input",compute));
  currency.input.addEventListener("change",()=>{if(currency.input.value==="USD"){kind.input.value="";rate.input.value=""}compute()});
  form.append(grid,estimate,noteDiv);modal.contents.append(form);compute();
  const save=U.h("button",{text:"Registrar abono",className:"op-btn",attrs:{type:"submit"}});
  modal.footer.append(U.btn("Cancelar",modal.close,true),save);
  save.addEventListener("click",()=>form.requestSubmit());
  const operationId=crypto.randomUUID();
  form.addEventListener("submit",async event=>{
   event.preventDefault();save.disabled=true;U.notice(noteDiv,"");
   try{
    const wanted=state.abiertos.find(x=>x.id===select.input.value);
    if(!wanted)throw new Error("Selecciona un pedido nuevo y válido.");
    const usd=currency.input.value==="USD"?Number(amount.input.value):Number(amount.input.value)/Number(rate.input.value);
    if(!Number.isFinite(usd)||usd<=0)throw new Error("Indica un monto y una tasa positivos.");
    if(usd>wanted.saldo_usd+0.004)throw new Error("El abono no puede superar el saldo del pedido.");
    if(currency.input.value==="VES"&&!kind.input.value)throw new Error("Selecciona la tasa BCV o Divisa.");
    const {error}=await api.rpc("padre_finanzas_registrar",{
     p_pedido_id:wanted.id,p_operacion_id:operationId,p_fecha:fecha.input.value,
     p_moneda:currency.input.value,p_monto:Number(amount.input.value),
     p_tipo_tasa:currency.input.value==="USD"?null:kind.input.value,
     p_tasa:currency.input.value==="USD"?null:Number(rate.input.value),
     p_metodo:method.input.value,p_referencia:reference.input.value.trim(),
     p_nota:comments.input.value.trim()
    });
    if(error)throw error;
    modal.close();await load();note("Abono registrado correctamente con historial.",true);
   }catch(e){U.notice(noteDiv,"No se pudo registrar: "+(e.message||"Error desconocido"))}
   finally{save.disabled=false}
  });
 }
 function annul(row){
  if(!can("dinero_anular")||row.estado!=="registrado")return;
  const modal=U.modal("Anular pago · "+row.cliente),noteDiv=U.h("div"),form=U.h("form");
  form.append(U.summary("La anulación no borra el pago: conserva los datos y libera el saldo de su pedido. Esta operación requiere permiso especial y quedará auditada."));
  const motive=U.field("Motivo obligatorio (mínimo 10 caracteres)","fn_motivo","","textarea",true);
  motive.input.minLength=10;form.append(motive.wrapper,noteDiv);modal.contents.append(form);
  const confirmButton=U.h("button",{className:"op-btn warn",text:"Confirmar anulación",attrs:{type:"submit"}});
  confirmButton.addEventListener("click",()=>form.requestSubmit());
  modal.footer.append(U.btn("Cancelar",modal.close,true),confirmButton);
  form.addEventListener("submit",async event=>{
   event.preventDefault();
   if(motive.input.value.trim().length<10){U.notice(noteDiv,"El motivo debe tener al menos 10 caracteres.");return}
   confirmButton.disabled=true;
   try{
    const {error}=await api.rpc("padre_finanzas_anular",{p_pago_id:row.id,p_motivo:motive.input.value.trim()});
    if(error)throw error;
    modal.close();await load();note("Pago anulado y registrado en el historial.",true);
   }catch(e){U.notice(noteDiv,"No se pudo anular: "+(e.message||"Error desconocido"))}
   finally{confirmButton.disabled=false}
  });
 }
 search.addEventListener("input",()=>{state.search=search.value;renderMovements()});
 await load();
})();