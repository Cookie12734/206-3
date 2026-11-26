"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionLink, Actions, Badge, DataTable, Field, Heading, Panel, Screen } from "../_components/screen";
import { useDemoValue } from "../_lib/demo-storage";
import { linked, recruitmentLabels, sampleId } from "../surveys/_lib/survey";
import { useSurveys } from "../surveys/_lib/use-surveys";
import { sampleAnswers, type Answer } from "./_lib/answers";
import styles from "./_components/answers.module.css";

export default function SurveyAnswers({ surveyId = sampleId }: { surveyId?: string }) {
  const { find, saved } = useSurveys();
  const [allAnswers] = useDemoValue<Answer[]>("survey-answers", []);
  const [selected, setSelected] = useState(surveyId);
  const [type, setType] = useState("");
  const [interest, setInterest] = useState("");
  const surveys = [...new Set([surveyId, sampleId, ...saved.map(({ id }) => id)])].map((id) => find(id));
  const answers = [...sampleAnswers, ...allAnswers].filter((answer) => answer.surveyId === selected &&
    (!type || answer.type === type) && (!interest || answer.interested === (interest === "yes")));
  return <Screen>
    <Heading title="説明会参加者のアンケート回答" description="参加者ごとに回答内容と、応募案内メールの送信状況を確認できます。" />
    <div className={styles.filters}>
      <Field label="対象アンケート"><select value={selected} onChange={(event) => setSelected(event.target.value)}>
        {surveys.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></Field>
      <Field label="採用区分"><select value={type} onChange={(event) => setType(event.target.value)}>
        <option value="">すべて</option><option value="new-graduate">新卒</option><option value="mid-career">中途</option></select></Field>
      <Field label="選考意思"><select value={interest} onChange={(event) => setInterest(event.target.value)}>
        <option value="">すべて</option><option value="yes">希望する</option><option value="no">希望しない</option></select></Field>
    </div>
    <Panel title="回答一覧">
      {answers.length ? <DataTable headings={["回答者 / メール", "採用区分", "選考意思", "案内メール", "回答日時", "操作"]}
        rows={answers.map((answer) => [
          <span key="respondent">{answer.name}<small className={styles.address}>{answer.email}</small></span>,
          recruitmentLabels[answer.type].replace("採用", ""), answer.interested ? "希望する" : "希望しない",
          <Badge key="mail" tone={answer.mailFailed ? "error" : answer.interested ? "default" : "waiting"}>{answer.mailFailed ? "送信失敗（例）" : answer.interested ? "送信済み（例）" : "未送信（希望なし）"}</Badge>,
          answer.submittedAt, <Link key="detail" href={`/answers/${answer.interested ? "detail" : "no-interest"}?answer=${encodeURIComponent(answer.id)}`}>詳細を見る</Link>,
        ])} /> : <p>条件に一致する回答がありません。</p>}
      <p>回答内容は参加者の詳細画面で確認できます。案内メールの送信状況はデモ表示です。</p>
    </Panel>
    <Actions><ActionLink href={linked("/surveys", selected)}>アンケート管理へ戻る</ActionLink></Actions>
  </Screen>;
}
