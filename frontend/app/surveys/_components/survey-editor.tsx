"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, Actions, Button, Field, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { useDemoValue } from "../../_lib/demo-storage";
import { linked, sampleSurvey, type Question, type Survey } from "../_lib/survey";
import { useSurveys } from "../_lib/use-surveys";
import styles from "./surveys.module.css";

const optional = { label: "", required: false };

function previewQuestions(base: Question[], state?: string): Question[] {
  if (!state) return base;
  const newQuestion = { ...optional, id: "preview-question", kind: "text" as const, options: [] };
  const choice = (count: number): Question => ({
    ...newQuestion, kind: "choice", options: Array.from({ length: count }, (_, i) => i < 2 ? `選択肢${i + 1}` : ""),
  });
  const previewCount = /^options-(0|3|4|5|6|7|8)$/.exec(state);
  if (previewCount) return [...base, choice(Number(previewCount[1]))];

  const [first, second] = base;
  switch (state) {
    case "text": return [...base, newQuestion];
    case "choice": return [...base, choice(2)];
    case "add-option": return [...base, choice(3)];
    case "remove-first": return base.slice(1);
    case "remove-second": return base.slice(0, 1);
    case "append-existing": return second ? [first, { ...second, options: [...second.options, ""] }] : base;
    case "remove-existing": return second ? [first, { ...second, options: second.options.slice(0, -1) }] : base;
    case "first-choice": return first ? [{ ...first, kind: "choice", options: ["", ""] }, ...base.slice(1)] : base;
    case "second-text": return second ? [first, { ...second, kind: "text", options: [] }] : base;
    default: {
      const removed = /^remove-option-([1-3])$/.exec(state);
      return removed && second ? [first, { ...second, options: second.options.filter((_, i) => i !== Number(removed[1]) - 1) }] : base;
    }
  }
}

function QuestionEditor({ question, number, update, remove }: {
  question: Question; number: number; update: (question: Question) => void; remove: () => void;
}) {
  return <fieldset className={styles.question}>
    <legend>質問{number}</legend>
    <Field label="質問文"><input value={question.label} onChange={(event) => update({ ...question, label: event.target.value })} /></Field>
    <div className={styles.twoFields}>
      <Field label="回答形式"><select value={question.kind} onChange={(event) => {
        const kind = event.target.value as Question["kind"];
        update({ ...question, kind, options: kind === "choice" ? ["", ""] : [] });
      }}><option value="text">記述式</option><option value="choice">選択式</option></select></Field>
      <label className={styles.checkbox}><input type="checkbox" checked={question.required}
        onChange={(event) => update({ ...question, required: event.target.checked })} />必須にする</label>
    </div>
    {question.kind === "choice" && <>
      {question.options.map((option, i) => <div key={i} className={styles.optionRow}>
        <Field label={`選択肢 ${i + 1}`}><input value={option} onChange={(event) => update({
          ...question, options: question.options.map((item, index) => index === i ? event.target.value : item),
        })} /></Field>
        <Button tone="danger" aria-label={`質問${number}の選択肢${i + 1}を削除`}
          onClick={() => update({ ...question, options: question.options.filter((_, index) => index !== i) })}>削除</Button>
      </div>)}
      {question.options.length === 0 && <Notice>選択肢がありません。</Notice>}
      <Actions><Button onClick={() => update({ ...question, options: [...question.options, ""] })}>＋ 選択肢を追加</Button></Actions>
    </>}
    <Actions><Button tone="danger" onClick={remove}>質問{number}を削除</Button></Actions>
  </fieldset>;
}

export function SurveyEditor({ edit = false, surveyId, state }: { edit?: boolean; surveyId?: string; state?: string }) {
  const { find, save } = useSurveys();
  const survey = edit ? find(surveyId) : { ...sampleSurvey(), id: "", questions: [], messages: {} };
  const [draft, setDraft] = useDemoValue<Survey | null>(`draft:${survey.id || "new"}`, null);
  const [changes, setChanges] = useState<Survey>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const current = changes ?? (state ? { ...survey, questions: previewQuestions(survey.questions, state) } : draft ?? survey);
  const setQuestions = (questions: Question[]) => setChanges({ ...current, questions });
  const back = edit ? linked("/surveys", survey.id) : "/surveys";

  if (survey.deleted) return <Screen>
    <Heading title="アンケートを編集する" />
    <Notice>このアンケートは削除されました。</Notice>
    <Actions><ActionLink href="/surveys">アンケート管理へ</ActionLink></Actions>
  </Screen>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!current.name.trim() || current.startsAt >= current.endsAt) {
      setError("アンケート名を入力し、申込終了日時を開始日時より後に設定してください。");
      return;
    }
    if (current.questions.some((question) => !question.label.trim()
      || question.kind === "choice" && (
        question.options.length < 2 || question.options.some((option) => !option.trim())
        || new Set(question.options.map((option) => option.trim())).size !== question.options.length
      ))) {
      setError("質問文を入力してください。選択式の質問には異なる選択肢が2件以上必要です。");
      return;
    }
    setSaving(true);
    const id = current.id || crypto.randomUUID();
    save({ ...current, id, name: current.name.trim() });
    setDraft(null);
    router.push(linked("/surveys", id));
  }

  return <Screen>
    <Heading title={edit ? "アンケートを編集する" : "アンケートを作成する"}
      description={edit ? "基本設定・必須項目と質問を編集し、変更を保存します。" : "基本設定を入力し、必要な質問を追加します。"} />
    <form onSubmit={submit} className={styles.form}>
      <div className={edit ? styles.editorColumns : styles.form}>
        <Panel title="基本設定・必須項目">
          <Field label="アンケート名"><input value={current.name} required
            onChange={(event) => setChanges({ ...current, name: event.target.value })} /></Field>
          <div className={styles.twoFields}>
            <Field label="採用区分選択メニュー（必須）"><input value="新卒採用・中途採用" readOnly /></Field>
            <Field label="メールアドレス入力欄（必須）"><input value="回答者のメールアドレス" readOnly /></Field>
          </div>
          <label className={styles.checkbox}><input type="checkbox" checked readOnly disabled />選考を希望する</label>
          <div className={styles.twoFields}>
            <Field label="申込開始日時（必須）"><input type="datetime-local" value={current.startsAt} required
              onChange={(event) => setChanges({ ...current, startsAt: event.target.value })} /></Field>
            <Field label="申込終了日時（必須）"><input type="datetime-local" value={current.endsAt} required
              onChange={(event) => setChanges({ ...current, endsAt: event.target.value })} /></Field>
          </div>
          <Notice>申込期限は終了日時から設定されます（日本時間）。</Notice>
          {!edit && !current.questions.length && <Actions><Button onClick={() => setQuestions([{
            ...optional, id: crypto.randomUUID(), kind: "text", options: [],
          }])}>＋ 質問を追加</Button></Actions>}
        </Panel>
        {(edit || current.questions.length > 0) && <div className={styles.questions}>
          {current.questions.map((question, i) => <QuestionEditor key={question.id} question={question} number={i + 1}
            update={(next) => setQuestions(current.questions.map((item) => item.id === next.id ? next : item))}
            remove={() => setQuestions(current.questions.filter((item) => item.id !== question.id))} />)}
          <Actions><Button onClick={() => setQuestions([...current.questions, {
            ...optional, id: crypto.randomUUID(), kind: "text", options: [],
          }])}>＋ 質問を追加</Button></Actions>
        </div>}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!edit && <Notice>リンクは、新卒用と中途用の案内メールを設定すると発行できます。</Notice>}
      <Actions>
        <Button tone="primary" type="submit" disabled={saving}>{edit ? "変更を保存" : "アンケートを保存"}</Button>
        <ActionLink href={back}>キャンセル</ActionLink>
        <Button onClick={() => { setDraft(current); setNotice("内容を一時保存しました。"); }}>内容を一時保存</Button>
        <span role="status" className={styles.inlineStatus}>{notice}</span>
      </Actions>
    </form>
  </Screen>;
}
