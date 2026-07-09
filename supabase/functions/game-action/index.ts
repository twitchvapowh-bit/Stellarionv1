// STELLARION — Edge Function : game-action
// Version 1.5.91 SERVER AUTHORITY — combat loot/report stable
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
  buildQueue2Price: 1500,
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
  {id:"battleship",cost:{titanium:3167,xenite:1300,antimatter:83},time:280,cargo:2000,attack:6200,hull:4600,can:["attack"]},
  {id:"destroyer",cost:{titanium:4500,xenite:2400,antimatter:183},time:390,cargo:1500,attack:8600,hull:7310,can:["attack"]},
  {id:"bomber",cost:{titanium:3167,xenite:2333,antimatter:200},time:370,cargo:800,attack:7800,hull:6630,can:["attack"]},
  {id:"siege_cruiser",cost:{titanium:7000,xenite:4000,antimatter:467},time:600,cargo:3000,attack:14400,hull:12240,can:["attack"]},
  {id:"titan",cost:{titanium:20667,xenite:12000,antimatter:2500},time:1600,cargo:8000,attack:52000,hull:44200,can:["attack"]},
  {id:"carrier",cost:{titanium:25333,xenite:15333,antimatter:3500},time:2200,cargo:25000,attack:29000,hull:24650,can:["attack","transfer"]},
  {id:"mothership",cost:{titanium:80000,xenite:48333,antimatter:12667},time:5200,cargo:100000,attack:180000,hull:153000,can:["attack","transfer"]},
  {id:"colon_ship",cost:{titanium:36000,xenite:20000,antimatter:6000},time:16200,cargo:10000,attack:0,hull:44000,can:["colonize"]},
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

    // V13 1.5.94 : une ouverture de coffre ne doit jamais être bloquée par une
    // flotte/attaque en attente. Avant, game-action appelait processQueues()
    // avant TOUTE action ; si une attaque posait problème, open_chest échouait
    // aussi, ce qui donnait l'impression que plus aucun coffre ne s'ouvrait.
    const isolateChestAction = action === "open_chest";
    const isolateBootAction = action === "bootstrap" || action === "state";
    const isolateProcessAction = action === "process";
    const isolateFleetLaunchAction = action === "launch_fleet";
    const fullProcessBeforeAction = action === "resolve_player_attack";
    let queueWarning: string | null = null;
    if (fullProcessBeforeAction) {
      await processQueues(admin, supaUser, user.id);
    } else if (isolateProcessAction || isolateFleetLaunchAction) {
      try { await processQueues(admin, supaUser, user.id); }
      catch (qe) {
        queueWarning = String((qe as Error)?.message || qe);
        try { await processQueuesSafeNoCombat(admin, user.id); } catch (_) {}
      }
    } else {
      try { await processQueuesSafeNoCombat(admin, user.id); }
      catch (qe) { queueWarning = String((qe as Error)?.message || qe); }
    }

    let message = "ok";
    let extra: Record<string, unknown> = {};
    if (queueWarning) extra.queueWarning = queueWarning;
    if (action === "bootstrap" || action === "state") {
      message = "Etat serveur charge.";
    } else if (action === "open_chest") {
      const chest = await openChest(admin, user.id, body);
      message = chest.message;
      extra.chest = chest;
    } else if (action === "buy_building") {
      message = await buyBuilding(admin, user.id, body);
    } else if (action === "buy_build_queue_2") {
      message = await buyBuildQueue2(admin, user.id);
    } else if (action === "finish_building") {
      message = await finishBuilding(admin, user.id, body);
    } else if (action === "buy_ship") {
      message = await buyShip(admin, user.id, body);
    } else if (action === "finish_ship") {
      message = await finishShip(admin, user.id, body);
    } else if (action === "launch_fleet") {
      message = await launchFleet(admin, user.id, body);
    } else if (action === "resolve_player_attack") {
      message = await resolvePlayerAttackNow(admin, supaUser, user.id, body);
    } else if (action === "process") {
      message = queueWarning ? "Traitement serveur partiel." : "Files et flottes traitees.";
    } else if (action === "repair_reduce_ships") {
      const repair = await repairReduceShips(admin, user.id, body);
      message = "Stock de vaisseaux reduit cote serveur.";
      extra.repair = repair;
    } else if (action === "credit_quest_reward") {
      message = await creditQuestReward(admin, user.id, body);
    } else if (action === "abandon_colony") {
      message = await abandonColony(admin, user.id, body);
    } else if (action === "transfer_resources") {
      message = await transferResources(admin, user.id, body);
    } else {
      await audit(admin, user.id, action, false, { error:"unknown_action" });
      return json({ ok:false, error:"action_inconnue", state: await snapshot(admin, user.id) }, 400);
    }

    await accrueResources(admin, user.id);
    if (fullProcessBeforeAction) {
      await processQueues(admin, supaUser, user.id);
    } else if (isolateProcessAction || isolateFleetLaunchAction) {
      try { await processQueues(admin, supaUser, user.id); }
      catch (qe) {
        extra.queueWarningAfter = String((qe as Error)?.message || qe);
        try { await processQueuesSafeNoCombat(admin, user.id); } catch (_) {}
      }
    } else {
      try { await processQueuesSafeNoCombat(admin, user.id); }
      catch (qe) { extra.queueWarningAfter = String((qe as Error)?.message || qe); }
    }
    await audit(admin, user.id, action, true, { message, ...extra });
    return json({ ok:true, message, ...extra, state: await snapshot(admin, user.id) }, 200);
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
function energyConsumption(base: number, level: number) { return level <= 0 ? 0 : Math.round(base * Math.pow(ECONOMY.productionScale, Math.max(0, level - 1))); }

async function audit(admin: any, playerId: string, action: string, ok: boolean, details: Record<string, unknown>) {
  try { await admin.from("game_security_audit").insert({ player_id: playerId, action, ok, details }); } catch (_) {}
}

async function ensurePlayer(admin: any, playerId: string, snapshotPayload: any) {
    try {
    await admin.rpc("stellarion_ensure_home_planet", {
      p_player_id: playerId,
      p_name: "Planète mère"
    });
  } catch (_) {}
  // 1.7.13 : game_resources est maintenant clé (player_id, planet_id) — un joueur
  // avec des colonies a plusieurs lignes. On vérifie spécifiquement la ligne
  // "home" (sinon .maybeSingle() plante dès la 2e planète avec "multiple rows").
  const existing = await admin.from("game_resources").select("player_id").eq("player_id", playerId).eq("planet_id", "home").maybeSingle();
  if (!existing.error && existing.data) {
    await admin.from("game_buildings").upsert({ player_id:playerId, planet_id:"home", building_id:"command_center", level:1, updated_at:new Date().toISOString() }, { onConflict:"player_id,planet_id,building_id", ignoreDuplicates:true });
    await admin.from("game_security_profile").upsert({ player_id:playerId, updated_at:new Date().toISOString() }, { onConflict:"player_id" });
    return;
  }

  const seed = sanitizeInitialSnapshot(snapshotPayload || {});
  const res = await admin.from("game_resources").upsert({
    player_id: playerId,
    planet_id: "home",
    titanium: seed.resources.titanium,
    xenite: seed.resources.xenite,
    antimatter: seed.resources.antimatter,
    fragments: seed.resources.fragments,
    last_tick: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict:"player_id,planet_id" });
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

// 1.7.13 : accrual par planète. Avant, la production de TOUS les bâtiments (toutes
// planètes confondues) était sommée dans l'unique ligne du joueur — une colonie
// profitait donc instantanément de tout le stock de la planète mère. Chaque planète
// (ligne game_resources) a maintenant son propre last_tick et n'accumule que la
// production de ses propres bâtiments (mêmes formules qu'avant, appliquées par planète).
async function accrueResources(admin: any, playerId: string) {
  const rr = await admin.from("game_resources").select("*").eq("player_id", playerId);
  if (rr.error) throw rr.error;
  const rows = rr.data || [];
  if (!rows.length) return;

  const br = await admin.from("game_buildings").select("planet_id,building_id,level").eq("player_id", playerId);
  if (br.error) throw br.error;
  const buildingsByPlanet: Record<string, any[]> = {};
  for (const row of br.data || []) {
    const pid = String(row.planet_id || "home");
    (buildingsByPlanet[pid] = buildingsByPlanet[pid] || []).push(row);
  }

  const now = Date.now();
  for (const res of rows) {
    const planetId = String(res.planet_id || "home");
    const last = new Date(res.last_tick || now).getTime();
    const dt = Math.min(12 * 3600, Math.max(0, (now - last) / 1000));
    if (dt < 5) continue;

    let energyProd = 0;
    let energyCons = 0;
    let titaniumPerHour = 0;
    let xenitePerHour = 0;
    let antimatterPerHour = 0;
    for (const row of buildingsByPlanet[planetId] || []) {
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
    const up = await admin.from("game_resources").update(upd).eq("player_id", playerId).eq("planet_id", planetId);
    if (up.error) throw up.error;
  }
}

function shipCargoCapacity(ships: any) {
  let total = 0;
  for (const [shipId, qtyRaw] of Object.entries(ships || {})) {
    const def = SHIPS[String(shipId)];
    if (!def) continue;
    total += n(qtyRaw, 0, 1000000) * n(def.cargo);
  }
  return total;
}
function shipAttackPower(ships: any) {
  let total = 0;
  for (const [shipId, qtyRaw] of Object.entries(ships || {})) {
    const def = SHIPS[String(shipId)];
    if (!def) continue;
    total += n(qtyRaw, 0, 1000000) * n(def.attack);
  }
  return total;
}
function targetNum(target: any, key: string, fallback = 0) {
  return n(target && target[key] !== undefined ? target[key] : fallback, 0, 100000000);
}
function fitLootToCargo(loot: any, cap: number) {
  cap = n(cap, 0, 100000000);
  const physical = n(loot.titanium) + n(loot.xenite) + n(loot.antimatter);
  if (cap <= 0) return { titanium:0, xenite:0, antimatter:0, fragments:n(loot.fragments,0,100000) };
  if (physical <= cap) return {
    titanium:n(loot.titanium), xenite:n(loot.xenite), antimatter:n(loot.antimatter), fragments:n(loot.fragments,0,100000)
  };
  const ratio = cap / physical;
  let titanium = Math.floor(n(loot.titanium) * ratio);
  let xenite = Math.floor(n(loot.xenite) * ratio);
  let antimatter = Math.floor(n(loot.antimatter) * ratio);
  let used = titanium + xenite + antimatter;
  if (used < cap && n(loot.titanium) > titanium) titanium += Math.min(cap - used, n(loot.titanium) - titanium);
  used = titanium + xenite + antimatter;
  if (used < cap && n(loot.xenite) > xenite) xenite += Math.min(cap - used, n(loot.xenite) - xenite);
  used = titanium + xenite + antimatter;
  if (used < cap && n(loot.antimatter) > antimatter) antimatter += Math.min(cap - used, n(loot.antimatter) - antimatter);
  return { titanium, xenite, antimatter, fragments:n(loot.fragments,0,100000) };
}
function serverAttackResult(f: any) {
  const ships = f.ships || {};
  const payload = f.payload || {};
  const target = payload.target || {};
  const cargoCap = shipCargoCapacity(ships);
  const attack = shipAttackPower(ships);
  const danger = Math.max(1, targetNum(target, "danger", 1));
  const richness = Math.max(1, targetNum(target, "richness", 1));
  const enemyPower = Math.max(
    160,
    targetNum(target, "enemyPower", 0) || targetNum(target, "power", 0) || Math.round(danger * 620 + richness * 220),
  );
  const victory = attack > 0 && attack >= Math.round(enemyPower * 0.55);
  const rawLoot = victory ? {
    titanium: Math.round((900 + enemyPower * 0.55) * richness),
    xenite: Math.round((420 + enemyPower * 0.32) * richness),
    antimatter: Math.round((35 + enemyPower * 0.035) * richness),
    fragments: target.aiThreat ? 2 : 0,
  } : { titanium:0, xenite:0, antimatter:0, fragments:0 };
  const loot = fitLootToCargo(rawLoot, cargoCap);
  return {
    patch:"v6-attack-loot-1588",
    targetName:String(f.target_name || target.name || "Cible"),
    victory,
    attackPower:attack,
    enemyPower,
    cargoCap,
    loot,
    resolvedAt:new Date().toISOString(),
  };
}


function combatReturnSeconds(f: any) {
  const payload = f && f.payload || {};
  const original = n(payload.durationSeconds || payload.duration || 60, 10, 3600);
  return Math.max(6, Math.min(900, Math.round(original * 0.75)) || 45);
}
function normalizeAiCombatResult(result: any, f: any) {
  const ships = f.ships || {};
  return {
    ...result,
    patch: "v7-ai-server-combat-1589",
    serverResolved: true,
    target: (f.payload && f.payload.target) || {},
    sentShips: ships,
    shipsSent: ships,
    playerRemaining: ships,
    playerLost: {},
    attackerLosses: {},
    attackerPower: n(result.attackPower),
    playerAttack: n(result.attackPower),
    defenderPower: n(result.enemyPower),
    enemyPower: n(result.enemyPower),
    attackRoll: n(result.attackPower),
    defenseRoll: n(result.enemyPower),
    loot: result.loot || { titanium:0, xenite:0, antimatter:0, fragments:0 },
  };
}
function normalizePvpCombatResult(data: any, target: any, sentShips: any) {
  data = data || {};
  const remaining = data.attackerRemaining || data.playerRemaining || sentShips || {};
  const cargoCap = shipCargoCapacity(remaining);
  const loot = fitLootToCargo(data.loot || {}, cargoCap);
  return {
    version: data.version || "v7-pvp-server-combat-1589",
    patch: "v7-pvp-server-combat-1589",
    serverResolved: true,
    victory: !!data.victory,
    target: target || {},
    targetName: String((target && (target.homePlanetName || target.name || target.username)) || "Planète ennemie"),
    sentShips: sentShips || {},
    shipsSent: sentShips || {},
    playerRemaining: remaining,
    playerLost: data.attackerLost || {},
    attackerLosses: data.attackerLost || {},
    loot,
    attackerPower: n(data.attackerPower || data.attackerAttack),
    playerAttack: n(data.attackerAttack || data.attackerPower),
    playerDefense: n(data.attackerHull),
    defenderPower: n(data.defenderPower || data.defenderAttack || data.defenderHull),
    enemyAttack: n(data.defenderAttack),
    enemyDefense: n(data.defenderHull),
    attackRoll: n(data.attackRoll || data.attackerPower),
    defenseRoll: n(data.defenseRoll || data.defenderPower),
    defenderShipsBefore: data.defenderShipsBefore || {},
    defenderShipsInFlight: data.defenderShipsInFlight || {},
    defenderShipsExcludedFromDefense: data.defenderShipsExcludedFromDefense || data.defenderShipsInFlight || {},
    defenderShipsLost: data.defenderShipsLost || {},
    defenderShipsRemaining: data.defenderShipsRemaining || {},
    defenderDefensesBefore: data.defenderDefensesBefore || {},
    defenderDefensesLost: data.defenderDefensesLost || {},
    defenderDefensesRemaining: data.defenderDefensesRemaining || {},
    stockBefore: data.stockBefore || {},
    stockAfter: data.stockAfter || {},
    deductedFromTargetStock: data.deductedFromTargetStock || data.loot || {},
  };
}
async function resolveFleetAttack(admin: any, supaUser: any, playerId: string, f: any) {
  const payload = f.payload || {};
  const target = payload.target || {};
  if (target && target.playerId && supaUser && typeof supaUser.rpc === "function") {
    const targetPlanetId = String(target.homePlanetId || target.planetId || target.home_planet_id || "") || null;
    const rpc = await supaUser.rpc("stellarion_resolve_player_attack", {
      target_player_id: String(target.playerId),
      target_planet_id: targetPlanetId,
      attacker_ships: f.ships || {},
    });
    if (rpc.error) throw rpc.error;
    return normalizePvpCombatResult(rpc.data || {}, target, f.ships || {});
  }
  return normalizeAiCombatResult(serverAttackResult(f), f);
}
async function markFleetReturningAfterCombat(admin: any, supaUser: any, playerId: string, f: any) {
  const now = new Date().toISOString();
  const payload = f.payload || {};
  const result = await resolveFleetAttack(admin, supaUser, playerId, f);
  const returningShips = result.playerRemaining || f.ships || {};
  const loot = result.loot || { titanium:0, xenite:0, antimatter:0, fragments:0 };
  const lootTotal = n(loot.titanium) + n(loot.xenite) + n(loot.antimatter) + n(loot.fragments);
  // 1.7.13 : le butin est credite a la planete d'origine de la flotte (ressources
  // propres a chaque planete), les fragments restent une monnaie compte-large (home).
  const creditPlanetId = await resolveCreditPlanetId(admin, playerId, f.origin_planet_id);
  if (n(loot.titanium) + n(loot.xenite) + n(loot.antimatter) > 0) await addResources(admin, playerId, creditPlanetId, loot);
  if (n(loot.fragments) > 0) await addFragments(admin, playerId, loot.fragments);
  const resourcesAfter = await currentResources(admin, playerId, creditPlanetId);
  const fragmentsAfter = await currentFragments(admin, playerId);
  const creditedResult = {
    ...result,
    serverResolved:true,
    lootCredited:true,
    lootCreditedAt: lootTotal > 0 ? now : null,
    attackerResourcesAfter:{
      titanium:n(resourcesAfter.titanium),
      xenite:n(resourcesAfter.xenite),
      antimatter:n(resourcesAfter.antimatter),
      fragments:fragmentsAfter,
    },
  };
  // V11 1.5.92 : le rapport ne dépend plus de la durée de vie de la ligne game_fleets.
  // On écrit un message serveur persistant immédiatement après la résolution du combat.
  // Ainsi, même si la flotte revient/supprimée avant que le client voie payload.serverCombat,
  // le rapport reste disponible dans la messagerie et contient le stock exact après crédit.
  await insertPersistentCombatMessage(admin, playerId, f, creditedResult);
  // V8 : le rapport contient le stock attaquant exact après crédit.
  // Le cargo retour reste vide pour éviter tout double crédit au retour de flotte.
  const cargo = { titanium:0, xenite:0, antimatter:0, fragments:0 };
  const nextPayload = { ...payload, serverCombat: creditedResult, combatResolvedAt: now, combatLootCreditedAt: lootTotal > 0 ? now : null, combatResolver: "v8-server-authority-1590" };
  const up = await admin.from("game_fleets")
    .update({ returning:true, ships:returningShips, cargo, payload:nextPayload, start_at:now, ends_at:isoPlus(combatReturnSeconds(f)), updated_at:now })
    .eq("id", f.id).eq("player_id", playerId);
  if (up.error) throw up.error;
  try {
    await admin.from("public_missions").update({
      from_x:n((payload.target || {}).x, -999999, 999999),
      from_y:n((payload.target || {}).y, -999999, 999999),
      to_x:n((payload.from || {}).x, -999999, 999999),
      to_y:n((payload.from || {}).y, -999999, 999999),
      is_returning:true,
      started_at:now,
      ends_at:isoPlus(combatReturnSeconds(f)),
      updated_at:now,
    }).eq("id", String(f.id));
  } catch (_) {}
  return creditedResult;
}

function reportFmt(v: unknown) { return n(v).toLocaleString("fr-FR"); }
function reportLootLine(loot: any) {
  loot = loot || {};
  return `${reportFmt(loot.titanium)} Titane · ${reportFmt(loot.xenite)} Xénite · ${reportFmt(loot.antimatter)} Antimatière${n(loot.fragments) ? ` · ${reportFmt(loot.fragments)} fragments` : ""}`;
}
function reportShipsLine(ships: any) {
  const entries = Object.entries(ships || {}).filter(([, qty]) => n(qty) > 0);
  if (!entries.length) return "Aucun vaisseau";
  return entries.map(([id, qty]) => `${id} x${reportFmt(qty)}`).join(" · ");
}
async function insertPersistentCombatMessage(admin: any, playerId: string, f: any, result: any) {
  try {
    const payload = f?.payload || {};
    const target = payload.target || result?.target || {};
    const name = String(target.name || target.username || target.homePlanetName || result?.targetName || f?.target_name || "cible");
    const marker = `[stellarion-combat-report:${String(f?.id || "unknown")}]`;
    const stock = result?.attackerResourcesAfter || {};
    const stockMarker = `[stellarion-combat-stock-json:${JSON.stringify({
      titanium:n(stock.titanium),
      xenite:n(stock.xenite),
      antimatter:n(stock.antimatter),
      fragments:n(stock.fragments),
    })}]`;
    try {
      const existing = await admin.from("messages")
        .select("id")
        .eq("recipient_id", playerId)
        .ilike("body", `%${marker}%`)
        .limit(1);
      if (!existing.error && Array.isArray(existing.data) && existing.data.length > 0) return;
    } catch (_) {}
    const victory = !!result?.victory;
    const subject = `${target?.playerId ? "Rapport de combat joueur" : "Rapport de combat"} : ${name}`;
    const body = [
      `Rapport de combat — ${name}`,
      ``,
      `Résultat : ${victory ? "Victoire" : "Défaite"}`,
      `Butin ajouté au stock : ${reportLootLine(result?.loot || {})}`,
      `Puissance attaque : ${reportFmt(result?.attackerPower || result?.playerAttack || result?.attackRoll || 0)}`,
      `Puissance défense : ${reportFmt(result?.defenderPower || result?.enemyPower || result?.defenseRoll || 0)}`,
      `Vaisseaux revenus : ${reportShipsLine(result?.playerRemaining || f?.ships || {})}`,
      `Pertes : ${reportShipsLine(result?.playerLost || {})}`,
      ``,
      `Stock après combat : ${reportFmt(stock.titanium)} Titane · ${reportFmt(stock.xenite)} Xénite · ${reportFmt(stock.antimatter)} Antimatière · ${reportFmt(stock.fragments)} fragments`,
      ``,
      `Ce rapport est écrit côté serveur au moment exact où le butin est crédité.`,
      marker,
      stockMarker,
    ].join("\n");
    const ins = await admin.from("messages").insert({
      sender_id: playerId,
      recipient_id: playerId,
      subject,
      body,
      created_at: new Date().toISOString(),
      read: false,
    });
    if (ins.error) console.warn("insertPersistentCombatMessage", ins.error.message || ins.error);
  } catch (e) {
    console.warn("insertPersistentCombatMessage", String((e as Error)?.message || e));
  }
}

async function resolvePlayerAttackNow(admin: any, supaUser: any, playerId: string, body: any) {
  const id = String(body.fleet_id || body.id || "");
  if (!id) throw new Error("fleet_id_missing");
  const row = await admin.from("game_fleets").select("*").eq("player_id", playerId).eq("id", id).maybeSingle();
  if (row.error) throw row.error;
  const f = row.data;
  if (!f) throw new Error("flotte_introuvable");
  if (String(f.mission || "") !== "attack") throw new Error("mission_non_combat");
  if (f.returning) return "Combat déjà résolu, retour en cours.";
  const dueAt = Date.parse(f.ends_at || "");
  if (Number.isFinite(dueAt) && dueAt > Date.now() + 1500) throw new Error("attaque_pas_encore_arrivee");
  const result = await markFleetReturningAfterCombat(admin, supaUser, playerId, f);
  return result.victory ? "Combat résolu côté serveur : butin crédité au stock." : "Combat résolu côté serveur : retour flotte en cours.";
}

async function processQueuesSafeNoCombat(admin: any, playerId: string) {
  // Même logique que processQueues pour bâtiments/vaisseaux, mais sans toucher
  // aux flottes. Utilisé pour les coffres afin qu'une erreur combat ne bloque
  // pas une action boutique/collection indépendante.
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
    if (!(await claimGameActionOnce(admin, playerId, "ship_queue", q.id))) {
      await admin.from("game_ship_queue").delete().eq("id", q.id).eq("player_id", playerId);
      continue;
    }
    await addShips(admin, playerId, q.planet_id, q.ship_id, n(q.qty,1,100000));
    await admin.from("game_ship_queue").delete().eq("id", q.id).eq("player_id", playerId);
  }
}

async function processQueues(admin: any, maybeSupaUser: any, maybePlayerId?: string) {
  const supaUser = maybePlayerId ? maybeSupaUser : null;
  const playerId = String(maybePlayerId || maybeSupaUser);
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
    if (!(await claimGameActionOnce(admin, playerId, "ship_queue", q.id))) {
      await admin.from("game_ship_queue").delete().eq("id", q.id).eq("player_id", playerId);
      continue;
    }
    await addShips(admin, playerId, q.planet_id, q.ship_id, n(q.qty,1,100000));
    await admin.from("game_ship_queue").delete().eq("id", q.id).eq("player_id", playerId);
  }

  const fl = await admin.from("game_fleets").select("*").eq("player_id", playerId).lte("ends_at", now);
  if (fl.error) throw fl.error;
  for (const f of fl.data || []) {
    if (f.returning) {
      if (!(await claimGameActionOnce(admin, playerId, "fleet_return", f.id))) {
        await admin.from("game_fleets").delete().eq("id", f.id).eq("player_id", playerId);
        continue;
      }
      // 1.7.13 : rapatrie vers la planete d'origine si elle existe encore, sinon
      // vers "home" (cas d'une colonie abandonnee pendant que la flotte etait en vol).
      const creditPlanetIdReturn = await resolveCreditPlanetId(admin, playerId, f.origin_planet_id);
      const ships = f.ships || {};
      for (const [shipId, qty] of Object.entries(ships)) if (SHIPS[shipId]) await addShips(admin, playerId, creditPlanetIdReturn, shipId, n(qty,0,1000000));
      const cargo = f.cargo || {};
      if (n(cargo.titanium)+n(cargo.xenite)+n(cargo.antimatter) > 0) await addResources(admin, playerId, creditPlanetIdReturn, cargo);
      await admin.from("game_fleets").delete().eq("id", f.id).eq("player_id", playerId);
    } else {
      const mission = String(f.mission || "");
      let cargo = f.cargo || {};
      let payload = f.payload || {};

      // V6 1.5.88 : une attaque doit générer son butin à l'arrivée,
      // le stocker dans le cargo du trajet retour, puis l'ajouter aux
      // ressources canoniques au retour. Avant, le serveur mettait juste
      // returning=true avec cargo vide : le rapport parlait de butin, mais
      // game_resources ne recevait jamais les ressources.
      if (mission === "attack") {
        await markFleetReturningAfterCombat(admin, supaUser, playerId, f);
        continue;
      }

      // 1.7.10 : la colonisation ne faisait jamais rien côté serveur (aucun
      // "case colonize" n'existait ici, contrairement à l'ancien processFleets
      // client qui créait la colonie via state.scanReports). Depuis le passage
      // en "server authority" (1.5.70/1.5.89), les flottes serverAuthority ne
      // passent plus jamais par ce processFleets client, donc la colonie
      // n'était plus jamais créée nulle part : le vaisseau colon rentrait
      // simplement à vide. Voir resolveColonization plus bas.
      if (mission === "colonize") {
        try {
          await resolveColonization(admin, playerId, f);
        } catch (colErr) {
          await audit(admin, playerId, "colonize_failed", false, { fleetId: f.id, error: String((colErr as Error)?.message || colErr) });
        }
      }

      await admin.from("game_fleets")
        .update({ returning:true, cargo, payload, start_at:now, ends_at:isoPlus(combatReturnSeconds(f)), updated_at:now })
        .eq("id", f.id).eq("player_id", playerId);
    }
  }
}

// 1.7.10 — Création de colonie côté serveur (source d'autorité pour les vaisseaux/ressources).
// Le nom/rareté/archétype/bonus d'une planète colonisable sont 100% déterministes côté
// client (planetProfile(), seed fixe dérivée de system.system) : pas besoin que le client
// transmette quoi que ce soit de plus que ce qui est déjà stocké au lancement
// (payload.target, qui contient l'objet système complet dont son .system numérique).
// Idempotent : si game_buildings a déjà une ligne pour ce planet_id, on ne recrée rien
// (évite un doublon si processQueues tourne deux fois sur la même flotte).
function seededServer1710(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967295; };
}
function rarityRollServer1710(r: () => number) {
  const x = r();
  return x < .01 ? "Mythic" : x < .05 ? "Legendary" : x < .15 ? "Epic" : x < .40 ? "Rare" : "Common";
}
function planetProfileServer1710(systemNumber: number, systemName: string) {
  const r = seededServer1710(systemNumber * 991 + 7);
  const rarity = rarityRollServer1710(r);
  const slotBase = rarity === "Mythic" ? 7 : rarity === "Legendary" ? 6 : rarity === "Epic" ? 6 : rarity === "Rare" ? 5 : 4;
  const archetypes = [
    { type: "Monde minier", weights: { mining: 3, industrial: 1, military: 1, energy: 1, research: 0 } },
    { type: "Monde énergétique", weights: { mining: 1, industrial: 1, military: 1, energy: 3, research: 0 } },
    { type: "Monde industriel", weights: { mining: 1, industrial: 3, military: 1, energy: 1, research: 0 } },
    { type: "Monde militaire", weights: { mining: 1, industrial: 1, military: 3, energy: 1, research: 0 } },
    { type: "Monde relique", weights: { mining: 1, industrial: 1, military: 1, energy: 1, research: 0 } },
  ];
  const arch = archetypes[Math.floor(r() * archetypes.length)];
  const keys: string[] = [];
  Object.entries(arch.weights).forEach(([k, w]) => { for (let i = 0; i < (w as number); i++) keys.push(k); });
  const slots: Record<string, number> = { mining: 0, industrial: 0, military: 0, energy: 0, research: 0 };
  for (let i = 0; i < slotBase; i++) slots[keys[Math.floor(r() * keys.length)]]++;
  slots.research = 0;
  return { name: systemName + " Prime", rarity, archetype: arch.type };
}
async function resolveColonization(admin: any, playerId: string, f: any) {
  const target = (f.payload && f.payload.target) || {};
  const planetId = safePlanet(String(f.target_id || target.id || "").slice(0, 48));
  if (!planetId || planetId === "home") return;
  const exists = await admin.from("game_buildings").select("building_id").eq("player_id", playerId).eq("planet_id", planetId).limit(1).maybeSingle();
  if (exists.error) throw exists.error;
  if (exists.data) return; // déjà colonisée : idempotent, on ne fait rien de plus
  const up = await admin.from("game_buildings").upsert(
    { player_id: playerId, planet_id: planetId, building_id: "command_center", level: 1, updated_at: new Date().toISOString() },
    { onConflict: "player_id,planet_id,building_id" }
  );
  if (up.error) throw up.error;
  // 1.7.13 : chaque planète a son propre stock de ressources (titane/xénite/antimatière) —
  // la nouvelle colonie démarre à 0 (elle n'a encore aucune mine) ; les fragments à 0 ne
  // sont jamais utilisés hors de la ligne "home", posés ici uniquement par cohérence de schéma.
  const resIns = await admin.from("game_resources").upsert(
    { player_id: playerId, planet_id: planetId, titanium: 0, xenite: 0, antimatter: 0, fragments: 0, last_tick: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: "player_id,planet_id", ignoreDuplicates: true }
  );
  if (resIns.error) throw resIns.error;
  const systemNumber = n(target.system, 1, 100000);
  const profile = planetProfileServer1710(systemNumber || 1, String(target.name || f.target_name || "Système"));
  await audit(admin, playerId, "colonize_success", true, { planetId, name: profile.name, rarity: profile.rarity, archetype: profile.archetype });
}

// 1.7.13 — Abandon de colonie. Décision confirmée : tout est perdu (bâtiments,
// vaisseaux, file de construction/formation, stock propre à la colonie), sans
// remboursement ni rapatriement. Jamais "home". Idempotent côté flottes en vol :
// resolveCreditPlanetId() détecte l'absence de la planète et rapatrie vers "home"
// tout vaisseau/ressource d'une flotte qui reviendrait vers une colonie abandonnée.
async function abandonColony(admin: any, playerId: string, body: any) {
  const planetId = safePlanet(String(body.planet_id || body.planetId || "").slice(0, 48));
  if (!planetId || planetId === "home") throw new Error("planete_invalide");
  const exists = await admin.from("game_buildings").select("building_id").eq("player_id", playerId).eq("planet_id", planetId).limit(1).maybeSingle();
  if (exists.error) throw exists.error;
  if (!exists.data) throw new Error("colonie_introuvable");
  const delBuildings = await admin.from("game_buildings").delete().eq("player_id", playerId).eq("planet_id", planetId);
  if (delBuildings.error) throw delBuildings.error;
  const delShips = await admin.from("game_ships").delete().eq("player_id", playerId).eq("planet_id", planetId);
  if (delShips.error) throw delShips.error;
  const delBQ = await admin.from("game_build_queue").delete().eq("player_id", playerId).eq("planet_id", planetId);
  if (delBQ.error) throw delBQ.error;
  const delSQ = await admin.from("game_ship_queue").delete().eq("player_id", playerId).eq("planet_id", planetId);
  if (delSQ.error) throw delSQ.error;
  const delRes = await admin.from("game_resources").delete().eq("player_id", playerId).eq("planet_id", planetId);
  if (delRes.error) throw delRes.error;
  await audit(admin, playerId, "abandon_colony", true, { planetId });
  return `Colonie abandonnée : bâtiments, vaisseaux et stock perdus.`;
}

// 1.7.15 — Transfert de ressources entre deux planètes du même joueur ("Logistique
// inter-planètes", transfert immédiat, sans vaisseau). Avant ce correctif, ce transfert
// n'existait QUE côté client (mutation directe de state.planetResources) : il n'appelait
// jamais le serveur, donc n'était jamais réellement persisté — la resynchronisation
// périodique avec game_resources (source de vérité) effaçait le "transfert" en silence,
// et l'utilisateur avait l'impression que "rien ne se passe". Ici, le mouvement est
// appliqué directement dans game_resources, planète par planète, de façon atomique.
async function transferResources(admin: any, playerId: string, body: any) {
  const fromId = safePlanet(String(body.from_planet_id || body.fromPlanetId || "").slice(0, 48));
  const toId = safePlanet(String(body.to_planet_id || body.toPlanetId || "").slice(0, 48));
  if (!fromId || !toId || fromId === toId) throw new Error("planetes_invalides");

  async function ownsPlanet(pid: string) {
    if (pid === "home") return true;
    const ex = await admin.from("game_buildings").select("building_id").eq("player_id", playerId).eq("planet_id", pid).limit(1).maybeSingle();
    if (ex.error) throw ex.error;
    return !!ex.data;
  }
  if (!(await ownsPlanet(fromId))) throw new Error("planete_depart_introuvable");
  if (!(await ownsPlanet(toId))) throw new Error("planete_destination_introuvable");

  // 1.7.16 — CORRECTIF CRITIQUE : une colonie fondée avant le passage aux ressources
  // par planète (1.7.13) peut n'avoir AUCUNE ligne game_resources (seule resolveColonization()
  // en crée une pour les nouvelles colonies). Avant ce correctif, currentResources(toId) plus
  // bas levait "resources_missing" APRÈS que le débit de la planète de départ avait déjà été
  // écrit (setResources(fromId) puis addResources(toId) qui échoue) : les ressources
  // disparaissaient purement et simplement (débitées, jamais créditées nulle part). On
  // s'assure maintenant que les DEUX planètes ont une ligne AVANT de toucher au stock.
  async function ensureResourceRow(pid: string) {
    const ex = await admin.from("game_resources").select("player_id").eq("player_id", playerId).eq("planet_id", pid).maybeSingle();
    if (ex.error) throw ex.error;
    if (ex.data) return;
    const ins = await admin.from("game_resources").upsert(
      { player_id: playerId, planet_id: pid, titanium: 0, xenite: 0, antimatter: 0, fragments: 0, last_tick: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "player_id,planet_id", ignoreDuplicates: true }
    );
    if (ins.error) throw ins.error;
  }
  await ensureResourceRow(fromId);
  await ensureResourceRow(toId);

  const requested = {
    titanium: n(body.titanium, 0, 100_000_000),
    xenite: n(body.xenite, 0, 100_000_000),
    antimatter: n(body.antimatter, 0, 50_000_000),
  };
  if (requested.titanium + requested.xenite + requested.antimatter <= 0) throw new Error("aucune_ressource_a_transferer");

  const src = await currentResources(admin, playerId, fromId);
  const moved = {
    titanium: Math.min(requested.titanium, n(src.titanium)),
    xenite: Math.min(requested.xenite, n(src.xenite)),
    antimatter: Math.min(requested.antimatter, n(src.antimatter)),
  };
  if (moved.titanium + moved.xenite + moved.antimatter <= 0) throw new Error("stock_insuffisant");

  spend(src, moved);
  await setResources(admin, playerId, fromId, src);
  await addResources(admin, playerId, toId, moved);
  await audit(admin, playerId, "transfer_resources", true, { fromId, toId, moved });
  return `Transfert effectué : ${moved.titanium} Ti / ${moved.xenite} Xe / ${moved.antimatter} AM vers ${toId === "home" ? "la planète mère" : toId}.`;
}

// 1.7.13 — Ressources par planète (au lieu d'un pool unique par joueur).
// game_resources est désormais clé (player_id, planet_id). Titane/Xénite/Antimatière
// sont propres à chaque planète (mère + colonies) ; les FRAGMENTS (monnaie premium,
// achetés via Stripe) restent volontairement une notion compte-large, toujours lus/
// écrits sur la ligne planet_id="home", jamais dupliqués ni fractionnés par colonie —
// voir currentFragments/spendFragments/addFragments plus bas.
async function currentResources(admin: any, playerId: string, planetId: string) {
  const rr = await admin.from("game_resources").select("titanium,xenite,antimatter").eq("player_id", playerId).eq("planet_id", planetId).maybeSingle();
  if (rr.error) throw rr.error;
  if (!rr.data) throw new Error("resources_missing");
  return rr.data;
}
async function setResources(admin: any, playerId: string, planetId: string, r: any) {
  const up = await admin.from("game_resources").update({ titanium:n(r.titanium), xenite:n(r.xenite), antimatter:n(r.antimatter), updated_at:new Date().toISOString() }).eq("player_id", playerId).eq("planet_id", planetId);
  if (up.error) throw up.error;
}
async function addResources(admin: any, playerId: string, planetId: string, delta: any) {
  const r = await currentResources(admin, playerId, planetId);
  r.titanium = n(r.titanium) + n(delta.titanium,0,100_000_000);
  r.xenite = n(r.xenite) + n(delta.xenite,0,100_000_000);
  r.antimatter = n(r.antimatter) + n(delta.antimatter,0,50_000_000);
  await setResources(admin, playerId, planetId, r);
}
async function currentFragments(admin: any, playerId: string) {
  const rr = await admin.from("game_resources").select("fragments").eq("player_id", playerId).eq("planet_id", "home").maybeSingle();
  if (rr.error) throw rr.error;
  if (!rr.data) throw new Error("resources_missing");
  return n(rr.data.fragments);
}
async function spendFragments(admin: any, playerId: string, amount: number) {
  amount = n(amount, 0, 100_000_000);
  if (amount <= 0) return;
  const cur = await currentFragments(admin, playerId);
  if (cur < amount) throw new Error("fragments_insuffisants");
  const up = await admin.from("game_resources").update({ fragments: cur - amount, updated_at: new Date().toISOString() }).eq("player_id", playerId).eq("planet_id", "home");
  if (up.error) throw up.error;
}
async function addFragments(admin: any, playerId: string, amount: number) {
  amount = n(amount, 0, 100_000);
  if (amount <= 0) return;
  const cur = await currentFragments(admin, playerId);
  const up = await admin.from("game_resources").update({ fragments: cur + amount, updated_at: new Date().toISOString() }).eq("player_id", playerId).eq("planet_id", "home");
  if (up.error) throw up.error;
}
// Un vaisseau qui rentre credite sa planete d'origine — sauf si cette planete a
// ete abandonnee entre-temps (colonie supprimee pendant que la flotte etait en
// vol) : dans ce cas, on rapatrie vers "home" plutot que d'echouer/perdre le gain.
async function resolveCreditPlanetId(admin: any, playerId: string, planetId: string) {
  const pid = safePlanet(planetId);
  if (!pid || pid === "home") return "home";
  const exists = await admin.from("game_buildings").select("building_id").eq("player_id", playerId).eq("planet_id", pid).limit(1).maybeSingle();
  if (exists.error || !exists.data) return "home";
  return pid;
}

// STELLARION — correctif "recompense qui disparait" (quetes journalieres / boss hebdomadaire).
// Avant ce correctif, les recompenses de Menaces galactiques (creditQuestRewardOnce /
// claimGalacticQuest cote client) n'etaient creditees qu'en local (state.resources),
// jamais transmises au serveur. Comme game_resources fait autorite et se resynchronise
// toutes les 30s (ca05_tick_all_my_planets), le gain local etait systematiquement efface
// au tick suivant : le joueur voyait la recompense apparaitre puis disparaitre.
// claim_key garantit qu'une meme recompense (menace tuee ou bonus quete/boss) ne peut
// etre creditee qu'une seule fois, meme en cas de double-clic ou de nouvel essai reseau.
async function creditQuestReward(admin: any, playerId: string, body: any) {
  const claimKey = String(body.claim_key || body.claimKey || "").slice(0, 160);
  if (!claimKey) throw new Error("claim_key_manquant");
  if (!(await claimGameActionOnce(admin, playerId, "quest_reward", claimKey))) {
    return `Recompense deja creditee pour ${claimKey}.`;
  }
  const reward = {
    titanium: n(body.titanium, 0, 2_000_000),
    xenite: n(body.xenite, 0, 2_000_000),
    antimatter: n(body.antimatter, 0, 500_000),
    fragments: n(body.fragments, 0, 5_000),
  };
  // 1.7.13 : recompense creditee sur "home" (les quetes/menaces galactiques ne sont
  // pas rattachees a une planete precise cote client) ; fragments toujours a part.
  if (reward.titanium || reward.xenite || reward.antimatter) await addResources(admin, playerId, "home", reward);
  if (reward.fragments) await addFragments(admin, playerId, reward.fragments);
  return `Recompense objectif galactique creditee : ${reward.titanium} Ti / ${reward.xenite} Xe / ${reward.antimatter} AM / ${reward.fragments} fragments.`;
}
function hasEnough(r: any, c: Cost) { return n(r.titanium) >= n(c.titanium) && n(r.xenite) >= n(c.xenite) && n(r.antimatter) >= n(c.antimatter); }
function spend(r: any, c: Cost) { r.titanium = n(r.titanium) - n(c.titanium); r.xenite = n(r.xenite) - n(c.xenite); r.antimatter = n(r.antimatter) - n(c.antimatter); }

async function buyBuilding(admin: any, playerId: string, body: any) {
  const buildingId = String(body.building_id || body.buildingId || "");
  const planetId = safePlanet(body.planet_id || body.planetId || "home");
  const def = BUILDINGS[buildingId];
  if (!def) throw new Error("batiment_inconnu");
  // 1.7.17 — la file de construction doit etre independante par planete : on ne compte
  // plus les constructions en cours sur TOUT le compte, seulement celles de cette planete.
  const qCount = await admin.from("game_build_queue").select("id", { count:"exact", head:true }).eq("player_id", playerId).eq("planet_id", planetId);
  if (qCount.error) throw qCount.error;
  const maxQueue = await maxBuildQueue(admin, playerId);
  if ((qCount.count || 0) >= maxQueue) throw new Error("file_construction_pleine");

  const rowLevel = await buildingLevel(admin, playerId, planetId, buildingId);
  const queued = await admin.from("game_build_queue").select("id", { count:"exact", head:true }).eq("player_id", playerId).eq("planet_id", planetId).eq("building_id", buildingId);
  if (queued.error) throw queued.error;
  const from = rowLevel + (queued.count || 0);
  const to = from + 1;
  const c = cost(def, to);
  const r = await currentResources(admin, playerId, planetId);
  if (!hasEnough(r, c)) throw new Error("ressources_insuffisantes");
  spend(r, c);
  await setResources(admin, playerId, planetId, r);
  const startsAt = new Date().toISOString();
  const ins = await admin.from("game_build_queue").insert({ player_id:playerId, planet_id:planetId, building_id:buildingId, from_level:from, to_level:to, start_at:startsAt, finish_at:isoPlus(buildTime(def, to)) });
  if (ins.error) throw ins.error;
  return `Construction serveur lancee : ${buildingId} niveau ${to}`;
}
async function maxBuildQueue(admin: any, playerId: string) {
  const pr = await admin.from("game_security_profile").select("build_queue_2_permanent").eq("player_id", playerId).maybeSingle();
  if (pr.error) throw pr.error;
  return pr.data?.build_queue_2_permanent ? 2 : 1;
}
async function buyBuildQueue2(admin: any, playerId: string) {
  const pr = await admin.from("game_security_profile").select("build_queue_2_permanent").eq("player_id", playerId).maybeSingle();
  if (pr.error) throw pr.error;
  if (pr.data?.build_queue_2_permanent) return "File auxiliaire deja active.";
  await spendFragments(admin, playerId, ECONOMY.buildQueue2Price);
  const up = await admin.from("game_security_profile").upsert({
    player_id: playerId,
    build_queue_2_permanent: true,
    build_queue_2_purchased_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict:"player_id" });
  if (up.error) throw up.error;
  return "File auxiliaire permanente debloquee.";
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
  await spendFragments(admin, playerId, price);
  const up = await admin.from("game_build_queue").update({ finish_at:new Date().toISOString() }).eq("id", id).eq("player_id", playerId);
  if (up.error) throw up.error;
  await processQueuesSafeNoCombat(admin, playerId);
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
  const r = await currentResources(admin, playerId, planetId);
  if (!hasEnough(r, total)) throw new Error("ressources_insuffisantes");
  spend(r, total);
  await setResources(admin, playerId, planetId, r);
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
  await spendFragments(admin, playerId, price);
  const up = await admin.from("game_ship_queue").update({ finish_at:new Date().toISOString() }).eq("id", id).eq("player_id", playerId);
  if (up.error) throw up.error;
  await processQueuesSafeNoCombat(admin, playerId);
  return `Formation terminee cote serveur avec ${price} fragments.`;
}

async function claimGameActionOnce(admin: any, playerId: string, kind: string, actionId: unknown) {
  const id = String(actionId || "");
  if (!id) return false;
  const ins = await admin.from("game_action_claims").insert({
    kind,
    action_id: id,
    player_id: playerId,
  });
  if (!ins.error) return true;
  if (ins.error.code === "23505" || String(ins.error.message || "").toLowerCase().includes("duplicate")) return false;
  if (String(ins.error.message || "").includes("game_action_claims")) {
    throw new Error("table_game_action_claims_manquante_lance_SUPABASE_GAME_ACTION_IDEMPOTENCY_1609");
  }
  throw ins.error;
}

async function addShips(admin: any, playerId: string, planetId: string, shipId: string, qty: number) {
  const old = await admin.from("game_ships").select("qty").eq("player_id", playerId).eq("planet_id", planetId).eq("ship_id", shipId).maybeSingle();
  if (old.error) throw old.error;
  const next = n(old.data?.qty) + n(qty,0,1000000);
  const up = await admin.from("game_ships").upsert({ player_id:playerId, planet_id:planetId, ship_id:shipId, qty:next, updated_at:new Date().toISOString() }, { onConflict:"player_id,planet_id,ship_id" });
  if (up.error) throw up.error;
}

function reduceShipMap(map: any, factor: number) {
  const out: Record<string, number> = {};
  let before = 0;
  let after = 0;
  for (const [shipId, qtyRaw] of Object.entries(map || {})) {
    if (!SHIPS[shipId]) continue;
    const qty = n(qtyRaw, 0, 1000000);
    before += qty;
    const next = Math.floor(qty * factor);
    if (next > 0) {
      out[String(shipId)] = next;
      after += next;
    }
  }
  return { ships: out, before, after };
}

async function repairReduceShips(admin: any, playerId: string, body: any) {
  const factor = Number(body.factor ?? body.keepFactor ?? 0.2);
  if (!(factor > 0 && factor < 1)) throw new Error("factor_invalide_entre_0_et_1");
  const now = new Date().toISOString();
  let stockBefore = 0;
  let stockAfter = 0;
  let stockRows = 0;
  let deletedStockRows = 0;
  let fleetBefore = 0;
  let fleetAfter = 0;
  let fleetRows = 0;

  const ships = await admin.from("game_ships").select("planet_id,ship_id,qty").eq("player_id", playerId);
  if (ships.error) throw ships.error;
  for (const row of ships.data || []) {
    if (!SHIPS[row.ship_id]) continue;
    const before = n(row.qty, 0, 1000000);
    const after = Math.floor(before * factor);
    stockBefore += before;
    stockAfter += after;
    stockRows += 1;
    if (after > 0) {
      const up = await admin.from("game_ships")
        .update({ qty: after, updated_at: now })
        .eq("player_id", playerId)
        .eq("planet_id", row.planet_id)
        .eq("ship_id", row.ship_id);
      if (up.error) throw up.error;
    } else {
      const del = await admin.from("game_ships")
        .delete()
        .eq("player_id", playerId)
        .eq("planet_id", row.planet_id)
        .eq("ship_id", row.ship_id);
      if (del.error) throw del.error;
      deletedStockRows += 1;
    }
  }

  const fleets = await admin.from("game_fleets").select("id,ships").eq("player_id", playerId);
  if (fleets.error) throw fleets.error;
  for (const fleet of fleets.data || []) {
    const reduced = reduceShipMap(fleet.ships || {}, factor);
    fleetBefore += reduced.before;
    fleetAfter += reduced.after;
    if (reduced.before === reduced.after) continue;
    const up = await admin.from("game_fleets")
      .update({ ships: reduced.ships, updated_at: now })
      .eq("player_id", playerId)
      .eq("id", fleet.id);
    if (up.error) throw up.error;
    fleetRows += 1;
  }

  await audit(admin, playerId, "repair_reduce_ships_detail", true, {
    factor,
    stockBefore,
    stockAfter,
    fleetBefore,
    fleetAfter,
    stockRows,
    deletedStockRows,
    fleetRows,
  });
  return { factor, stockBefore, stockAfter, stockRemoved: stockBefore - stockAfter, fleetBefore, fleetAfter, fleetRemoved: fleetBefore - fleetAfter, stockRows, deletedStockRows, fleetRows };
}

async function launchFleet(admin: any, playerId: string, body: any) {
  const planetId = safePlanet(body.planet_id || body.planetId || "home");
  const mission = String(body.mission || "explore").replace(/[^a-z_]/g, "").slice(0, 24) || "explore";
  const ships = body.ships || {};
  const rawCargo = body.cargo || {};
  const cargo = mission === "transfer" ? rawCargo : { titanium:0, xenite:0, antimatter:0 };
  const duration = n(body.durationSeconds || body.duration || 60, 10, 3600);
  const target = body.target || {};
  const launchShips: Record<string, number> = {};
  let shipCount = 0;
  let cargoCap = 0;
  for (const [shipId, qtyRaw] of Object.entries(ships)) {
    const def = SHIPS[shipId];
    const requested = n(qtyRaw,0,1000000);
    if (!def || requested <= 0) continue;
    const old = await admin.from("game_ships").select("qty").eq("player_id", playerId).eq("planet_id", planetId).eq("ship_id", shipId).maybeSingle();
    if (old.error) throw old.error;
    const qty = Math.min(n(old.data?.qty), requested);
    if (qty <= 0) continue;
    launchShips[String(shipId)] = qty;
    shipCount += qty;
    cargoCap += def.cargo * qty;
  }
  if (shipCount <= 0) throw new Error("aucun_vaisseau");
  // 1.7.10 : le client bloque déjà le lancement sans vaisseau colon (canDoMission),
  // mais rien ne l'imposait ici — un appel direct à l'API aurait pu coloniser
  // sans posséder de colon_ship. Le serveur étant désormais l'autorité qui crée
  // réellement la colonie (resolveColonization), il doit appliquer la même règle.
  if (mission === "colonize" && !(n(launchShips["colon_ship"]) > 0)) throw new Error("vaisseau_colon_requis");
  const cargoTotal = n(cargo.titanium) + n(cargo.xenite) + n(cargo.antimatter);
  if (cargoTotal > cargoCap) throw new Error("capacite_cargo_insuffisante");
  const r = await currentResources(admin, playerId, planetId);
  if (!hasEnough(r, cargo)) throw new Error("ressources_cargo_insuffisantes");
  const launchKey = fleetLaunchClaimKey(playerId, planetId, mission, target.id || body.target_id || "", launchShips, cargo, body.launch_id || body.launchId);
  if (!(await claimGameActionOnce(admin, playerId, "fleet_launch", launchKey))) {
    throw new Error("lancement_flotte_deja_en_cours");
  }

  for (const [shipId, qtyRaw] of Object.entries(launchShips)) {
    const qty = n(qtyRaw,0,1000000);
    if (!SHIPS[shipId] || qty <= 0) continue;
    const old = await admin.from("game_ships").select("qty").eq("player_id", playerId).eq("planet_id", planetId).eq("ship_id", shipId).maybeSingle();
    const next = n(old.data?.qty) - qty;
    await admin.from("game_ships").upsert({ player_id:playerId, planet_id:planetId, ship_id:shipId, qty:next, updated_at:new Date().toISOString() }, { onConflict:"player_id,planet_id,ship_id" });
  }
  spend(r, cargo);
  await setResources(admin, playerId, planetId, r);
  const ends = isoPlus(duration);
  const ins = await admin.from("game_fleets").insert({
    player_id:playerId,
    origin_planet_id:planetId,
    target_id:String(target.id || body.target_id || "").slice(0,64),
    target_name:String(target.name || body.target_name || "Système").slice(0,80),
    mission,
    ships: launchShips,
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

function fleetLaunchClaimKey(playerId: string, planetId: string, mission: string, targetId: unknown, ships: any, cargo: any, launchId?: unknown) {
  const shipSig = Object.keys(ships || {}).sort().map((k) => `${k}:${n(ships[k],0,1000000)}`).join(",");
  const cargoSig = ["titanium","xenite","antimatter","fragments"].map((k) => `${k}:${n(cargo?.[k])}`).join(",");
  const nonce = String(launchId || Math.floor(Date.now() / 5000));
  return [playerId, planetId, mission, String(targetId || ""), shipSig, cargoSig, nonce].join("|").slice(0, 500);
}


type ChestRoll = { kind: string; rarity?: string; res?: string; min?: number; max?: number; weight: number; label: string; boost?: string };
type ChestDef = { id: string; name: string; cost: number; rolls: number; table: ChestRoll[] };

const CHESTS: Record<string, ChestDef> = {
  supply: {
    id: "supply", name: "Coffre standard", cost: 10, rolls: 2,
    table: [
      { kind:"apparat", rarity:"Common", weight:42, label:"Apparat commun" },
      { kind:"fragments", min:1, max:3, weight:22, label:"Fragments bonus" },
      { kind:"resource", res:"titanium", min:2000, max:8000, weight:14, label:"Titane" },
      { kind:"resource", res:"xenite", min:1000, max:4000, weight:10, label:"Xénite" },
      { kind:"resource", res:"antimatter", min:250, max:1200, weight:5, label:"Antimatière" },
      { kind:"boost", boost:"prod", weight:7, label:"Boost production 30 min" },
    ],
  },
  military: {
    id: "military", name: "Coffre rare", cost: 25, rolls: 2,
    table: [
      { kind:"apparat", rarity:"Rare", weight:34, label:"Apparat rare" },
      { kind:"apparat", rarity:"Epic", weight:9, label:"Apparat épique" },
      { kind:"fragments", min:2, max:6, weight:22, label:"Fragments bonus" },
      { kind:"resource", res:"titanium", min:8000, max:20000, weight:12, label:"Titane" },
      { kind:"resource", res:"xenite", min:4000, max:12000, weight:10, label:"Xénite" },
      { kind:"resource", res:"antimatter", min:1500, max:5000, weight:5, label:"Antimatière" },
      { kind:"boost", boost:"fleet", weight:8, label:"Boost flotte 30 min" },
    ],
  },
  relic: {
    id: "relic", name: "Coffre épique", cost: 50, rolls: 3,
    table: [
      { kind:"apparat", rarity:"Epic", weight:30, label:"Apparat épique" },
      { kind:"apparat", rarity:"Legendary", weight:16, label:"Apparat légendaire" },
      { kind:"apparat", rarity:"Mythic", weight:7, label:"Apparat mythique" },
      { kind:"apparat", rarity:"Ancient", weight:3, label:"Artefact antique" },
      { kind:"apparat", rarity:"Rare", weight:14, label:"Apparat rare" },
      { kind:"fragments", min:5, max:12, weight:18, label:"Fragments bonus" },
      { kind:"resource", res:"titanium", min:15000, max:35000, weight:5, label:"Titane" },
      { kind:"resource", res:"xenite", min:8000, max:22000, weight:5, label:"Xénite" },
      { kind:"resource", res:"antimatter", min:4000, max:12000, weight:2, label:"Antimatière" },
    ],
  },
};

function rand01() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}
function randRange(min = 0, max = 0) {
  min = n(min, 0, 1_000_000_000); max = n(max, min, 1_000_000_000);
  return Math.floor(min + rand01() * (max - min + 1));
}
function chooseWeighted(table: ChestRoll[]) {
  const total = table.reduce((sum, x) => sum + n(x.weight, 0, 1_000_000), 0);
  let r = rand01() * Math.max(1, total);
  for (const item of table) { r -= n(item.weight, 0, 1_000_000); if (r <= 0) return item; }
  return table[table.length - 1];
}
function fmtServer(v: number) { return Math.round(v).toLocaleString("fr-FR"); }

async function openChest(admin: any, playerId: string, body: any) {
  const chestId = String(body.chest_id || body.chestId || "").replace(/[^a-z0-9_-]/gi, "");
  const chest = CHESTS[chestId];
  if (!chest) throw new Error("coffre_inconnu");

  // 1.7.13 : les coffres ne sont pas rattachés à une planète précise dans l'UI —
  // coût et gains (ressources + fragments) sont toujours appliqués sur "home".
  const rr = await admin.from("game_resources").select("*").eq("player_id", playerId).eq("planet_id", "home").maybeSingle();
  if (rr.error) throw rr.error;
  if (!rr.data) throw new Error("stock_introuvable");
  const before = rr.data;
  const beforeFragments = n(before.fragments, 0, 100_000_000);
  if (beforeFragments < chest.cost) throw new Error("fragments_insuffisants");

  const gain = { titanium: 0, xenite: 0, antimatter: 0, fragments: 0 };
  const rewards: any[] = [];
  for (let i = 0; i < chest.rolls; i++) {
    const item = chooseWeighted(chest.table);
    if (item.kind === "resource") {
      const amount = randRange(item.min || 0, item.max || 0);
      if (item.res === "titanium") gain.titanium += amount;
      if (item.res === "xenite") gain.xenite += amount;
      if (item.res === "antimatter") gain.antimatter += amount;
      rewards.push({ kind:"resource", res:item.res, label:item.label, amount, text:`+${fmtServer(amount)} ${item.label}` });
    } else if (item.kind === "fragments") {
      const amount = randRange(item.min || 0, item.max || 0);
      gain.fragments += amount;
      rewards.push({ kind:"fragments", label:"fragments", amount, text:`+${fmtServer(amount)} fragments` });
    } else if (item.kind === "apparat") {
      rewards.push({ kind:"apparat", rarity:item.rarity, label:item.label, text:item.label });
    } else if (item.kind === "boost") {
      rewards.push({ kind:"boost", boost:item.boost, label:item.label, text:item.label });
    } else {
      rewards.push({ kind:item.kind, label:item.label, text:item.label });
    }
  }

  const stockAfter = {
    titanium: n(before.titanium) + gain.titanium,
    xenite: n(before.xenite) + gain.xenite,
    antimatter: n(before.antimatter) + gain.antimatter,
    fragments: Math.max(0, beforeFragments - chest.cost + gain.fragments),
    updated_at: new Date().toISOString(),
  };

  // Garde anti double-clic : si les fragments ont changé entre la lecture et l'écriture,
  // on refuse au lieu de risquer un débit/crédit incohérent.
  const up = await admin.from("game_resources")
    .update(stockAfter)
    .eq("player_id", playerId)
    .eq("planet_id", "home")
    .eq("fragments", before.fragments)
    .select("titanium,xenite,antimatter,fragments")
    .maybeSingle();
  if (up.error) throw up.error;
  if (!up.data) throw new Error("stock_modifie_reessaye");

  return {
    message: `Coffre ouvert : ${chest.name}.`,
    chestId: chest.id,
    chestName: chest.name,
    cost: chest.cost,
    rewards,
    gain,
    stockAfter: up.data,
  };
}

async function snapshot(admin: any, playerId: string) {
  const [res, b, bq, ships, sq, fleets, profile] = await Promise.all([
    admin.from("game_resources").select("*").eq("player_id", playerId),
    admin.from("game_buildings").select("planet_id,building_id,level").eq("player_id", playerId),
    admin.from("game_build_queue").select("*").eq("player_id", playerId).order("finish_at", { ascending:true }),
    admin.from("game_ships").select("planet_id,ship_id,qty").eq("player_id", playerId),
    admin.from("game_ship_queue").select("*").eq("player_id", playerId).order("finish_at", { ascending:true }),
    admin.from("game_fleets").select("*").eq("player_id", playerId).order("ends_at", { ascending:true }),
    admin.from("game_security_profile").select("build_queue_2_permanent,build_queue_2_purchased_at").eq("player_id", playerId).maybeSingle(),
  ]);
  for (const r of [res,b,bq,ships,sq,fleets,profile]) if (r.error) throw r.error;
  // 1.7.13 : game_resources renvoie maintenant une ligne par planète. "resources"
  // reste la ligne "home" (compat : c'est ce que le client historique attend comme
  // "les" ressources du joueur, et les fragments n'existent que là). "resourcesByPlanet"
  // est le nouveau champ que le client utilise pour peupler state.planetResources par planète.
  const resRows = res.data || [];
  const homeRes = resRows.find((r: any) => String(r.planet_id) === "home") || null;
  return { serverTime: new Date().toISOString(), resources: homeRes, resourcesByPlanet: resRows, buildings:b.data || [], buildQueue:bq.data || [], ships:ships.data || [], shipQueue:sq.data || [], fleets:fleets.data || [], upgrades:{ buildQueue2Permanent: !!profile.data?.build_queue_2_permanent, buildQueue2PurchasedAt: profile.data?.build_queue_2_purchased_at || null } };
}
