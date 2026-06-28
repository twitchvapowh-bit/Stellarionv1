// STELLARION — Edge Function : create-checkout
// Cree une session de paiement Stripe. Le PRIX et le nombre de FRAGMENTS
// sont definis ICI (cote serveur) et JAMAIS recus du client.
// Le joueur est identifie par son JWT Supabase : impossible d'usurper un autre compte.

import Stripe from "https://esm.sh/stripe@17?target=deno&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});

// >>> SOURCE DE VERITE des packs : montants en CENTIMES d'euro. <
const PACKS: Record<string, { name: string; fragments: number; amount: number }> = {
  orbite:  { name: "Pack Orbite",  fragments: 100,  amount: 199  }, // 1,99 €
  pulsar:  { name: "Pack Pulsar",  fragments: 550,  amount: 899  }, // 8,99 €
  nova:    { name: "Pack Nova",    fragments: 1200, amount: 1699 }, // 16,99 €
  stellar: { name: "Pack Stellar", fragments: 3000, amount: 3999 }, // 39,99 €
};

const APP_URL = Deno.env.get("APP_URL") ?? "https://stellarionunivers.vercel.app";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error } = await supa.auth.getUser();
    if (error || !user) {
      return json({ error: "non authentifié" }, 401);
    }

    const { pack_id } = await req.json();
    const pack = PACKS[pack_id];
    if (!pack) return json({ error: "pack inconnu" }, 400);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: pack.amount,
          product_data: { name: `STELLARION — ${pack.name} (${pack.fragments} fragments)` },
        },
      }],
      success_url: `${APP_URL}/?stellarion_paid=1`,
      cancel_url:  `${APP_URL}/?stellarion_paid=0`,
      metadata: {
        player_id: user.id,
        pack_id,
        fragments: String(pack.fragments),
      },
    });

    return json({ url: session.url }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}