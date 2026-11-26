export type RecruitmentType = "new-graduate" | "mid-career";
export type Question = { id: string; label: string; kind: "text" | "choice"; options: string[]; required: boolean };
export type Message = { subject: string; body: string };
export type Survey = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  questions: Question[];
  messages: Partial<Record<RecruitmentType, Message>>;
  published: boolean;
  deleted?: true;
};

export const recruitmentLabels: Record<RecruitmentType, string> = { "new-graduate": "新卒採用", "mid-career": "中途採用" };
export const surveyName = "Webエンジニア 会社説明会アンケート";
export const sampleId = "SE-2026-01";
export const sampleScenarios = ["missing-both", "missing-new-graduate", "missing-mid-career", "published"];
export const sampleQuestions: Question[] = [
  { id: "impression", label: "説明会の感想", kind: "text", options: [], required: false },
  { id: "interest", label: "興味のある業務", kind: "choice", options: ["Webアプリケーション開発", "インフラ・クラウド", "その他"], required: false },
];

export function defaultMessage(type: RecruitmentType): Message {
  const label = recruitmentLabels[type];
  const files = type === "new-graduate"
    ? "履歴書をご提出ください。\n職務経歴書は職歴がある場合に任意で添付できます。"
    : "履歴書と職務経歴書をご提出ください。";
  return {
    subject: `【${label}】Webエンジニア 応募のご案内`,
    body: `説明会へのご参加、ありがとうございました。\nWebエンジニア（${label}）の応募をご案内します。\n\n申込期限：{{申込期限}}\n応募はこちら：{{応募リンク}}\n\n${files}\n申込期間内かつ判断未登録の場合、応募内容を編集できます。`,
  };
}

export function sampleSurvey(id = sampleId): Survey {
  const messages: Survey["messages"] = {};
  if (!["missing-both", "missing-new-graduate"].includes(id)) messages["new-graduate"] = defaultMessage("new-graduate");
  if (!["missing-both", "missing-mid-career"].includes(id)) messages["mid-career"] = defaultMessage("mid-career");
  return {
    id, name: surveyName, startsAt: "2026-10-20T09:00", endsAt: "2026-11-06T23:59",
    questions: sampleQuestions, messages, published: id === "published",
  };
}

export function canPublish(survey: Survey) {
  return Boolean(survey.messages["new-graduate"] && survey.messages["mid-career"]);
}

export function displayDate(value: string) {
  return value.replaceAll("-", "/").replace("T", " ");
}

export function surveyPeriod(survey: Survey) {
  return `${displayDate(survey.startsAt)} 〜 ${displayDate(survey.endsAt)}（日本時間）`;
}

export function surveyLink(id: string) {
  return `/questionnaire/new-graduate?survey=${encodeURIComponent(id)}`;
}

export function linked(path: string, id: string) {
  return id === sampleId ? path : `${path}?survey=${encodeURIComponent(id)}`;
}

export type SurveyPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function readSurveyQuery(searchParams: SurveyPageProps["searchParams"]) {
  const { survey, state } = await searchParams;
  return {
    survey: typeof survey === "string" ? survey : undefined,
    state: typeof state === "string" ? state : undefined,
  };
}
