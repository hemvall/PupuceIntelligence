const KEY = "pupuce-workspace-v1";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pupuce-atelier", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("workspace");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function loadBrowserWorkspace(): Promise<string | null> {
  if (!("indexedDB" in window)) return localStorage.getItem(KEY);
  const db = await database();
  try {
    const value = await new Promise<string | undefined>((resolve, reject) => {
      const r = db.transaction("workspace").objectStore("workspace").get(KEY);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return value ?? localStorage.getItem(KEY);
  } finally {
    db.close();
  }
}
async function saveBrowserWorkspace(value: string): Promise<void> {
  if (!("indexedDB" in window)) {
    localStorage.setItem(KEY, value);
    return;
  }
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("workspace", "readwrite");
      tx.objectStore("workspace").put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}


let diskRevision: string | null = null;
let diskReady = false;
let writes: Promise<void> = Promise.resolve();
export function usesMacFolder() {
  return typeof window !== "undefined" && window.location.origin === "http://127.0.0.1:3210";
}
async function diskRequest(method = "GET", value?: string) {
  const response = await fetch("/api/local/workspace", {
    method, cache: "no-store", credentials: "same-origin",
    ...(method === "PUT" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value, revision: diskRevision }) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Sauvegarde sur le Mac indisponible.");
  return data as { value: string | null; revision: string | null };
}
export async function loadWorkspace(): Promise<string | null> {
  if (!usesMacFolder()) return loadBrowserWorkspace();
  const saved = await diskRequest();
  diskRevision = saved.revision;
  diskReady = true;
  // Only migrate the old browser workspace when no file exists on disk.
  return saved.value ?? await loadBrowserWorkspace();
}
export function saveWorkspace(value: string): Promise<void> {
  if (!usesMacFolder()) return saveBrowserWorkspace(value);
  const operation = writes.then(async () => {
    if (!diskReady) throw new Error("Recharge Pupuce pour lire la sauvegarde du Mac avant de modifier les dossiers.");
    const saved = await diskRequest("PUT", value);
    diskRevision = saved.revision;
  });
  writes = operation.catch(() => {});
  return operation;
}
