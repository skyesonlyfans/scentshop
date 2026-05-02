export default async function handler(req, res) {
  const search = String(req.query.search || req.query.q || "").trim();

  if (!search) {
    return res.status(400).json({
      error: "Missing search query."
    });
  }

  const rapidApiKey = process.env.RAPIDAPI_KEY;

  if (!rapidApiKey) {
    return res.status(500).json({
      error: "RAPIDAPI_KEY is not configured in Vercel."
    });
  }

  try {
    const apiUrl =
      `https://fragrancefinder-api.p.rapidapi.com/perfumes/search?q=${encodeURIComponent(search)}`;

    const apiResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "fragrancefinder-api.p.rapidapi.com",
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });

    const rawText = await apiResponse.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        error: "Fragrance Finder returned a non-JSON response.",
        status: apiResponse.status,
        raw: rawText.slice(0, 800)
      });
    }

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({
        error: "Fragrance Finder API request failed.",
        status: apiResponse.status,
        details: data
      });
    }

    const list = getFragranceList(data);
    const normalized = list.map((item, index) =>
      normalizeFragrance(item, index)
    );

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
      error: "Unable to reach Fragrance Finder API.",
      message: error?.message || "Unknown server error"
    });
  }
}

function getFragranceList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.perfumes)) return data.perfumes;
  if (Array.isArray(data?.fragrances)) return data.fragrances;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.matches)) return data.matches;

  if (data?.perfume) return [data.perfume];
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
    item.company ||
    "Unknown brand";

  const name =
    item.name ||
    item.perfume ||
    item.perfume_name ||
    item.perfumeName ||
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
    item.picture ||
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
    accords: normalizeArray(
      item.accords ||
      item.main_accords ||
      item.mainAccords
    ),
    top_notes: normalizeArray(
      item.top_notes ||
      item.topNotes ||
      item.top
    ),
    middle_notes: normalizeArray(
      item.middle_notes ||
      item.middleNotes ||
      item.heart_notes ||
      item.heartNotes ||
      item.middle
    ),
    base_notes: normalizeArray(
      item.base_notes ||
      item.baseNotes ||
      item.base
    ),
    raw: item
  };
}

function normalizeArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.name || item?.label || item?.title || "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildDescriptionFromNotes(item) {
  const top = normalizeArray(
    item.top_notes ||
    item.topNotes ||
    item.top
  );

  const middle = normalizeArray(
    item.middle_notes ||
    item.middleNotes ||
    item.heart_notes ||
    item.heartNotes ||
    item.middle
  );

  const base = normalizeArray(
    item.base_notes ||
    item.baseNotes ||
    item.base
  );

  const parts = [];

  if (top.length) {
    parts.push(`Top notes include ${top.join(", ")}`);
  }

  if (middle.length) {
    parts.push(`middle notes include ${middle.join(", ")}`);
  }

  if (base.length) {
    parts.push(`base notes include ${base.join(", ")}`);
  }

  return parts.length ? `${parts.join("; ")}.` : "";
}
