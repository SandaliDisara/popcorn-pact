"use client";

import { useState } from "react";
import { createClient } from "../../lib/superbase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <main style={{ padding: 40, textAlign: "center" }}>
        <h1>Check your email 🍿</h1>
        <p>We sent a magic login link to {email}.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 40, maxWidth: 400, margin: "0 auto" }}>
      <h1>PopcornPact 🍿</h1>
      <p>Sign in to start recommending movies.</p>
      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 20,
        }}
      >
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          Send magic link
        </button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    </main>
  );
}
