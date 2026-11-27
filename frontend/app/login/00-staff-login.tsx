"use client";

import { useRouter } from "next/navigation";
import { Button, Field, Panel, Screen } from "../_components/screen";
import styles from "./00-staff-login.module.css";

export default function StaffLogin() {
  const router = useRouter();
  return <Screen className={styles.screen}>
    <form className={styles.form} aria-labelledby="staff-login-heading" onSubmit={(event) => {
      event.preventDefault();
      router.push("/candidates");
    }}>
      <Panel className={styles.card}>
        <div>
          <h1 id="staff-login-heading">採用担当者ログイン</h1>
          <p>採用担当者専用の管理画面です。</p>
        </div>
        <Field label="メールアドレス"><input type="email" defaultValue="recruiter@example.com" autoComplete="username" required /></Field>
        <Field label="パスワード"><input type="password" defaultValue="salt-demo" autoComplete="current-password" required /></Field>
        <Button type="submit" tone="primary" className={styles.submit}>ログイン</Button>
      </Panel>
    </form>
    <section className={styles.intro} aria-label="一次選考の流れ">
      <p className={styles.tagline}>一次選考を、<br />根拠の見える判断へ。</p>
      <p>
        応募書類を整理し、評価基準と照らし合わせる。<br />
        採用担当者の確認と判断を支えるワークスペースです。
      </p>
      <ol className={styles.steps}>
        <li><span aria-hidden="true">01</span>応募書類を読み取る</li>
        <li><span aria-hidden="true">02</span>ルールでスコアを算出</li>
        <li><span aria-hidden="true">03</span>根拠を確認し、人が判断</li>
      </ol>
    </section>
  </Screen>;
}
