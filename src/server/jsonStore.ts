import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

/** Tiny JSON persistence shared by every `data/*.json` store in the app. */

const DIR = join(process.cwd(), "data");

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(join(DIR, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(name: string, data: unknown): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, name), JSON.stringify(data, null, 2), "utf8");
}
