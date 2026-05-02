import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  if (!search) {
    return NextResponse.json(
      { error: "Missing search query." },
      { status: 400 }
    );
  }

  const apiKey = process.env.FRAGELLA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "FRAGELLA_API_KEY is not configured." },
      { status: 500 }
    );
  }

  try {
    const fragellaResponse = await fetch(
      `https://api.fragella.com/api/v1/fragrances?search=${encodeURIComponent(search)}`,
      {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await fragellaResponse.json();

    if (!fragellaResponse.ok) {
      return NextResponse.json(
        {
          error: "Fragella API request failed.",
          details: data,
        },
        { status: fragellaResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to reach Fragella API.",
      },
      { status: 500 }
    );
  }
}
