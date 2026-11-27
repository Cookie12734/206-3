"use client";

import { useState } from "react";
import { ActionLink, Actions, Badge, Button, Details, Heading, Notice, Panel, Screen } from "../_components/screen";
import { recruitments } from "../recruitments/_lib/recruitments";
import { activeCriteria, criteriaPath, type CriteriaVersion } from "./_lib/criteria";
import { useCriteria } from "./_lib/use-criteria";
import styles from "./04-criteria.module.css";

export default function CriteriaManagement() {
  const { versions, remove } = useCriteria();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const openings = recruitments.flatMap(job => {
    const latest = activeCriteria(versions, job.id);
    return latest ? [{ job, latest }] : [];
  });

  async function deleteCriteria(name: string, version: CriteriaVersion) {
    if (!window.confirm(`「${name}」の評価基準を削除しますか？\n基準の適用を解除します。過去の版は保存されます。`)) return;
    setError("");
    setStatus("");
    try {
      await remove(version);
      setStatus(`「${name}」の評価基準を削除しました。`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "評価基準を削除できませんでした。");
    }
  }

  return <Screen>
    <Heading title="評価管理" description="募集ごとに評価基準を作成し、適用中の基準と過去の版を確認できます。" />
    {openings.length < recruitments.length && <Actions><ActionLink tone="primary" href="/criteria/new">評価基準を作成</ActionLink></Actions>}
    <Panel title="登録済みの評価基準">
      <span role="status" hidden={!status}>{status}</span>
      {error && <Notice tone="error">{error}</Notice>}
      {openings.length === 0 && <p>登録済みの評価基準がありません。</p>}
      {openings.map(({ job, latest }) => {
        const history = versions.filter(v => v.opening === job.id).reverse();
        return <section key={job.id} className={styles.opening} aria-label={job.name}>
          <h3>{job.name}（{job.type}・{job.year}年度）</h3>
          <Badge>適用中　v1.{latest.number}</Badge>
          <p>{latest.values.description}</p>
          <Actions>
            <ActionLink href={criteriaPath("edit", latest)}>評価基準を編集</ActionLink>
            <Button tone="danger" aria-label={`${job.name}の評価基準を削除`}
              onClick={() => void deleteCriteria(job.name, latest)}>削除</Button>
          </Actions>
          <details className={styles.history}>
            <summary>版履歴（{history.length}件）</summary>
            {history.map(({ number, savedAt, values }) => <section key={number}>
              <h4>v1.{number}　{number === latest.number ? "適用中" : "過去の版"}</h4>
              <Details rows={[
                ...(savedAt ? [["保存日時", new Date(savedAt).toLocaleString("ja-JP")] as [string, string]] : []),
                ["募集職種", values.job], ["募集要項", values.description],
                ["必要経験年数", `${values.years}年`], ["必要資格", values.qualification || "指定なし"],
                ["配点", values.weights.map(w => `${w.title} ${w.points}点`).join(" ／ ")],
              ]} />
            </section>)}
          </details>
        </section>;
      })}
    </Panel>
  </Screen>;
}
