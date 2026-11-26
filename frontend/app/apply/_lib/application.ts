import type { RecruitmentType } from "../../surveys/_lib/survey";

export type DocumentSummary = { name: string; size: number };
export type Application = {
  name: string;
  email: string;
  phone: string;
  resume: DocumentSummary | null;
  history: DocumentSummary | null;
  consent: boolean;
};

export type Submission = {
  application: Application;
  sentAt: string;
  scheduledAt: string;
};

export function sampleApplication(type: RecruitmentType, editing = false): Application {
  return {
    name: "候補者 A", email: "applicant@example.com", phone: editing ? "090-1111-2222" : "090-0000-0000",
    resume: { name: editing ? "履歴書_修正版.pdf" : "履歴書.pdf", size: 1200000 },
    history: type === "new-graduate" ? null : { name: "職務経歴書.pdf", size: 800000 },
    consent: true,
  };
}

export function documentLabel(file: DocumentSummary | null) {
  return file ? `${file.name} / ${(file.size / 1000000).toFixed(1)} MB` : "未提出（任意）";
}

export function sampleSubmission(type: RecruitmentType, updated = false): Submission {
  return {
    application: sampleApplication(type, updated),
    sentAt: updated ? "2026/10/20 12:30" : "2026/10/20 11:00",
    scheduledAt: updated ? "2026/10/20 14:30" : "2026/10/20 13:00",
  };
}

export function recordSubmission(application: Application): Submission {
  const now = new Date();
  const format = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tokyo", hourCycle: "h23",
  });
  return { application, sentAt: format.format(now), scheduledAt: format.format(now.getTime() + 2 * 60 * 60 * 1000) };
}
