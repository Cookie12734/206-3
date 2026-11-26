"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, Actions, Badge, Button, Details, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { canPublish, linked, sampleId, sampleScenarios, surveyLink, surveyPeriod } from "../_lib/survey";
import { useSurveys } from "../_lib/use-surveys";
import styles from "./surveys.module.css";

export function SurveyList({ surveyId = sampleId }: { surveyId?: string }) {
  const { saved, find, save, remove } = useSurveys();
  const router = useRouter();
  const [status, setStatus] = useState("");
  const surveys = (surveyId === sampleId
    ? [find(), ...saved.filter(({ id }) => id !== sampleId && !sampleScenarios.includes(id))]
    : [find(surveyId)]).filter(survey => !survey.deleted);

  return (
    <Screen>
      <Heading title="アンケート管理" description="説明会アンケートを作成し、回答から応募案内につなげます。" />
      <Actions>
        <ActionLink tone="primary" href="/surveys/new">アンケートを作成</ActionLink>
        <ActionLink href="/mail/new-graduate">新卒の案内メール設定</ActionLink>
        <ActionLink href="/mail/mid-career">中途の案内メール設定</ActionLink>
      </Actions>
      <Panel title="登録済みのアンケート" className={styles.surveyList}>
        <span role="status" hidden={!status}>{status}</span>
        {surveys.length === 0 && <p>表示できるアンケートがありません。</p>}
        {surveys.map((survey) => {
          const ready = canPublish(survey);
          const publishedPath = `/surveys/published?survey=${encodeURIComponent(survey.id)}`;
          const newGraduate = survey.messages["new-graduate"] ? "設定済み" : "未設定";
          const midCareer = survey.messages["mid-career"] ? "設定済み" : "未設定";
          return (
            <section key={survey.id} className={styles.surveyItem} aria-label={survey.name}>
              <Badge>{survey.published ? "発行済み" : "下書き"}</Badge>
              <h3>{survey.name}</h3>
              <Details rows={[
                ["申込期間", surveyPeriod(survey)],
                ["採用区分", "新卒・中途（回答時に選択）"],
                ["自動案内メール", ready ? "選考希望者に、このアンケート用に設定したメールを送信" :
                  newGraduate === midCareer ? "未設定：新卒用・中途用の案内メールを設定してください" :
                    `新卒用：${newGraduate} ／ 中途用：${midCareer}`],
              ]} />
              <Actions>
                <ActionLink href={linked("/surveys/edit", survey.id)}>内容を編集</ActionLink>
                <ActionLink href={linked(`/surveys/mail/${survey.messages["new-graduate"] && !survey.messages["mid-career"] ? "mid-career" : "new-graduate"}`, survey.id)}>メール設定</ActionLink>
                {survey.published
                  ? <ActionLink tone="primary" href={publishedPath}>発行したリンクを見る</ActionLink>
                  : <Button tone="primary" disabled={!ready} onClick={() => {
                      save({ ...survey, published: true });
                      router.push(publishedPath);
                    }}>アンケートリンクを発行</Button>}
                <ActionLink href={linked("/answers", survey.id)}>回答を確認</ActionLink>
                {survey.published && <ActionLink href={surveyLink(survey.id)}>アンケートを開く</ActionLink>}
                <Button tone="danger" aria-label={`${survey.name}を削除`} onClick={() => {
                  if (!window.confirm(`「${survey.name}」を削除しますか？\n回答の受付を終了します。これまでの回答は回答一覧に残ります。`)) return;
                  remove(survey.id);
                  setStatus(`「${survey.name}」を削除しました。`);
                  if (surveyId !== sampleId) router.replace("/surveys");
                }}>削除</Button>
              </Actions>
            </section>
          );
        })}
      </Panel>
      {surveys.length > 0 && <Notice>{surveys.some((survey) => !canPublish(survey))
        ? "未設定があります：このアンケートの案内メールを設定してください。設定が揃うとリンクを発行できます。"
        : "アンケートでは説明会の感想と選考意思を確認します。応募情報・書類は、案内メールの専用リンクから受け付けます。"}</Notice>}
    </Screen>
  );
}
