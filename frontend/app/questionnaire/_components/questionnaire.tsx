"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, Actions, Button, Details, Field, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { useDemoValue } from "../../_lib/demo-storage";
import type { Answer } from "../../answers/_lib/answers";
import { displayDate, linked, recruitmentLabels, sampleId, surveyPeriod, type RecruitmentType } from "../../surveys/_lib/survey";
import { useSurveys } from "../../surveys/_lib/use-surveys";
import styles from "./questionnaire.module.css";

export function Questionnaire({ type, surveyId = sampleId, interested = true }: {
  type: RecruitmentType; surveyId?: string; interested?: boolean;
}) {
  const { find, isSample } = useSurveys();
  const survey = find(surveyId);
  const [answers, setAnswers] = useDemoValue<Answer[]>("survey-answers", []);
  const [draft, setDraft] = useDemoValue<{ email: string; responses: Record<string, string> }>(
    `survey-response:${surveyId}`, { email: "applicant@example.com", responses: {} },
  );
  const router = useRouter();
  const [selection, setSelection] = useState<{ type: RecruitmentType; interested: boolean }>();
  const [sending, setSending] = useState(false);
  const current = selection ?? { type, interested };

  if (survey.deleted) return <Screen portal>
    <Heading title="会社説明会アンケート" />
    <Notice>このアンケートの回答受付は終了しました。</Notice>
  </Screen>;

  if (!isSample(surveyId) && !survey.published) return <Screen portal>
    <Heading title="会社説明会アンケート" />
    <Notice>このアンケートは公開されていません。デモで作成したアンケートは、発行したブラウザーから開いてください。</Notice>
  </Screen>;

  function choose(next: typeof current) {
    setSelection(next);
    router.push(linked(`/questionnaire/${next.type}${next.interested ? "" : "/no-interest"}`, surveyId));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    const answer: Answer = {
      id: crypto.randomUUID(), surveyId, name: `参加者 ${answers.length + 1}`, email: draft.email.trim(), ...current,
      submittedAt: new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date()),
      responses: draft.responses,
    };
    setAnswers((items) => [...items, answer]);
    router.push(current.interested
      ? linked(`/questionnaire/${current.type}/complete`, surveyId)
      : linked("/questionnaire/no-interest/complete", surveyId));
  }

  return <Screen portal>
    <Heading title="会社説明会アンケート" description="Webエンジニア｜説明会へのご参加ありがとうございました。" />
    <form onSubmit={submit} className={styles.form}>
      <Panel title="アンケートにご回答ください">
        <Field label="採用区分（必須）"><select value={current.type} onChange={(event) =>
          choose({ ...current, type: event.target.value as RecruitmentType })}>
          <option value="new-graduate">新卒採用</option><option value="mid-career">中途採用</option>
        </select></Field>
        <Field label="メールアドレス（必須）"><input type="email" value={draft.email} required
          onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></Field>
        {survey.questions.map((question) => {
          const label = `${question.label}（${question.required ? "必須" : "任意"}）`;
          const value = draft.responses[question.id] ?? "";
          const update = (next: string) => setDraft({ ...draft, responses: { ...draft.responses, [question.id]: next } });
          return <Field key={question.id} label={label}>{question.kind === "choice"
            ? <select value={value} required={question.required} onChange={(event) => update(event.target.value)}>
                <option value="">選択してください</option>{question.options.map((option) => <option key={option}>{option}</option>)}
              </select>
            : <input value={value} required={question.required} onChange={(event) => update(event.target.value)} />}</Field>;
        })}
        <label className={styles.checkbox}><input type="checkbox" checked={current.interested} onChange={(event) =>
          choose({ ...current, interested: event.target.checked })} />選考を希望する</label>
        <Notice>{`応募の申込期間：${surveyPeriod(survey)}\n選考を希望しない場合も、アンケートに回答できます。`}</Notice>
      </Panel>
      <Button tone="primary" type="submit" disabled={sending}>アンケートを送信する</Button>
    </form>
    <p className={styles.small}>回答内容は説明会の改善と、ご希望に応じた採用のご案内に使用します。<br />
      デモ用のアドレスと回答を使ってください。回答はこのブラウザー内に保存されます。</p>
  </Screen>;
}

export function QuestionnaireComplete({ type, surveyId = sampleId }: { type?: RecruitmentType; surveyId?: string }) {
  const survey = useSurveys().find(surveyId);
  const [answers] = useDemoValue<Answer[]>("survey-answers", []);
  const answer = answers.findLast((item) => item.surveyId === surveyId && (type ? item.type === type && item.interested : !item.interested));
  const email = answer?.email ?? "applicant@example.com";
  const label = type ? recruitmentLabels[type] : "";
  return <Screen portal>
    <Heading title="アンケートの回答を受け付けました" description="会社説明会へのご参加、ありがとうございました。" />
    {type ? <>
      <Panel title="応募案内メールをお送りしました（表示例）">
        <p>選考をご希望のため、{label}の応募案内を自動送信する場合の表示です。</p>
        <Details rows={[["送信先", email], ["採用区分", label], ["申込期限", `${displayDate(survey.endsAt)}（日本時間）`]]} />
      </Panel>
      <Panel title="応募のご案内">
        <p><strong>【{label}】Webエンジニア 応募のご案内</strong></p>
        <p>メールに記載された専用リンクから、応募情報と書類を提出してください。</p>
        <p>{type === "new-graduate" ? "履歴書は必須です。職務経歴書は、職歴がある場合に任意で提出できます。" : "履歴書と職務経歴書を提出してください。"}</p>
        <Actions><ActionLink href={linked(`/apply/${type}/login`, surveyId)} tone="primary">応募手続きへ進む</ActionLink></Actions>
      </Panel>
      <Notice>【送信失敗時の表示例】回答は保存済みです。応募案内メールを送信できませんでした。</Notice>
    </> : <Panel title="ご回答ありがとうございました">
      <p>アンケートの回答を保存しました。選考希望のチェックがないため、応募案内メールは送信していません。</p>
      <Details rows={[["回答メールアドレス", email], ["選考意思", "選考を希望しない"]]} />
      <Notice>いただいたご意見は、今後の説明会の改善に活用します。</Notice>
    </Panel>}
  </Screen>;
}
