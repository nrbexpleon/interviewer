import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export class Store {
  constructor(dir) { this.dir = dir; }
  async init() { await mkdir(this.dir, { recursive: true }); }
  async create(value) {
    const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...value };
    await this.save(record); return record;
  }
  async get(id) {
    const safe = String(id).replace(/[^a-f0-9-]/gi, "");
    return JSON.parse(await readFile(path.join(this.dir, `${safe}.json`), "utf8"));
  }
  async save(record) {
    const safe = String(record.id).replace(/[^a-f0-9-]/gi, "");
    await writeFile(path.join(this.dir, `${safe}.json`), JSON.stringify(record, null, 2), { mode: 0o600 });
    return record;
  }
}
