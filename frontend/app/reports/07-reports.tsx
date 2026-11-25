"use client";

import { useState } from "react";
import { ActionLink, Actions, Button, DataTable, Field, Heading, Panel, Screen } from "../_components/screen";
import { useDemoValue } from "../_lib/demo-storage";
import { candidatePath, candidateSample, decisionExample, type Decision } from "../candidates/_lib/candidates";
import styles from "./07-reports.module.css";

const sections = ["スコア内訳", "必須条件・判定理由", "担当者と判定日時"];

export default function Reports() {
  const [kind, setKind] = useState("result");
  const [format, setFormat] = useState("PDF");
  const [selection, setSelection] = useState(sections);
  const [decision] = useDemoValue<Decision>("candidate-decision", decisionExample);
  const latest = decision ?? decisionExample;
  const resultRows = [
    ["総合スコア", "86.25 / 100"],
    ...(selection.includes(sections[0]) ? [["スキル / 経験 / 資格 / AI", "26.25 / 30 / 15 / 15"]] : []),
    ...(selection.includes(sections[1]) ? [["必須条件", "2 / 2 充足"]] : []),
    ...(selection.includes(sections[2]) ? [["判断者・基準", "採用担当者 / v1.2"], ["判定日時", latest.recordedAt]] : []),
  ];
  return <Screen>
    <Heading title="帳票出力" description="候補者一覧やスコアの根拠を、用途に合わせて出力します。" />
    <div className={styles.columns}>
      <Panel title="出力設定">
        <Field label="対象の募集"><select><option>Webエンジニア / 2026年度 中途採用</option></select></Field>
        <Field label="出力対象"><select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="result">選考結果レポート</option><option value="list">候補者一覧</option></select></Field>
        <Field label="ファイル形式"><select value={format} onChange={(event) => setFormat(event.target.value)}>
          <option>PDF</option><option>CSV</option></select></Field>
        <div className={styles.options}>{sections.map((label) => <label className={styles.option} key={label}>
          <input type="checkbox" checked={selection.includes(label)} disabled={kind === "list"} onChange={(event) => setSelection(
            event.target.checked ? [...selection, label] : selection.filter((item) => item !== label),
          )} />{label}</label>)}</div>
        <Actions><Button tone="primary" onClick={() => document.getElementById("report-preview")?.focus()}>出力例を確認</Button></Actions>
        <p>このデモでは帳票のプレビューを確認できます。</p>
      </Panel>
      <Panel className={styles.preview} title={kind === "result" ? "選考結果レポート / プレビュー" : "候補者一覧 / プレビュー"}>
        <p tabIndex={-1} id="report-preview">{kind === "result" ? "候補者 A　APP-024" : "Webエンジニア / 2026年度 中途採用"}　{format}</p>
        {kind === "result" ? <>
          <DataTable headings={["項目", "評価"]} rows={resultRows} />
          {selection.includes(sections[1]) && <><h3>判定理由</h3><p>{latest.reason}</p></>}
          <p>サンプル / 2026年10月5日</p>
          <Actions><ActionLink href={`${candidatePath}/decision/complete`}>判定履歴を見る</ActionLink></Actions>
        </> : <DataTable headings={["応募番号", "候補者", "スコア", "選考状況"]}
          rows={candidateSample.map((item) => [item.id, item.name, item.score ?? "—", item.status])} />}
      </Panel>
    </div>
  </Screen>;
}
