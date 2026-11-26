"use client";

import { useState } from "react";
import { ActionLink, Actions, Button, Details, Field, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { canPublish, displayDate, linked, surveyLink, surveyPeriod } from "../_lib/survey";
import { useSurveys } from "../_lib/use-surveys";

export default function PublishedSurvey({ surveyId }: { surveyId?: string }) {
  const survey = useSurveys().find(surveyId);
  const path = surveyLink(survey.id);
  const [status, setStatus] = useState("");
  if (!survey.published || !canPublish(survey)) {
    return <Screen>
      <Heading title="アンケートリンクの発行" />
      <Notice>{survey.deleted ? "このアンケートは削除されました。" : "アンケート管理から案内メールの設定とリンクの発行を行ってください。"}</Notice>
      <Actions><ActionLink href={survey.deleted ? "/surveys" : linked("/surveys", survey.id)}>アンケート管理へ</ActionLink></Actions>
    </Screen>;
  }
  return <Screen>
    <Heading title="アンケートリンクを発行しました" description="回答用リンクを発行しました。説明会参加者へ共有してください。" />
    <Panel title={survey.name}>
      <Field label="アンケート回答用リンク"><input readOnly value={path} onFocus={(event) => event.target.select()} /></Field>
      <Actions>
        <Button onClick={async () => {
          try {
            await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
            setStatus("リンクをコピーしました。");
          } catch {
            setStatus("コピーできませんでした。「アンケートを開く」からURLを確認できます。");
          }
        }}>リンクをコピー</Button>
        <span role="status">{status}</span>
      </Actions>
      <Details rows={[
        ["申込期間", surveyPeriod(survey)], ["採用区分", "新卒・中途"],
        ["自動送信", "選考希望のチェックがある回答だけに応募案内を送信"],
      ]} />
    </Panel>
    <Actions>
      <ActionLink href={path} tone="primary">アンケートを開く</ActionLink>
      <ActionLink href={linked("/surveys", survey.id)}>アンケート管理へ</ActionLink>
      <ActionLink href={linked("/answers", survey.id)}>回答一覧を見る</ActionLink>
    </Actions>
    <Notice>{`案内メールの {{申込期限}} には「${displayDate(survey.endsAt)}」が入ります。応募リンクは回答された採用区分に合わせて設定されます。`}</Notice>
  </Screen>;
}
