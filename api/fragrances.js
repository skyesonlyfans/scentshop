export default async function handler(req, res) {
  const search = String(req.query.search || "").trim();

  if (!search) {
    return res.status(400).json({
      error: "Missing search query."
    });
  }

  const apiKey = process.env.FRAGELLA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "FRAGELLA_API_KEY is not configured in Vercel."
    });
  }

  try {
    const fragellaUrl =
      `https://api.fragella.com/api/v1/fragrances?search=${encodeURIComponent(search)}`;

    const fragellaResponse = await fetch(fragellaUrl, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json"
      }
    });

    const rawText = await fragellaResponse.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        error: "Fragella returned a non-JSON response.",
        status: fragellaResponse.status,
        raw: rawText.slice(0, 500)
      });
    }

    if (!fragellaResponse.ok) {
      return res.status(fragellaResponse.status).json({
        error: "Fragella API request failed.",
        status: fragellaResponse.status,
        details: data
      });
    }

    const list = getFragranceList(data);

    const normalized = list.map((item, index) => normalizeFragrance(item, index));

    return res.status(200).json({
      query: search,
      count: normalized.length,
      fragrances: normalized,
      rawShape: Array.isArray(data)
        ? "array"
        : Object.keys(data || {})
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to reach Fragella API.",
      message: error?.message || "Unknown server error"
    });
  }
}

function getFragranceList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.fragrances)) return data.fragrances;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.matches)) return data.matches;

  if (data?.fragrance) return [data.fragrance];
  if (data?.result) return [data.result];

  return [];
}

function normalizeFragrance(item, index) {
  const brand =
    item.brand ||
    item.brand_name ||
    item.brandName ||
    item.house ||
    item.designer ||
    item.maker ||
    "Unknown brand";

  const name =
    item.name ||
    item.fragrance_name ||
    item.fragranceName ||
    item.title ||
    item.product_name ||
    item.productName ||
    "Untitled fragrance";

  const description =
    item.description ||
    item.summary ||
    item.about ||
    item.overview ||
    item.short_description ||
    item.shortDescription ||
    item.text ||
    buildDescriptionFromNotes(item) ||
    "Description unavailable.";

  const image =
    item.image ||
    item.image_url ||
    item.imageUrl ||
    item.photo ||
    item.photo_url ||
    item.thumbnail ||
    item.thumbnail_url ||
    item.main_image ||
    item.mainImage ||
    item.bottle_image ||
    item.bottleImage ||
    "";

  return {
    id: item.id || item.slug || `${brand}-${name}-${index}`,
    name,
    brand,
    description,
    image,
    gender:
      item.gender ||
      item.type ||
      item.category ||
      item.concentration ||
      "Fragrance",
    year:
      item.year ||
      item.release_year ||
      item.releaseYear ||
      "",
    accords:
      item.accords || [],
    top_notes:
      item.top_notes || item.topNotes || item.top || [],
    middle_notes:
      item.middle_notes || item.middleNotes || item.heart_notes || item.heartNotes || item.middle || [],
    base_notes:
      item.base_notes || item.baseNotes || item.base || [],
    raw: item
  };
}

function buildDescriptionFromNotes(item) {
  const top = item.top_notes || item.topNotes || item.top || [];
  const middle =
    item.middle_notes ||
    item.middleNotes ||
    item.heart_notes ||
    item.heartNotes ||
    item.middle ||
    [];
  const base = item.base_notes || item.baseNotes || item.base || [];

  const parts = [];

  if (Array.isArray(top) && top.length) {
    parts.push(`Top notes include ${top.join(", ")}`);
  }

  if (Array.isArray(middle) && middle.length) {
    parts.push(`middle notes include ${middle.join(", ")}`);
  }

  if (Array.isArray(base) && base.length) {
    parts.push(`base notes include ${base.join(", ")}`);
  }

  return parts.length ? `${parts.join("; ")}.` : "";
}
