// STELLARION — Edge Function : game-action
// Version 1.5.70 SERVER AUTHORITY
// Le navigateur ne décide plus des ressources / bâtiments / vaisseaux / files / flottes.
// Il demande une action; cette fonction authentifie, vérifie, applique et renvoie l'état canonique.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Cost = { titanium?: number; xenite?: number; antimatter?: number };
type BuildingDef = { id: string; baseCost: Cost; costScale: number; baseTime: number; timeScale: number; produces?: string | null; baseRate: number; baseEnergyConsumption: number };
type ShipDef = { id: string; cost: Cost; time: number; cargo: number; attack: number; hull: number; can: string[] };

const ECONOMY = {
  productionScale: 1.45,
  buildingCostScale: 1.35,
  lateBuildingCostScale: 1.55,
  softEmbassyLimit: 30,
  unitPriceMultiplier: 5,
};

const BUILDINGS: Record<string, BuildingDef> = (() => {
  const list: BuildingDef[] = [
    { id:"command_center", baseCost:{titanium:500,xenite:250,antimatter:0}, costScale:1.35, baseTime:35, timeScale:1.42, baseEnergyConsumption:10, produces:null, baseRate:0 },
    { id:"titanium_mine", baseCost:{titanium:60,xenite:15,antimatter:0}, costScale:1.35, baseTime:25, timeScale:1.38, baseEnergyConsumption:25, produces:"titanium", baseRate:400 },
    { id:"xenite_extractor", baseCost:{titanium:48,xenite:24,antimatter:0}, costScale:1.35, baseTime:35, timeScale:1.40, baseEnergyConsumption:32, produces:"xenite", baseRate:240 },
    { id:"antimatter_refinery", baseCost:{titanium:900,xenite:1200,antimatter:0}, costScale:1.35, baseTime:120, timeScale:1.48, baseEnergyConsumption:80, produces:"antimatter", baseRate:375 },
    { id:"fusion_plant", baseCost:{titanium:900,xenite:360,antimatter:0}, costScale:1.35, baseTime:80, timeScale:1.40, baseEnergyConsumption:0, produces:"energy", baseRate:120 },
    { id:"quantum_lab", baseCost:{titanium:200,xenite:400,antimatter:0}, costScale:1.35, baseTime:130, timeScale:1.48, baseEnergyConsumption:65, produces:null, baseRate:0 },
    { id:"academy", baseCost:{titanium:1200,xenite:1600,antimatter:0}, costScale:1.35, baseTime:180, timeScale:1.50, baseEnergyConsumption:90, produces:null, baseRate:0 },
    { id:"shipyard", baseCost:{titanium:400,xenite:200,antimatter:0}, costScale:1.35, baseTime:150, timeScale:1.48, baseEnergyConsumption:75, produces:null, baseRate:0 },
    { id:"orbital_base", baseCost:{titanium:2200,xenite:1400,antimatter:0}, costScale:1.35, baseTime:180, timeScale:1.47, baseEnergyConsumption:95, produces:null, baseRate:0 },
    { id:"shield_generator", baseCost:{titanium:1500,xenite:1000,antimatter:0}, costScale:1.35, baseTime:160, timeScale:1.46, baseEnergyConsumption:110, produces:null, baseRate:0 },
    { id:"embassy", baseCost:{titanium:3000,xenite:2000,antimatter:0}, costScale:1.35, baseTime:90, timeScale:1.45, baseEnergyConsumption:35, produces:null, baseRate:0 },
  ];
  for (let i=2; i<=5; i++) {
    list.push({ id:`titanium_mine_${i}`, baseCost:{titanium:60*i,xenite:15*i,antimatter:0}, costScale:1.35, baseTime:25+8*i, timeScale:1.38, baseEnergyConsumption:25, produces:"titanium", baseRate:400 });
    list.push({ id:`xenite_extractor_${i}`, baseCost:{titanium:48*i,xenite:24*i,antimatter:0}, costScale:1.35, baseTime:35+8*i, timeScale:1.40, baseEnergyConsumption:32, produces:"xenite", baseRate:240 });
  }
  return Object.fromEntries(list.map((b) => [b.id, b]));
})();

const SHIPS: Record<string, ShipDef> = Object.fromEntries([
  {id:"scout_probe",cost:{titanium:27,xenite:13,antimatter:1},time:8,cargo:0,attack:0,hull:90,can:["scan","explore"]},
  {id:"small_cargo",cost:{titanium:117,xenite:83,antimatter:1},time:22,cargo:5000,attack:30,hull:1400,can:["transfer","explore"]},
  {id:"light_fighter",cost:{titanium:150,xenite:60,antimatter:1},time:25,cargo:50,attack:260,hull:221,can:["attack","explore"]},
  {id:"interceptor",cost:{titanium:233,xenite:117,antimatter:1},time:35,cargo:40,attack:420,hull:357,can:["attack"]},
  {id:"large_cargo",cost:{titanium:600,xenite:400,antimatter:1},time:75,cargo:30000,attack:70,hull:5200,can:["transfer","explore"]},
  {id:"heavy_fighter",cost:{titanium:600,xenite:317,antimatter:7},time:85,cargo:100,attack:780,hull:663,can:["attack","explore"]},
  {id:"frigate",cost:{titanium:1000,xenite:567,antimatter:17},time:120,cargo:500,attack:1300,hull:1105,can:["attack","transfer","explore"]},
  {id:"cruiser",cost:{titanium:1600,xenite:633,antimatter:33},time:150,cargo:1200,attack:2200,hull:1870,can:["attack","explore"]},
  {id:"battleship",cost:{titanium:3167,xenite:1300,antimatter:83},time:280,cargo:2000,attack:5000,hull:4250,can:["attack"]},
  {id:"destroyer",cost:{titanium:4500,xenite:2400,antimatter:183},time:390,cargo:1500,attack:8600,hull:7310,can:["attack"]},
  {id:"bomber",cost:{titanium:3167,xenite:2333,antimatter:200},time:370,cargo:800,attack:7800,hull:6630,can:["attack"]},
  {id:"siege_cruiser",cost:{titanium:7000,xenite:4000,antimatter:467},time:600,cargo:3000,attack:14400,hull:12240,can:["attack"]},
  {id:"titan",cost:{titanium:20667,xenite:12000,antimatter:2500},time:1600,cargo:8000,attack:52000,hull:44200,can:["attack"]},
  {id:"carrier",cost:{titanium:25333,xenite:15333,antimatter:3500},time:2200,cargo:25000,attack:29000,hull:24650,can:["attack","transfer"]},
  {id:"mothership",cost:{titanium:80000,xenite:48333,antimatter:12667},time:5200,cargo:100000,attack:180000,hull:153000,can:["attack","transfer"]},
  {id:"colon_ship",cost:{titanium:11667,xenite:6333,antimatter:333},time:14400,cargo:10000,attack:0,hull:44000,can:["colonize"]},
].map((s: any) => {
  const c: Cost = {};
  for (const k of ["titanium","xenite","antimatter"] as const) c[k] = Math.round((s.cost[k] || 0) * ECONOMY.unitPriceMultiplier);
  return [s.id, {...s, cost:c}];
}));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok:false, error:"method_not_allowed" }, 405);

  const supaUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: { user }, error: userErr } = await supaUser.auth.getUser();
  if (userErr || !user) return json({ ok:false, error:"non_authentifie" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  const action = String(body.action || "bootstrap");

  try {
    await ensurePlayer(admin, user.id, body.snapshot || null);
    await accrueResources(admin, user.id);
    await processQueues(admin, user.id);

    let message = "ok";
    if (action === "bootstrap" || action === "state") {
      message = "Etat serveur charge.";
    } else if (action === "buy_building") {
      message = await buyBuilding(admin, user.id, body);
    } else if (action === "finish_building") {
      message = await finishBuilding(admin, user.id, body);
    } else if (action === "buy_ship") {
      message = await buyShip(admin, user.id, body);
    } else if (action === "finish_ship") {
      message = await finishShip(admin, user.id, body);
    } else if (action === "launch_fleet") {
      message = await launchFleet(admin, user.id, body);
    } else if (action === "process") {
      message = "Files et flottes traitees.";
    } else {
      await audit(admin, user.id, action, false, { error:"unknown_action" });
      return json({ ok:false, error:"action_inconnue", state: await snapshot(admin, user.id) }, 400);
    }

    await accrueResources(admin, user.id);
    await processQueues(admin, user.id);
    await audit(admin, user.id, action, true, { message });
    return json({ ok:true, message, state: await snapshot(admin, user.id) }, 200);
  } catch (e) {
    await audit(admin, user.id, action, false, { error:String((e as Error)?.message || e) });
    return json({ ok:false, error:String((e as Error)?.message || e), state: await snapshot(admin, user.id).catch(() => null) }, 400);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type":"application/json" } });
}

function n(v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const x = Math.floor(Number(v) || 0);
  return Math.max(min, Math.min(max, x));
}
function safePlanet(v: unknown) { return String(v || "home").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "home"; }
function isoPlus(seconds: number) { return new Date(Date.now() + Math.max(1, seconds) * 1000).toISOString(); }
function cost(def: BuildingDef, next: number): Required<Cost> {
  if (next <= 1 && def.id === "command_center") return { titanium:0, xenite:0, antimatter:0 };
  const lvl = Math.max(0, next - 1);
  const early = Math.min(lvl, ECONOMY.softEmbassyLimit);
  const late = Math.max(0, lvl - ECONOMY.softEmbassyLimit);
  const m = Math.pow(def.costScale || ECONOMY.buildingCostScale, early) * Math.pow(ECONOMY.lateBuildingCostScale, late);
  return {
    titanium: Math.round((def.baseCost.titanium || 0) * m),
    xenite: Math.round((def.baseCost.xenite || 0) * m),
    antimatter: Math.round((def.baseCost.antimatter || 0) * m),
  };
}
function buildTime(def: BuildingDef, next: number) { return Math.max(20, Math.round(def.baseTime * Math.pow(def.timeScale, Math.max(0, next - 1)))); }
function fragmentFinishCost(remainingSeconds: number) { return remainingSeconds <= 0 ? 0 : Math.max(1, Math.ceil(remainingSeconds / 60)); }
function resourceProduction(base: number, level: number) { return Math.round(base * Math.pow(ECONOMY.productionScale, Math.max(0, level))); }
function energyProduction(level: number) { return level <= 0 ? 0 : Math.round(120 * Math.pow(ECONOMY.productionScale, level)); }
function energyConsumption(base: number, level: number) { return level <= 0 ? 0 : Math.round(base * Math.pow(1.85, Math.max(0, level - 1))); }

async function audit(admin: any, playerId: string, action: string, ok: boolean, details: Record<string, unknown>) {
  try { await admin.from("game_security_audit").insert({ player_id: playerId, action, ok, details }); } catch (_) {}
}

async function ensurePlayer(admin: any, playerId: string, snapshotPayload: any) {
  const existing = await admin.from("game_resources").select("player_id").eq("player_id", playerId).maybeSingle();
  if (!existing.error && existing.data) {
    await admin.from("game_buildings").upsert({ player_id:playerId, planet_id:"home", building_id:"command_center", level:1, updated_at:new Date().toISOString() }, { onConflict:"player_id,planet_id,building_id", ignoreDuplicates:true });
    return;
  }

  const seed = sanitizeInitialSnapshot(snapshotPayload || {});
  const res = await admin.from("game_resources").upsert({
    player_id: playerId,
    titanium: seed.resources.titanium,
    xenite: seed.resources.xenite,
    antimatter: seed.resources.antimatter,
    fragments: seed.resources.fragments,
    last_tick: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict:"player_id" });
  if (res.error) throw res.error;

  const rows = seed.buildings.length ? seed.buildings : [{ planet_id:"home", building_id:"command_center", level:1 }];
  for (const b of rows) {
    if (!BUILDINGS[b.building_id]) continue;
    await admin.from("game_buildings").upsert({ player_id:playerId, planet_id:safePlanet(b.planet_id), building_id:b.building_id, level:n(b.level, 0, 200), updated_at:new Date().toISOString() }, { onConflict:"player_id,planet_id,building_id" });
  }
  await admin.from("game_buildings").upsert({ player_id:playerId, planet_id:"home", building_id:"command_center", level:1, updated_at:new Date().toISOString() }, { onConflict:"player_id,planet_id,building_id" });

  for (const s of seed.ships) {
    if (!SHIPS[s.ship_id]) continue;
    await admin.from("game_ships").upsert({ player_id:playerId, planet_id:safePlanet(s.planet_id), ship_id:s.ship_id, qty:n(s.qty,0,1000000), updated_at:new Date().toISOString() }, { onConflict:"player_id,planet_id,ship_id" });
  }
  await admin.from("game_security_profile").upsert({ player_id:playerId, migration_locked:true, migrated_at:new Date().toISOString(), updated_at:new Date().toISOString() }, { onConflict:"player_id" });
  await audit(admin, playerId, "initial_migration", true, { source: snapshotPayload ? "client_snapshot_once" : "fresh_seed" });
}

function sanitizeInitialSnapshot(s: any) {
  const r = s.resources || {};
  const resources = {
    titanium: n(r.titanium, 2500, 100_000_000),
    xenite: n(r.xenite, 1200, 100_000_000),
    antimatter: n(r.antimatter, 0, 50_000_000),
    fragments: n(r.fragments, 0, 100_000),
  };
  const buildings: Array<{planet_id:string; building_id:string; level:number}> = [];
  const srcB = s.buildings || {};
  for (const [planetId, rows] of Object.entries(srcB)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows as any[]) buildings.push({ planet_id:safePlanet(planetId), building_id:String(row.building_id || ""), level:n(row.level,0,200) });
  }
  const ships: Array<{planet_id:string; ship_id:string; qty:number}> = [];
  const srcPS = s.planetShips || s.ships || {};
  for (const [planetId, map] of Object.entries(srcPS)) {
    if (typeof map !== "object" || !map) continue;
    for (const [shipId, qty] of Object.entries(map as Record<string, unknown>)) ships.push({ planet_id:safePlanet(planetId), ship_id:String(shipId), qty:n(qty,0,1000000) });
  }
  return { resources, buildings, ships };
}

async function accrueResources(admin: any, playerId: string) {
  const rr = await admin.from("game_resources").select("*").eq("player_id", playerId).maybeSingle();
  if (rr.error) throw rr.error;
  const res = rr.data;
  if (!res) return;
  const last = new Date(res.last_tick || Date.now()).getTime();
  const now = Date.now();
  const dt = Math.min(12 * 3600, Math.max(0, (now - last) / 1000));
  if (dt < 5) return;

  const br = await admin.from("game_buildings").select("planet_id,building_id,level").eq("player_id", playerId);
  if (br.error) throw br.error;
  const buildings = br.data || [];
  let energyProd = 0;
  let energyCons = 0;
  let titaniumPerHour = 0;
  let xenitePerHour = 0;
  let antimatterPerHour = 0;

  for (const row of buildings) {
    const def = BUILDINGS[row.building_id];
    if (!def) continue;
    const lvl = n(row.level, 0, 1000);
    if (def.id === "fusion_plant") energyProd += energyProduction(lvl);
    energyCons += energyConsumption(def.baseEnergyConsumption, lvl);
    if (!def.produces || def.produces === "energy") continue;
    const v = resourceProduction(def.baseRate, lvl);
    if (def.produces === "titanium") titaniumPerHour += v;
    if (def.produces === "xenite") xenitePerHour += v;
    if (def.produces === "antimatter") antimatterPerHour += v;
  }
  const balance = energyProd - energyCons;
  const ratio = balance >= 0 ? 1 : balance > -energyProd*.1 ? .85 : balance > -energyProd*.25 ? .60 : balance > -energyProd*.5 ? .30 : .10;
  const upd = {
    titanium: n(res.titanium) + Math.floor(titaniumPerHour * ratio * dt / 3600),
    xenite: n(res.xenite) + Math.floor(xenitePerHour * ratio * dt / 3600),
    antimatter: n(res.antimatter) + Math.floor(antimatterPerHour * ratio * dt / 3600),
    last_tick: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const up = await admin.from("game_resources").update(upd).eq("player_id", playerId);
  if (up.error) throw up.error;
}

async function processQueues(admin: any, playerId: string) {
  const now = new Date().toISOString();
  const bq = await admin.from("game_build_queue").select("*").eq("player_id", playerId).lte("finish_at", now);
  if (bq.error) throw bq.error;
  for (const q of bq.data || []) {
    await admin.from("game_buildings").upsert({ player_id:playerId, planet_id:q.planet_id, building_id:q.building_id, level:q.to_level, updated_at:now }, { onConflict:"player_id,planet_id,building_id" });
    await admin.from("game_build_queue").delete().eq("id", q.id).eq("player_id", playerId);
  }

  const sq = await admin.from("game_ship_queue").select("*").eq("player_id", playerId).lte("finish_at", now);
  if (sq.error) throw sq.error;
  for (const q of sq.data || []) {
    await addShips(admin, playerId, q.planet_id, q.ship_id, n(q.qty,1,100000));
    await admin.from("game_ship_queue").delete().eq("id", q.id).eq("player_id", playerId);
  }

  const fl = await admin.from("game_fleets").select("*").eq("player_id", playerId).lte("ends_at", now);
  if (fl.error) throw fl.error;
  for (const f of fl.data || []) {
    if (f.returning) {
      const ships = f.ships || {};
      for (const [shipId, qty] of Object.entries(ships)) if (SHIPS[shipId]) await addShips(admin, playerId, f.origin_planet_id, shipId, n(qty,0,1000000));
      const cargo = f.cargo || {};
      if (Object.keys(cargo).length) await addResources(admin, playerId, cargo);
      await admin.from("game_fleets").delete().eq("id", f.id).eq("player_id", playerId);
    } else {
      await admin.from("game_fleets").update({ returning:true, start_at:now, ends_at:isoPlus(45), updated_at:now }).eq("id", f.id).eq("player_id", playerId);
    }
  }
}

async function currentResources(admin: any, playerId: string) {
  const rr = await admin.from("game_resources").select("*").eq("player_id", playerId).maybeSingle();
  if (rr.error) throw rr.error;
  if (!rr.data) throw new Error("resources_missing");
  return rr.data;
}
async function setResources(admin: any, playerId: string, r: any) {
  const up = await admin.from("game_resources").update({ titanium:n(r.titanium), xenite:n(r.xenite), antimatter:n(r.antimatter), fragments:n(r.fragments), updated_at:new Date().toISOString() }).eq("player_id", playerId);
  if (up.error) throw up.error;
}
async function addResources(admin: any, playerId: string, delta: any) {
  const r = await currentResources(admin, playerId);
  r.titanium = n(r.titanium) + n(delta.titanium,0,100_000_000);
  r.xenite = n(r.xenite) + n(delta.xenite,0,100_000_000);
  r.antimatter = n(r.antimatter) + n(delta.antimatter,0,50_000_000);
  r.fragments = n(r.fragments) + n(delta.fragments,0,100_000);
  await setResources(admin, playerId, r);
}
function hasEnough(r: any, c: Cost) { return n(r.titanium) >= n(c.titanium) && n(r.xenite) >= n(c.xenite) && n(r.antimatter) >= n(c.antimatter); }
function spend(r: any, c: Cost) { r.titanium = n(r.titanium) - n(c.titanium); r.xenite = n(r.xenite) - n(c.xenite); r.antimatter = n(r.antimatter) - n(c.antimatter); }

async function buyBuilding(admin: any, playerId: string, body: any) {
  const buildingId = String(body.building_id || body.buildingId || "");
  const planetId = safePlanet(body.planet_id || body.planetId || "home");
  const def = BUILDINGS[buildingId];
  if (!def) throw new Error("batiment_inconnu");
  const qCount = await admin.from("game_build_queue").select("id", { count:"exact", head:true }).eq("player_id", playerId).eq("planet_id", planetId);
  if (qCount.error) throw qCount.error;
  const cc = await buildingLevel(admin, playerId, planetId, "command_center");
  const maxQueue = Math.min(3, 1 + Math.floor(cc / 10));
  if ((qCount.count || 0) >= maxQueue) throw new Error("file_construction_pleine");

  const rowLevel = await buildingLevel(admin, playerId, planetId, buildingId);
  const queued = await admin.from("game_build_queue").select("id", { count:"exact", head:true }).eq("player_id", playerId).eq("planet_id", planetId).eq("building_id", buildingId);
  if (queued.error) throw queued.error;
  const from = rowLevel + (queued.count || 0);
  const to = from + 1;
  const c = cost(def, to);
  const r = await currentResources(admin, playerId);
  if (!hasEnough(r, c)) throw new Error("ressources_insuffisantes");
  spend(r, c);
  await setResources(admin, playerId, r);
  const startsAt = new Date().toISOString();
  const ins = await admin.from("game_build_queue").insert({ player_id:playerId, planet_id:planetId, building_id:buildingId, from_level:from, to_level:to, start_at:startsAt, finish_at:isoPlus(buildTime(def, to)) });
  if (ins.error) throw ins.error;
  return `Construction serveur lancee : ${buildingId} niveau ${to}`;
}
async function buildingLevel(admin: any, playerId: string, planetId: string, buildingId: string) {
  const br = await admin.from("game_buildings").select("level").eq("player_id", playerId).eq("planet_id", planetId).eq("building_id", buildingId).maybeSingle();
  if (br.error) throw br.error;
  return n(br.data?.level, buildingId === "command_center" ? 1 : 0, 10000);
}
async function finishBuilding(admin: any, playerId: string, body: any) {
  const id = String(body.queue_id || body.id || "");
  const qr = await admin.from("game_build_queue").select("*").eq("player_id", playerId).eq("id", id).maybeSingle();
  if (qr.error) throw qr.error;
  if (!qr.data) throw new Error("construction_introuvable");
  const remain = Math.max(0, (new Date(qr.data.finish_at).getTime() - Date.now()) / 1000);
  const price = fragmentFinishCost(remain);
  const r = await currentResources(admin, playerId);
  if (n(r.fragments) < price) throw new Error("fragments_insuffisants");
  r.fragments = n(r.fragments) - price;
  await setResources(admin, playerId, r);
  const up = await admin.from("game_build_queue").update({ finish_at:new Date().toISOString() }).eq("id", id).eq("player_id", playerId);
  if (up.error) throw up.error;
  await processQueues(admin, playerId);
  return `Construction terminee cote serveur avec ${price} fragments.`;
}

async function buyShip(admin: any, playerId: string, body: any) {
  const shipId = String(body.ship_id || body.shipId || "");
  const planetId = safePlanet(body.planet_id || body.planetId || "home");
  const qty = n(body.qty || 1, 1, 1000);
  const def = SHIPS[shipId];
  if (!def) throw new Error("vaisseau_inconnu");
  const shipyard = await buildingLevel(admin, playerId, planetId, "shipyard");
  if (shipyard <= 0 && shipId !== "scout_probe") throw new Error("chantier_spatial_requis");
  const total: Cost = { titanium:n(def.cost.titanium)*qty, xenite:n(def.cost.xenite)*qty, antimatter:n(def.cost.antimatter)*qty };
  const r = await currentResources(admin, playerId);
  if (!hasEnough(r, total)) throw new Error("ressources_insuffisantes");
  spend(r, total);
  await setResources(admin, playerId, r);
  const speedBonus = Math.max(1, 1 + shipyard * 0.04);
  const duration = Math.max(12, Math.round(def.time / speedBonus)) * qty;
  const ins = await admin.from("game_ship_queue").insert({ player_id:playerId, planet_id:planetId, ship_id:shipId, qty, start_at:new Date().toISOString(), finish_at:isoPlus(duration) });
  if (ins.error) throw ins.error;
  return `Formation serveur lancee : ${shipId} x${qty}`;
}
async function finishShip(admin: any, playerId: string, body: any) {
  const id = String(body.queue_id || body.id || "");
  const qr = await admin.from("game_ship_queue").select("*").eq("player_id", playerId).eq("id", id).maybeSingle();
  if (qr.error) throw qr.error;
  if (!qr.data) throw new Error("formation_introuvable");
  const remain = Math.max(0, (new Date(qr.data.finish_at).getTime() - Date.now()) / 1000);
  const price = fragmentFinishCost(remain);
  const r = await currentResources(admin, playerId);
  if (n(r.fragments) < price) throw new Error("fragments_insuffisants");
  r.fragments = n(r.fragments) - price;
  await setResources(admin, playerId, r);
  const up = await admin.from("game_ship_queue").update({ finish_at:new Date().toISOString() }).eq("id", id).eq("player_id", playerId);
  if (up.error) throw up.error;
  await processQueues(admin, playerId);
  return `Formation terminee cote serveur avec ${price} fragments.`;
}
async function addShips(admin: any, playerId: string, planetId: string, shipId: string, qty: number) {
  const old = await admin.from("game_ships").select("qty").eq("player_id", playerId).eq("planet_id", planetId).eq("ship_id", shipId).maybeSingle();
  if (old.error) throw old.error;
  const next = n(old.data?.qty) + n(qty,0,1000000);
  const up = await admin.from("game_ships").upsert({ player_id:playerId, planet_id:planetId, ship_id:shipId, qty:next, updated_at:new Date().toISOString() }, { onConflict:"player_id,planet_id,ship_id" });
  if (up.error) throw up.error;
}

async function launchFleet(admin: any, playerId: string, body: any) {
  const planetId = safePlanet(body.planet_id || body.planetId || "home");
  const mission = String(body.mission || "explore").replace(/[^a-z_]/g, "").slice(0, 24) || "explore";
  const ships = body.ships || {};
  const cargo = body.cargo || {};
  const duration = n(body.durationSeconds || body.duration || 60, 10, 3600);
  let shipCount = 0;
  let cargoCap = 0;
  for (const [shipId, qtyRaw] of Object.entries(ships)) {
    const def = SHIPS[shipId];
    const qty = n(qtyRaw,0,1000000);
    if (!def || qty <= 0) continue;
    const old = await admin.from("game_ships").select("qty").eq("player_id", playerId).eq("planet_id", planetId).eq("ship_id", shipId).maybeSingle();
    if (old.error) throw old.error;
    if (n(old.data?.qty) < qty) throw new Error("vaisseaux_insuffisants");
    shipCount += qty;
    cargoCap += def.cargo * qty;
  }
  if (shipCount <= 0) throw new Error("aucun_vaisseau");
  const cargoTotal = n(cargo.titanium) + n(cargo.xenite) + n(cargo.antimatter);
  if (cargoTotal > cargoCap) throw new Error("capacite_cargo_insuffisante");
  const r = await currentResources(admin, playerId);
  if (!hasEnough(r, cargo)) throw new Error("ressources_cargo_insuffisantes");

  for (const [shipId, qtyRaw] of Object.entries(ships)) {
    const qty = n(qtyRaw,0,1000000);
    if (!SHIPS[shipId] || qty <= 0) continue;
    const old = await admin.from("game_ships").select("qty").eq("player_id", playerId).eq("planet_id", planetId).eq("ship_id", shipId).maybeSingle();
    const next = n(old.data?.qty) - qty;
    await admin.from("game_ships").upsert({ player_id:playerId, planet_id:planetId, ship_id:shipId, qty:next, updated_at:new Date().toISOString() }, { onConflict:"player_id,planet_id,ship_id" });
  }
  spend(r, cargo);
  await setResources(admin, playerId, r);
  const target = body.target || {};
  const ends = isoPlus(duration);
  const ins = await admin.from("game_fleets").insert({
    player_id:playerId,
    origin_planet_id:planetId,
    target_id:String(target.id || body.target_id || "").slice(0,64),
    target_name:String(target.name || body.target_name || "Système").slice(0,80),
    mission,
    ships,
    cargo:{ titanium:n(cargo.titanium), xenite:n(cargo.xenite), antimatter:n(cargo.antimatter) },
    returning:false,
    start_at:new Date().toISOString(),
    ends_at:ends,
    payload:{ target, from:body.from || null },
  }).select("id").maybeSingle();
  if (ins.error) throw ins.error;
  try {
    await admin.from("public_missions").insert({
      id:String(ins.data?.id || crypto.randomUUID()),
      player_id:playerId,
      player_name:String(body.player_name || "Commandant").slice(0,60),
      mission,
      from_x:n(body.from?.x, -999999, 999999),
      from_y:n(body.from?.y, -999999, 999999),
      to_x:n(target.x, -999999, 999999),
      to_y:n(target.y, -999999, 999999),
      target_name:String(target.name || "Système").slice(0,80),
      started_at:new Date().toISOString(),
      ends_at:ends,
      is_returning:false,
      updated_at:new Date().toISOString(),
    });
  } catch (_) {}
  return `Mission serveur lancee : ${mission} avec ${shipCount} vaisseau(x).`;
}

async function snapshot(admin: any, playerId: string) {
  const [res, b, bq, ships, sq, fleets] = await Promise.all([
    admin.from("game_resources").select("*").eq("player_id", playerId).maybeSingle(),
    admin.from("game_buildings").select("planet_id,building_id,level").eq("player_id", playerId),
    admin.from("game_build_queue").select("*").eq("player_id", playerId).order("finish_at", { ascending:true }),
    admin.from("game_ships").select("planet_id,ship_id,qty").eq("player_id", playerId),
    admin.from("game_ship_queue").select("*").eq("player_id", playerId).order("finish_at", { ascending:true }),
    admin.from("game_fleets").select("*").eq("player_id", playerId).order("ends_at", { ascending:true }),
  ]);
  for (const r of [res,b,bq,ships,sq,fleets]) if (r.error) throw r.error;
  return { serverTime: new Date().toISOString(), resources: res.data, buildings:b.data || [], buildQueue:bq.data || [], ships:ships.data || [], shipQueue:sq.data || [], fleets:fleets.data || [] };
}
