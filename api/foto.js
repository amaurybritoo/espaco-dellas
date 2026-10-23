/* Foto de prévia para WhatsApp/Instagram: /api/foto?p=products/<arquivo>
   Esses apps não mostram imagens WebP nas prévias de link; aqui a foto da peça
   é convertida para JPEG 1200x630 (foto inteira, sem cortar, sobre um fundo
   desfocado da própria foto). Se algo falhar, devolve a foto original. */
const SUPABASE_URL = "https://awlecfmaivubbxlfvysz.supabase.co";
const PATH_OK = /^products\/[\w.\-]{1,160}$/;

module.exports = async (req, res) => {
  const path = String(req.query?.p || "");
  if (!PATH_OK.test(path)) {
    res.statusCode = 400;
    return res.end("Pedido inválido");
  }
  const source = `${SUPABASE_URL}/storage/v1/object/public/link-assets/${path}`;
  try {
    const sharp = require("sharp");
    const response = await fetch(source);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const input = Buffer.from(await response.arrayBuffer());
    const [back, front] = await Promise.all([
      sharp(input)
        .rotate()
        .resize(1200, 630, { fit: "cover" })
        .blur(28)
        .modulate({ brightness: 1.06 })
        .toBuffer(),
      sharp(input).rotate().resize(1200, 630, { fit: "inside" }).toBuffer(),
    ]);
    const jpeg = await sharp(back)
      .composite([{ input: front, gravity: "centre" }])
      .flatten({ background: "#f1ece6" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    res.statusCode = 200;
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
    );
    res.end(jpeg);
  } catch {
    res.statusCode = 302;
    res.setHeader("Location", source);
    res.setHeader("Cache-Control", "public, s-maxage=60");
    res.end();
  }
};
