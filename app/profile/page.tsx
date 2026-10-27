"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/superbase/client";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (data) setName(data.display_name);
    }
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving...");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", user.id);
    setStatus(error ? `Error: ${error.message}` : "Saved ✅");
  }

  return (
    <main style={{ padding: 40, maxWidth: 400, margin: "0 auto" }}>
      <h1>Your Profile 🍿</h1>
      <form
        onSubmit={save}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 20,
        }}
      >
        <label>Display name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          style={{
            padding: 10,
            borderRadius: 8,
            background: "#e11d48",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Save
        </button>
        {status && <p>{status}</p>}
      </form>
    </main>
  );
}
