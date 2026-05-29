// Auth centralizado COMANDA
// Control de sesion, permisos por pagina y fuente unica de navegacion.

(function () {
  const AUTH_KEY = "comanda_operador_actual";

  const DEFAULT_NAV_ITEMS = [
    { page: "index.html", label: "Pedidos", permission: "puede_pedidos" },
    { page: "clientes.html", label: "Clientes", permission: "puede_clientes" },
    { page: "materiales.html", label: "Materiales", permission: "puede_materiales" },
    { page: "estadisticas.html", label: "Estadisticas", permission: "puede_estadisticas" },
    { page: "marketing.html", label: "Marketing", permission: "puede_marketing" },
    { page: "cotizador.html", label: "Cotizador", permission: "puede_cotizador" },
    { page: "label.html", label: "Label", permission: "puede_label" },
    { page: "organizador.html", label: "Organizador", permission: "puede_organizador" },
    { page: "configuracion.html", label: "Configuracion", permission: "puede_configuracion" }
  ];

  function normalizePageName(value) {
    return String(value || "")
      .split("?")[0]
      .split("#")[0]
      .trim()
      .toLowerCase();
  }

  function getCurrentPage() {
    const raw = decodeURIComponent(location.pathname.split("/").pop() || "index.html");
    return normalizePageName(raw || "index.html");
  }

  function buildNavigationConfig(items) {
    const menuItems = Array.isArray(items) ? items.slice() : [];
    const permissionMap = {};
    const pageOrder = [];

    menuItems.forEach((item) => {
      const key = normalizePageName(item && item.page);
      if (!key) return;
      permissionMap[key] = item.permission || null;
      pageOrder.push(key);
    });

    return { menuItems, permissionMap, pageOrder };
  }

  const existing = window.COMANDA_NAV_CONFIG;
  const config = existing && Array.isArray(existing.menuItems)
    ? buildNavigationConfig(existing.menuItems)
    : buildNavigationConfig(DEFAULT_NAV_ITEMS);

  window.COMANDA_NAV_CONFIG = config;
  const PAGE = getCurrentPage();

  function getSesionOperador() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setSesionOperador(op) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(op));
  }

  function clearSesionOperador() {
    localStorage.removeItem(AUTH_KEY);
  }

  function esRoberto(op) {
    return String((op && op.nombre) || "").trim().toLowerCase() === "roberto";
  }

  function operadorActivo(op) {
    return !!op && op.activo !== false;
  }

  function tienePermiso(op, permiso) {
    if (!operadorActivo(op)) return false;
    if (esRoberto(op)) return true;
    if (!permiso) return true;
    return op[permiso] === true;
  }

  function primeraPaginaPermitida(op) {
    if (!operadorActivo(op)) return "login.html";
    if (esRoberto(op)) return "index.html";

    for (const page of config.pageOrder) {
      const perm = config.permissionMap[page];
      if (tienePermiso(op, perm)) return page;
    }

    return "login.html";
  }

  function filtrarMenu(op) {
    const menu = document.getElementById("authMenu");
    if (!menu) return;

    const items = Array.from(menu.querySelectorAll("a.tab-btn"));
    items.forEach((a) => {
      const hrefRaw = a.getAttribute("href") || "";
      const key = normalizePageName(decodeURIComponent(hrefRaw));
      const perm = config.permissionMap[key];
      if (!perm) return;
      a.style.display = tienePermiso(op, perm) ? "" : "none";
    });
  }

  function aplicarPermisosComanda() {
    if (PAGE === "login.html") return true;

    const op = getSesionOperador();
    if (!operadorActivo(op)) {
      location.href = "login.html";
      return false;
    }

    const permisoRequerido = config.permissionMap[PAGE];
    if (permisoRequerido && !tienePermiso(op, permisoRequerido)) {
      location.href = primeraPaginaPermitida(op);
      return false;
    }

    filtrarMenu(op);
    return true;
  }

  window.getSesionOperador = getSesionOperador;
  window.setSesionOperador = setSesionOperador;
  window.clearSesionOperador = clearSesionOperador;
  window.esRoberto = esRoberto;
  window.tienePermisoComanda = tienePermiso;
  window.normalizePageNameComanda = normalizePageName;
  window.aplicarPermisosComanda = aplicarPermisosComanda;

  document.addEventListener("DOMContentLoaded", aplicarPermisosComanda);
})();

