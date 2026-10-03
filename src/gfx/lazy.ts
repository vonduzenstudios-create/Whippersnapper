// Sheets that are only drawn when something first asks for them. The trial bosses' puppets
// are big (a hundred frames or more each), so they are not built at start-up with the rest.
import { SheetBuilder } from './pixel';
import { Sheet, buildSheet } from './view';

const cache = new Map<string, Sheet>();

export function lazySheet(name: string, build: () => SheetBuilder): Sheet {
  let s = cache.get(name);
  if (!s) {
    const t0 = performance.now();
    s = buildSheet(build());
    cache.set(name, s);
    console.log(`[nocturne] ${name} sheet drawn in ${(performance.now() - t0).toFixed(0)}ms`);
  }
  return s;
}
