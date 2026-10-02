import { ITEMS, xpForLevel } from './data';
import { SAVE_KEY } from '../config';
import type { HeroId } from './story';

export class Hunter {
  hero: HeroId = 'vesna'; // which twin is playing (cosmetic only)
  difficulty = 0; // index into DIFFICULTIES (older saves load as NORMAL)
  marks: [number, number][] = []; // map markers the player placed, in map-cell units (fractions allowed)
  level = 1;
  xp = 0;
  hp = 90;
  maxHp = 90;
  hearts = 10;
  maxHearts = 30;
  baseStr = 7;
  baseCon = 4;
  baseLck = 5;
  equip = { whip: 'whip_leather', shield: 'shield_buckler', armor: 'armor_coat', acc1: '', acc2: '' };
  inv: Record<string, number> = { potion: 1 };
  owned: string[] = ['whip_leather', 'shield_buckler', 'armor_coat'];
  sub = ''; // the selected sub-weapon
  subs: string[] = []; // every sub-weapon found so far
  grapple = false;
  doubleJump = false; // Raven Mantle
  slide = false; // Frostrunner Greaves
  glide = false; // Duskwing Shroud (experimental)
  swim = false; // Undertow Pearl (experimental)
  ward = false; // Ashglass Ward (experimental)
  collected: string[] = [];
  flags: string[] = []; // world switches that stay flipped, e.g. 'crypt_drained', 'boss_hound'
  broken: string[] = []; // breakable stones already smashed, as 'roomId:x,y' (they stay broken)
  bestiary: Record<string, number> = {}; // kills per enemy kind
  visited: string[] = [];
  bossDefeated = false; // the Ossuary Wyrm (older saves only have this); other bosses use 'boss_<id>' flags
  time = 0; // frames
  kills = 0;
  saveRoom = '';

  private bonus(k: 'str' | 'con' | 'lck' | 'def' | 'atk') {
    let v = 0;
    for (const id of [this.equip.whip, this.equip.shield, this.equip.armor, this.equip.acc1, this.equip.acc2]) {
      if (!id) continue;
      const it = ITEMS[id] as any;
      if (it[k]) v += it[k];
    }
    return v;
  }
  get str() {
    return this.baseStr + this.bonus('str');
  }
  get con() {
    return this.baseCon + this.bonus('con');
  }
  get lck() {
    return Math.max(0, this.baseLck + this.bonus('lck'));
  }
  get atk() {
    return this.bonus('atk') + this.str;
  }
  get def() {
    return this.bonus('def') + this.con;
  }
  get whipLen() {
    return ITEMS[this.equip.whip].len || 56;
  }
  /** Share of a blocked melee hit the equipped shield soaks up (0 = no shield). */
  get block() {
    return (this.equip.shield && ITEMS[this.equip.shield]?.block) || 0;
  }
  /** An accessory (the Rootstone) stops hits from knocking you back. */
  get noKnock() {
    return [this.equip.acc1, this.equip.acc2].some((id) => id && ITEMS[id]?.noKnock);
  }
  get fireWhip() {
    return !!ITEMS[this.equip.whip].fire;
  }
  get nextXp() {
    return xpForLevel(this.level);
  }

  /** True once the boss with this id (a BOSSES key) has been defeated. */
  beaten(id: string) {
    return this.flags.includes(`boss_${id}`) || (id === 'wyrm' && this.bossDefeated);
  }

  /** Select the next (+1) or previous (-1) unlocked sub-weapon. Returns false if there is nothing to switch to. */
  cycleSub(dir: number) {
    if (this.subs.length < 2) return false;
    const i = this.subs.indexOf(this.sub);
    this.sub = this.subs[(i + dir + this.subs.length) % this.subs.length];
    return true;
  }

  /** Returns number of levels gained. */
  gainXp(n: number) {
    this.xp += n;
    let ups = 0;
    while (this.xp >= this.nextXp && this.level < 99) {
      this.level++;
      ups++;
      this.maxHp += 7;
      this.hp = Math.min(this.maxHp, this.hp + 20);
      this.baseStr += 1;
      this.baseCon += 1;
      if (this.level % 2 === 0) this.baseLck += 1;
    }
    return ups;
  }

  addItem(id: string) {
    const it = ITEMS[id];
    if (!it) return;
    if (it.slot === 'use') this.inv[id] = (this.inv[id] || 0) + 1;
    else if (it.slot === 'sub') {
      // unlock it and switch to it; the others stay available
      if (!this.subs.includes(id)) this.subs.push(id);
      this.sub = id;
    }
    else if (it.slot === 'relic') {
      if (id === 'relic_grapple') this.grapple = true;
      else if (id === 'relic_mantle') this.doubleJump = true;
      else if (id === 'relic_greaves') this.slide = true;
      else if (id === 'relic_shroud') this.glide = true;
      else if (id === 'relic_pearl') this.swim = true;
      else if (id === 'relic_ward') this.ward = true;
    }
    else if (it.slot === 'max') {
      if (id === 'life_up') {
        this.maxHp += 15;
        this.hp = this.maxHp;
      } else if (id === 'str_up') this.baseStr += 1;
      else if (id === 'con_up') this.baseCon += 1;
      else {
        this.maxHearts += 10;
        this.hearts = this.maxHearts;
      }
    } else if (!this.owned.includes(id)) this.owned.push(id);
  }

  serialize() {
    const o: any = {};
    for (const k of Object.keys(this)) o[k] = (this as any)[k];
    return o;
  }
  static load(): Hunter | null {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return null;
      const h = new Hunter();
      Object.assign(h, JSON.parse(s));
      // saves from before sub-weapon switching only stored the one held weapon
      if (h.sub && !h.subs.includes(h.sub)) h.subs.push(h.sub);
      // saves from before the shield slot (0.10.0) get the starting buckler
      if (h.equip.shield === undefined) {
        h.equip.shield = 'shield_buckler';
        if (!h.owned.includes('shield_buckler')) h.owned.push('shield_buckler');
      }
      return h;
    } catch {
      return null;
    }
  }
  save(room: string) {
    this.saveRoom = room;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.serialize()));
      return true;
    } catch {
      return false;
    }
  }
  static hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }
}
