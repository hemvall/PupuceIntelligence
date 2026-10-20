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
export async function loadWorkspace(): Promise<string | null> {
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
export async function saveWorkspace(value: string): Promise<void> {
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
