"use client";

import { ActionLink, Actions, Badge, DataTable, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { useDemoValue } from "../../_lib/demo-storage";
import type { Submission } from "../../apply/_lib/application";
import { sampleId } from "../../surveys/_lib/survey";
import { candidatePath, score, scoreBreakdown } from "../_lib/candidates";
import styles from "./_components/candidate-review.module.css";

export default function ScoreDetails() {
  const [verified] = useDemoValue("document-verified", false);
  const [submission] = useDemoValue<Submission | null>(`application-submitted:mid-career:${sampleId}`, null);
  const currentScore = verified && !submission;
  return <Screen>
    <Heading title="候補者 A" description={currentScore ? "APP-024 / 原本照合済み" : "APP-024 / 更新前の解析結果｜最新の応募内容は再解析待ちです。"} />
    <Actions>
      <ActionLink href="/candidates">一覧に戻る</ActionLink>
      <ActionLink href={`${candidatePath}/documents`}>原本・抽出情報</ActionLink>
      <ActionLink href={`${candidatePath}/${currentScore ? "decision" : "reanalysis"}`} tone="primary">最終判断へ</ActionLink>
    </Actions>
    <div className={styles.columns}>
      <Panel title="評価スコア">
        <strong className={styles.score}>{score} / 100</strong>
        <p className={styles.small}>ルール v1.2 / 2026.10.01</p>
        <ul className={styles.scoreRows}>{scoreBreakdown.map(([label, value, max, level]) => <li key={label}>
          <span>{label}　{value} / {max}（段階{level}）</span><meter value={value} max={max} aria-label={label} />
        </li>)}</ul>
        <p className={styles.small}>計算例：最大配点35 × 評価段階3 ÷ 4 = 26.25点</p>
      </Panel>
      <Panel title="必須条件と判定理由">
        <Badge tone="pending">合否は未確定</Badge>
        <DataTable headings={["必須条件", "抽出内容", "判定"]} rows={[
          ["開発実務 2年以上", "3年 / 職務経歴書 p.1", "YES"],
          ["基本情報技術者", "取得済 / 履歴書 p.2", "YES"],
        ]} />
        <h3>AIによる要約・キーワード</h3>
        <p>Pythonを用いたWeb開発を3年間経験。API設計とSQLによるデータ処理を担当。志望動機に、業務改善への関心が示されています。</p>
        <Notice>根拠：職務経歴書 p.1–2、志望動機欄 / 原本と照合してください。</Notice>
      </Panel>
    </div>
  </Screen>;
}
