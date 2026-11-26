const selection = [
  { icon: "people", label: "候補者一覧", href: "/candidates" },
  { icon: "job", label: "募集管理", href: "/recruitments" },
  { icon: "criteria", label: "評価管理", href: "/criteria" },
];

const events = [
  { icon: "survey", label: "アンケート", href: "/surveys" },
  { icon: "answers", label: "回答一覧", href: "/answers" },
  { icon: "mail", label: "案内メール設定", href: "/mail" },
];

const admin = [
  { icon: "report", label: "帳票出力", href: "/reports" },
  { icon: "account", label: "アカウント", href: "/accounts" },
  { icon: "logs", label: "運用・ログ", href: "/operations" },
];

export const navigation = [
  { title: "選考管理", items: selection },
  { title: "説明会", items: events },
  { title: "管理", items: admin },
];
