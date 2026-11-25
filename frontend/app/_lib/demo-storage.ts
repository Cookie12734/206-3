"use client";

import { useSyncExternalStore } from "react";

const changeEvent = "salt-demo-change";
const memory = new Map<string, string>();

type Update<T> = T | ((previous: T) => T);

export function useDemoValue<T>(key: string, fallback: T, storage: "sessionStorage" | "localStorage" = "sessionStorage"): [T, (value: Update<T>) => void] {
  const storageKey = `salt-demo:${key}`;
  const raw = useSyncExternalStore(subscribe, () => read(storage, storageKey), () => null);
  return [decode(raw, fallback), (update) => {
    const value = typeof update === "function" ? (update as (previous: T) => T)(decode(read(storage, storageKey), fallback)) : update;
    const serialized = JSON.stringify(value);
    try {
      window[storage].setItem(storageKey, serialized);
      memory.delete(storageKey);
    } catch {
      memory.set(storageKey, serialized);
    }
    window.dispatchEvent(new Event(changeEvent));
  }];
}

function decode<T>(raw: string | null, fallback: T): T {
  try {
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function read(storage: "sessionStorage" | "localStorage", key: string) {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}
