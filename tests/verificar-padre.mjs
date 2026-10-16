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
// Si Pages publica desde la raíz del repo, los enlaces previos deben redirigir a /docs/.
for(const slug of modules){
 const oldPath=join(root,"modulos",slug+".html");
 check(existsSync(oldPath),"Falta redirección pública del módulo "+slug);
 if(existsSync(oldPath)){
  const redirect=load(oldPath);
  check(redirect.includes("../docs/modulos/"+slug+".html"),
    "Redirección incorrecta para "+slug);
 }
}
check(load(join(root,"login.html")).includes("./docs/login.html"),
  "El acceso /Padre/login.html no redirige al login real");

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
check(home.includes('id="logoutBtn"')&&home.includes('>Salir</button>'),"Menú: falta el botón visible de Salir");
check(home.includes('id="accessBtn"')&&home.includes('id="sessionName"'),"Menú: falta distinguir sesión y acceso");
check(home.includes('./session-controls.js?v=13'),"Menú: no carga el controlador de sesión actualizado");
const sessionControls=load(join(docs,"session-controls.js"));
check(sessionControls.includes('auth.currentOperator()'),"Sesión: no verifica el operador actual");
check(sessionControls.includes('await auth.signOut()'),"Sesión: botón no cierra sesión");
check(sessionControls.includes('access.hidden=true')&&sessionControls.includes('logout.hidden=false'),"Sesión: no muestra Salir tras validar acceso");

const login=load(join(docs,"login.js"));
check(login.includes('functions.invoke("padre-pin-login"'),"Login: no utiliza PIN seguro de Padre");
check(!login.includes("signInWithPassword"),"Login: persiste acceso directo con PIN");
check(login.includes('rpc("padre_login_disponibles"'),"Login: falta filtrar operadores con PIN");
check(login.includes('padre_mi_pin_estado'),"Login: no comprueba primer ingreso");
check(load(join(docs,"auth.js")).includes('cambiar-pin.html'),"Acceso: falta bloqueo al PIN provisional");
check(existsSync(join(docs,"cambiar-pin.html")),"PIN: falta formulario obligatorio");
const loginPage=load(join(docs,"login.html"));
const pinChangeHtml=load(join(docs,"cambiar-pin.html"));
check(login.includes("^[0-9]{4,8}$"),"Login: faltan PIN de 4 a 8 dígitos");
check(loginPage.includes('maxlength="8"')&&loginPage.includes('pattern="[0-9]{4,8}"'),"Login: formulario limita longitud");
check(pinChangeHtml.includes('maxlength="8"')&&pinChangeHtml.includes('pattern="[0-9]{4,8}"'),"Cambio PIN: campos no aceptan 4-8");
const pinPage=load(join(docs,"cambiar-pin.js"));
check(pinPage.includes('padre_cambiar_mi_pin'),"PIN: falta cambio personal protegido");
check(pinPage.includes('auth.api.auth.signOut()'),"PIN: no exige volver a iniciar sesión");
check(pinPage.includes("^[0-9]{4,8}$"),"Cambio PIN: falta longitud flexible");
check(!pinPage.includes('next==="0000"')&&!pinPage.includes("no repetitivo"),"Cambio PIN: se prohíben secuencias");
check(loginPage.includes("login.js?v=14")&&pinChangeHtml.includes("cambiar-pin.js?v=14"),"Actualización PIN sin versión en HTML");
const pedidos=load(join(docs,"modulos","pedidos.js"));
check(pedidos.includes("origen_comanda_id"),"Pedidos: no distingue histórico");
check(pedidos.includes("precio_total_origen"),"Pedidos: pierde precio original");
check(pedidos.includes("moneda_origen"),"Pedidos: pierde moneda original");
const seguridad=load(join(docs,"modulos","seguridad.js"));
check(seguridad.includes("padre_seguridad_guardar_perfil"),"Seguridad: falta acceso al procedimiento de permisos");
check(seguridad.includes("padre_seguridad_configurar_pin"),"Seguridad: falta PIN temporal individual");
check(seguridad.includes("padre_seguridad_activar_pendientes"),"Seguridad: falta activar empleados pendientes");
check(seguridad.includes("op.nombre===\"Roberto\""),"Seguridad: no limita controles visuales a Roberto");
check(seguridad.includes("seguridad_leer"),"Seguridad: no verifica lectura autorizada");
check(seguridad.includes("dinero_anular"),"Seguridad: no distingue permiso de alto riesgo");
const securityPage=load(join(docs,"modulos","seguridad.html"));
check(securityPage.includes("seguridad.js"),"Seguridad: página sin módulo operativo");
check(securityPage.includes("seguridad.js?v=12"),"Seguridad: versión del panel antigua");
const moneyModule=load(join(docs,"modulos","dinero.js"));
check(moneyModule.includes("padre_finanzas_registrar"),"Contabilidad: falta el registro de abonos");
check(moneyModule.includes("padre_finanzas_anular"),"Contabilidad: falta la anulación");
check(moneyModule.includes("padre_finanzas_pedidos_abiertos"),"Contabilidad: falta la consulta de saldos");
const moneyPage=load(join(docs,"modulos","dinero.html"));
check(moneyPage.includes("dinero.js?v=9"),"Contabilidad: página sin script operativo");
const conciliation=load(join(docs,"modulos","conciliacion.js"));
check(conciliation.includes("padre_conciliacion_listar"),"Conciliación: falta consulta paginada");
check(conciliation.includes("padre_conciliacion_guardar_revision"),"Conciliación: falta auditoría documental");
check(conciliation.includes("padre_conciliacion_evidencias"),"Conciliación: falta revisión de referencias");
check(conciliation.includes("detalle_fuentes"),"Conciliación: falta desglose por origen");
check(conciliation.includes("pendientes_copia"),"Conciliación: falta aviso de fuente incompleta");
check(conciliation.includes("copia_completa"),"Conciliación: falta verificación de completitud");
check(conciliation.includes("NO demuestra"),"Conciliación: no advierte que faltan comprobantes");
check(conciliation.includes("no se copian al libro")||conciliation.includes("no se recalculan deudas"),"Conciliación: advertencia de saldos faltante");
const reconciliationPage=load(join(docs,"modulos","conciliacion.html"));
check(reconciliationPage.includes("conciliacion.js?v=15"),"Conciliación: página sin nuevo módulo");
check(existsSync(join(root,"modulos","conciliacion.html")),"Conciliación: falta redirección desde /modulos/");
const accounting=load(join(docs,"modulos","dinero.js"));
check(accounting.includes('./conciliacion.html'),"Contabilidad: enlace a conciliación faltante");
const clientes=load(join(docs,"modulos","clientes.js"));
check(clientes.includes("tipo_cliente_origen"),"Clientes: no visualiza clasificación original");
check(!files.some(f=>relative(docs,f).startsWith("js/supabase")),"Código Supabase heredado detectado");
if(errors.length){
 console.error("Validación de Padre FALLÓ ("+errors.length+"):");
 errors.forEach(x=>console.error(" - "+x));
 process.exitCode=1;
}else console.log("Padre OK: "+modules.length+" módulos, "+files.length+" archivos de docs, sin enlaces rotos ni referencias a Supabase Comanda.");
