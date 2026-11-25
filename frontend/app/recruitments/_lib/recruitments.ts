export const recruitments = [
  { id: "engineer", name: "エンジニア", type: "中途", year: 2026, status: "募集中" },
  { id: "sales", name: "営業", type: "新卒", year: 2027, status: "準備中" },
  { id: "office", name: "事務", type: "中途", year: 2026, status: "終了" },
];

export const defaultAssignments: Record<string, string[]> = {
  engineer: ["recruiter", "viewer"],
  sales: [],
  office: ["recruiter"],
};

export const roleDescriptions: [string, string][] = [
  ["管理者", "すべての募集を管理できます"], ["採用担当者", "割り当てられた募集を編集できます"],
  ["閲覧担当者", "割り当てられた募集を閲覧できます"],
];
