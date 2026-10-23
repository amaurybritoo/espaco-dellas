const SUPABASE_URL = "https://awlecfmaivubbxlfvysz.supabase.co";
const SUPABASE_KEY = "sb_publishable_3p9Rdi65L_3RkKDAKYQRjw_FpF0wOOd";
const DEFAULT = {
  name: "Espaço Dellas",
  bio: "Beleza, autoestima e estilo para ser você.",
  address:
    "Avenida Tancredo Neves, 6, Parque 10 de Novembro, Manaus — AM, Mini Shopping Mindu Center",
  location_query:
    "Mini Shopping Mindu Center, Avenida Tancredo Neves, 6, Parque 10 de Novembro, Manaus, AM",
  whatsapp: "https://wa.me/5592993258071",
  instagram: "https://www.instagram.com/espacodellasam/",
  brand_background: "#f1ece6",
  brand_primary: "#b5825b",
  brand_accent: "#96652f",
  brand_text: "#34261f",
  catalog_title: "A sua presença,\no seu estilo.",
  catalog_description:
    "Peças escolhidas para acompanhar seus dias com personalidade, conforto e leveza.",
  catalog_cta_text: "Atendimento pelo WhatsApp",
  vip: "https://chat.whatsapp.com/FbHcH09HqTsF61CAkp1VCK?s=cl&p=i&mlu=4&ilr=4",
};
const $ = (selector) => document.querySelector(selector),
  isCatalog = document.body.classList.contains("catalog-page");
let currentSettings = { ...DEFAULT },
  currentPublicLinks = [];
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
/* ---------- Utilidades de catálogo ---------- */
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const money = (value) => brl.format(Number(value));
const positive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};
const isOn = (value) => value !== false && String(value) !== "false";
const splitList = (value) =>
  String(value ?? "")
    .split(/[,;/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
const plain = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR");
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Preço de uma peça: preço normal, "de/por", "leve N por X" e conjuntos vendidos separadamente. */
function priceParts(product) {
  const price = positive(product.price),
    promo = positive(product.promo_price),
    original = positive(product.original_price),
    qty = Math.floor(Number(product.promo_qty));
  if (product.promo_type === "unit" && promo) {
    const old =
      original && original > promo ? original : price > promo ? price : null;
    const pct = old ? Math.round((1 - promo / old) * 100) : 0;
    return {
      kind: "unit",
      now: money(promo),
      old: old ? money(old) : "",
      pct,
      badge: pct >= 1 ? `−${pct}%` : "OFERTA",
    };
  }
  if (product.promo_type === "bundle" && promo && qty >= 2) {
    return {
      kind: "bundle",
      now: price ? money(price) : `${qty} por ${money(promo)}`,
      note: price ? `Leve ${qty} por ${money(promo)}` : "",
      each: `${money(promo / qty)} cada`,
      badge: `LEVE ${qty}`,
    };
  }
  if (!price && product.set_mode === "separate") {
    const parts = [product.top_price, product.bottom_price]
      .map(positive)
      .filter(Boolean);
    if (parts.length)
      return {
        kind: "separate",
        prefix: "A partir de",
        now: money(Math.min(...parts)),
      };
  }
  if (price) return { kind: "regular", now: money(price) };
  return { kind: "consult", now: "Consulte o valor" };
}
function priceHtml(product, { notes = true } = {}) {
  const info = priceParts(product);
  return [
    info.prefix ? `<span class="price-prefix">${esc(info.prefix)}</span>` : "",
    info.old ? `<span class="price-old">${esc(info.old)}</span>` : "",
    `<strong class="price-now${info.kind === "consult" ? " is-consult" : ""}">${esc(info.now)}</strong>`,
    notes && info.note
      ? `<span class="price-note">${esc(info.note)}</span>`
      : "",
  ].join("");
}
function flagFor(product) {
  const info = priceParts(product);
  if (info.kind === "unit" || info.kind === "bundle")
    return { kind: "promo", label: info.badge };
  if (product.featured) return { kind: "featured", label: "✦ DESTAQUE" };
  return null;
}

/* Trava a rolagem da página enquanto houver popup/menu aberto (inclusive no iOS). */
const scrollLock = (() => {
  const holders = new Set();
  let savedY = 0;
  const root = document.documentElement;
  function apply() {
    const locked = root.classList.contains("scroll-locked");
    if (holders.size && !locked) {
      savedY = window.scrollY;
      const gap = window.innerWidth - root.clientWidth;
      root.classList.add("scroll-locked");
      document.body.style.top = `-${savedY}px`;
      if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    } else if (!holders.size && locked) {
      root.classList.remove("scroll-locked");
      document.body.style.top = "";
      document.body.style.paddingRight = "";
      window.scrollTo({ top: savedY, left: 0, behavior: "instant" });
    }
  }
  return {
    lock(key) {
      holders.add(key);
      apply();
    },
    unlock(key) {
      holders.delete(key);
      apply();
    },
  };
})();

function setupCatalogMenu() {
  const toggle = $("#catalogMenuToggle"),
    drawer = $("#catalogDrawer"),
    scrim = $("#catalogMenuScrim"),
    close = $("#catalogMenuClose");
  if (!toggle || !drawer || !scrim) return;
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    drawer.setAttribute("aria-hidden", String(!open));
    scrim.hidden = !open;
    document.body.classList.toggle("menu-open", open);
    if (open) scrollLock.lock("menu");
    else scrollLock.unlock("menu");
    if (open) close?.focus();
    else toggle.focus();
  };
  const productsToggle = $("#drawerProductsToggle"),
    categoryGroup = $("#drawerCategoryGroup");
  productsToggle?.addEventListener("click", () => {
    if (!categoryGroup) return;
    const isOpen = categoryGroup.hidden;
    categoryGroup.hidden = !isOpen;
    productsToggle.setAttribute("aria-expanded", String(isOpen));
    if (isOpen)
      categoryGroup.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  toggle.addEventListener("click", () =>
    setOpen(toggle.getAttribute("aria-expanded") !== "true"),
  );
  close?.addEventListener("click", () => setOpen(false));
  scrim.addEventListener("click", () => setOpen(false));
  drawer
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    )
      setOpen(false);
  });
}
function setupTicker() {
  const track = $(".ticker>div");
  if (!track) return;
  const holder = track.parentElement,
    source = track.dataset.source || track.innerHTML;
  track.dataset.source = source;
  let frame = 0;
  const rebuild = () => {
    track.replaceChildren();
    const first = document.createElement("span");
    first.className = "ticker-segment";
    first.innerHTML = source;
    track.append(first);
    const minimum = Math.max(1, holder.clientWidth * 2);
    while (first.scrollWidth < minimum)
      first.insertAdjacentHTML(
        "beforeend",
        ' <i class="ticker-separator" aria-hidden="true">✳︎</i> ' + source,
      );
    track.append(first.cloneNode(true));
    track.style.setProperty(
      "--ticker-duration",
      `${Math.max(18, first.scrollWidth / 38)}s`,
    );
  };
  rebuild();
  window.addEventListener(
    "resize",
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(rebuild);
    },
    { passive: true },
  );
}
function titleHtml(value) {
  let lines = String(value || "").split(/\n/);
  if (lines.length === 1) {
    const match = lines[0].match(/^(.*\S)\s+(\S+)$/);
    if (match) lines = [match[1], match[2]];
  }
  return lines
    .map((line, index) =>
      index === lines.length - 1 ? `<em>${esc(line)}</em>` : esc(line),
    )
    .join("<br>");
}
/* Leitura enxuta: um GET simples (sem cabeçalhos personalizados) não gera
   a viagem extra de "preflight" do navegador, o que poupa uns 100–300 ms no
   celular. Se o servidor recusar, cai para o modo com cabeçalhos. */
function restUrl(path) {
  return `${SUPABASE_URL}/rest/v1/${path}${path.includes("?") ? "&" : "?"}apikey=${SUPABASE_KEY}`;
}
async function fetchJson(url, options, ms = 8000) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
async function read(path) {
  try {
    return await fetchJson(restUrl(path));
  } catch (error) {
    return fetchJson(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
  }
}
/* Usa a busca que o <head> já começou antes mesmo deste arquivo carregar. */
function early(name, path) {
  const task = window.__dellasEarly?.[name];
  if (window.__dellasEarly) delete window.__dellasEarly[name];
  return task ? task.catch(() => read(path)) : read(path);
}
/* Cache local: mostra na hora o que a visita anterior viu e atualiza em seguida. */
const CACHE_PREFIX = "dellas:v2:";
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function cacheSet(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {}
}
/* Miniatura: fotos novas têm uma versão leve (.sm.webp) ao lado da grande. */
function thumbUrl(url) {
  return /\.hd\.webp(\?|$)/.test(url)
    ? url.replace(/\.hd\.webp/, ".sm.webp")
    : url;
}
function thumbFallback(img) {
  if (img.dataset.full && img.src !== img.dataset.full) {
    img.src = img.dataset.full;
  }
}
function safeUrl(value) {
  try {
    const raw = String(value || "").trim(),
      url = new URL(raw, location.href);
    if (!/^[a-z][a-z\d+.-]*:/i.test(raw))
      return url.origin === location.origin ? url.href : "#";
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol)
      ? url.href
      : "#";
  } catch {
    return "#";
  }
}
function whatsappHref(base, message) {
  try {
    const url = new URL(safeUrl(base || DEFAULT.whatsapp), location.href);
    url.searchParams.set("text", message);
    return url.href;
  } catch {
    return safeUrl(base || DEFAULT.whatsapp);
  }
}
function applyTheme(settings) {
  const root = document.documentElement;
  [
    ["--paper", "brand_background"],
    ["--caramel", "brand_primary"],
    ["--gold", "brand_accent"],
    ["--ink", "brand_text"],
  ].forEach(([variable, key]) => {
    const value = String(settings[key] || DEFAULT[key]);
    if (/^#[0-9a-f]{6}$/i.test(value)) root.style.setProperty(variable, value);
  });
  const media = window.matchMedia("(max-width: 640px)");
  const updateBackground = () => {
    const mobile = media.matches,
      background = safeUrl(
        mobile
          ? "assets/dellas-cover-mobile-v5.webp"
          : settings.background_url || "assets/dellas-cover-v5.webp",
      );
    if (!isCatalog) {
      document.body.style.backgroundImage = mobile
        ? "none"
        : `url("${background}")`;
      document.body.style.backgroundSize = mobile ? "100% auto" : "cover";
      document.body.style.backgroundPosition = mobile ? "center top" : "center";
      document.body.style.backgroundRepeat = "no-repeat";
      document.body.style.backgroundAttachment = "scroll";
    } else {
      const hero = $("#catalogHero");
      if (hero) {
        hero.style.backgroundImage = `url("${background}")`;
        hero.style.backgroundPosition = mobile ? "center 38%" : "center";
        hero.style.backgroundSize = "cover";
      }
    }
  };
  updateBackground();
  if (!window.__dellasResponsiveBg) {
    if (media.addEventListener)
      media.addEventListener("change", () => {
        if (window.__dellasTheme) applyTheme(window.__dellasTheme);
      });
    else
      media.addListener(() => {
        if (window.__dellasTheme) applyTheme(window.__dellasTheme);
      });
    window.__dellasResponsiveBg = true;
  }
  window.__dellasTheme = settings;
}
function deferMapUntilNeeded(frame) {
  if (!frame || frame.dataset.deferBound) return;
  frame.dataset.deferBound = "true";
  const load = () => {
    if (!frame.hasAttribute("src")) frame.src = frame.dataset.src || "";
  };
  if (!("IntersectionObserver" in window)) {
    load();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        load();
        observer.disconnect();
      }
    },
    { rootMargin: "240px" },
  );
  observer.observe(frame);
}
function applySettings(settings = {}) {
  currentSettings = { ...DEFAULT, ...settings };
  settings = currentSettings;
  applyTheme(settings);
  const name = settings.name || DEFAULT.name,
    whatsapp = safeUrl(
      settings.catalog_whatsapp || settings.whatsapp || DEFAULT.whatsapp,
    ),
    instagram = safeUrl(settings.instagram || DEFAULT.instagram),
    logoUrl =
      settings.logo_url === "assets/logo.svg" ||
      settings.logo_url === "/assets/logo.svg"
        ? "assets/logo-dellas-circular.svg"
        : settings.logo_url;
  if (!isCatalog) {
    const footerName = $("#footerName");
    if (footerName) footerName.textContent = name.toUpperCase();
    const logo = $("#logo");
    if (logoUrl) logo.src = safeUrl(logoUrl);
    logo.alt = name;
    const rawAddress = String(settings.address || DEFAULT.address);
    const address = [
      DEFAULT.address,
      "Avenida Tancredo Neves, 6, Parque 10 de Novembro, Manaus — AM, Mini Shopping Mindu Center",
    ].includes(rawAddress)
      ? "Mini Shopping Mindu Center\nAvenida Tancredo Neves, 6\nParque 10 de Novembro\nManaus — AM"
      : rawAddress.replace(/,\s*/g, "\n");
    $("#address").textContent = address;
    const mapQuery =
      settings.location_query || settings.address || DEFAULT.location_query;
    $("#mapLink").href =
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`;
    const frame = $("#mapFrame");
    const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&hl=pt-BR&output=embed`;
    if (frame) {
      frame.dataset.src = mapUrl;
      deferMapUntilNeeded(frame);
    }
    document.title = `${name} — links`;
  } else {
    ["#catalogLogo", "#drawerLogo"].forEach((selector) => {
      const logo = $(selector);
      if (logoUrl) logo.src = safeUrl(logoUrl);
      logo.alt = name;
    });
    $("#catalogBrand").textContent = name.toUpperCase();
    $("#drawerBrand").textContent = name.toUpperCase();
    const savedTitle = [
      "Peças para imaginar.",
      "Vista o que faz\nvocê brilhar",
      "Vista o que faz você brilhar",
    ].includes(settings.catalog_title)
      ? ""
      : settings.catalog_title;
    const savedDescription = [
      "Uma seleção feita para você. Consulte disponibilidade e tamanhos com a nossa equipe.",
      "Uma seleção feminina feita para momentos em que você quer se sentir ainda mais especial.",
    ].includes(settings.catalog_description)
      ? ""
      : settings.catalog_description;
    const title = savedTitle || DEFAULT.catalog_title;
    $("#catalogTitle").innerHTML = titleHtml(title);
    $("#catalogDescription").textContent =
      savedDescription || DEFAULT.catalog_description;
    const cta = $("#catalogCta");
    cta.textContent =
      settings.catalog_cta_text === "Fale com a equipe"
        ? DEFAULT.catalog_cta_text
        : settings.catalog_cta_text || DEFAULT.catalog_cta_text;
    cta.href = whatsapp;
    document.title = `Catálogo — ${name}`;
    document.querySelector('meta[name="description"]').content =
      savedDescription || DEFAULT.catalog_description;
  }
  document
    .querySelectorAll(".whatsapp-link")
    .forEach(
      (link) =>
        (link.href = whatsappHref(
          whatsapp,
          link.dataset.whatsappMessage ||
            "Olá! Gostaria de falar com a equipe da Espaço Dellas.",
        )),
    );
  document
    .querySelectorAll(".instagram-link")
    .forEach((link) => (link.href = instagram));
  if (!isCatalog && currentPublicLinks.length) renderLinks(currentPublicLinks);
}
const iconFor = (type) =>
  ({
    whatsapp:
      '<svg class="wa-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 3.5A11.7 11.7 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.2 1.6 6L.2 24l6.4-1.7a11.8 11.8 0 0 0 5.5 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.5-8.4ZM12.1 21.6h-.1c-1.7 0-3.4-.5-4.8-1.3l-.3-.2-3.8 1 1-3.7-.2-.3a9.8 9.8 0 0 1-1.5-5.2c0-5.4 4.4-9.8 9.8-9.8 2.6 0 5.1 1 7 2.9 1.9 1.9 2.9 4.4 2.9 7 0 5.4-4.4 9.8-9.8 9.8Zm5.4-7.3c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.7-.9-2.8-1.6-3.9-3.5-.3-.5.3-.5.8-1.6.1-.2.1-.4 0-.6-.1-.1-.7-1.6-1-2.2-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5.1 2.2 1 2.2.7 2.6.7.4 0 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3Z"></path></svg>',
    instagram:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.8" r=".8" fill="currentColor" stroke="none"/></svg>',
    vip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="m12 3 2.5 5 5.5.8-4 3.9.9 5.4-4.9-2.6-4.9 2.6.9-5.4-4-3.9 5.5-.8L12 3Z"/></svg>',
    tiktok: "♪",
    location:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    youtube: "▷",
    catalogo:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M8 8a4 4 0 0 1 8 0"/><path d="M9 12h.01M15 12h.01"/></svg>',
  })[String(type || "").toLowerCase()] || "•";
function renderLinks(rows = []) {
  const host = $("#links");
  if (!host) return;
  currentPublicLinks = Array.isArray(rows) ? rows : [];
  rows = currentPublicLinks;
  const active = rows.filter(
    (row) =>
      row.enabled !== false && String(row.enabled) !== "false" && row.title,
  );
  const catalogRow = active.find((row) =>
    /catalog/i.test(`${row.type} ${row.title}`),
  );
  const defaultLinks = [
    {
      type: "whatsapp",
      title: "Falar no WhatsApp",
      subtitle: "Atendimento e novidades",
      url: DEFAULT.whatsapp,
    },
    {
      type: "instagram",
      title: "Instagram",
      subtitle: "Acompanhe a Espaço Dellas",
      url: DEFAULT.instagram,
    },
  ];
  const rest = (active.length ? active : defaultLinks).filter(
    (row) =>
      row !== catalogRow &&
      !/catalog/i.test(`${row.type} ${row.title}`) &&
      row.url,
  );
  if (
    !rows.some((row) => String(row.type || "").toLowerCase() === "vip") &&
    currentSettings.vip
  )
    rest.push({
      type: "vip",
      title: "Clube Dellas",
      subtitle: "Novidades e benefícios para você",
      url: currentSettings.vip,
      enabled: true,
    });
  const catalog = {
    type: "catalogo",
    title: catalogRow?.title || "Ver nosso catálogo",
    subtitle: catalogRow?.subtitle || "Veja as peças disponíveis",
    url: catalogRow?.url || "catalogo.html",
  };
  const all = [catalog, ...rest];
  host.innerHTML = all
    .map((row) => {
      const message = `Olá! Vim pela página de links da Espaço Dellas e gostaria de saber mais sobre ${row.title}.`;
      const href =
        row.type === "whatsapp"
          ? whatsappHref(row.url, message)
          : safeUrl(row.url);
      return `<a class="link-card ${row.type === "catalogo" ? "catalog-link" : ""} ${row.type === "vip" ? "vip-link" : ""}" href="${esc(href)}" ${row.type === "catalogo" ? "" : 'target="_blank" rel="noopener"'}><span class="link-icon" aria-hidden="true">${iconFor(row.type)}</span><span class="link-copy"><b>${esc(row.title)}</b><small>${esc(row.subtitle || "")}</small></span>${row.type === "vip" ? '<span class="vip-badge">EXCLUSIVO</span>' : ""}</a>`;
    })
    .join("");
}
const modelShapes = [
  `<path class="product-garment" d="M89 82 69 95l-21 39 27 13 9-17-12 105h96l-12-105 9 17 27-13-21-39-20-13-31 12-32-12Z"/><path class="product-seam" d="m88 82 32 38 31-38m-56 50c17 8 35 8 52 0m-68 71h81"/>`,
  `<path class="product-garment" d="M93 80 66 91l-20 35 28 14 14-17-10 54 14 9-8 50h74l-8-50 14-9-10-54 14 17 28-14-20-35-27-11-29 11-27-11Z"/><path class="product-seam" d="m93 80 27 33 29-33m-41 3v50m25-50v50m-57 64h90"/>`,
  `<path class="product-garment" d="m83 83-24 12-18 34 26 12 15-17-6 62h88l-6-62 15 17 26-12-18-34-24-12-31 10-32-10Z"/><path class="product-garment" d="m78 193 84 0 12 57H66Z"/><path class="product-seam" d="m83 83 37 35 31-35m-62 2v43m59-43v43m-72 75h75"/>`,
  `<path class="product-garment" d="m90 82-27 13-18 36 30 13 12-18 1 47h64l1-47 12 18 30-13-18-36-27-13-30 11Z"/><path class="product-garment" d="m83 185 74 0 14 65H69Z"/><path class="product-seam" d="m90 82 30 33 30-33m-48 4v47m36-47v47m-65 62h92"/>`,
];
const FALLBACK_PRODUCTS = [
  {
    name: "Vestido Aurora",
    category: "Vestidos",
    description: "Silhueta fluida · modelo de demonstração",
    price: 189.9,
    is_demo: true,
    enabled: true,
  },
  {
    name: "Vestido Serena",
    category: "Vestidos",
    description: "Recorte delicado · modelo de demonstração",
    price: 219.9,
    is_demo: true,
    enabled: true,
  },
  {
    name: "Conjunto Duna",
    category: "Conjuntos",
    description: "Textura natural · modelo de demonstração",
    price: 249.9,
    is_demo: true,
    enabled: true,
  },
  {
    name: "Conjunto Íris",
    category: "Conjuntos",
    description: "Cor marcante · modelo de demonstração",
    price: 279.9,
    is_demo: true,
    enabled: true,
  },
  {
    name: "Vestido Alba",
    category: "Vestidos",
    description: "Caimento leve · modelo de demonstração",
    price: 199.9,
    is_demo: true,
    enabled: true,
  },
  {
    name: "Blusa Nara",
    category: "Blusas",
    description: "Toque macio · modelo de demonstração",
    price: 89.9,
    is_demo: true,
    enabled: true,
  },
  {
    name: "Calça Cora",
    category: "Calças",
    description: "Corte versátil · modelo de demonstração",
    price: 149.9,
    is_demo: true,
    enabled: true,
  },
  {
    name: "Conjunto Brisa",
    category: "Conjuntos",
    description: "Combinação descontraída · modelo de demonstração",
    price: 239.9,
    is_demo: true,
    enabled: true,
  },
];
const TONES = ["terracotta", "sage", "sand", "rose"];
function productArt(product, index, { flag = true } = {}) {
  const tone = TONES[index % 4],
    tag = flag ? flagFor(product) : null,
    tags =
      (product.is_demo ? '<span class="product-tag">MODELO TESTE</span>' : "") +
      (tag
        ? `<span class="product-flag" data-kind="${tag.kind}">${esc(tag.label)}</span>`
        : "");
  if (product.image_url) {
    const full = safeUrl(product.image_url);
    return `<div class="product-art" data-tone="${tone}"><img loading="lazy" decoding="async" src="${esc(thumbUrl(full))}" data-full="${esc(full)}" alt="${esc(product.image_alt || product.name)}">${tags}</div>`;
  }
  const colors = ["#b36e4b", "#7d8771", "#c2a384", "#8e696f"];
  return `<div class="product-art" data-tone="${tone}"><svg viewBox="0 0 240 280" aria-hidden="true"><path class="product-hanger" d="M120 36c0-12 17-13 17-2 0 6-6 8-10 12l-5 7M57 75l63-24 63 24M57 75h126"/><g style="--item-color:${colors[index % 4]}">${modelShapes[index % modelShapes.length]}</g></svg>${tags}</div>`;
}

/* ---------- Foto que preenche o quadro sem distorcer ----------
   Proporção parecida com a do quadro  -> "cover" (preenche tudo, sem esticar).
   Proporção muito diferente           -> "contain" (foto inteira, nítida) sobre um
                                          fundo desfocado da própria foto. */
function photoHtml(
  url,
  alt,
  { eager = false, extra = "", thumb = false } = {},
) {
  const shown = thumb ? thumbUrl(url) : url;
  return `<figure class="photo ${extra}" data-fit="cover" data-src="${esc(shown)}"><img class="${extra ? extra + "-img" : ""}" src="${esc(shown)}" data-full="${esc(url)}" alt="${esc(alt)}" decoding="async"${eager ? ' fetchpriority="high"' : ' loading="lazy"'}></figure>`;
}
function fitPhoto(figure) {
  const img = figure.querySelector("img");
  figure.style.setProperty(
    "--photo",
    `url("${String(figure.dataset.src).replace(/"/g, "%22")}")`,
  );
  const apply = () => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const box = figure.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const gap = Math.abs(
      Math.log(img.naturalWidth / img.naturalHeight / (box.width / box.height)),
    );
    figure.dataset.fit = gap <= 0.2 ? "cover" : "contain";
  };
  if (img.complete) apply();
  else img.addEventListener("load", apply, { once: true });
  return apply;
}

/* ---------- Tamanhos e cores com "…" quando não cabem no card ---------- */
function metaHtml(product) {
  const rows = [
    ["Tam.", splitList(product.sizes)],
    ["Cores", splitList(product.colors)],
  ].filter(([, list]) => list.length);
  if (!rows.length) return "";
  return `<div class="product-meta">${rows
    .map(
      ([label, list]) =>
        `<div class="meta-row"><b>${label}</b><span class="meta-list" data-items="${esc(JSON.stringify(list))}" title="${esc(list.join(", "))}">${esc(list.join(", "))}</span></div>`,
    )
    .join("")}</div>`;
}
function fitMetaLists(scope = document) {
  scope.querySelectorAll(".meta-list").forEach((el) => {
    if (!el.clientWidth) return;
    let items;
    try {
      items = JSON.parse(el.dataset.items || "[]");
    } catch {
      return;
    }
    el.textContent = items.join(", ");
    if (el.scrollWidth <= el.clientWidth) return;
    for (let count = items.length - 1; count >= 1; count--) {
      el.textContent = `${items.slice(0, count).join(", ")}…`;
      if (el.scrollWidth <= el.clientWidth) return;
    }
    el.textContent = items[0];
  });
}
let metaResizeFrame = 0;
window.addEventListener(
  "resize",
  () => {
    cancelAnimationFrame(metaResizeFrame);
    metaResizeFrame = requestAnimationFrame(() => fitMetaLists());
  },
  { passive: true },
);
document.fonts?.ready?.then(() => fitMetaLists());

/* ---------- Carrossel de destaques ---------- */
const CAROUSEL_DELAY = 5600;
let carouselCleanup = null;
const pad2 = (n) => String(n).padStart(2, "0");
function slideHtml(item, index, total) {
  const flag = flagFor(item),
    kicker =
      flag?.kind === "promo"
        ? "OFERTA ESPECIAL"
        : flag?.kind === "featured"
          ? "DESTAQUE"
          : "SELEÇÃO DA CASA",
    gallery = Array.isArray(item.gallery_images) ? item.gallery_images : [],
    cover = item.image_url || gallery[0],
    media = cover
      ? photoHtml(safeUrl(cover), item.image_alt || item.name, {
          eager: true,
          extra: "feature-photo",
          thumb: matchMedia("(max-width: 640px)").matches,
        })
      : productArt(item, index, { flag: false });
  return `<article class="featured-slide" data-kind="${flag?.kind || "default"}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Ver detalhes de ${esc(item.name)}"><div class="featured-image">${media}${flag ? `<span class="feature-badge" data-kind="${flag.kind}">${esc(flag.label)}</span>` : ""}${item.is_demo ? '<span class="product-tag">MODELO TESTE</span>' : ""}${total > 1 ? `<span class="feature-count" aria-hidden="true"><b>${pad2(index + 1)}</b> / ${pad2(total)}</span>` : ""}</div><div class="featured-copy"><span class="feature-kicker"><i></i>${kicker}</span><small class="feature-category">${esc(item.category || "Novidades")}</small><h2>${esc(item.name)}</h2><p>${esc(item.description || "Uma peça escolhida pela equipe Espaço Dellas.")}</p><div class="feature-price">${priceHtml(item)}${item.is_demo ? "<small>VALOR ILUSTRATIVO</small>" : ""}</div><span class="feature-link" aria-hidden="true">Ver detalhes <b>→</b></span></div></article>`;
}
function renderCarousel(rows) {
  carouselCleanup?.();
  carouselCleanup = null;
  const items = rows.filter(
    (item) => isOn(item.enabled) && isOn(item.show_in_carousel),
  );
  const stage = $("#featuredCarousel"),
    dots = $("#carouselDots"),
    section = $(".feature-stage");
  if (!stage || !dots || !items.length) {
    if (section) section.hidden = true;
    return;
  }
  section.hidden = false;
  stage.setAttribute("aria-live", "off");
  dots.style.setProperty("--slide-ms", `${CAROUSEL_DELAY}ms`);
  const abort = new AbortController(),
    opts = { signal: abort.signal },
    touchOpts = { signal: abort.signal, passive: true };
  let active = 0,
    direction = "next",
    timer = 0;
  const holds = new Set();

  function paintDots() {
    dots.innerHTML = items
      .map(
        (_, i) =>
          `<button class="carousel-dot" type="button" aria-label="Mostrar peça ${i + 1} de ${items.length}" aria-current="${i === active}" data-slide="${i}"></button>`,
      )
      .join("");
  }
  function show() {
    const item = items[active];
    stage.dataset.direction = direction;
    stage.innerHTML = slideHtml(item, active, items.length);
    stage.querySelectorAll(".photo").forEach(fitPhoto);
    paintDots();
  }
  function restartProgress() {
    const dot = dots.querySelector('[aria-current="true"]');
    if (!dot) return;
    dot.classList.remove("is-running");
    void dot.offsetWidth;
    dot.classList.add("is-running");
  }
  function schedule() {
    clearTimeout(timer);
    timer = 0;
    section.classList.toggle("is-paused", holds.size > 0);
    if (items.length < 2 || prefersReducedMotion()) {
      dots
        .querySelector('[aria-current="true"]')
        ?.classList.remove("is-running");
      return;
    }
    if (holds.size) return;
    restartProgress();
    timer = setTimeout(() => go(1), CAROUSEL_DELAY);
  }
  function go(step) {
    direction = step > 0 ? "next" : "prev";
    active = (active + step + items.length) % items.length;
    show();
    schedule();
  }
  function goTo(index) {
    if (index === active) return;
    direction = index > active ? "next" : "prev";
    active = index;
    show();
    schedule();
  }
  const hold = (key) => {
    holds.add(key);
    schedule();
  };
  const release = (key) => {
    holds.delete(key);
    schedule();
  };

  dots.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("[data-slide]");
      if (button) goTo(Number(button.dataset.slide));
    },
    opts,
  );
  const pointerArea = section;
  pointerArea.addEventListener(
    "pointerenter",
    (event) => event.pointerType === "mouse" && hold("hover"),
    opts,
  );
  pointerArea.addEventListener(
    "pointerleave",
    (event) => event.pointerType === "mouse" && release("hover"),
    opts,
  );
  stage.addEventListener("focusin", () => hold("focus"), opts);
  stage.addEventListener("focusout", () => release("focus"), opts);
  document.addEventListener(
    "visibilitychange",
    () => (document.hidden ? hold("hidden") : release("hidden")),
    opts,
  );
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) =>
        entry.isIntersecting ? release("offscreen") : hold("offscreen"),
      { threshold: 0.25 },
    );
    observer.observe(section);
    abort.signal.addEventListener("abort", () => observer.disconnect());
  }
  function openActive() {
    hold("dialog");
    const dialog = openProductDetails(items[active]);
    dialog.addEventListener("close", () => release("dialog"), { once: true });
  }
  stage.addEventListener(
    "click",
    (event) => {
      if (event.target.closest(".featured-slide")) openActive();
    },
    opts,
  );
  stage.addEventListener(
    "keydown",
    (event) => {
      if (!event.target.closest(".featured-slide")) return;
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        openActive();
      } else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    },
    opts,
  );
  let touchX = 0,
    touchY = 0;
  stage.addEventListener(
    "touchstart",
    (event) => {
      touchX = event.changedTouches[0].clientX;
      touchY = event.changedTouches[0].clientY;
      hold("touch");
    },
    touchOpts,
  );
  const endTouch = (event) => {
    const dx = event.changedTouches[0].clientX - touchX,
      dy = event.changedTouches[0].clientY - touchY;
    holds.delete("touch");
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2)
      go(dx < 0 ? 1 : -1);
    else schedule();
  };
  stage.addEventListener("touchend", endTouch, touchOpts);
  stage.addEventListener("touchcancel", () => release("touch"), touchOpts);
  window.addEventListener(
    "resize",
    () => stage.querySelectorAll(".photo").forEach(fitPhoto),
    touchOpts,
  );

  carouselCleanup = () => {
    clearTimeout(timer);
    abort.abort();
  };
  show();
  schedule();
}

/* ---------- Popup de detalhes da peça ---------- */
/* ---------- Link da peça, mensagem do WhatsApp e compartilhamento ---------- */
const siteOrigin = /^https?:$/.test(location.protocol)
  ? location.origin
  : "https://espaco-dellas-cyan.vercel.app";
const productKey = (product) => String(product.slug || product.id || "");
function productLink(product) {
  const key = productKey(product);
  return key
    ? `${siteOrigin}/p/${encodeURIComponent(key)}`
    : `${siteOrigin}/catalogo.html`;
}
function priceLine(product) {
  const info = priceParts(product);
  if (info.kind === "unit")
    return info.old ? `de ${info.old} por ${info.now}` : `${info.now} (oferta)`;
  if (info.kind === "bundle")
    return info.note ? `${info.now} · ${info.note}` : info.now;
  if (info.kind === "separate") return `${info.prefix} ${info.now}`;
  return info.now;
}
function productSummary(product) {
  const sizes = splitList(product.sizes),
    colors = splitList(product.colors),
    lines = [`*${product.name || "Peça Dellas"}*`];
  lines.push(
    `${product.category || "Novidades"} · ${priceLine(product)}`.replace(
      / · Consulte o valor$/,
      "",
    ),
  );
  if (sizes.length) lines.push(`Tamanhos: ${sizes.join(", ")}`);
  if (colors.length) lines.push(`Cores: ${colors.join(", ")}`);
  return lines.join("\n").replace(/\u00a0/g, " ");
}
/* Mensagem pronta: apresenta a peça e leva o link com a foto (prévia). */
function whatsappMessage(product) {
  return [
    "Olá! Tenho interesse nesta peça da Espaço Dellas:",
    "",
    productSummary(product),
    "",
    "Ela está disponível?",
    productLink(product),
  ].join("\n");
}
let toastTimer = 0;
function showToast(message) {
  let node = $("#dellasToast");
  if (!node) {
    node = document.createElement("div");
    node.id = "dellasToast";
    node.className = "dellas-toast";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    document.body.append(node);
  }
  /* Dentro do popup aberto o aviso precisa ficar na mesma "camada" para aparecer. */
  const host = document.querySelector("dialog[open]") || document.body;
  if (node.parentNode !== host) host.append(node);
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2400);
}
async function shareProduct(product) {
  const url = productLink(product),
    title = `${product.name || "Peça"} — Espaço Dellas`,
    text = `Olha essa peça da Espaço Dellas:\n*${product.name || "Peça Dellas"}*`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    showToast("Link da peça copiado!");
  } catch {
    const field = document.createElement("textarea");
    field.value = `${text}\n${url}`;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;opacity:0;top:0";
    /* Com o popup aberto, o resto da página fica "inerte": o campo precisa estar dentro dele. */
    (document.querySelector("dialog[open]") || document.body).append(field);
    field.focus();
    field.select();
    try {
      document.execCommand("copy");
      showToast("Link da peça copiado!");
    } catch {
      showToast("Não foi possível copiar o link.");
    }
    field.remove();
  }
}
/* Endereço da peça aberta (?peca=) para voltar/compartilhar a mesma tela. */
function setPieceInUrl(product) {
  try {
    const url = new URL(location.href);
    if (product) url.searchParams.set("peca", productKey(product));
    else url.searchParams.delete("peca");
    history.replaceState(history.state, "", url);
  } catch {}
}

const GALLERY_DELAY = 4600;
let galleryCleanup = null;
function ensureProductDialog() {
  let dialog = $("#productDetailDialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "productDetailDialog";
  dialog.className = "product-detail-dialog";
  dialog.setAttribute("aria-labelledby", "detailProductName");
  dialog.innerHTML =
    '<button class="product-detail-close" type="button" aria-label="Fechar detalhes">×</button><div class="product-detail-layout"><div class="product-detail-media"><div class="product-detail-visual"><div class="product-detail-placeholder" hidden></div></div><div class="product-detail-dots" role="group" aria-label="Fotos da peça" hidden></div></div><div class="product-detail-copy"><small class="product-detail-category"></small><h2 id="detailProductName"></h2><p class="product-detail-description"></p><div class="product-detail-variants"></div><div class="product-detail-price"></div><div class="product-detail-actions"><a class="product-detail-contact" target="_blank" rel="noopener">Consultar pelo WhatsApp</a><button class="product-detail-share" type="button"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 8a3 3 0 1 0-2.8-4.1A3 3 0 0 0 18 8ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Compartilhar</span></button></div></div></div>';
  document.body.append(dialog);
  dialog
    .querySelector(".product-detail-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    galleryCleanup?.();
    galleryCleanup = null;
    scrollLock.unlock("dialog");
    setPieceInUrl(null);
  });
  dialog
    .querySelector(".product-detail-share")
    .addEventListener("click", () => {
      if (dialog.currentProduct) shareProduct(dialog.currentProduct);
    });
  return dialog;
}
function startGallery(dialog) {
  galleryCleanup?.();
  const slides = [...dialog.querySelectorAll(".product-detail-photo")],
    dotsBox = dialog.querySelector(".product-detail-dots"),
    media = dialog.querySelector(".product-detail-media"),
    fits = slides.map(fitPhoto);
  dotsBox.hidden = slides.length < 2;
  dotsBox.innerHTML =
    slides.length > 1
      ? slides
          .map(
            (_, i) =>
              `<button class="gallery-dot" type="button" aria-label="Ver foto ${i + 1} de ${slides.length}" data-photo="${i}"></button>`,
          )
          .join("")
      : "";
  const abort = new AbortController(),
    opts = { signal: abort.signal },
    touchOpts = { signal: abort.signal, passive: true },
    holds = new Set();
  let index = 0,
    timer = 0;
  function paint() {
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === index);
      slide.setAttribute("aria-hidden", String(i !== index));
    });
    dotsBox.querySelectorAll("button").forEach((dot, i) => {
      dot.setAttribute("aria-current", String(i === index));
      dot.classList.remove("is-running");
    });
  }
  function schedule() {
    clearTimeout(timer);
    timer = 0;
    dotsBox.classList.toggle("is-paused", holds.size > 0);
    const dot = dotsBox.querySelector('[aria-current="true"]');
    if (slides.length < 2 || prefersReducedMotion()) {
      dot?.classList.remove("is-running");
      return;
    }
    if (holds.size) return;
    if (dot) {
      dot.classList.remove("is-running");
      void dot.offsetWidth;
      dot.classList.add("is-running");
    }
    timer = setTimeout(() => go(1), GALLERY_DELAY);
  }
  function go(step) {
    index = (index + step + slides.length) % slides.length;
    paint();
    schedule();
  }
  function goTo(next) {
    index = next;
    paint();
    schedule();
  }
  dotsBox.addEventListener(
    "click",
    (event) => {
      const dot = event.target.closest("[data-photo]");
      if (dot) goTo(Number(dot.dataset.photo));
    },
    opts,
  );
  media.addEventListener(
    "pointerenter",
    (event) => {
      if (event.pointerType === "mouse") {
        holds.add("hover");
        schedule();
      }
    },
    opts,
  );
  media.addEventListener(
    "pointerleave",
    (event) => {
      if (event.pointerType === "mouse") {
        holds.delete("hover");
        schedule();
      }
    },
    opts,
  );
  let startX = 0,
    startY = 0;
  media.addEventListener(
    "touchstart",
    (event) => {
      startX = event.changedTouches[0].clientX;
      startY = event.changedTouches[0].clientY;
      holds.add("touch");
      schedule();
    },
    touchOpts,
  );
  media.addEventListener(
    "touchend",
    (event) => {
      const dx = event.changedTouches[0].clientX - startX,
        dy = event.changedTouches[0].clientY - startY;
      holds.delete("touch");
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2)
        go(dx < 0 ? 1 : -1);
      else schedule();
    },
    touchOpts,
  );
  media.addEventListener(
    "touchcancel",
    () => {
      holds.delete("touch");
      schedule();
    },
    touchOpts,
  );
  dialog.addEventListener(
    "keydown",
    (event) => {
      if (slides.length < 2) return;
      if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    },
    opts,
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) holds.add("hidden");
      else holds.delete("hidden");
      schedule();
    },
    opts,
  );
  window.addEventListener(
    "resize",
    () => fits.forEach((apply) => apply()),
    touchOpts,
  );
  paint();
  schedule();
  requestAnimationFrame(() => fits.forEach((apply) => apply()));
  galleryCleanup = () => {
    clearTimeout(timer);
    abort.abort();
  };
}
function openProductDetails(product) {
  const dialog = ensureProductDialog(),
    images = [
      ...new Set(
        [
          ...(Array.isArray(product.gallery_images)
            ? product.gallery_images
            : []),
          product.image_url,
        ]
          .filter(Boolean)
          .map(safeUrl)
          .filter((url) => url !== "#"),
      ),
    ],
    visual = dialog.querySelector(".product-detail-visual"),
    placeholder = dialog.querySelector(".product-detail-placeholder"),
    alt = product.image_alt || product.name || "Foto da peça";
  visual
    .querySelectorAll(".photo, .product-detail-badge")
    .forEach((node) => node.remove());
  visual.insertAdjacentHTML(
    "afterbegin",
    images
      .map((url, i) =>
        photoHtml(url, i === 0 ? alt : `${alt} — foto ${i + 1}`, {
          eager: true,
          extra: "product-detail-photo",
        }),
      )
      .join(""),
  );
  placeholder.hidden = !!images.length;
  placeholder.innerHTML = images.length
    ? ""
    : productArt(product, 1, { flag: false });
  const flag = flagFor(product);
  if (flag)
    visual.insertAdjacentHTML(
      "beforeend",
      `<span class="product-detail-badge" data-kind="${flag.kind}">${esc(flag.label)}</span>`,
    );
  dialog.querySelector(".product-detail-category").textContent =
    product.category || "Novidades";
  dialog.querySelector("#detailProductName").textContent =
    product.name || "Peça Dellas";
  dialog.querySelector(".product-detail-description").textContent =
    product.description ||
    "Uma escolha especial da Espaço Dellas. Consulte nossa equipe para saber mais.";

  const chips = (label, list) =>
    list.length
      ? `<div class="detail-group"><b>${label}</b><ul>${list.map((entry) => `<li>${esc(entry)}</li>`).join("")}</ul></div>`
      : "";
  const variants = [
    chips("Tamanhos", splitList(product.sizes)),
    chips("Cores", splitList(product.colors)),
  ];
  if (product.set_mode === "separate") {
    const part = (label, name, price) =>
      name
        ? `<div class="detail-group detail-part"><b>${label}</b><span>${esc(name)}${positive(price) ? ` <em>${money(price)}</em>` : ""}</span></div>`
        : "";
    variants.push(
      part("Parte de cima", product.top_name, product.top_price),
      part("Parte de baixo", product.bottom_name, product.bottom_price),
    );
  }
  dialog.querySelector(".product-detail-variants").innerHTML =
    variants.join("");

  const info = priceParts(product),
    priceBox = dialog.querySelector(".product-detail-price");
  priceBox.innerHTML = `<div class="detail-price-main">${priceHtml(product, { notes: false })}${info.kind === "unit" && info.pct >= 1 ? `<span class="price-save">−${info.pct}%</span>` : ""}</div>${info.kind === "bundle" ? `<div class="detail-offer"><b>${info.note || `Leve ${info.now}`}</b>${info.each ? `<small>${esc(info.each)}</small>` : ""}</div>` : ""}`;

  dialog.currentProduct = product;
  const contact = dialog.querySelector(".product-detail-contact");
  contact.href = whatsappHref($("#catalogCta")?.href, whatsappMessage(product));
  contact.setAttribute(
    "aria-label",
    `Consultar ${product.name || "peça"} pelo WhatsApp`,
  );
  dialog.scrollTop = 0;
  dialog.showModal();
  scrollLock.lock("dialog");
  setPieceInUrl(product);
  startGallery(dialog);
  return dialog;
}

/* Só mede os tamanhos/cores dos cards que estão perto da tela. */
let metaObserver = null;
function observeMeta(grid) {
  if (!("IntersectionObserver" in window)) {
    requestAnimationFrame(() => fitMetaLists(grid));
    return;
  }
  metaObserver?.disconnect();
  metaObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        fitMetaLists(entry.target);
        metaObserver.unobserve(entry.target);
      }),
    { rootMargin: "400px 0px" },
  );
  grid
    .querySelectorAll(".product-card")
    .forEach((card) => metaObserver.observe(card));
}
const catalogState = { category: "Todos", signature: "", rows: [] };
/* Esqueleto: mostra o desenho da página na hora, sem "tela vazia". */
function showSkeleton() {
  const grid = $("#productGrid"),
    stage = $("#featuredCarousel"),
    section = $(".feature-stage");
  $("#catalogEmpty").hidden = true;
  grid.hidden = false;
  grid.setAttribute("aria-busy", "true");
  grid.innerHTML = Array.from(
    { length: 6 },
    () =>
      '<article class="product-card is-skeleton" aria-hidden="true"><div class="product-art"></div><div class="product-info"><i></i><i></i><i></i></div></article>',
  ).join("");
  if (section && stage) {
    section.hidden = false;
    stage.innerHTML =
      '<article class="featured-slide is-skeleton" aria-hidden="true"><div class="featured-image"></div><div class="featured-copy"><i></i><i></i><i></i></div></article>';
  }
}
/* ---------- Grade de peças ---------- */
function renderProducts(rows) {
  const grid = $("#productGrid"),
    empty = $("#catalogEmpty"),
    published = rows.filter((item) => isOn(item.enabled));
  grid.removeAttribute("aria-busy");
  renderCarousel(published);
  empty.hidden = published.length > 0;
  grid.hidden = !published.length;
  if (!published.length) {
    grid.innerHTML = "";
    return;
  }
  const categories = [
    "Todos",
    ...new Set(published.map((item) => item.category || "Novidades")),
  ];
  if (!categories.includes(catalogState.category))
    catalogState.category = "Todos";
  $("#categoryFilters").innerHTML = categories
    .map(
      (category) =>
        `<button class="category-filter" type="button" data-category="${esc(category)}" aria-pressed="${category === catalogState.category}">${esc(category)}</button>`,
    )
    .join("");
  const drawerCategories = $("#drawerCategories");
  if (drawerCategories)
    drawerCategories.innerHTML = categories
      .map(
        (category) =>
          `<button class="drawer-category" type="button" data-category="${esc(category)}" aria-pressed="${category === catalogState.category}">${esc(category)}</button>`,
      )
      .join("");
  const contactBase = $("#catalogCta").href;
  grid.innerHTML = published
    .map((product, index) => {
      const contactHref = whatsappHref(contactBase, whatsappMessage(product));
      const search = plain(
        `${product.name} ${product.category || ""} ${product.description || ""} ${product.colors || ""}`,
      );
      return `<article class="product-card" tabindex="0" role="button" aria-haspopup="dialog" aria-label="Ver detalhes de ${esc(product.name)}" data-product-category="${esc(product.category || "Novidades")}" data-search="${esc(search)}">${productArt(product, index)}<div class="product-info"><small>${esc(product.category || "NOVIDADES")}${product.is_demo ? " · DEMONSTRAÇÃO" : ""}</small><h2>${esc(product.name)}</h2><p>${esc(product.description || "Consulte detalhes com a nossa equipe.")}</p>${metaHtml(product)}<div class="product-buy"><span class="product-price">${priceHtml(product)}${product.is_demo ? "<small>VALOR ILUSTRATIVO</small>" : ""}</span><a href="${esc(contactHref)}" target="_blank" rel="noopener" aria-label="Consultar ${esc(product.name)}">Consultar</a></div></div></article>`;
    })
    .join("");
  const productByCard = new Map(
    [...grid.querySelectorAll(".product-card")].map((card, index) => [
      card,
      published[index],
    ]),
  );
  grid.onclick = (event) => {
    const card = event.target.closest(".product-card");
    if (!card || event.target.closest("a,button")) return;
    openProductDetails(productByCard.get(card));
  };
  grid.onkeydown = (event) => {
    const card = event.target.closest(".product-card");
    if (!card || event.target !== card || !["Enter", " "].includes(event.key))
      return;
    event.preventDefault();
    openProductDetails(productByCard.get(card));
  };
  function filterCards() {
    const query = plain($("#catalogSearch").value.trim());
    grid.querySelectorAll(".product-card").forEach((card) => {
      card.hidden =
        (catalogState.category !== "Todos" &&
          card.dataset.productCategory !== catalogState.category) ||
        !card.dataset.search.includes(query);
    });
    requestAnimationFrame(() => fitMetaLists(grid));
  }
  $("#catalogSearch").oninput = filterCards;
  $("#categoryFilters").onclick = (event) => {
    const button = event.target.closest(".category-filter");
    if (!button) return;
    catalogState.category = button.dataset.category;
    $("#categoryFilters")
      .querySelectorAll("button")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    drawerCategories
      ?.querySelectorAll("button")
      .forEach((item) =>
        item.setAttribute(
          "aria-pressed",
          String(item.dataset.category === catalogState.category),
        ),
      );
    filterCards();
  };
  if (drawerCategories)
    drawerCategories.onclick = (event) => {
      const button = event.target.closest(".drawer-category");
      if (!button) return;
      const selected = Array.from(
        $("#categoryFilters").querySelectorAll(".category-filter"),
      ).find((item) => item.dataset.category === button.dataset.category);
      selected?.click();
      const toggle = $("#catalogMenuToggle");
      if (toggle?.getAttribute("aria-expanded") === "true") toggle.click();
      requestAnimationFrame(() =>
        $("#categoryFilters").scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        }),
      );
    };
  if (catalogState.category !== "Todos" || $("#catalogSearch").value.trim())
    filterCards();
  else observeMeta(grid);
  const warm = (event) => {
    const card = event.target.closest?.(".product-card");
    if (card && productByCard.has(card)) warmProduct(productByCard.get(card));
  };
  grid.onpointerover = warm;
  grid.ontouchstart = warm;
  /* Fotos mais "quentes": as 4 primeiras peças já ficam prontas. */
  published.slice(0, 4).forEach(warmProduct);
}

/* Se uma miniatura não existir (fotos antigas), usa a foto original. */
document.addEventListener(
  "error",
  (event) => {
    if (event.target instanceof HTMLImageElement) thumbFallback(event.target);
  },
  true,
);
/* Ao encostar numa peça, já baixa a foto grande: o popup abre instantâneo. */
const warmed = new Set();
function warmProduct(product) {
  [
    product.image_url,
    ...(Array.isArray(product.gallery_images) ? product.gallery_images : []),
  ]
    .filter(Boolean)
    .slice(0, 4)
    .forEach((url) => {
      const full = safeUrl(url);
      if (full === "#" || warmed.has(full)) return;
      warmed.add(full);
      new Image().src = full;
    });
}

/* "Ver peças" desce até a barra de busca. */
function setupSeeProducts() {
  const button = $("#seeProducts");
  if (!button) return;
  button.addEventListener("click", (event) => {
    const target = $(".catalog-search");
    if (!target) return;
    event.preventDefault();
    const offset = window.innerWidth <= 760 ? 84 : 96,
      top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  });
}
const SETTINGS_PATH = "link_page_settings?id=eq.1&select=*&limit=1";
const LINKS_PATH =
  "link_page_links?profile_id=is.null&select=*&order=sort_order.asc&limit=100";
const PRODUCTS_PATH =
  "link_page_products?profile_id=is.null&enabled=eq.true&select=*&order=sort_order.asc,created_at.asc&limit=200";
const publicProducts = (rows) =>
  rows.filter(
    (item) =>
      item.enabled !== false &&
      String(item.enabled) !== "false" &&
      item.is_demo !== true &&
      String(item.is_demo) !== "true",
  );
/* Abre a peça indicada em ?peca= (link compartilhado). */
let deepLinkDone = false;
function openFromUrl() {
  if (deepLinkDone || !catalogState.rows.length) return;
  const key = new URLSearchParams(location.search).get("peca");
  if (!key) {
    deepLinkDone = true;
    return;
  }
  const product = catalogState.rows.find(
    (item) => String(item.slug) === key || String(item.id) === key,
  );
  if (!product) return;
  deepLinkDone = true;
  openProductDetails(product);
}
async function init() {
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
  const drawerYear = $("#drawerYear");
  if (drawerYear) drawerYear.textContent = new Date().getFullYear();
  const localPreview =
    location.protocol === "file:" ||
    ["localhost", "127.0.0.1"].includes(location.hostname);

  /* 1) Pinta na hora com o que a visita anterior guardou. */
  applySettings({ ...DEFAULT, ...(cacheGet("settings") || {}) });
  let firstLoad = true;
  const loadSettings = () =>
    (firstLoad ? early("settings", SETTINGS_PATH) : read(SETTINGS_PATH))
      .then((rows) => {
        const row = rows[0] || {};
        if (JSON.stringify(row) !== JSON.stringify(cacheGet("settings"))) {
          cacheSet("settings", row);
          applySettings({ ...DEFAULT, ...row });
        }
      })
      .catch(() => {});

  let loadContent;
  if (!isCatalog) {
    let signature = "";
    const showLinks = (rows) => {
      const next = JSON.stringify(rows);
      if (next === signature) return;
      signature = next;
      renderLinks(rows);
    };
    const cached = cacheGet("links");
    if (cached?.length) showLinks(cached);
    else renderLinks([]);
    loadContent = () =>
      (firstLoad ? early("links", LINKS_PATH) : read(LINKS_PATH))
        .then((rows) => {
          cacheSet("links", rows);
          showLinks(rows);
        })
        .catch(() => {
          if (!signature) showLinks([]);
        });
  } else {
    const show = (rows) => {
      const list = localPreview ? [...rows, ...FALLBACK_PRODUCTS] : rows,
        next = JSON.stringify(list);
      if (next === catalogState.signature) return;
      catalogState.signature = next;
      catalogState.rows = list;
      renderProducts(list);
      openFromUrl();
    };
    const cached = cacheGet("products");
    if (cached?.rows?.length) show(cached.rows);
    else if (localPreview) show([]);
    else showSkeleton();
    loadContent = () =>
      (firstLoad ? early("products", PRODUCTS_PATH) : read(PRODUCTS_PATH))
        .then((rows) => {
          const publicRows = publicProducts(rows);
          cacheSet("products", { rows: publicRows, at: Date.now() });
          show(publicRows);
          deepLinkDone = true;
        })
        .catch((error) => {
          if (!catalogState.signature) show([]);
          if (localPreview)
            console.info(
              "Exibindo modelos locais de demonstração:",
              error.message,
            );
        });
  }
  const refresh = () => Promise.all([loadSettings(), loadContent()]);
  const first = refresh();
  firstLoad = false;
  await first;

  /* 2) Mudanças feitas no painel aparecem sozinhas, sem recarregar. */
  let lastRefresh = Date.now();
  const refreshSoon = () => {
    if (document.hidden || Date.now() - lastRefresh < 4000) return;
    lastRefresh = Date.now();
    refresh();
  };
  document.addEventListener("visibilitychange", refreshSoon);
  window.addEventListener(
    "pageshow",
    (event) => event.persisted && refreshSoon(),
  );
  window.addEventListener("online", refreshSoon);
  setInterval(refreshSoon, 45000);
}
setupTicker();
setupCatalogMenu();
setupSeeProducts();
const share = $("#shareBtn");
if (share)
  share.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: location.href });
        return;
      }
      await navigator.clipboard.writeText(location.href);
      share.classList.add("copied");
      share.lastChild.textContent = " Link copiado";
      setTimeout(() => {
        share.classList.remove("copied");
        share.lastChild.textContent = " Compartilhar";
      }, 1600);
    } catch {}
  });
init();
