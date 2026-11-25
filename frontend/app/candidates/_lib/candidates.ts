export const candidateSample = [
  { id: "APP-023", name: "候補者 B", score: 81.25, condition: "すべて充足", skills: "Java・SQL", status: "確認待ち" },
  { id: "APP-022", name: "候補者 C", score: 77.5, condition: "要確認 1件", skills: "Python", status: "確認待ち" },
  { id: "APP-021", name: "候補者 D", score: null, condition: "判定前", skills: "解析中", status: "AI処理エラー" },
  { id: "APP-024", name: "候補者 A", score: null, condition: "再判定待ち", skills: "Python・SQL", status: "再解析待ち" },
];

export const candidateId = "APP-024";
export const candidatePath = "/candidates/app-024";
export const score = 86.25;
export const scoreBreakdown = [
  ["スキル一致", 26.25, 35, 3], ["経験年数", 30, 30, 4], ["関連資格", 15, 15, 4], ["募集要件との適合", 15, 20, 3],
] as const;

export const decisionExample = {
  result: "次選考へ",
  reason: "必須条件を満たし、PythonとAPI開発の経験が募集要件に合致しています。原本とスコア内訳を確認したため、面接に進めます。",
  recordedAt: "2026/10/05 10:42",
};

export type Decision = typeof decisionExample;
