"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/superbase/client";

const IMG = "https://image.tmdb.org/t/p/w200";
const currentMonth = new Date().toISOString().slice(0, 7); // '2026-10'

type Movie = {
  tmdb_id: number;
  title: string;
  year: string;
  poster_path: string | null;
};

export default function RecommendPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [picks, setPicks] = useState<{ movie: Movie; note: string }[]>([]);
  const [couple, setCouple] = useState<any>(null);
  const [me, setMe] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  // Load couple + existing picks for this month
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setMe(user.id);

      const { data: c } = await supabase
        .from("couples")
        .select("*")
        .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
        .maybeSingle();
      setCouple(c);

      if (c) {
        const { data: existing } = await supabase
          .from("recommendations")
          .select("*")
          .eq("couple_id", c.id)
          .eq("recommender_id", user.id)
          .eq("month", currentMonth);
        if (existing) {
          setPicks(
            existing.map((r) => ({
              movie: {
                tmdb_id: r.tmdb_id,
                title: r.movie_title,
                year: r.release_year,
                poster_path: r.poster_path,
              },
              note: r.note || "",
            })),
          );
        }
      }
    }
    load();
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results || []);
  }

  function addPick(movie: Movie) {
    if (picks.length >= 2) {
      setStatus("You can only pick 2 movies per month!");
      return;
    }
    if (picks.some((p) => p.movie.tmdb_id === movie.tmdb_id)) return;
    setPicks([...picks, { movie, note: "" }]);
    setResults([]);
    setQuery("");
  }

  function updateNote(i: number, note: string) {
    const copy = [...picks];
    copy[i].note = note;
    setPicks(copy);
  }

  function removePick(i: number) {
    setPicks(picks.filter((_, idx) => idx !== i));
  }

  async function savePicks() {
    if (!couple || !me) return;
    setStatus("Saving...");
    const recipient =
      couple.partner_a === me ? couple.partner_b : couple.partner_a;
    if (!recipient) {
      setStatus("Your partner hasn't joined yet!");
      return;
    }

    // Clear this month's existing picks, then re-insert
    await supabase
      .from("recommendations")
      .delete()
      .eq("couple_id", couple.id)
      .eq("recommender_id", me)
      .eq("month", currentMonth);

    const rows = picks.map((p) => ({
      couple_id: couple.id,
      recommender_id: me,
      recipient_id: recipient,
      month: currentMonth,
      tmdb_id: p.movie.tmdb_id,
      movie_title: p.movie.title,
      poster_path: p.movie.poster_path,
      release_year: p.movie.year,
      note: p.note,
    }));

    const { error } = await supabase.from("recommendations").insert(rows);
    setStatus(error ? `Error: ${error.message}` : "Saved your picks ✅");
  }

  if (!couple) {
    return (
      <main style={{ padding: 40 }}>
        <p>
          You need to <a href="/pair">pair with your partner</a> first.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 40, maxWidth: 560, margin: "0 auto" }}>
      <h1>Pick 2 movies 🍿</h1>
      <p>For {currentMonth} — recommend 2 films to your partner.</p>

      {/* Search */}
      <form
        onSubmit={search}
        style={{ display: "flex", gap: 8, marginTop: 16 }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a movie..."
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: "#e11d48",
            color: "white",
            border: "none",
          }}
        >
          Search
        </button>
      </form>

      {/* Results */}
      {results.map((m) => (
        <div
          key={m.tmdb_id}
          onClick={() => addPick(m)}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: 8,
            cursor: "pointer",
            borderBottom: "1px solid #eee",
          }}
        >
          {m.poster_path && (
            <img src={`${IMG}${m.poster_path}`} alt="" width={40} />
          )}
          <span>
            {m.title} {m.year && `(${m.year})`}
          </span>
        </div>
      ))}

      {/* Your picks */}
      <h2 style={{ marginTop: 32 }}>Your picks ({picks.length}/2)</h2>
      {picks.map((p, i) => (
        <div
          key={p.movie.tmdb_id}
          style={{
            display: "flex",
            gap: 12,
            marginTop: 12,
            alignItems: "flex-start",
          }}
        >
          {p.movie.poster_path && (
            <img src={`${IMG}${p.movie.poster_path}`} alt="" width={60} />
          )}
          <div style={{ flex: 1 }}>
            <strong>
              {p.movie.title} {p.movie.year && `(${p.movie.year})`}
            </strong>
            <textarea
              value={p.note}
              onChange={(e) => updateNote(i, e.target.value)}
              placeholder="Add a little note..."
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: 8,
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
            <button
              onClick={() => removePick(i)}
              style={{
                marginTop: 4,
                color: "#e11d48",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {picks.length > 0 && (
        <button
          onClick={savePicks}
          style={{
            marginTop: 24,
            padding: 12,
            width: "100%",
            borderRadius: 8,
            background: "#e11d48",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Save my picks
        </button>
      )}

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </main>
  );
}
