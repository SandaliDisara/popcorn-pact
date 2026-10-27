"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/superbase/client";

function makeCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function PairPage() {
  const supabase = createClient();
  const [myCode, setMyCode] = useState<string | null>(null);
  const [paired, setPaired] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [status, setStatus] = useState("");

  // Check current pairing state
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: couple } = await supabase
        .from("couples")
        .select("*")
        .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
        .maybeSingle();

      if (couple) {
        if (couple.partner_b) {
          setPaired(true);
        } else {
          setMyCode(couple.invite_code);
        }
      }
    }
    load();
  }, []);

  // Create a couple with an invite code
  async function createCode() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const code = makeCode();
    const { error } = await supabase
      .from("couples")
      .insert({ partner_a: user.id, invite_code: code });
    if (error) setStatus(`Error: ${error.message}`);
    else setMyCode(code);
  }

  // Join an existing couple by code
  async function joinCouple(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Joining...");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: couple, error: findErr } = await supabase
      .from("couples")
      .select("*")
      .eq("invite_code", joinCode.toUpperCase())
      .maybeSingle();

    if (findErr || !couple) {
      setStatus("Code not found. Check it and try again.");
      return;
    }
    if (couple.partner_a === user.id) {
      setStatus("That's your own code! Share it with your partner.");
      return;
    }
    if (couple.partner_b) {
      setStatus("This couple is already full.");
      return;
    }

    const { error: updateErr } = await supabase
      .from("couples")
      .update({ partner_b: user.id })
      .eq("id", couple.id);

    if (updateErr) setStatus(`Error: ${updateErr.message}`);
    else setPaired(true);
  }

  if (paired) {
    return (
      <main style={{ padding: 40, textAlign: "center" }}>
        <h1>You're paired! 💕🍿</h1>
        <p>Time to start recommending movies.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 40, maxWidth: 440, margin: "0 auto" }}>
      <h1>Pair with your partner 🍿</h1>

      <section style={{ marginTop: 24 }}>
        <h2>Share your code</h2>
        {myCode ? (
          <p
            style={{
              fontSize: 28,
              fontWeight: "bold",
              letterSpacing: 2,
              color: "#e11d48",
            }}
          >
            {myCode}
          </p>
        ) : (
          <button
            onClick={createCode}
            style={{
              padding: 10,
              borderRadius: 8,
              background: "#e11d48",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Generate my invite code
          </button>
        )}
      </section>

      <hr style={{ margin: "32px 0" }} />

      <section>
        <h2>Or enter their code</h2>
        <form
          onSubmit={joinCouple}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="ABC123"
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              textTransform: "uppercase",
            }}
          />
          <button
            type="submit"
            style={{
              padding: 10,
              borderRadius: 8,
              background: "#333",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Join
          </button>
        </form>
      </section>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </main>
  );
}
