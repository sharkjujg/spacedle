// Client for the account system designed in rng-accounts: sign in with an emailed code, a public handle, a ranked roll and the leaderboards.
// It talks to one Supabase project over plain fetch, with no third-party script. Only public values are used here (project URL, publishable key);
// the browser never sends a score, only the game name, and the server decides everything else.
const SKEY = 'rng.session'; // one key for every game on this origin, so signing in once covers them all

export function createAccount({ url, key, fetch: f, storage, now = Date.now }) {
  const read = () => { try { return JSON.parse(storage.getItem(SKEY)); } catch { return null; } };
  const write = (s) => { try { if (s) storage.setItem(SKEY, JSON.stringify(s)); else storage.removeItem(SKEY); } catch { /* signed in for this page only */ } };
  let mem = read();
  const pack = (s) => ({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at ?? Math.floor(now() / 1000) + s.expires_in, user: { id: s.user.id, email: s.user.email } });

  const friendly = (status, d) => {
    const msg = d?.msg || d?.message || d?.error_description || d?.error || '';
    if (status === 429 || /rate limit|too many/i.test(msg)) return 'Too many tries. Wait a minute and try again.';
    if (d?.code === 'PGRST202' || d?.code === 'PGRST205' || (status === 404 && /schema cache|function|not found/i.test(msg))) return 'The account service is not set up yet.';
    if (/expired|invalid/i.test(msg) && /token|otp|code/i.test(msg)) return 'That code is wrong or has expired. Ask for a new one.';
    if (d?.code === '23505' || /duplicate key|already exists/i.test(msg)) return 'That handle is taken.';
    if (/violates check constraint/i.test(msg)) return 'A handle is 3 to 20 letters, digits or underscores, and cannot be a reserved word.';
    return msg || `Request failed (${status}).`;
  };

  async function call(path, { method = 'GET', body, token } = {}) {
    const r = await f(url + path, {
      method, body: body === undefined ? undefined : JSON.stringify(body),
      headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    if (!r.ok) { const e = new Error(friendly(r.status, data)); e.status = r.status; e.code = data?.code ?? data?.error_code ?? null; throw e; }
    return data;
  }

  // A valid session, refreshed when it is about to expire. A dead refresh token signs out; a network hiccup does not.
  async function session() {
    if (!mem) return null;
    if (mem.expires_at - 60 > now() / 1000) return mem;
    try {
      mem = pack(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: mem.refresh_token } }));
      write(mem);
      return mem;
    } catch (e) {
      if (e.status && e.status < 500 && e.status !== 429) { mem = null; write(null); }
      return null;
    }
  }
  const authed = async () => { const s = await session(); if (!s) throw new Error('Sign in first.'); return s.access_token; };
  const rpc = async (name, args, token) => call(`/rest/v1/rpc/${name}`, { method: 'POST', body: args, token });

  return {
    session,
    configured: !!(url && key),
    sendCode: (email) => call('/auth/v1/otp', { method: 'POST', body: { email: String(email).trim(), create_user: true } }),
    async verify(email, code) {
      mem = pack(await call('/auth/v1/verify', { method: 'POST', body: { type: 'email', email: String(email).trim(), token: String(code).replace(/\s+/g, '') } }));
      write(mem);
      return mem;
    },
    async signOut() {
      const s = mem; mem = null; write(null);
      if (s) await call('/auth/v1/logout', { method: 'POST', token: s.access_token }).catch(() => {}); // already signed out locally
    },
    async handle() { const rows = await call('/rest/v1/profiles?select=handle', { token: await authed() }); return rows?.[0]?.handle ?? null; },
    async claimHandle(h) { const p = await rpc('claim_handle', { p_handle: String(h).trim() }, await authed()); return p.handle; },
    ranked: async (game) => call(`/functions/v1/roll-${encodeURIComponent(game)}`, { method: 'POST', body: { game }, token: await authed() }),
    async todaysRoll(game, day) {
      const rows = await call(`/rest/v1/rolls?select=day,idx,rp,tier,c,n,awards,season,rolled_at&game=eq.${encodeURIComponent(game)}&day=eq.${encodeURIComponent(day)}`, { token: await authed() });
      return rows?.[0] ?? null;
    },
    daily: (game, day, limit = 50) => rpc('leaderboard_daily', { p_game: game, p_day: day, p_limit: limit }),
    best: (game, season, limit = 50) => rpc('leaderboard_best', { p_game: game, p_season: season, p_limit: limit }),
    badges: (game, season, limit = 50) => rpc('leaderboard_badges', { p_game: game, p_season: season, p_limit: limit }),
    standing: async (game, day, season) => (await rpc('my_standing', { p_game: game, p_day: day, p_season: season }, await authed()))?.[0] ?? null,
  };
}
