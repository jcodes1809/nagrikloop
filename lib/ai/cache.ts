import data from "../../data/demo_cache.json";
import { cfg } from "./config";
import { validateAnalyze, validateVerify, type Analyze, type Verify } from "./validate";

const store: any = data;
const strip = (o: any) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => !k.startsWith("_")));

// Lookup order: demo_key -> exact photo hash -> "default" (only if ALLOW_DEFAULT_CACHE=true)
export function lookupAnalyze(demoKey: string | undefined, hash: string): Analyze | null {
  const tries = [demoKey, hash];
  if (cfg().allowDefaultCache) tries.push("default");
  for (const k of tries) {
    if (k && store.analyze?.[k]) {
      try {
        return validateAnalyze(strip(store.analyze[k]));
      } catch {
        /* bad cache entry, ignore */
      }
    }
  }
  return null;
}

// Verify has no default on purpose: guessing a verdict would be fabricating evidence.
export function lookupVerify(demoKey: string | undefined, hashBefore: string, hashAfter: string): Verify | null {
  const tries = [demoKey, `${hashBefore}:${hashAfter}`];
  for (const k of tries) {
    if (k && store.verify?.[k]) {
      try {
        return validateVerify(strip(store.verify[k]));
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}
