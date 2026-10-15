/* Comanda Padre · utilidades visuales seguras para Clientes y Pedidos */
"use strict";
window.PadreUI=(()=>{
 const h=(tag,options={})=>{
  const e=document.createElement(tag);
  if(options.className)e.className=options.className;
  if(options.text!==undefined)e.textContent=String(options.text);
  if(options.attrs)for(const [name,value] of Object.entries(options.attrs)){if(value!==null&&value!==undefined)e.setAttribute(name,String(value))}
  return e;
 };
 const btn=(label,callback,alt=false)=>{
  const e=h("button",{className:"op-btn"+(alt?" alt":""),text:label,attrs:{type:"button"}});
  if(callback)e.addEventListener("click",callback);return e;
 };
 const notice=(root,text,kind="error")=>{
  root.replaceChildren();
  if(!text)return;
  root.append(h("div",{className:"op-message "+(kind==="success"?"op-success":"op-error"),text,attrs:{role:kind==="success"?"status":"alert"}}));
 };
 const field=(label,name,value="",type="text",required=false)=>{
  const wrapper=h("div",{className:"op-field"});
  const lab=h("label",{text:label,attrs:{for:"op_"+name}});
  let input;
  if(type==="textarea")input=h("textarea",{className:"op-textarea"});
  else input=h("input",{className:"op-input",attrs:{type:type==="number"?"number":type,step:type==="number"?"0.0001":null,min:type==="number"?"0":null}});
  input.id="op_"+name;input.name=name;input.required=!!required;input.value=value??"";
  wrapper.append(lab,input);return {wrapper,input};
 };
 const choose=(label,name,entries,value="")=>{
  const wrapper=h("div",{className:"op-field"});
  const lab=h("label",{text:label,attrs:{for:"op_"+name}});
  const input=h("select",{className:"op-input",attrs:{id:"op_"+name,name}});
  for(const [id,title] of entries){
   const opt=h("option",{text:title,attrs:{value:id}});input.append(opt);
  }
  input.value=value??"";wrapper.append(lab,input);return {wrapper,input};
 };
 const modal=(title)=>{
  const screen=h("div",{className:"op-modal",attrs:{role:"dialog","aria-modal":"true","aria-label":title}});
  const dialog=h("section",{className:"op-dialog"});
  const top=h("div",{className:"op-dialog-head"}),heading=h("h2",{text:title}),x=btn("Cerrar",()=>close(),true);
  top.append(heading,x);
  const contents=h("div"),footer=h("div",{className:"op-dialog-footer"});
  dialog.append(top,contents,footer);screen.append(dialog);document.body.append(screen);
  const prev=document.activeElement;
  const close=()=>{screen.remove();document.removeEventListener("keydown",onKey);if(prev?.focus)prev.focus()};
  const onKey=e=>{if(e.key==="Escape")close()};
  document.addEventListener("keydown",onKey);
  screen.addEventListener("click",e=>{if(e.target===screen)close()});
  x.focus();
  return {screen,contents,footer,close};
 };
 const fmtMoney=value=>new Intl.NumberFormat("es-VE",{style:"currency",currency:"USD"}).format(Number(value)||0);
 const shortDate=value=>value?String(value).slice(0,10):"Sin fecha";
 const useAuth=async(permission)=>{
  const root=document.getElementById("moduleRoot");
  root.replaceChildren();
  if(!window.PadreAuth?.configured){
   const p=h("section",{className:"panel"});p.append(h("h2",{text:"Acceso pendiente de activación",className:"section-heading"}));
   p.append(h("p",{text:"El módulo ya está preparado en el Supabase independiente de Padre. Falta habilitar una cuenta de operador; no se mostrarán datos de Comanda.",className:"op-muted"}));
   const a=h("a",{text:"Ir al acceso de Padre",attrs:{href:"../login.html"},className:"op-muted-link"});p.append(a);root.append(p);
   return null;
  }
  let auth;
  try{auth=await window.PadreAuth.authorize()}catch(e){
   root.append(h("p",{text:"No fue posible verificar la sesión. Intenta iniciar sesión de nuevo.",className:"op-error"}));return null;
  }
  if(!auth)return null;
  if(!auth.can(permission)){
   const p=h("section",{className:"panel"});p.append(h("h2",{text:"Sin permiso para consultar esta sección",className:"section-heading"}));
   p.append(h("p",{className:"op-muted",text:"Solicita al administrador de Padre acceso a este módulo."}));root.append(p);return null;
  }
  const header=h("div",{className:"op-toolbar"});
  header.append(h("span",{className:"op-muted",text:"Operador: "+auth.op.nombre}));
  header.append(btn("Cerrar sesión",()=>window.PadreAuth.signOut(),true));
  root.append(header);
  return {...auth,root};
 };
 const summary=(text)=>{
  const box=h("section",{className:"op-note",text});return box;
 };
 const empty=(text)=>{
  const e=h("div",{className:"op-empty",text});return e;
 };
 return {h,btn,notice,field,choose,modal,fmtMoney,shortDate,useAuth,summary,empty};
})();