import { createClient } from "../lib/superbase/server";

export default async function Home() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("recommendations")
    .select("*", { count: "exact", head: true });

  return (
    <main style={{ padding: 40 }}>
      <h1>PopcornPact 🍿</h1>
      <p>
        Supabase connection: {error ? `❌ ${error.message}` : "✅ connected"}
      </p>
      <p>Recommendations in DB: {count ?? 0}</p>
    </main>
  );
}
