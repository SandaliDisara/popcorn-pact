"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/superbase/client";

const IMG = "https://image.tmdb.org/t/p/w200";
const currentMonth = new Date().toISOString().slice(0, 7);

export default function WatchPage() {
  const supabase = createClient();
  const [me, setMe] = useState<string | null>(null);
  const [couple, setCouple] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]); // movies picked FOR me
  const [myRatings, setMyRatings] = useState<Record<string, any>>({});
  const [partnerRated, setPartnerRated] = useState(false);
  const [status, setStatus] = useState("");

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
    if (!c) return;

    // Movies my partner recommended to me this month
    const { data: recommendations } = await supabase
      .from("recommendations")
      .select("*")
      .eq("couple_id", c.id)
      .eq("recipient_id", user.id)
      .eq("month", currentMonth);
    setRecs(recommendations || []);

    // My own ratings so far
    const recIds = (recommendations || []).map((r) => r.id);
    if (recIds.length) {
      const { data: ratings } = await supabase
        .from("ratings")
        .select("*")
        .in("recommendation_id", recIds)
        .eq("rater_id", user.id);
      const map: Record<string, any> = {};
      (ratings || []).forEach((rt) => {
        map[rt.recommendation_id] = rt;
      });
      setMyRatings(map);
    }

    // Has my partner rated any of MY recommendations this month?
    const partnerId = c.partner_a === user.id ? c.partner_b : c.partner_a;
    if (partnerId) {
      const { data: myRecs } = await supabase
        .from("recommendations")
        .select("id")
        .eq("couple_id", c.id)
        .eq("recommender_id", user.id)
        .eq("month", currentMonth);
      const myRecIds = (myRecs || []).map((r) => r.id);
      if (myRecIds.length) {
        const { count } = await supabase
          .from("ratings")
          .select("*", { count: "exact", head: true })
          .in("recommendation_id", myRecIds)
          .eq("rater_id", partnerId);
        setPartnerRated((count || 0) > 0);
      }
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function rate(recId: string, stars: number) {
    if (!me) return;
    setStatus("Saving rating...");
    const { error } = await supabase
      .from("ratings")
      .upsert(
        { recommendation_id: recId, rater_id: me, stars },
        { onConflict: "recommendation_id,rater_id" },
      );
    if (error) setStatus(`Error: ${error.message}`);
    else {
      setStatus("Rated ✅");
      load();
    }
  }

  if (couple === null) {
    return (
      <main style={{ padding: 40 }}>
        <p>Loading…</p>
      </main>
    );
  }
  if (!couple) {
    return (
      <main style={{ padding: 40 }}>
        <p>
          You need to <a href="/pair">pair</a> first.
        </p>
      </main>
    );
  }

  const iHaveRated = Object.keys(myRatings).length > 0;
  const revealed = iHaveRated && partnerRated;

  return (
    <main style={{ padding: 40, maxWidth: 560, margin: "0 auto" }}>
      <h1>Movies for you 🍿</h1>
      <p>Picked by your partner for {currentMonth}.</p>

      {recs.length === 0 && (
        <p>No movies yet — your partner hasn't picked for this month.</p>
      )}

      {recs.map((r) => {
        const mine = myRatings[r.id];
        return (
          <div
            key={r.id}
            style={{
              display: "flex",
              gap: 14,
              marginTop: 20,
              paddingBottom: 20,
              borderBottom: "1px solid #eee",
            }}
          >
            {r.poster_path && (
              <img src={`${IMG}${r.poster_path}`} alt="" width={70} />
            )}
            <div style={{ flex: 1 }}>
              <strong>
                {r.movie_title} {r.release_year && `(${r.release_year})`}
              </strong>
              {r.note && (
                <p style={{ fontStyle: "italic", color: "#666" }}>"{r.note}"</p>
              )}

              {/* Star buttons */}
              <div style={{ marginTop: 8 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => rate(r.id, s)}
                    style={{
                      fontSize: 24,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: mine && s <= mine.stars ? "#f59e0b" : "#ddd",
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
              {mine && <small>You rated this {mine.stars}★</small>}
            </div>
          </div>
        );
      })}

      {/* Reveal status */}
      <div
        style={{
          marginTop: 32,
          padding: 16,
          borderRadius: 10,
          background: "#fdf2f8",
          textAlign: "center",
        }}
      >
        {revealed ? (
          <p>
            🎉 Both of you have rated! Head to the{" "}
            <a href="/history">history</a> to see everything.
          </p>
        ) : iHaveRated ? (
          <p>
            ⏳ You've rated — waiting on your partner before ratings unlock.
          </p>
        ) : (
          <p>Rate at least one movie to get the reveal going.</p>
        )}
      </div>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </main>
  );
}
