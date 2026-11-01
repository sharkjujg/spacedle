// Spacedle badge rules. The rules, record preparation and presentation for each kind of object live in kinds/<kind>.js;
// this file joins them. Each rule is a deterministic predicate over known fields: a value a catalog lacks never matches.
import asteroid from './kinds/asteroid.js';
import comet from './kinds/comet.js';
import exoplanet from './kinds/exoplanet.js';
import star from './kinds/star.js';
import satellite from './kinds/satellite.js';
import rocket from './kinds/rocket.js';
import feature from './kinds/feature.js';
import deepsky from './kinds/deepsky.js';

export const RULESET = '2'; // 2: deep-sky objects added, so every badge weight changed
export { norm } from './kinds/kit.js';

export const KINDS = [asteroid, comet, exoplanet, star, satellite, rocket, feature, deepsky]; // a new kind goes last, so every earlier record keeps its index
export const KIND = Object.fromEntries(KINDS.map((k) => [k.kind, k]));
export const RULES = KINDS.flatMap((k) => k.rules);
export const prep = (raw) => (KIND[raw.kind] ? KIND[raw.kind].prep(raw) : { ...raw, kind: null });
