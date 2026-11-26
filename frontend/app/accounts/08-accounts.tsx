"use client";

import { useRef, useState, type FormEvent } from "react";
import { Badge, Button, DataTable, Field, Heading, Notice, Panel, Screen } from "../_components/screen";
import { useDemoValue } from "../_lib/demo-storage";
import { defaultStaff, type Staff } from "./_lib/staff";
import styles from "./08-accounts.module.css";

const newStaff: Staff = { id: "", name: "", email: "", role: "採用担当者", status: "有効" };
const fields = [
  ["name", "担当者名"], ["email", "メールアドレス"], ["role", "権限"], ["status", "状態"],
] as const;

function showDialog(dialog: HTMLDialogElement | null) {
  if (dialog && !dialog.open) dialog.showModal();
}

function focusElement(element: HTMLElement | null) {
  element?.focus();
}

function StaffDialog({ original, staff, onSave, onDismiss }: {
  original: Staff;
  staff: Staff[];
  onSave: (person: Staff) => void;
  onDismiss: () => void;
}) {
  const [draft, setDraft] = useState(original);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(original.id);
  const reviewFields = editing ? fields.filter(([key]) => draft[key] !== original[key]) : fields;
  const title = editing ? `${original.name} の編集` : "担当者登録";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const person = { ...draft, name: draft.name.trim(), email: draft.email.trim() };
    if (!person.name) {
      setError("担当者名を入力してください。");
      return;
    }
    if (staff.some((item) => item.id !== person.id && item.email.toLowerCase() === person.email.toLowerCase())) {
      setError("このメールアドレスは登録済みです。別のメールアドレスを入力してください。");
      setReviewing(false);
      return;
    }
    if (editing && fields.every(([key]) => original[key] === person[key])) {
      setError("変更された項目がありません。");
      return;
    }
    setError("");
    if (reviewing) {
      onSave(person);
      event.currentTarget.closest("dialog")?.close();
    } else {
      setDraft(person);
      setReviewing(true);
    }
  }

  return <dialog ref={showDialog} aria-labelledby="staff-dialog-title" className={styles.dialog} onClose={onDismiss}>
    <form onSubmit={submit}>
      <h2 id="staff-dialog-title">{title}</h2>
      {reviewing ? <section className={styles.review}>
        <h3 ref={focusElement} tabIndex={-1}>{editing ? "変更内容の確認" : "登録内容の確認"}</h3>
        <dl>{reviewFields.map(([key, label]) => <div key={key}>
          <dt>{label}</dt>
          <dd>{editing && <span className={styles.before}>{original[key]} → </span>}{draft[key]}</dd>
        </div>)}</dl>
      </section> : <div className={styles.inputs}>
        <Field label="担当者名"><input ref={focusElement} value={draft.name} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="メールアドレス"><input type="email" value={draft.email} required onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
        <div className={styles.selects}>
          <Field label="権限"><select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
            <option>管理者</option><option>採用担当者</option><option>閲覧のみ</option>
          </select></Field>
          {editing && <Field label="状態"><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option>有効</option><option>停止中</option>
          </select></Field>}
        </div>
      </div>}
      {error && <Notice tone="error">{error}</Notice>}
      <div className={styles.actions}>
        <Button onClick={(e) => e.currentTarget.closest("dialog")?.close()}>キャンセル</Button>
        {reviewing && <Button onClick={() => setReviewing(false)}>戻る</Button>}
        <Button type="submit" tone="primary">{reviewing
          ? (editing ? "変更を保存" : "登録する")
          : (editing ? "変更を確認" : "登録を確認")}</Button>
      </div>
    </form>
  </dialog>;
}

export default function Accounts() {
  const [staff, setStaff] = useDemoValue("staff", defaultStaff);
  const [selected, setSelected] = useState<Staff>();
  const [notice, setNotice] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);

  function openForm(person: Staff, button: HTMLButtonElement) {
    trigger.current = button;
    setNotice("");
    setSelected(person);
  }

  function save(person: Staff) {
    if (person.id) {
      setStaff((previous) => previous.map((item) => item.id === person.id ? person : item));
      setNotice("担当者情報を変更しました。");
    } else {
      const created = { ...person, id: crypto.randomUUID() };
      setStaff((previous) => [...previous, created]);
      setNotice("担当者を登録しました。");
    }
  }

  return <Screen>
    <Heading title="アカウント管理" description="担当者の登録・変更は管理者のみ行えます。" />
    {notice && <Notice><span role="status">{notice}</span></Notice>}
    <Panel className={styles.data}>
      <div className={styles.toolbar}>
        <h2>担当者一覧</h2>
        <Button tone="primary" aria-haspopup="dialog" onClick={(e) => openForm(newStaff, e.currentTarget)}>担当者登録</Button>
      </div>
      <DataTable caption="担当者一覧" headings={["担当者", "権限", "状態", "編集"]} rows={staff.map((person) => [
        <div key="person" className={styles.person}><strong>{person.name}</strong><span>{person.email}</span></div>,
        person.role, <Badge key="status" tone={person.status === "停止中" ? "waiting" : "default"}>{person.status}</Badge>,
        <Button key="edit" className={styles.edit} aria-label={`${person.name}を編集`} aria-haspopup="dialog"
          onClick={(e) => openForm(person, e.currentTarget)}>編集</Button>,
      ])} />
    </Panel>
    {selected && <StaffDialog original={selected} staff={staff} onSave={save} onDismiss={() => {
      setSelected(undefined);
      trigger.current?.focus();
    }} />}
  </Screen>;
}
