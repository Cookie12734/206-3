"use client";

import { ActionLink, Actions, Details, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { useDemoValue } from "../../_lib/demo-storage";
import { defaultMessage, displayDate, linked, recruitmentLabels } from "../../surveys/_lib/survey";
import { useSurveys } from "../../surveys/_lib/use-surveys";
import { sampleAnswers, type Answer } from "../_lib/answers";
import styles from "./answers.module.css";

export function AnswerDetail({ answerId }: { answerId: string }) {
  const [allAnswers] = useDemoValue<Answer[]>("survey-answers", []);
  const answer = [...sampleAnswers, ...allAnswers].find(({ id }) => id === answerId);
  const { find } = useSurveys();
  if (!answer) return <Screen><Heading title="アンケート回答" /><Notice tone="error">指定された回答が見つかりません。</Notice>
    <Actions><ActionLink href="/answers">回答一覧へ戻る</ActionLink></Actions></Screen>;

  const survey = find(answer.surveyId);
  const message = survey.messages[answer.type] ?? defaultMessage(answer.type);
  return <Screen>
    <Heading title={`${answer.name} のアンケート回答`} description={survey.name} />
    <div className={styles.answers}>
      <Panel title="参加者情報・回答内容">
        <Details rows={[
          ["メールアドレス", answer.email], ["採用区分", recruitmentLabels[answer.type]],
          ["回答日時", answer.submittedAt], ["選考意思", answer.interested ? "選考を希望する" : "選考を希望しない"],
        ]} />
        {survey.questions.map((question) => <section key={question.id}><h3>{question.label}</h3><p>{answer.responses[question.id] || "未回答"}</p></section>)}
      </Panel>
      <Panel title="応募案内メール">
        {answer.interested ? <>
          <Notice tone={answer.mailFailed ? "warning" : "info"}>{answer.mailFailed ? "案内メールを送信できませんでした（表示例）。" : `${recruitmentLabels[answer.type]}用の案内メールを送信しました（表示例）。`}</Notice>
          <Details rows={[["送信先", answer.email], ["申込期限", displayDate(survey.endsAt)], ["件名", message.subject]]} />
          <Actions><ActionLink href={`/mail/${answer.type}`}>使用テンプレートを見る</ActionLink></Actions>
        </> : <Notice>「希望しない」が選択されたため、応募案内は送信していません。</Notice>}
      </Panel>
    </div>
    <Actions><ActionLink href={linked("/answers", survey.id)}>回答一覧へ戻る</ActionLink></Actions>
  </Screen>;
}
