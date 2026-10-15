"use strict";
(async()=>{
 const form=document.getElementById("authForm");
 const error=document.getElementById("error");
 const enter=document.getElementById("enter");
 const select=document.getElementById("operator");
 const auth=window.PadreAuth;
 const fail=(message)=>{error.textContent=message;};
 if(!auth?.configured){
  select.replaceChildren(new Option("Pendiente de activar acceso", ""));
  fail(auth?.error||"El acceso independiente de Padre todavía no está configurado.");
  enter.disabled=true;
  return;
 }
 try{
  const current=await auth.currentOperator();
  if(current){location.replace("./index.html");return}
 }catch(e){console.warn("Padre: verificación de sesión pendiente");}
 try{
  // Listado público mínimo: solo alias y código, jamás claves o privilegios.
  const {data, error:fetchError}=await auth.api.from("login_operadores")
   .select("codigo,nombre_visible")
   .order("nombre_visible",{ascending:true});
  if(fetchError)throw fetchError;
  select.replaceChildren(new Option("Selecciona tu operador",""));
  for(const row of data||[]){
   if(typeof row.codigo!=="string"||typeof row.nombre_visible!=="string")continue;
   select.append(new Option(row.nombre_visible,row.codigo));
  }
  if(!data?.length){fail("No hay operadores habilitados en Padre.");enter.disabled=true}
 }catch(e){
  select.replaceChildren(new Option("No fue posible cargar operadores",""));
  fail("No fue posible cargar el listado de operadores. Comprueba tu conexión.");
  enter.disabled=true;
 }
 form.addEventListener("submit",async ev=>{
  ev.preventDefault();
  if(!select.value)return fail("Selecciona un operador.");
  enter.disabled=true;error.textContent="";
  try{
   const codigo=select.value;
   if(!/^op_[0-9a-f]{32}$/.test(codigo))throw new Error("Operador no válido");
   const password=document.getElementById("password").value;
   // No pedimos correo al empleado. Cada cuenta se vinculará internamente a
   // una identidad de Supabase Auth del entorno exclusivo de Padre.
   const email=codigo+"@login.padre.invalid";
   const {error:loginError}=await auth.api.auth.signInWithPassword({email,password});
   if(loginError){fail("Operador o contraseña incorrectos, o acceso aún sin activar.");return}
   const op=await auth.currentOperator();
   if(!op){await auth.api.auth.signOut({scope:"local"});fail("Esta cuenta aún no está habilitada como operador de Padre.");return}
   location.replace("./index.html");
  }catch(e){fail("No se pudo iniciar sesión. Revisa tu clave o contacta al administrador.")}
  finally{enter.disabled=false}
 });
})();