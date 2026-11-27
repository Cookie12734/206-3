"use client";

import { useState, type FormEvent, type InputHTMLAttributes } from "react";
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

type Errors = Record<string, string>;

function validateSurvey(survey: Survey): Errors {
  const errors: Errors = {};
  if (!survey.name.trim()) errors["survey-name"] = "アンケート名を入力してください。";
  if (!survey.startsAt) errors.start = "申込開始日時を入力してください。";
  if (!survey.endsAt) errors.end = "申込終了日時を入力してください。";
  else if (survey.startsAt >= survey.endsAt) errors.end = "終了日時は開始日時より後に設定してください。";

  survey.questions.forEach((question, index) => {
    const title = `質問${index + 1}`;
    if (!question.label.trim()) errors[question.id] = `${title}の質問文を入力してください。`;
    if (question.kind !== "choice") return;
    const seen = new Set<string>();
    question.options.forEach((value, i) => {
      const option = value.trim();
      const id = `${question.id}-option-${i}`;
      if (!option) errors[id] = `${title}の選択肢${i + 1}を入力してください。`;
      else if (seen.has(option)) errors[id] = `${title}の選択肢${i + 1}が重複しています。`;
      seen.add(option);
    });
    if (question.options.length < 2) errors[`${question.id}-add`] = `${title}には選択肢が2件以上必要です。`;
  });
  return errors;
}

function EditorInput({ label, id, errors, ...props }: InputHTMLAttributes<HTMLInputElement> & {
  label: string; id: string; errors: Errors;
}) {
  const message = errors[id];
  return <Field label={label}>
    <input {...props} id={id} aria-invalid={message ? true : undefined} aria-describedby={message ? id + "-error" : undefined} />
    {message && <span id={id + "-error"} className={styles.fieldError}>{message}</span>}
  </Field>;
}

function QuestionEditor({ question, number, update, remove, errors }: {
  errors: Errors; question: Question; number: number; update: (question: Question) => void; remove: () => void;
}) {
  return <fieldset className={styles.question}>
    <legend>質問{number}</legend>
    <EditorInput label="質問文" id={question.id} errors={errors} value={question.label}
      onChange={(event) => update({ ...question, label: event.target.value })} />
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
        <EditorInput label={`選択肢 ${i + 1}`} id={`${question.id}-option-${i}`} errors={errors} value={option} onChange={(event) => update({
          ...question, options: question.options.map((item, index) => index === i ? event.target.value : item),
        })} />
        <Button tone="danger" aria-label={`質問${number}の選択肢${i + 1}を削除`}
          onClick={() => update({ ...question, options: question.options.filter((_, index) => index !== i) })}>削除</Button>
      </div>)}
      {question.options.length === 0 && <Notice>選択肢がありません。</Notice>}
      {errors[`${question.id}-add`] && <span id={question.id + "-add-error"} className={styles.fieldError}>{errors[`${question.id}-add`]}</span>}
      <Actions><Button id={question.id + "-add"} aria-describedby={errors[question.id + "-add"] ? question.id + "-add-error" : undefined}
        onClick={() => update({ ...question, options: [...question.options, ""] })}>＋ 選択肢を追加</Button></Actions>
    </>}
    <Actions><Button tone="danger" onClick={remove}>質問{number}を削除</Button></Actions>
  </fieldset>;
}

export function SurveyEditor({ edit = false, surveyId, state }: { edit?: boolean; surveyId?: string; state?: string }) {
  const { find, save } = useSurveys();
  const survey = edit ? find(surveyId) : { ...sampleSurvey(), id: "", questions: [], messages: {} };
  const [draft, setDraft] = useDemoValue<Survey | null>(`draft:${survey.id || "new"}`, null);
  const [changes, setChanges] = useState<Survey>();
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const current = changes ?? (state ? { ...survey, questions: previewQuestions(survey.questions, state) } : draft ?? survey);
  const errors = attempted ? validateSurvey(current) : {};
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
    const [first] = Object.keys(validateSurvey(current));
    if (first) {
      setAttempted(true);
      requestAnimationFrame(() => document.getElementById(first)?.focus());
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
    <form noValidate onSubmit={submit} className={styles.form}>
      <div className={edit ? styles.editorColumns : styles.form}>
        <Panel title="基本設定・必須項目">
          <EditorInput id="survey-name" errors={errors} label="アンケート名" value={current.name} required
            onChange={(event) => setChanges({ ...current, name: event.target.value })} />
          <div className={styles.twoFields}>
            <Field label="採用区分選択メニュー（必須）"><input value="新卒採用・中途採用" readOnly /></Field>
            <Field label="メールアドレス入力欄（必須）"><input value="回答者のメールアドレス" readOnly /></Field>
          </div>
          <p>固定の質問：選考を希望しますか（希望する／希望しない）</p>
          <div className={styles.twoFields}>
            <EditorInput id="start" errors={errors} label="申込開始日時（必須）" type="datetime-local" value={current.startsAt} required
              onChange={(event) => setChanges({ ...current, startsAt: event.target.value })} />
            <EditorInput id="end" errors={errors} label="申込終了日時（必須）" type="datetime-local" value={current.endsAt} required
              onChange={(event) => setChanges({ ...current, endsAt: event.target.value })} />
          </div>
          <Notice>申込期限は終了日時から設定されます（日本時間）。</Notice>
          {!edit && !current.questions.length && <Actions><Button onClick={() => setQuestions([{
            ...optional, id: crypto.randomUUID(), kind: "text", options: [],
          }])}>＋ 質問を追加</Button></Actions>}
        </Panel>
        {(edit || current.questions.length > 0) && <div className={styles.questions}>
          {current.questions.map((question, i) => <QuestionEditor key={question.id} question={question} number={i + 1} errors={errors}
            update={(next) => setQuestions(current.questions.map((item) => item.id === next.id ? next : item))}
            remove={() => setQuestions(current.questions.filter((item) => item.id !== question.id))} />)}
          <Actions><Button onClick={() => setQuestions([...current.questions, {
            ...optional, id: crypto.randomUUID(), kind: "text", options: [],
          }])}>＋ 質問を追加</Button></Actions>
        </div>}
      </div>
      {Object.keys(errors).length > 0 && <Notice tone="error">入力内容を確認してください。修正が必要な項目に理由を表示しています。</Notice>}
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
