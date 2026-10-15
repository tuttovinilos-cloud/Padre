"use strict";
(async()=>{
const form=document.getElementById("authForm"),error=document.getElementById("error"),enter=document.getElementById("enter");
const auth=window.PadreAuth;
if(!auth?.configured){error.textContent=auth?.error||"El acceso de Padre todavía no está configurado.";enter.disabled=true;return}
try{if(await auth.currentOperator()){location.replace("./index.html");return}}catch(e){console.warn("Error al comprobar sesión de Padre",e)}
form.addEventListener("submit",async ev=>{
ev.preventDefault();enter.disabled=true;error.textContent="";
try{
 const email=document.getElementById("email").value.trim();
 const password=document.getElementById("password").value;
 const attempt=await auth.api.auth.signInWithPassword({email,password});
 if(attempt.error){error.textContent="Datos incorrectos o cuenta sin confirmar.";return}
 const op=await auth.currentOperator();
 if(!op){await auth.api.auth.signOut({scope:"local"});error.textContent="El usuario todavía no es un operador activo y autorizado en Padre.";return}
 location.replace("./index.html");
}catch(e){error.textContent="No se pudo iniciar sesión. Verifica la conexión y tus permisos."}
finally{enter.disabled=false}
});
})();