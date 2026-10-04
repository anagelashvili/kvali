"use client";

// Bare sign-in page so the auth flow can be used before the real design lands.
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  async function post(url: string, body: object) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Something went wrong");
    return data;
  }

  return (
    <main style={{ maxWidth: 420, margin: "10vh auto", padding: 16 }}>
      <h1>Sign in</h1>
      {!sent ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await post("/api/auth/login", { email });
              setSent(true);
              setMessage("Check your email for a link or a 6-digit code.");
            } catch (err) {
              setMessage((err as Error).message);
            }
          }}
        >
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <button>Send link</button>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await post("/api/auth/verify", { email, code });
              const me = await fetch("/api/me").then((r) => r.json());
              location.href = me.artist ? "/dashboard" : "/join";
            } catch (err) {
              setMessage((err as Error).message);
            }
          }}
        >
          <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          <button>Sign in</button>
        </form>
      )}
      <p>
        <a href="/api/auth/google">Continue with Google</a>
      </p>
      {message && <p role="status">{message}</p>}
    </main>
  );
}
