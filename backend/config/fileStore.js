import fs from 'fs';
import path from 'path';

// Lightweight file-based JSON storage for fully-offline desktop usage.
// Stores each "collection" (groups, logs, users) as a JSON file in a
// writable data directory. No external database service required.

const DEFAULT_DATA_DIR = path.join(
    process.env.APPDATA || process.env.HOME || '.',
    'savecircle',
    'data'
);

const DATA_DIR = process.env.SAVECIRCLE_DATA_DIR || DEFAULT_DATA_DIR;

const collections = new Map(); // name -> Map<id, doc>

const fileFor = (name) => path.join(DATA_DIR, `${name}.json`);

const ensureDir = () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
};

const load = (name) => {
    ensureDir();
    const file = fileFor(name);
    if (fs.existsSync(file)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
            const map = new Map();
            for (const [k, v] of Object.entries(parsed)) map.set(k, v);
            collections.set(name, map);
            return map;
        } catch {
            // corrupted file — start fresh
        }
    }
    const map = new Map();
    collections.set(name, map);
    return map;
};

const save = (name) => {
    ensureDir();
    const map = collections.get(name);
    const obj = {};
    for (const [k, v] of map) obj[k] = v;
    fs.writeFileSync(fileFor(name), JSON.stringify(obj, null, 2), 'utf8');
};

// Public API — mirrors the model interfaces used by controllers

export const fileStore = {
    async find(name) {
        const map = load(name);
        return Array.from(map.values());
    },

    async findOne(name, key, value) {
        const map = load(name);
        return map.get(value) || null;
    },

    async upsert(name, key, doc) {
        const map = load(name);
        map.set(key, doc);
        save(name);
        return doc;
    },

    async deleteOne(name, key) {
        const map = load(name);
        const existed = map.delete(key);
        save(name);
        return existed;
    },

    // For users: query by arbitrary field (e.g. { email }) or { role }
    async findWhere(name, predicate) {
        const map = load(name);
        for (const [, doc] of map) {
            if (predicate(doc)) return doc;
        }
        return null;
    }
};
