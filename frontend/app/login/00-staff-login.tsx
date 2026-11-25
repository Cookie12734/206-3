"use client";

import { useRouter } from "next/navigation";
import { ActionLink, Actions, Button, Field, Heading, Panel, Screen } from "../_components/screen";
import styles from "./00-staff-login.module.css";

export default function StaffLogin() {
  const router = useRouter();
  return <Screen>
    <Heading title="採用担当者ログイン" description="デモアカウントで画面の流れを確認できます。" />
    <div className={styles.layout}>
      <form aria-label="採用担当者ログイン" onSubmit={(event) => { event.preventDefault(); router.push("/candidates"); }}>
        <Panel>
          <Field label="メールアドレス"><input type="email" defaultValue="recruiter@example.com" autoComplete="username" required /></Field>
          <Field label="パスワード"><input type="password" defaultValue="salt-demo" autoComplete="current-password" required /></Field>
          <Actions><Button type="submit" tone="primary">ログイン</Button></Actions>
        </Panel>
      </form>
      <div className={styles.help}>
        <Panel title="一次選考の流れ">
          <p>応募書類を整理し、評価基準と照らし合わせる。採用担当者の確認と判断を支えるワークスペースです。</p>
          <ol className={styles.steps}><li>応募書類を読み取る</li><li>ルールでスコアを算出</li><li>根拠を確認し、人が判断</li></ol>
        </Panel>
        <Panel title="応募者の方はこちら">
          <Actions><ActionLink href="/apply/mid-career/login">中途の応募フォーム</ActionLink>
            <ActionLink href="/apply/new-graduate/login">新卒の応募フォーム</ActionLink></Actions>
        </Panel>
      </div>
    </div>
  </Screen>;
}
