export default async function handler(req, res) {
  const { search } = req.query;

  if (!search || typeof search !== "string") {
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
    const fragellaResponse = await fetch(
      `https://api.fragella.com/api/v1/fragrances?search=${encodeURIComponent(search)}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json"
        }
      }
    );

    const data = await fragellaResponse.json();

    if (!fragellaResponse.ok) {
      return res.status(fragellaResponse.status).json({
        error: "Fragella API request failed.",
        details: data
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Unable to reach Fragella API."
    });
  }
}
