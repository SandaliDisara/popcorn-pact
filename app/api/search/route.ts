import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        accept: "application/json",
      },
    },
  );

  if (!res.ok) {
    return NextResponse.json({ error: "TMDB request failed" }, { status: 500 });
  }

  const data = await res.json();

  // Trim to just what we need
  const results = data.results.slice(0, 8).map((m: any) => ({
    tmdb_id: m.id,
    title: m.title,
    year: m.release_date ? m.release_date.split("-")[0] : "",
    poster_path: m.poster_path,
  }));

  return NextResponse.json({ results });
}
