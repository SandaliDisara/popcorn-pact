"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/superbase/client";

const IMG = "https://image.tmdb.org/t/p/w200";

export default function HistoryPage() {
  const supabase = createClient();
  const [me, setMe] = useState<string | null>(null);
  const [couple, setCouple] = useState<any>(null);
  const [months, setMonths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setMe(user.id);

      const { data: c } = await supabase
        .from("couples")
        .select("*")
        .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
        .maybeSingle();
      setCouple(c);
      if (!c) {
        setLoading(false);
        return;
      }

      // All recommendations for this couple
      const { data: recs } = await supabase
        .from("recommendations")
        .select("*")
        .eq("couple_id", c.id)
        .order("month", { ascending: false });

      // All ratings for those recs
      const recIds = (recs || []).map((r) => r.id);
      let ratings: any[] = [];
      if (recIds.length) {
        const { data: rt } = await supabase
          .from("ratings")
          .select("*")
          .in("recommendation_id", recIds);
        ratings = rt || [];
      }

      // Group by month
      const byMonth: Record<string, any> = {};
      (recs || []).forEach((r) => {
        if (!byMonth[r.month]) byMonth[r.month] = { month: r.month, recs: [] };
        const theseRatings = ratings.filter(
          (rt) => rt.recommendation_id === r.id,
        );
        byMonth[r.month].recs.push({ ...r, ratings: theseRatings });
      });

      // Decide reveal per month: both partners must have rated at least once
      const partnerId = c.partner_a === user.id ? c.partner_b : c.partner_a;
      const monthList = Object.values(byMonth).map((m: any) => {
        const iRated = m.recs.some((r: any) =>
          r.ratings.some((rt: any) => rt.rater_id === user.id),
        );
        const partnerRated = m.recs.some((r: any) =>
          r.ratings.some((rt: any) => rt.rater_id === partnerId),
        );
        return { ...m, revealed: iRated && partnerRated };
      });

      setMonths(monthList);
      setLoading(false);
    }
    load();
  }, []);

  if (loading)
    return (
      <main style={{ padding: 40 }}>
        <p>Loading…</p>
      </main>
    );
  if (!couple)
    return (
      <main style={{ padding: 40 }}>
        <p>
          You need to <a href="/pair">pair</a> first.
        </p>
      </main>
    );

  function formatMonth(m: string) {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
  }

  return (
    <main style={{ padding: 40, maxWidth: 640, margin: "0 auto" }}>
      <h1>Your history 🍿</h1>

      {months.length === 0 && <p>No history yet — start recommending!</p>}

      {months.map((m) => (
        <section key={m.month} style={{ marginTop: 32 }}>
          <h2 style={{ borderBottom: "2px solid #e11d48", paddingBottom: 4 }}>
            {formatMonth(m.month)}
          </h2>

          {!m.revealed && (
            <p
              style={{
                color: "#9333ea",
                background: "#faf5ff",
                padding: 10,
                borderRadius: 8,
              }}
            >
              🔒 Ratings hidden until you both rate this month.
            </p>
          )}

          {m.recs.map((r: any) => {
            const fromMe = r.recommender_id === me;
            return (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  gap: 14,
                  marginTop: 16,
                  alignItems: "flex-start",
                }}
              >
                {r.poster_path && (
                  <img src={`${IMG}${r.poster_path}`} alt="" width={60} />
                )}
                <div style={{ flex: 1 }}>
                  <strong>
                    {r.movie_title} {r.release_year && `(${r.release_year})`}
                  </strong>
                  <p style={{ fontSize: 13, color: "#666" }}>
                    {fromMe ? "You recommended this" : "Recommended to you"}
                  </p>
                  {r.note && (
                    <p style={{ fontStyle: "italic", color: "#888" }}>
                      "{r.note}"
                    </p>
                  )}

                  {/* Ratings — only if revealed */}
                  {m.revealed ? (
                    r.ratings.length ? (
                      r.ratings.map((rt: any) => (
                        <p key={rt.id} style={{ color: "#f59e0b" }}>
                          {rt.rater_id === me
                            ? "Your rating"
                            : "Partner's rating"}
                          : {"★".repeat(rt.stars)}
                          {"☆".repeat(5 - rt.stars)}
                        </p>
                      ))
                    ) : (
                      <p style={{ color: "#999" }}>Not watched</p>
                    )
                  ) : (
                    <p style={{ color: "#ccc" }}>★★★★★ (hidden)</p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
