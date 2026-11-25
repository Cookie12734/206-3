"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionLink, Badge, Button, DataTable, Field, Heading, Panel, Screen } from "../_components/screen";
import { useDemoValue } from "../_lib/demo-storage";
import { candidateId, candidatePath, candidateSample, score, type Decision } from "./_lib/candidates";
import styles from "./01-candidates.module.css";

export type CandidateFilter = { keyword?: string; status?: string; order?: string };

export default function Candidates({ filtered = false, original = false, initial }: {
  filtered?: boolean; original?: boolean; initial?: CandidateFilter;
}) {
  const router = useRouter();
  const keyword = initial?.keyword ?? (filtered ? "Python" : "");
  const status = initial?.status ?? (filtered ? "pending" : "");
  const [order, setOrder] = useState(initial?.order ?? "desc");
  const [decision] = useDemoValue<Decision | null>("candidate-decision", null);
  const [retry] = useDemoValue("analysis-retry", false);
  const rows = candidateSample.map((item) => {
    if (item.id === candidateId && decision) return { ...item, score, condition: "すべて充足", status: decision.result };
    if (item.id === "APP-021" && retry) return { ...item, status: "再解析待ち" };
    return item;
  }).filter((item) => {
    const target = [item.id, item.name, item.skills].join(" ").toLowerCase();
    return target.includes(keyword.toLowerCase()) && (
      !status || status === "pending" && ["確認待ち", "再解析待ち"].includes(item.status) ||
      status === "advanced" && item.status === "次選考へ" || status === "error" && item.status === "AI処理エラー" ||
      status === "rejected" && item.status === "見送り"
    );
  }).sort((a, b) => {
    if (a.score === null || b.score === null) return Number(a.score === null) - Number(b.score === null);
    return (a.score - b.score) * (order === "asc" ? 1 : -1);
  });
  const defaultPath = original ? "/candidates/original" : "/candidates";
  const statusLabel = status === "pending" ? "確認待ち" : status === "advanced" ? "次選考へ" : status === "rejected" ? "見送り" : status === "error" ? "AI処理エラー" : "";
  const summary = [["応募総数", 24], ["確認待ち", decision ? 11 : 12], ["次選考へ", decision?.result === "次選考へ" ? 9 : 8], ["処理エラー", retry ? 0 : 1]] as const;

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams({ keyword: String(data.get("keyword")).trim(), status: String(data.get("status")), order });
    router.push(`/candidates/filtered?${params.toString()}`);
  }

  return <Screen>
    <Heading title="候補者一覧" description={original || filtered ? "Webエンジニア / 中途採用　更新：2026/10/20 12:30　すべて架空のサンプル" : "Webエンジニア / 2026年度 中途採用"}
      action={<ActionLink href="/criteria">評価基準を見る</ActionLink>} />
    <dl className={styles.summary}>{summary.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
    <Panel className={styles.tablePanel}>
      <div className={styles.tabs}><nav aria-label="候補者一覧の切り替え">
        <ActionLink href={defaultPath} current={!filtered}>すべての候補者</ActionLink>
        <ActionLink href="/candidates/filtered?keyword=&status=pending" current={filtered && !keyword && status === "pending"}>確認待ち 12件</ActionLink>
      </nav>{filtered && <Link href={defaultPath}>すべてに戻す</Link>}</div>
      <form className={styles.filters} onSubmit={apply} key={`${keyword}:${status}`}>
        <Field label="検索"><input name="keyword" type="search" defaultValue={keyword} placeholder="候補者・スキルで検索" /></Field>
        <Field label="選考状況"><select name="status" defaultValue={status}>
          <option value="">すべて</option><option value="pending">確認待ち</option><option value="advanced">次選考へ</option>
          <option value="error">AI処理エラー</option><option value="rejected">見送り</option>
        </select></Field>
        <Button type="submit" tone="primary">条件を適用</Button>
        <Field label="並び順"><select value={order} onChange={(event) => setOrder(event.target.value)}>
          <option value="desc">スコアの高い順</option><option value="asc">スコアの低い順</option></select></Field>
      </form>
      {filtered && <div className={styles.rowCount}>検索結果：{[keyword, statusLabel].filter(Boolean).join(" / ") || "すべての候補者"}</div>}
      {rows.length ? <DataTable caption="候補者一覧" headings={["順位", "候補者", "スコア", "必須条件", "主要スキル", "選考状況", "操作"]}
        rows={rows.map((candidate, index) => [
          candidate.score === null ? "—" : String(index + 1).padStart(2, "0"),
          <><strong>{candidate.name}</strong><span className={styles.secondaryText}>{candidate.id}</span></>,
          candidate.score === null ? "—" : <span className={styles.score}>{candidate.score}<small>/ 100</small></span>,
          candidate.condition, candidate.skills,
          <Badge key="status" tone={candidate.status === "確認待ち" ? "pending" : candidate.status === "AI処理エラー" ? "error" : candidate.status === "再解析待ち" ? "waiting" : "default"}>{candidate.status}</Badge>,
          candidate.id === candidateId ? <Link href={decision ? `${candidatePath}/decision/complete` : `${candidatePath}/reanalysis`}>詳細を見る →</Link> :
            candidate.id === "APP-021" ? <Link href="/operations">{retry ? "処理ログ →" : "再実行 →"}</Link> : "参考表示",
        ])} /> : <p className={styles.empty}>条件に一致する候補者がありません。</p>}
      <div className={styles.rowCount}><span>{filtered ? `${rows.length}件を表示 / 絞り込み条件を適用中` : "24件中 1〜4件を表示"}</span>{!filtered && <span>1 / 6 ページ</span>}</div>
    </Panel>
    <p className={styles.note}>スコアは選考の参考値です。必須条件と原本を確認したうえで、採用担当者が最終判断します。</p>
    {!original && !filtered && <footer className={styles.metadata}><span>すべて架空のサンプルデータ</span><span>最終更新 2026/10/20 12:30</span></footer>}
  </Screen>;
}
