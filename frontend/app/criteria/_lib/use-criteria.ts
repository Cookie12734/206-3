"use client";

import { useEffect } from "react";
import { useDemoValue } from "../../_lib/demo-storage";
import { activeCriteria, sampleVersion, type CriteriaValues, type CriteriaVersion } from "./criteria";

async function withVersionLock<T>(action: () => T) {
  return navigator.locks ? navigator.locks.request("salt-criteria-versions", action) : action();
}

function initialVersions(legacy: CriteriaValues | null) {
  return legacy ? [sampleVersion, { ...sampleVersion, number: 3, values: legacy }] : [sampleVersion];
}

export function useCriteria() {
  const [legacy] = useDemoValue<CriteriaValues | null>("criteria", null);
  const [stored, write] = useDemoValue<CriteriaVersion[] | null>("criteria-versions", null, "localStorage");

  // Preserve the last save from the original single-form, session-scoped screen.
  useEffect(() => {
    if (legacy && !stored) {
      void withVersionLock(() => write(previous => previous ?? initialVersions(legacy)));
    }
  }, [legacy, stored, write]);

  async function append(opening: string, base: number, values: CriteriaValues) {
    return withVersionLock(() => {
      const next: CriteriaVersion = { opening, number: base + 1, savedAt: new Date().toISOString(), values };
      write(previous => {
        const versions = previous ?? initialVersions(legacy);
        const latest = versions.findLast(v => v.opening === opening);
        const activeNumber = latest?.deleted ? 0 : latest?.number ?? 0;
        if (activeNumber !== base) {
          throw new Error("この募集の評価基準が更新されました。評価管理から最新版を開いてください。");
        }
        if (latest?.deleted) next.number = latest.number + 1;
        return [...versions, next];
      });
      return next;
    });
  }

  async function remove(target: CriteriaVersion) {
    await withVersionLock(() => write(previous => {
      const versions = previous ?? initialVersions(legacy);
      const active = activeCriteria(versions, target.opening);
      if (active?.number !== target.number) {
        throw new Error("この募集の評価基準が更新されました。適用中の版を確認してください。");
      }
      return versions.map(v => v === active ? { ...v, deleted: true } : v);
    }));
  }

  return { versions: stored ?? initialVersions(legacy), append, remove };
}
