/* Padre · Cliente exclusivo de su Supabase de DESARROLLO.
  Falta configurar una clave PUBLICABLE en padre-config.js; nunca usar service_role.
  No admite la URL del Supabase de Comanda. */
"use strict";
(()=>{
const cfg=window.PadreConfig||{};
const expected="https://cuzswxryqvbguntjvhsa.supabase.co";
const base=()=>location.pathname.includes("/modulos/")?"../":"./";
const signinUrl=()=>base()+"login.html";
if(cfg.supabaseUrl!==expected||typeof cfg.publishableKey!=="string"||!cfg.publishableKey.startsWith("sb_publishable_")){
 window.PadreAuth={configured:false,base,signinUrl,
  error:"La clave pública de desarrollo de Padre aún no está configurada."};
 return;
}
if(!window.supabase?.createClient){
 window.PadreAuth={configured:false,base,signinUrl,error:"La biblioteca Supabase Auth no se cargó."};
 return;
}
const api=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"padre-dev-auth-v1"}
});
let cached=null,checked=0;
async function currentOperator(){
 const {data:{user},error}=await api.auth.getUser();
 if(error||!user){cached=null;return null}
 if(cached&&cached.auth_user_id===user.id&&Date.now()-checked<5000)return cached;
 const {data,error:dbError}=await api.from("operadores")
  .select("id,nombre,activo,auth_user_id")
  .eq("auth_user_id",user.id).eq("activo",true).maybeSingle();
 if(dbError)throw new Error("No fue posible verificar tu operador.");
 if(!data){cached=null;return null}
 cached=data;checked=Date.now();return data;
}
async function permissions(operator){
 const op=operator||await currentOperator();if(!op)return new Set();
 const {data,error}=await api.from("operadores_roles")
  .select("rol_id,roles(codigo,roles_permisos(permiso_codigo))")
  .eq("operador_id",op.id);
 if(error)throw new Error("No fue posible comprobar tus permisos.");
 const allowed=new Set();
 (data||[]).forEach(x=>(x.roles?.roles_permisos||[]).forEach(y=>allowed.add(y.permiso_codigo)));
 return allowed;
}
async function authorize(){
 const op=await currentOperator();
 if(!op){location.replace(signinUrl());return null}
 const granted=await permissions(op);
 return {op,api,granted,can:k=>granted.has(k)};
}
async function signOut(){
 await api.auth.signOut({scope:"local"});
 cached=null;location.replace(signinUrl());
}
window.PadreAuth={configured:true,api,base,signinUrl,currentOperator,permissions,authorize,signOut};
})();