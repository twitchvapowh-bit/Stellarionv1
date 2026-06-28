// STELLARION — Edge Function : stripe-webhook
// C'est le SEUL endroit ou un credit de fragments peut naitre.
// Stripe appelle cette fonction apres un paiement reussi ; on verifie la
// SIGNATURE (donc l'appel vient bien de Stripe) puis on inscrit le grant en base.

import Stripe from "https://esm.sh/stripe@17?target=deno&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider,
    );
  } catch (e) {
    return new Response(`signature invalide: ${e}`, { status: 400 });
  }

  const seen = await admin.from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (seen.error) {
    return new Response("déjà traité", { status: 200 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const m = (s.metadata ?? {}) as Record<string, string>;
    const player_id = m.player_id;
    const fragments = parseInt(m.fragments ?? "0", 10);

    if (player_id && fragments > 0) {
      const ins = await admin.from("fragment_grants").insert({
        player_id,
        pack_id: m.pack_id ?? "?",
        fragments,
        stripe_session_id: s.id,
      });
      if (ins.error && !String(ins.error.message).includes("duplicate")) {
        return new Response(`erreur enregistrement: ${ins.error.message}`, { status: 500 });
      }
    }
  }

  return new Response("ok", { status: 200 });
});