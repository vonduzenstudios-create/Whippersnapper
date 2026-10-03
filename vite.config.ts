import { defineConfig, Plugin } from 'vite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

const ROOMS_FILE = fileURLToPath(new URL('./src/world/room_edits.json', import.meta.url));
const ABBEY_ROOMS_FILE = fileURLToPath(new URL('./src/world/room_edits_abbey.json', import.meta.url)); // NEW GAME +
const ENEMIES_FILE = fileURLToPath(new URL('./src/game/enemy_edits.json', import.meta.url));
const writeJson = (file: string, data: unknown) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

/** Read a JSON object body, run `handle` on it, and answer { ok, ... } or { ok: false, error }. */
function jsonPost(handle: (data: any) => object) {
  return (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end();
      return;
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) req.destroy(); // far bigger than any real level
    });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      try {
        const data = JSON.parse(body);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('expected a JSON object');
        res.end(JSON.stringify({ ok: true, ...handle(data) }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
  };
}

/**
 * Dev-only endpoints for the editors:
 * - POST /__editor/save writes the map editor's room changes to src/world/room_edits.json.
 * - POST /__editor/save-enemies writes the enemy editor's enemies to src/game/enemy_edits.json.
 *   Body: { enemies, renames? }. `renames` ({ oldId: newId }) also updates the variant ids
 *   that rooms in room_edits.json place, so renaming a variant doesn't orphan it.
 */
function editorSave(): Plugin {
  return {
    name: 'editor-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__editor/save-enemies', jsonPost((data) => {
        const enemies = data.enemies;
        if (!enemies || typeof enemies !== 'object') throw new Error('expected { enemies: {...} }');
        for (const [id, e] of Object.entries<any>(enemies)) {
          if (!/^[a-z0-9_]+$/.test(id)) throw new Error(`enemy id "${id}" may only use a-z, 0-9 and _`);
          if (typeof e?.base !== 'string' || typeof e?.hp !== 'number') throw new Error(`enemy "${id}" needs a base and hp`);
        }
        writeJson(ENEMIES_FILE, enemies);
        let moved = 0;
        const renames: Record<string, string> = data.renames || {};
        if (Object.keys(renames).length && fs.existsSync(ROOMS_FILE)) {
          const rooms = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
          for (const r of Object.values<any>(rooms))
            for (const e of r.ents || [])
              if (e.arg && renames[e.arg]) {
                e.arg = renames[e.arg];
                moved++;
              }
          if (moved) writeJson(ROOMS_FILE, rooms);
        }
        return { enemies: Object.keys(enemies).length, moved };
      }));
      // ?world=abbey saves NEW GAME +'s map to its own file
      let world = '';
      server.middlewares.use('/__editor/save', (req, res, next) => {
        world = new URL(req.url || '', 'http://x').searchParams.get('world') || '';
        next();
      });
      server.middlewares.use('/__editor/save', jsonPost((data) => {
        for (const [id, r] of Object.entries<any>(data)) {
          const ok = Array.isArray(r?.tiles) && r.tiles.every((t: unknown) => typeof t === 'string') && Array.isArray(r?.ents);
          if (!ok) throw new Error(`room "${id}" needs tiles (string[]) and ents (array)`);
        }
        writeJson(world === 'abbey' ? ABBEY_ROOMS_FILE : ROOMS_FILE, data);
        return { rooms: Object.keys(data).length };
      }));
    },
    handleHotUpdate(ctx) {
      // The editors already hold these edits in memory, so don't reload the page
      // under them. Invalidate the module so the next manual reload reads the new file.
      const f = ctx.file.replace(/\\/g, '/');
      if (f.endsWith('/src/world/room_edits.json') || f.endsWith('/src/world/room_edits_abbey.json') || f.endsWith('/src/game/enemy_edits.json')) {
        for (const m of ctx.modules) ctx.server.moduleGraph.invalidateModule(m);
        return [];
      }
    },
  };
}

export default defineConfig({
  base: './',
  // Own port (not Vite's default 5173) so another copy of the project can't shadow this one;
  // strictPort makes a clash a loud error instead of silently hopping to another port.
  server: { port: 5273, strictPort: true },
  plugins: [editorSave()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { main: 'index.html', editor: 'editor.html', enemies: 'enemies.html' } },
  },
});
