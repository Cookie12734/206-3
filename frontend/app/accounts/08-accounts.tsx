"use client";

import { useState, type FormEvent } from "react";
import { Actions, Badge, Button, DataTable, Field, Heading, Notice, Panel, Screen } from "../_components/screen";
import { useDemoValue } from "../_lib/demo-storage";
import { defaultStaff, type Staff } from "./_lib/staff";
import styles from "./08-accounts.module.css";

const empty = { id: "", name: "", email: "", role: "採用担当者", status: "有効" };

export default function Accounts() {
  const [staff, setStaff] = useDemoValue("staff", defaultStaff);
  const [draft, setDraft] = useState<Staff>(empty);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Staff>();

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = draft.email.trim();
    if (!draft.name.trim() || staff.some((person) => person.id !== draft.id && person.email.toLowerCase() === email.toLowerCase())) {
      setError("担当者名を入力し、登録済みの担当者と異なるメールアドレスを指定してください。");
      return;
    }
    setError("");
    setConfirmation({ ...draft, name: draft.name.trim(), email });
  }

  function save() {
    if (!confirmation) return;
    const person = { ...confirmation, id: confirmation.id || crypto.randomUUID() };
    setStaff(confirmation.id ? staff.map((item) => item.id === person.id ? person : item) : [...staff, person]);
    setConfirmation(undefined);
    setDraft(empty);
    setNotice("担当者情報を保存しました。");
  }

  return <Screen>
    <Heading title="アカウント管理" description="担当者の役割と利用状況を管理します。" />
    <Actions><Badge>担当者</Badge><span>管理者のみ登録・変更・削除が可能</span></Actions>
    {notice && <Notice><span role="status">{notice}</span></Notice>}
    <Panel title="担当者一覧" className={styles.data}>
      <DataTable headings={["担当者", "メールアドレス", "権限", "状態", "操作"]} rows={staff.map((person) => [
        person.name, person.email, person.role, <Badge key="status" tone={person.status === "停止中" ? "waiting" : "default"}>{person.status}</Badge>,
        <Button key="edit" onClick={() => { setDraft(person); setNotice(""); setConfirmation(undefined); }}>編集</Button>,
      ])} />
    </Panel>
    <form onSubmit={prepare}>
      <Panel title="担当者の登録・変更（入力例）">
        <div className={styles.inputs}>
          <Field label="担当者名"><input value={draft.name} required onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
          <Field label="メールアドレス"><input type="email" value={draft.email} required onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></Field>
          <Field label="権限"><select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>
            <option>管理者</option><option>採用担当者</option><option>閲覧のみ</option></select></Field>
        </div>
        {draft.id && <Field label="状態"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
          <option>有効</option><option>停止中</option></select></Field>}
        {error && <Notice tone="error">{error}</Notice>}
        <Actions><Button tone="primary" type="submit">{draft.id ? "変更を確認" : "登録を確認"}</Button>
          {draft.id && <Button onClick={() => { setDraft(empty); setConfirmation(undefined); }}>キャンセル</Button>}</Actions>
        {confirmation && <Notice>
          <p>{confirmation.name}（{confirmation.role}・{confirmation.status}）の設定を保存します。</p>
          <Actions><Button tone="primary" onClick={save}>保存する</Button><Button onClick={() => setConfirmation(undefined)}>戻る</Button></Actions>
        </Notice>}
      </Panel>
    </form>
  </Screen>;
}
