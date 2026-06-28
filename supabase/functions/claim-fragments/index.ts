// STELLARION — Edge Function : claim-fragments
// Appelee par le jeu au chargement (et au retour de paiement).
// Marque les grants non reclames du joueur comme "claimed" et renvoie le total,
// le tout de maniere ATOMIQUE => impossible de reclamer deux fois les memes fragments.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supaUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error } = await supaUser.auth.getUser();
    if (error || !user) return json({ credited: 0, error: "non authentifié" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error: upErr } = await admin
      .from("fragment_grants")
      .update({ claimed: true, claimed_at: new Date().toISOString() })
      .eq("player_id", user.id)
      .eq("claimed", false)
      .select("fragments");
    if (upErr) throw upErr;

    const credited = (data ?? []).reduce(
      (sum: number, r: { fragments: number }) => sum + (r.fragments || 0),
      0,
    );
    return json({ credited }, 200);
  } catch (e) {
    return json({ credited: 0, error: String(e) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}