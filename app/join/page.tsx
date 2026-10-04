"use client";

// Bare "create your artist profile" step; the real form comes with the design.
import { useState } from "react";

export default function Join() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  return (
    <main style={{ maxWidth: 420, margin: "10vh auto", padding: 16 }}>
      <h1>Create your artist profile</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch("/api/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ display_name: name }),
          });
          const data = await res.json();
          if (res.ok || res.status === 409) location.href = "/dashboard";
          else setMessage(data.error);
        }}
      >
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name or studio" />
        <button>Continue</button>
      </form>
      {message && <p role="status">{message}</p>}
    </main>
  );
}
