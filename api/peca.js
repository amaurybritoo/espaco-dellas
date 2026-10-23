/* Página de compartilhamento de uma peça: /p/<slug>
   - WhatsApp, Instagram e afins leem as etiquetas Open Graph daqui e mostram
     a foto, o nome e o preço da peça na conversa;
   - quem clica é levado direto ao catálogo, com a peça já aberta. */
const SUPABASE_URL = "https://awlecfmaivubbxlfvysz.supabase.co";
const SUPABASE_KEY = "sb_publishable_3p9Rdi65L_3RkKDAKYQRjw_FpF0wOOd";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const brl = (value) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const positive = (value) =>
  Number(value) > 0 && Number.isFinite(Number(value)) ? Number(value) : 0;

function priceText(product) {
  const price = positive(product.price),
    promo = positive(product.promo_price),
    qty = Math.floor(Number(product.promo_qty));
  if (product.promo_type === "unit" && promo) return `por ${brl(promo)}`;
  if (product.promo_type === "bundle" && promo && qty >= 2)
    return `leve ${qty} por ${brl(promo)}`;
  return price ? brl(price) : "";
}
/* A foto vai por /api/foto, que a converte em JPEG (WhatsApp não exibe WebP). */
function previewImage(product, origin) {
  const gallery = Array.isArray(product.gallery_images)
      ? product.gallery_images
      : [],
    url = String(product.image_url || gallery[0] || "");
  if (!/^https:\/\//.test(url)) return "";
  const match = url.match(
    /\/storage\/v1\/object\/public\/link-assets\/(products\/[\w.\-]+)$/,
  );
  return match && origin
    ? `${origin}/api/foto?p=${encodeURIComponent(match[1])}`
    : url;
}
function page({ title, description, image, target, origin, canonical }) {
  const tags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Espaço Dellas">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    image ? `<meta property="og:image" content="${esc(image)}">` : "",
    image ? `<meta property="og:image:alt" content="${esc(title)}">` : "",
    image.includes("/api/foto")
      ? `<meta property="og:image:type" content="image/jpeg">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`
      : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    image ? `<meta name="twitter:image" content="${esc(image)}">` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${tags}
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body style="font-family:system-ui,sans-serif;background:#f1ece6;color:#3a2a20;text-align:center;padding:48px 20px">
<p>Abrindo a peça… <a href="${esc(target)}">Toque aqui se não abrir sozinho.</a></p>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const slug = String(req.query?.slug || "")
      .trim()
      .slice(0, 160),
    host = req.headers["x-forwarded-host"] || req.headers.host || "",
    origin = host ? `https://${host}` : "";
  const target = `${origin}/catalogo.html${slug ? `?peca=${encodeURIComponent(slug)}` : ""}`;
  let product = null;
  if (slug) {
    try {
      const column =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          slug,
        )
          ? "id"
          : "slug";
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/link_page_products?${column}=eq.${encodeURIComponent(slug)}&enabled=eq.true&select=name,category,description,price,promo_type,promo_price,promo_qty,image_url,gallery_images&limit=1`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        },
      );
      if (response.ok) product = (await response.json())[0] || null;
    } catch {}
  }
  let html;
  if (product) {
    const price = priceText(product),
      lead = [product.category, price].filter(Boolean).join(" · "),
      about = String(product.description || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 140);
    html = page({
      title: `${product.name} — Espaço Dellas`,
      description: [lead, about || "Toque para ver os detalhes da peça."]
        .filter(Boolean)
        .join(" — "),
      image:
        previewImage(product, origin) ||
        (origin ? `${origin}/assets/dellas-og.jpg` : ""),
      target,
      origin,
      canonical: `${origin}/p/${encodeURIComponent(slug)}`,
    });
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=600",
    );
  } else {
    html = page({
      title: "Catálogo — Espaço Dellas",
      description:
        "Peças escolhidas para acompanhar seus dias com personalidade, conforto e leveza.",
      image: origin ? `${origin}/assets/dellas-og.jpg` : "",
      target: `${origin}/catalogo.html`,
      origin,
      canonical: `${origin}/catalogo.html`,
    });
    res.setHeader("Cache-Control", "public, s-maxage=30");
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
};
