"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, Actions, Button, Details, Field, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { useDemoValue } from "../../_lib/demo-storage";
import type { Decision } from "../../candidates/_lib/candidates";
import { displayDate, linked, recruitmentLabels, sampleId, type RecruitmentType } from "../../surveys/_lib/survey";
import { useSurveys } from "../../surveys/_lib/use-surveys";
import { documentLabel, recordSubmission, sampleApplication, sampleSubmission, type Application, type DocumentSummary, type Submission } from "../_lib/application";
import styles from "./application.module.css";

type Props = { type: RecruitmentType; surveyId?: string };
type Stage = "login" | "form" | "confirm" | "received" | "receipt" | "edit" | "edit/confirm" | "edit/received";

function Steps({ active }: { active: number }) {
  return <ol className={styles.steps} aria-label="応募手順">{["メールアドレス", "応募情報・書類", "内容の確認", "受付完了"].map((label, i) =>
    <li key={label} aria-current={i === active ? "step" : undefined}>{i + 1} {label}</li>)}</ol>;
}

function Upload({ label, file, setFile, optional = false }: {
  label: string; file: DocumentSummary | null; setFile: (file: DocumentSummary | null) => void; optional?: boolean;
}) {
  const [error, setError] = useState("");
  return <div className={styles.upload}>
    <Field label={label}><input type="file" accept=".pdf,application/pdf" required={!optional && !file}
      onChange={(event) => {
        const selected = event.target.files?.[0];
        if (!selected) return;
        if (!selected.name.toLowerCase().endsWith(".pdf") || selected.size > 10 * 1024 * 1024 || selected.size === 0) {
          event.target.value = "";
          setError("10MB以下のPDFファイルを選択してください。");
          return;
        }
        setError("");
        setFile({ name: selected.name, size: selected.size });
      }} /></Field>
    <span>{documentLabel(file)}</span>
    {optional && file && <Actions><Button onClick={() => setFile(null)}>添付を取り消す</Button></Actions>}
    {error && <Notice tone="error">{error}</Notice>}
  </div>;
}

export function ApplicationFlow({ type, surveyId = sampleId, stage }: Props & { stage: Stage }) {
  const router = useRouter();
  const survey = useSurveys().find(surveyId);
  const editing = stage.startsWith("edit");
  const key = `${type}:${surveyId}`;
  const [email, setEmail] = useDemoValue(`application-email:${key}`, "applicant@example.com");
  const [draft, setDraft] = useDemoValue<Application | null>(`application-${editing ? "edit" : "draft"}:${key}`, null);
  const [saved, setSaved] = useDemoValue<Submission | null>(`application-submitted:${key}`, null);
  const [decision] = useDemoValue<Decision | null>("candidate-decision", null);
  const [changes, setChanges] = useState<Application>();
  const [error, setError] = useState("");
  const display = changes ?? draft ?? (editing && saved ? saved.application : { ...sampleApplication(type, stage === "edit/confirm"), email });
  const submission = saved ?? sampleSubmission(type, stage === "edit/received");
  const next = (path: Stage) => linked(`/apply/${type}/${path}`, surveyId);
  const role = recruitmentLabels[type];
  const job = `Webエンジニア / ${role}`;
  const reference = type === "new-graduate" ? "APP-NG-024" : "APP-024";
  const deadline = `${displayDate(survey.endsAt)}（日本時間）`;
  const optional = type === "new-graduate";
  const editable = optional || surveyId !== sampleId || !decision;
  const editNote = "申込期間内かつ判断未登録の場合に編集できます。再送信が完了すると、その時点から2時間後に解析予定を更新します。";
  const timing: [string, string][] = [
    ["最終送信日時", submission.sentAt], ["解析予定日時", `${submission.scheduledAt}（最終送信から2時間後）`], ["申込期限", deadline],
  ];
  const information = (data: Application): [string, string][] => [
    ["氏名", data.name], ["メールアドレス", data.email], ["電話番号", data.phone],
    ["履歴書", documentLabel(data.resume)], ["職務経歴書", documentLabel(data.history)],
  ];

  if (editing && stage !== "edit/received" && !editable) return <Screen portal>
    <Heading title="応募内容を編集する" description={`${job}｜受付番号 ${reference}`} />
    <Notice tone="warning">この応募は受付内容の確認のみ可能です。</Notice>
    <Actions><ActionLink href={next("receipt")}>提出内容を確認</ActionLink></Actions>
  </Screen>;

  if (stage === "login") return <Screen portal>
    <Steps active={0} />
    <Heading title="応募を始める" description={job} />
    <form className={styles.form} onSubmit={(event) => {
      event.preventDefault();
      setDraft(null);
      router.push(next("form"));
    }}>
      <Panel title={`${role}の応募者ログイン`}>
        <p>案内メールを受け取ったメールアドレスを入力してください。</p>
        <Field label="メールアドレス（必須）"><input type="email" value={email} required onChange={(event) => setEmail(event.target.value)} /></Field>
        <Actions><Button type="submit" tone="primary">応募情報の入力へ進む</Button></Actions>
        <Notice>{`このリンクは${role}専用です。採用区分はリンクに紐づいています。`}</Notice>
      </Panel>
    </form>
    <p className={styles.footer}>デモ用のメールアドレスを入力してください。</p>
  </Screen>;

  if (stage === "form" || stage === "edit") {
    function submit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (!display.name.trim() || !display.phone.trim() || !display.resume || (!optional && !display.history) || !display.consent) {
        setError("氏名、電話番号、提出書類、同意の各項目を確認してください。");
        return;
      }
      setDraft({ ...display, name: display.name.trim(), phone: display.phone.trim() });
      router.push(next(editing ? "edit/confirm" : "confirm"));
    }
    const contactFields = <>
      <Field label="氏名（必須）"><input required value={display.name} onChange={(event) => setChanges({ ...display, name: event.target.value })} /></Field>
      <Field label="電話番号（必須）"><input type="tel" required value={display.phone} onChange={(event) => setChanges({ ...display, phone: event.target.value })} /></Field>
    </>;
    const uploads = <div className={styles.pair}>
      <Upload label="履歴書（必須）" file={display.resume} setFile={(resume) => setChanges({ ...display, resume })} />
      <Upload label={optional ? "職務経歴書（任意）" : "職務経歴書（必須）"} optional={optional}
        file={display.history} setFile={(history) => setChanges({ ...display, history })} />
    </div>;
    return <Screen portal>
      {!editing && <Steps active={1} />}
      <Heading title={editing ? "応募内容を編集する" : "応募情報・書類を入力する"}
        description={editing ? `${job}｜受付番号 ${reference}` : `${job}｜入力したメールアドレスで応募を受け付けます。`} />
      {editing && <Notice>{`申込期限：${deadline}\n変更内容の送信後、最新の内容で2時間後に解析します。`}</Notice>}
      <form className={styles.form} onSubmit={submit}>
        {editing ? <Panel title="応募者情報・提出書類">
          <div className={styles.pair}>{contactFields}</div>
          <Field label="メールアドレス（必須）"><input type="email" required value={display.email}
            onChange={(event) => setChanges({ ...display, email: event.target.value })} /></Field>
          {uploads}
        </Panel> : <>
          <Panel title="応募者情報">
            <p>メール：{display.email}｜応募職種：{job}</p>
            <div className={styles.pair}>{contactFields}</div>
          </Panel>
          <Panel title="提出書類">{uploads}
            <p className={styles.footer}>PDF形式・各10MBまで。確認には架空の書類を使用してください。</p>
          </Panel>
          <label className={styles.checkbox}><input type="checkbox" required checked={display.consent}
            onChange={(event) => setChanges({ ...display, consent: event.target.checked })} />応募書類を採用選考に使用することに同意します。</label>
          <p className={styles.footer}>解析は最終送信の2時間後に行います。期間内かつ判断未登録なら再送信できます。</p>
        </>}
        {error && <Notice tone="error">{error}</Notice>}
        <Actions>
          <Button tone="primary" type="submit">{editing ? "変更内容を確認する" : "応募内容を確認する"}</Button>
          {editing && <ActionLink href={next("receipt")}>変更をやめる</ActionLink>}
        </Actions>
      </form>
      {editing && <p className={styles.footer}>変更内容を送信すると応募内容と解析予定時刻が更新されます。PDF形式・各ファイル10MBまで。</p>}
    </Screen>;
  }

  if (stage === "confirm" || stage === "edit/confirm") return <Screen portal>
    {!editing && <Steps active={2} />}
    <Heading title={editing ? "変更内容を確認する" : "応募内容を確認する"} description={`${job}｜送信する内容を確認してください。`} />
    <Panel title={editing ? "更新する応募内容" : "送信する内容"}>
      <Details rows={editing ? information(display) : [["応募職種", job], ...information(display)]} />
      <Notice>{editing ? "変更内容の送信が完了した時点から、改めて2時間後に解析します。すでに解析済みの場合も、最新の応募内容でスコアを更新します。" : editNote}</Notice>
    </Panel>
    <Actions>
      <ActionLink href={next(editing ? "edit" : "form")}>{editing ? "編集へ戻る" : "入力内容を修正"}</ActionLink>
      <Button tone="primary" onClick={() => {
        setSaved(recordSubmission(display));
        setDraft(null);
        router.push(next(editing ? "edit/received" : "received"));
      }}>{editing ? "変更内容を送信する" : "この内容で応募する"}</Button>
    </Actions>
    <p className={styles.footer}>入力内容はデモ用にブラウザー内に保存します。書類本体とメールの送信は行いません。</p>
  </Screen>;

  const receipt = stage === "receipt";
  const updated = stage === "edit/received";
  return <Screen portal>
    <Heading title={receipt ? "受け付けた応募内容" : updated ? "変更内容を受け付けました" : "応募を受け付けました"}
      description={`${job}｜受付番号 ${reference}`} />
    <Panel title={receipt ? "受付済みの内容" : updated ? "応募内容の更新が完了しました" : "受付が完了しました"}>
      <Details rows={receipt ? [...information(submission.application), ...timing] : updated
        ? [...timing, ["電話番号", submission.application.phone], ["履歴書", submission.application.resume?.name ?? "未提出"]]
        : timing} />
      <Notice>{updated ? `最新の応募内容で解析を予約しました。\n${editNote}` : editNote}</Notice>
      <Actions>
        {editable && <ActionLink tone="primary" href={next("edit")}>{updated ? "応募内容を再び編集" : "応募内容を編集"}</ActionLink>}
        <ActionLink href={next(receipt ? "received" : "receipt")}>{receipt ? "受付完了へ戻る" : "提出内容を確認"}</ActionLink>
      </Actions>
    </Panel>
    <p className={styles.footer}>このデモでは、応募の受付内容と解析予定を確認できます。</p>
  </Screen>;
}
