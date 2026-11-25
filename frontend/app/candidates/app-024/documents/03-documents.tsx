"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, Actions, Button, Field, Heading, Notice, Panel, Screen } from "../../../_components/screen";
import { useDemoValue } from "../../../_lib/demo-storage";
import { candidatePath } from "../../_lib/candidates";
import styles from "../_components/candidate-review.module.css";

export default function Documents() {
  const router = useRouter();
  const [date, setDate] = useDemoValue("document-date", "2022-10");
  const [nextDate, setNextDate] = useState<string>();
  const [, setVerified] = useDemoValue("document-verified", false);
  return <Screen>
    <Heading title="原本と抽出情報を照合" description="候補者 A / APP-024　抽出情報を修正・確認すると、評価を直ちに再計算します。" />
    <Actions><ActionLink href={candidatePath}>スコア詳細へ</ActionLink><span>履歴書.pdf / 2ページ中 2ページ</span></Actions>
    <div className={`${styles.columns} ${styles.equal}`}>
      <Panel title="履歴書.pdf">
        <article className={styles.paper} aria-label="履歴書の記載例">
          <h3>履 歴 書</h3><p>候補者 A（架空の記載例）</p>
          <section><h4>学歴・職歴</h4><p>2021年 3月　情報系専門学校 卒業<br />2023年 4月　サンプル開発株式会社 入社<br />Webアプリケーションの開発を担当</p></section>
          <section><h4>資格・免許</h4><p className={styles.highlight}>2022年10月 基本情報技術者試験 合格</p></section>
          <section><h4>志望動機</h4><p>開発を通じて、日々の業務を改善したいと考えています。</p></section>
        </article>
      </Panel>
      <form onSubmit={(event) => {
        event.preventDefault();
        setDate(nextDate ?? date);
        setVerified(true);
        router.push(candidatePath);
      }}>
        <Panel title="抽出項目の確認">
          <Field label="学歴（確認用情報）"><input value="情報系専門学校 卒業" readOnly /></Field>
          <Field label="開発実務の経験年数"><input value="3年" readOnly /></Field>
          <Field label="資格"><input value="基本情報技術者" readOnly /></Field>
          <Notice tone="warning">資格の取得年月はOCRの確認が必要です。原本では「2022年10月」です。</Notice>
          <Field label="取得年月（修正例）"><input required type="month" value={nextDate ?? date} onChange={(event) => setNextDate(event.target.value)} /></Field>
          <Actions><Button tone="primary" type="submit">確認済みにして詳細へ</Button></Actions>
        </Panel>
      </form>
    </div>
  </Screen>;
}
