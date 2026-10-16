// Pruebas estáticas de Padre (Node 20+), no requiere acceso a Supabase.
import {readFileSync,readdirSync,existsSync,statSync} from "node:fs";
import {resolve,join,dirname,extname,relative,sep} from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const docs=join(root,"docs");
const load=p=>readFileSync(p,"utf8");
const files=[];
function walk(dir){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,item.name);
  if(item.isDirectory())walk(p);
  else if(item.isFile())files.push(p);
 }
}
walk(docs);
const errors=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};
const modules=["seguridad","clientes","dinero","pedidos","materiales","cotizaciones",
"produccion","compras","precios","comunicacion","estadisticas","configuracion","marketing"];
modules.forEach(module=>check(existsSync(join(docs,"modulos",module+".html")),"Falta módulo "+module));
for(const path of files){
 const ext=extname(path).toLowerCase();
 const content=[".html",".js",".css",".webmanifest"].includes(ext)?load(path):"";
 if(!content)continue;
 // No deben quedar en la página endpoints ni identificadores de la base productiva.
 check(!content.includes("ujfdsabypflseijatxba"),"Referencia de Supabase Comanda en "+relative(root,path));
 if(ext===".js"){
  try{new Function(content)}catch(e){errors.push("JavaScript inválido "+relative(root,path)+": "+e.message)}
 }
 if(ext===".html"){
  const attrs=/\b(?:src|href)=["']([^"']+)["']/gi;
  for(const m of content.matchAll(attrs)){
   const url=m[1].trim();
   if(!url||/^(?:#|https?:|data:|blob:|mailto:|tel:|javascript:|\/\/)/i.test(url))continue;
   const resource=url.split(/[?#]/,1)[0];
   if(!resource)continue;
   const location=resolve(dirname(path),decodeURIComponent(resource));
   check(location.startsWith(root+sep),"Enlace fuera del repositorio "+url);
   if(!location.startsWith(root+sep))continue;
   const target=existsSync(location)&&statSync(location).isDirectory()?join(location,"index.html"):location;
   check(existsSync(target),"Recurso inexistente "+relative(root,path)+" -> "+url);
  }
 }
}
const sw=load(join(docs,"sw.js"));
const precache=sw.match(/const ASSETS=(\[[\s\S]*?\])\.map\(x=>new URL\(x,SCOPE\)\.href\)/);
check(!!precache,"SW: no se reconoció la lista de recursos estáticos");
if(precache){
 const assets=JSON.parse(precache[1]);
 for(const asset of assets)check(existsSync(resolve(docs,asset)),"SW: recurso inexistente "+asset);
 check(assets.every(x=>!x.includes("/auth/")&&!x.includes("supabase.co")),"SW: posible recurso privado");
}
const home=load(join(docs,"index.html"));
for(const mod of modules)check(home.includes('"'+mod+'"'),"Menú: falta enlace de "+mod);
const login=load(join(docs,"login.js"));
check(login.includes('functions.invoke("padre-pin-login"'),"Login: no utiliza PIN seguro de Padre");
check(!login.includes("signInWithPassword"),"Login: persiste acceso directo con PIN");
const pedidos=load(join(docs,"modulos","pedidos.js"));
check(pedidos.includes("origen_comanda_id"),"Pedidos: no distingue histórico");
check(pedidos.includes("precio_total_origen"),"Pedidos: pierde precio original");
check(pedidos.includes("moneda_origen"),"Pedidos: pierde moneda original");
const seguridad=load(join(docs,"modulos","seguridad.js"));
check(seguridad.includes("padre_seguridad_guardar_perfil"),"Seguridad: falta acceso al procedimiento de permisos");
check(seguridad.includes("seguridad_leer"),"Seguridad: no verifica lectura autorizada");
check(seguridad.includes("dinero_anular"),"Seguridad: no distingue permiso de alto riesgo");
const securityPage=load(join(docs,"modulos","seguridad.html"));
check(securityPage.includes("seguridad.js"),"Seguridad: página sin módulo operativo");
const clientes=load(join(docs,"modulos","clientes.js"));
check(clientes.includes("tipo_cliente_origen"),"Clientes: no visualiza clasificación original");
check(!files.some(f=>relative(docs,f).startsWith("js/supabase")),"Código Supabase heredado detectado");
if(errors.length){
 console.error("Validación de Padre FALLÓ ("+errors.length+"):");
 errors.forEach(x=>console.error(" - "+x));
 process.exitCode=1;
}else console.log("Padre OK: "+modules.length+" módulos, "+files.length+" archivos de docs, sin enlaces rotos ni referencias a Supabase Comanda.");
