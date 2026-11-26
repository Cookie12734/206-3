import { sampleId, type RecruitmentType } from "../../surveys/_lib/survey";

export type Answer = {
  id: string;
  surveyId: string;
  name: string;
  email: string;
  type: RecruitmentType;
  interested: boolean;
  mailFailed?: boolean;
  submittedAt: string;
  responses: Record<string, string>;
};

export const sampleAnswers: Answer[] = [
  { id: "a", surveyId: sampleId, name: "参加者 A", email: "applicant@example.com", type: "new-graduate", interested: true,
    submittedAt: "2026/10/20 10:00", responses: { impression: "開発の進め方やチームの雰囲気を知ることができました。", interest: "Webアプリケーション開発" } },
  { id: "b", surveyId: sampleId, name: "参加者 B", email: "visitor@example.com", type: "mid-career", interested: false,
    submittedAt: "2026/10/20 10:20", responses: { impression: "業務の説明が具体的で、仕事内容を理解できました。", interest: "インフラ・クラウド" } },
];
