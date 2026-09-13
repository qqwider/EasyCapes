import type { TextureRow } from "../db.js";

const MAX_CACHED_ITEMS = 64;

export class TextureStore {
  private cache = new Map<string, TextureRow>();

  constructor(private dbGet: (hash: string) => TextureRow | undefined) {}

  get(hash: string): TextureRow | undefined {
    const cached = this.cache.get(hash);
    if (cached) {
      this.cache.delete(hash);
      this.cache.set(hash, cached);
      return cached;
    }
    const row = this.dbGet(hash);
    if (row) {
      this.cache.set(hash, row);
      if (this.cache.size > MAX_CACHED_ITEMS) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== undefined) this.cache.delete(oldest);
      }
    }
    return row;
  }
}
