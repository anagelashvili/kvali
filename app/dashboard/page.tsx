import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

// Placeholder dashboard: proves the session works until the real design lands.
export default async function Dashboard() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data: artist } = await supabase.from("artists").select("display_name, slug, status").eq("id", user.id).maybeSingle();
  if (!artist) redirect("/join");

  return (
    <main style={{ maxWidth: 640, margin: "10vh auto", padding: 16 }}>
      <h1>{artist.display_name}</h1>
      <p>
        kvali/{artist.slug} · {artist.status}
      </p>
      <p>Signed in as {user.email}. The dashboard design is coming next.</p>
    </main>
  );
}
