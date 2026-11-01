// The public side of the account system: the Supabase project URL and its publishable key. Both are meant to ship in a web page; the
// secret (service role) key never appears in any repository. Leave enabled false until the database schema and the roll function are
// deployed (see rng-accounts/README.md): while it is false the games behave exactly as before and show no account or leaderboard links.
export default {
  enabled: false,
  url: 'https://kxzouothsnqabfnojejy.supabase.co',
  key: 'sb_publishable_oEH94mGDVgEI8zggrIm5IQ_rBpxs5E_',
};
