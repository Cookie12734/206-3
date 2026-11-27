"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, Actions, Button, Details, Field, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { useDemoValue } from "../../_lib/demo-storage";
import { defaultMessage, displayDate, linked, recruitmentLabels, type Message, type RecruitmentType } from "../../surveys/_lib/survey";
import { useSurveys } from "../../surveys/_lib/use-surveys";
import styles from "./mail-editor.module.css";

export function MailEditor({ type, surveyId, scoped = false, useTemplate = false, pickDate = false }: {
  type: RecruitmentType; surveyId?: string; scoped?: boolean; useTemplate?: boolean; pickDate?: boolean;
}) {
  const router = useRouter();
  const { find, save } = useSurveys();
  const survey = find(surveyId);
  const [template, saveTemplate] = useDemoValue(`mail-template:${type}`, defaultMessage(type));
  const [message, setMessage] = useState<Message>();
  const [previewDate, setPreviewDate] = useState(pickDate ? "2026-12-01T23:59" : "");
  const [error, setError] = useState("");
  const label = recruitmentLabels[type];
  const shortLabel = type === "new-graduate" ? "新卒" : "中途";
  const current = message ?? (scoped && !useTemplate ? survey.messages[type] ?? defaultMessage(type) : template);
  const back = scoped ? linked("/surveys", survey.id) : "/surveys";
  const applyRoute = `/apply/${type}/login`;
  const deadline = displayDate(previewDate || survey.endsAt);
  const preview = (content: string) => content
    .replaceAll("{{申込期限}}", `${deadline}（日本時間）`)
    .replaceAll("{{応募リンク}}", `https://recruit.example.com${applyRoute}`);

  if (scoped && survey.deleted) return <Screen>
    <Heading title="アンケート別の案内メールを設定する" />
    <Notice>このアンケートは削除されました。</Notice>
    <Actions><ActionLink href="/surveys">アンケート管理へ</ActionLink></Actions>
  </Screen>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current.subject.trim() || !current.body.trim()) {
      setError("件名と本文を入力してください。");
      return;
    }
    if (!current.body.includes("{{応募リンク}}") || !current.body.includes("{{申込期限}}")) {
      setError("本文に {{応募リンク}} と {{申込期限}} を入力してください。");
      return;
    }
    if (scoped) save({ ...survey, messages: { ...survey.messages, [type]: current } });
    else saveTemplate(current);
    router.push(back);
  }

  return <Screen>
    <Heading title={scoped ? "アンケート別の案内メールを設定する" : `${shortLabel}用の案内メールテンプレートを作成する`}
      description={scoped ? `対象：${survey.name} ／ ${useTemplate ? `${shortLabel}用テンプレートを読み込みました。内容を編集して保存してください。` : "このアンケート専用の文面を作成します。"}`
        : "テンプレートを保存し、各アンケートのメール設定でコピーして利用できます。"} />
    <Actions>
      {(["new-graduate", "mid-career"] as const).map((kind) => <ActionLink key={kind} current={kind === type}
        tone={kind === type ? "primary" : "normal"} href={scoped ? linked(`/surveys/mail/${kind}`, survey.id) : `/mail/${kind}`}>
        {recruitmentLabels[kind]}</ActionLink>)}
    </Actions>
    <div className={styles.mailColumns}>
      <form onSubmit={submit}>
        <Panel title={scoped ? "このアンケートで送るメール" : "案内メールのテンプレート"}>
          {scoped && <Actions><Button onClick={() => {
            if (useTemplate) setMessage(template);
            else router.push(linked(`/surveys/mail/${type}/template-applied`, survey.id));
          }}>テンプレートを読み込む</Button></Actions>}
          <Field label="件名"><input value={current.subject} required onChange={(event) => setMessage({ ...current, subject: event.target.value })} /></Field>
          <Field label="本文"><textarea value={current.body} required
            onChange={(event) => setMessage({ ...current, body: event.target.value })} /></Field>
          <Notice>{"{{申込期限}}：アンケートに設定した申込終了日時\n{{応募リンク}}：回答された採用区分に対応する専用リンク"}</Notice>
          {error && <Notice tone="error">{error}</Notice>}
          <Actions><Button tone="primary" type="submit">{scoped ? "メール設定を保存" : "テンプレートを保存"}</Button>
            <ActionLink href={back}>アンケート管理へ</ActionLink></Actions>
        </Panel>
      </form>
      <Panel title={pickDate ? "申込期限を選択（確認用）" : scoped ? "自動送信される内容" : "差し込み内容の確認例"}>
        <Details rows={[["宛先", "回答されたメールアドレス"]]} />
        {pickDate ? <Field label="日付と時刻"><input type="datetime-local" value={previewDate}
          onChange={(event) => setPreviewDate(event.target.value)} /></Field> :
          !scoped && <Actions><ActionLink href={`/mail/${type}/preview-deadline`}>申込期限を選択</ActionLink></Actions>}
        <div className={styles.previewBody}><strong>{preview(current.subject)}</strong><p>{preview(current.body)}</p></div>
        <Notice>{`送信条件：「選考を希望する」を選択\n区分：${label}\n宛先の手動入力は不要です。`}</Notice>
        <p>申込期限の値は、アンケートごとの申込期間から設定されます。</p>
      </Panel>
    </div>
  </Screen>;
}
