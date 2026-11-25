type MenuItem = {
  icon: string;
  label: string;
  href?: string;
};

// 対応する page.tsx を追加したら、その項目に href を指定する。
export const navigation: { title: string; items: MenuItem[] }[] = [
  {
    title: "選考管理",
    items: [
      { icon: "people", label: "候補者一覧" },
      { icon: "job", label: "募集管理" },
      { icon: "criteria", label: "評価基準" },
    ],
  },
  {
    title: "説明会",
    items: [
      { icon: "survey", label: "アンケート" },
      { icon: "answers", label: "回答一覧" },
      { icon: "mail", label: "案内メール設定" },
    ],
  },
  {
    title: "管理",
    items: [
      { icon: "report", label: "帳票出力" },
      { icon: "account", label: "アカウント" },
      { icon: "logs", label: "運用・ログ" },
    ],
  },
];
