export const weights = [
  { title: "スキル一致率", points: 35 },
  { title: "経験年数", points: 30 },
  { title: "関連資格", points: 15 },
  { title: "AI適合度", points: 20 },
];

export const defaultCriteria = {
  job: "Webエンジニア",
  description: "Python・SQLを用いたWeb開発。API設計、チーム開発、業務改善に取り組める方。",
  years: 2,
  qualification: "基本情報技術者",
  weights,
};

export type CriteriaValues = typeof defaultCriteria;
export type CriteriaVersion = {
  opening: string;
  number: number;
  savedAt: string | null;
  values: CriteriaValues;
  deleted?: true;
};

export function activeCriteria(versions: CriteriaVersion[], opening?: string) {
  const latest = versions.findLast(v => v.opening === opening);
  return latest?.deleted ? undefined : latest;
}

export function criteriaPath(page: "edit" | "saved", version: CriteriaVersion) {
  return `/criteria/${page}?opening=${encodeURIComponent(version.opening)}&version=${version.number}`;
}

export type CriteriaPageProps = { searchParams: Promise<{ opening?: string; version?: string }> };

export const sampleVersion: CriteriaVersion = {
  opening: "engineer", number: 2, savedAt: null, values: defaultCriteria,
};
