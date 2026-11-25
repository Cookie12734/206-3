export const defaultStaff = [
  { id: "admin", name: "管理者 A", email: "admin@example.com", role: "管理者", status: "有効" },
  { id: "recruiter", name: "採用担当者 B", email: "recruiter@example.com", role: "採用担当者", status: "有効" },
  { id: "viewer", name: "閲覧担当者 C", email: "viewer@example.com", role: "閲覧のみ", status: "有効" },
];

export type Staff = (typeof defaultStaff)[number];
