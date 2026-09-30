import type { AppId, Take, TakeMeta } from "./types";
type Stored = Omit<Take, "audio"> & { data: ArrayBuffer };
const session = new Map<string, Take>();
const LIMIT = 24 * 1024 * 1024;
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("clearpair-recordings", 1);
    let settled = false;
    const fail = (error: unknown) => {
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const timer = setTimeout(() => fail(new Error("Storage timed out")), 3000);
    request.onupgradeneeded = () => {
      if (settled) {
        request.transaction?.abort();
        return;
      }
      const s = request.result.createObjectStore("takes", { keyPath: "id" });
      s.createIndex("appDate", ["app", "createdAt", "id"]);
    };
    request.onerror = () => {
      fail(request.error);
    };
    request.onblocked = () => {
      fail(new Error("Close another app window and retry"));
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
async function transact<T>(
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  const database = await db();
  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction("takes", mode);
    let value: T;
    const timer = setTimeout(() => {
      try {
        tx.abort();
      } catch {}
      database.close();
      reject(new Error("Storage timed out"));
    }, 3500);
    const finish = () => {
      clearTimeout(timer);
      database.close();
    };
    tx.oncomplete = () => {
      finish();
      resolve(value);
    };
    tx.onerror = tx.onabort = () => {
      finish();
      reject(tx.error || new Error("Storage unavailable"));
    };
    try {
      body(tx.objectStore("takes"), (v) => (value = v));
    } catch (error) {
      try {
        tx.abort();
      } catch {}
      finish();
      reject(error);
    }
  });
}
export async function saveTake(take: Take): Promise<"device" | "session"> {
  try {
    // WebKit requires conversion BEFORE a transaction is opened.
    const data = await take.audio.arrayBuffer();
    const { audio, ...meta } = take;
    await transact<void>("readwrite", (s, done) => {
      s.put({ ...meta, data, storage: "device" });
      done();
    });
    return "device";
  } catch {
    const total = [...session.values()].reduce((s, t) => s + t.audio.size, 0);
    if (total + take.audio.size > LIMIT)
      throw new Error(
        "Session storage is full. Export a recording before trying again.",
      );
    session.set(take.id, { ...take, storage: "session" });
    return "session";
  }
}
export type Cursor = [number, string];
export async function listTakes(
  app: AppId,
  before?: Cursor,
  limit = 12,
): Promise<{
  items: TakeMeta[];
  more: boolean;
  next?: Cursor;
  temporary: boolean;
}> {
  let temporary = false;
  let items: TakeMeta[] = [];
  try {
    items = await transact<TakeMeta[]>("readonly", (s, done) => {
      const rows: TakeMeta[] = [];
      const range = IDBKeyRange.bound(
        [app, 0, ""],
        [app, before?.[0] ?? Number.MAX_SAFE_INTEGER, before?.[1] ?? "\uffff"],
        false,
        !!before,
      );
      const request = s.index("appDate").openCursor(range, "prev");
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || rows.length >= limit + 1) {
          done(rows);
          return;
        }
        const { data, ...meta } = cursor.value as Stored;
        rows.push(meta);
        cursor.continue();
      };
    });
  } catch {
    temporary = true;
  }
  items.push(
    ...[...session.values()]
      .filter(
        (t) =>
          t.app === app &&
          (!before ||
            t.createdAt < before[0] ||
            (t.createdAt === before[0] && t.id < before[1])),
      )
      .map(({ audio, ...m }) => m),
  );
  items.sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  const more = items.length > limit;
  items = items.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    more,
    next: last ? [last.createdAt, last.id] : undefined,
    temporary,
  };
}
export async function getTake(id: string): Promise<Take | undefined> {
  if (session.has(id)) return session.get(id);
  return transact<Take | undefined>("readonly", (s, done) => {
    const r = s.get(id);
    r.onsuccess = () => {
      const value = r.result as Stored | undefined;
      if (!value) {
        done(undefined);
        return;
      }
      const { data, ...meta } = value;
      done({ ...meta, audio: new Blob([data], { type: meta.mimeType }) });
    };
  });
}
export async function deleteTake(id: string) {
  if (session.has(id)) {
    session.delete(id);
    return;
  }
  await transact<void>("readwrite", (s, done) => {
    s.delete(id);
    done();
  });
}
