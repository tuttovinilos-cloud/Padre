/* Padre · barra de sesión del menú principal. Solo utiliza Supabase Padre. */
"use strict";
(async()=>{
 const auth=window.PadreAuth;
 const access=document.getElementById("accessBtn");
 const logout=document.getElementById("logoutBtn");
 const name=document.getElementById("sessionName");
 if(!access||!logout||!name)return;
 const showAccess=()=>{
  access.hidden=false;logout.hidden=true;name.hidden=true;name.textContent="";
 };
 const showOperator=(operator)=>{
  access.hidden=true;logout.hidden=false;
  name.textContent="Operador: "+operator.nombre;name.hidden=false;
 };
 showAccess();
 if(!auth?.configured)return;
 try{
  const operator=await auth.currentOperator();
  if(operator)showOperator(operator);
 }catch(e){
  console.warn("Padre: no se pudo comprobar la sesión para el encabezado");
  showAccess();
 }
 logout.addEventListener("click",async()=>{
  if(logout.disabled)return;
  logout.disabled=true;logout.textContent="Saliendo…";
  try{
   await auth.signOut();
  }catch(e){
   logout.disabled=false;logout.textContent="Salir";
   console.warn("Padre: no fue posible cerrar la sesión.");
   window.alert("No se pudo cerrar la sesión. Inténtalo de nuevo.");
  }
 });
})();