"use strict";
(async()=>{
 const auth=window.PadreAuth;
 const form=document.getElementById("changeForm");
 const note=document.getElementById("message");
 const btn=document.getElementById("savePin");
 const name=document.getElementById("operatorName");
 const oldPin=document.getElementById("oldPin");
 const newPin=document.getElementById("newPin");
 const repeatPin=document.getElementById("repeatPin");
 const status=document.getElementById("pinStatus");
 const show=(msg,ok=false)=>{note.textContent=msg;note.className=ok?"message success":"message"};
 if(!auth?.configured){show(auth?.error||"El acceso de Padre no está configurado.");btn.disabled=true;return}
 try{
  const op=await auth.currentOperator();
  if(!op){location.replace("./login.html");return}
  name.textContent=op.nombre;
  const {data,error}=await auth.api.rpc("padre_mi_pin_estado");
  if(error||!data?.length)throw error||new Error("No se pudo consultar el estado");
  status.textContent=data[0].requiere_cambio?
    "Primer ingreso: debes cambiar el PIN provisional antes de utilizar los módulos.":
    "Puedes cambiar tu PIN personal. Al guardarlo, deberás iniciar sesión otra vez.";
 }catch(e){show("No fue posible verificar el acceso. Cierra la sesión e inténtalo nuevamente.");btn.disabled=true;return}
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  const previous=oldPin.value, next=newPin.value, repeat=repeatPin.value;
  if(!/^[0-9]{4,8}$/.test(previous)||!/^[0-9]{4,8}$/.test(next)){
    show("Introduce PIN de entre 4 y 8 números.");return
  }
  if(next!==repeat){show("La confirmación no coincide.");return}
  if(next===previous){
    show("El PIN nuevo debe ser distinto del actual.");return
  }
  btn.disabled=true;show("");
  try{
   const {data,error}=await auth.api.rpc("padre_cambiar_mi_pin",{p_anterior:previous,p_nuevo:next});
   if(error)throw error;
   if(data!==true){show("El PIN actual no coincide o el cambio está temporalmente bloqueado.");return}
   oldPin.value="";newPin.value="";repeatPin.value="";
   show("PIN personal actualizado. Cerrando sesión para que ingreses con tu nuevo código…",true);
   try{await auth.api.auth.signOut()}catch(e){console.warn("No fue posible cerrar la sesión remota.");}
   location.replace("./login.html?pin=actualizado");
  }catch(e){show("No fue posible cambiar el PIN: "+(e?.message||"Error inesperado"))}
  finally{oldPin.value="";newPin.value="";repeatPin.value="";btn.disabled=false}
 });
 document.getElementById("signout").addEventListener("click",()=>auth.signOut());
})();