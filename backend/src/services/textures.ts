import type { TextureRow } from "../db.js";

const MAX_CACHED_BYTES = 32 * 1024 * 1024;
const MAX_ITEM_BYTES = MAX_CACHED_BYTES / 2;

export class TextureStore {
  private cache = new Map<string, TextureRow>();
  private bytes = 0;

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
      this.insert(row);
    }
    return row;
  }

  private insert(row: TextureRow): void {
    if (row.size > MAX_ITEM_BYTES) {
      return;
    }
    this.evict(row.size);
    this.cache.set(row.hash, row);
    this.bytes += row.size;
  }

  private evict(incomingBytes: number): void {
    while (this.bytes + incomingBytes > MAX_CACHED_BYTES && this.cache.size > 0) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      const evicted = this.cache.get(oldest)!;
      this.cache.delete(oldest);
      this.bytes -= evicted.size;
    }
  }
}
