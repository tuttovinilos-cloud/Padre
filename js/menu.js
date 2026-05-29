console.log("MENU GLOBAL conectado v13");

(function () {
  const AUTH_KEY = "comanda_operador_actual";

  const fallbackItems = [
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

  const navConfig = window.COMANDA_NAV_CONFIG && Array.isArray(window.COMANDA_NAV_CONFIG.menuItems)
    ? window.COMANDA_NAV_CONFIG
    : {
        menuItems: fallbackItems,
        permissionMap: {
          "index.html": "puede_pedidos",
          "clientes.html": "puede_clientes",
          "materiales.html": "puede_materiales",
          "estadisticas.html": "puede_estadisticas",
          "marketing.html": "puede_marketing",
          "cotizador.html": "puede_cotizador",
          "label.html": "puede_label",
          "organizador.html": "puede_organizador",
          "configuracion.html": "puede_configuracion"
        },
        pageOrder: [
          "index.html",
          "clientes.html",
          "materiales.html",
          "estadisticas.html",
          "marketing.html",
          "cotizador.html",
          "label.html",
          "organizador.html",
          "configuracion.html"
        ]
      };

  function normalizePageName(value) {
    if (typeof window.normalizePageNameComanda === "function") {
      return window.normalizePageNameComanda(value);
    }

    return String(value || "")
      .split("?")[0]
      .split("#")[0]
      .trim()
      .toLowerCase();
  }

  function getOp() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch {
      return null;
    }
  }

  function norm(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function isRoberto(op) {
    return norm(op && op.nombre) === "roberto";
  }

  function hasPermission(op, permission) {
    if (typeof window.tienePermisoComanda === "function") {
      return window.tienePermisoComanda(op, permission);
    }

    if (!op || op.activo === false) return false;
    if (isRoberto(op)) return true;
    if (!permission) return true;
    return op[permission] === true;
  }

  function firstAllowed(op) {
    if (!op || op.activo === false) return "login.html";
    if (isRoberto(op)) return "index.html";

    const first = navConfig.menuItems.find((item) => hasPermission(op, item.permission));
    return first ? first.page : "login.html";
  }

  function currentPage() {
    const file = decodeURIComponent(location.pathname.split("/").pop() || "index.html");
    return normalizePageName(file || "index.html");
  }

  function samePage(a, b) {
    return normalizePageName(a) === normalizePageName(b);
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    location.href = "login.html?logout=1";
  }

  function createStoragePill() {
    const pill = document.createElement("div");
    pill.className = "menu-status storage-pill";
    pill.id = "storageBadgeHeader";
    pill.innerHTML = '<span class="status-dot storage-dot"></span><span id="storageBadgeTextHeader">SUPABASE</span>';
    return pill;
  }

  function renderMenu() {
    const op = getOp();
    if (!op || op.activo === false) {
      location.href = "login.html";
      return;
    }

    const menu = document.getElementById("authMenu");
    if (!menu) {
      console.warn("No existe #authMenu");
      markMenuReady();
      return;
    }

    menu.innerHTML = "";

    const pageNow = currentPage();
    let visibleCount = 0;

    navConfig.menuItems.forEach((item) => {
      if (!hasPermission(op, item.permission)) return;

      visibleCount += 1;

      const a = document.createElement("a");
      a.href = item.page;
      a.textContent = item.label || item.page;
      a.className = "tab-btn";

      if (samePage(item.page, pageNow)) {
        a.classList.add("active");
      }

      menu.appendChild(a);
    });

    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "tab-btn";
    logoutBtn.textContent = "Salir";
    logoutBtn.onclick = logout;
    menu.appendChild(logoutBtn);

    menu.appendChild(createStoragePill());
    syncStorageBadge();

    if (visibleCount === 0) {
      console.warn("Operador sin permisos visibles:", op);
    }

    if (!hasPermission(op, "puede_pedidos") && samePage(pageNow, "index.html")) {
      location.href = firstAllowed(op);
    }
  }

  function setupMobileMenu() {
    const header = document.querySelector(".header, .top, .top-inner");
    const menu = document.getElementById("authMenu");
    if (!header || !menu) return;

    let btn = document.getElementById("mobileMenuBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "mobileMenuBtn";
      btn.className = "mobile-menu-btn";
      btn.type = "button";
      btn.textContent = "Menu";
      header.insertBefore(btn, menu);
    }

    function setOpenState(isOpen) {
      menu.classList.toggle("open", isOpen);
      btn.classList.toggle("active", isOpen);
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      btn.textContent = isOpen ? "Cerrar" : "Menu";

      if (typeof window.updateStickyOffsets === "function") {
        window.updateStickyOffsets();
      }
    }

    function toggleMenu(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      const openNow = !menu.classList.contains("open");
      setOpenState(openNow);
    }

    function closeMenu() {
      if (!menu.classList.contains("open")) return;
      setOpenState(false);
    }

    btn.onclick = toggleMenu;

    window.toggleGlobalMenu = toggleMenu;
    window.closeGlobalMenu = closeMenu;

    document.addEventListener("click", function (event) {
      const target = event.target;
      if (!target) return;
      if (!menu.classList.contains("open")) return;
      if (header.contains(target)) return;
      closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 980) closeMenu();
    });
  }

  function syncStorageBadge() {
    const desktopText = document.getElementById("storageBadgeText");
    const headerText = document.getElementById("storageBadgeTextHeader");
    const desktopBadge = document.getElementById("storageBadge");
    const headerBadge = document.getElementById("storageBadgeHeader");

    const isSupa = !!window.supabaseClient || (desktopBadge && desktopBadge.classList.contains("ok"));

    if (headerText) {
      headerText.textContent = isSupa ? "SUPABASE" : ((desktopText && desktopText.textContent) || "LOCAL");
    }

    if (headerBadge) {
      headerBadge.classList.toggle("ok", isSupa);
    }
  }

  function setSelectOptions(select, operadores, placeholder) {
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">' + placeholder + "</option>";

    operadores.forEach((op) => {
      const opt = document.createElement("option");
      opt.value = op.nombre;
      opt.textContent = op.nombre;
      select.appendChild(opt);
    });

    if (current) select.value = current;
  }

  async function cargarOperadoresEnComanda() {
    const fallback = [
      { nombre: "Roberto" },
      { nombre: "Ricardo" },
      { nombre: "Marie Gabriela" },
      { nombre: "Chico" },
      { nombre: "Carlos" },
      { nombre: "Alejandro" },
      { nombre: "Ruben" },
      { nombre: "Ana" },
      { nombre: "Miguel" }
    ];

    let operadores = fallback;

    try {
      if (window.supabaseClient) {
        const { data, error } = await window.supabaseClient
          .from("operadores")
          .select("nombre, activo")
          .eq("activo", true)
          .order("nombre", { ascending: true });

        if (!error && Array.isArray(data) && data.length) {
          operadores = data;
        }
      }
    } catch (error) {
      console.warn("No se pudieron cargar operadores desde Supabase:", error);
    }

    setSelectOptions(document.getElementById("q_operador"), operadores, "Operador");
    setSelectOptions(document.getElementById("f_operador"), operadores, "Seleccionar...");
    setSelectOptions(document.getElementById("filterOperador"), operadores, "Operador");

    const opActual = getOp();
    if (opActual && opActual.nombre) {
      const puedeCambiar = isRoberto(opActual) || opActual.puede_modificar_operador === true;

      ["q_operador", "f_operador"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.value = opActual.nombre;
        if (!puedeCambiar) el.disabled = true;
      });
    }
  }

  function marcarSupabaseSiListo() {
    const badgeText = document.getElementById("storageBadgeText");
    const badgeBox = document.getElementById("storageBadge");

    if (window.supabaseClient) {
      if (badgeText) badgeText.textContent = "SUPABASE";
      if (badgeBox) badgeBox.classList.add("ok");
    }

    syncStorageBadge();
  }

  function updateStickyOffsets() {
    document.documentElement.style.setProperty("--sticky-head-top", "0px");
    document.documentElement.style.setProperty("--sticky-quick-top", "0px");
  }

  function markMenuReady() {
    const header = document.querySelector(".header, .top");

    document.documentElement.classList.remove("loading-menu");
    document.documentElement.classList.add("menu-ready");

    if (header) {
      header.classList.add("menu-ready");
    }
  }

  window.logout = window.logout || logout;
  window.cargarOperadoresEnComanda = cargarOperadoresEnComanda;
  window.updateStickyOffsets = window.updateStickyOffsets || updateStickyOffsets;
  window.marcarSupabaseSiListo = window.marcarSupabaseSiListo || marcarSupabaseSiListo;

  document.addEventListener("DOMContentLoaded", function () {
    marcarSupabaseSiListo();
    renderMenu();
    setupMobileMenu();
    markMenuReady();

    updateStickyOffsets();
    cargarOperadoresEnComanda();
    syncStorageBadge();

    window.addEventListener("resize", updateStickyOffsets);

    if (window.__MENU_STORAGE_TIMER__) {
      clearInterval(window.__MENU_STORAGE_TIMER__);
    }

    window.__MENU_STORAGE_TIMER__ = setInterval(syncStorageBadge, 1500);
  });
})();

