"use client";

import { ActionLink, Actions, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { recruitments } from "../../recruitments/_lib/recruitments";
import { activeCriteria, criteriaPath } from "../_lib/criteria";
import { useCriteria } from "../_lib/use-criteria";

export default function CriteriaSaved({ opening, version }: { opening?: string; version: number }) {
  const { versions } = useCriteria();
  const saved = versions.find(v => v.opening === opening && v.number === version);
  const latest = activeCriteria(versions, opening);
  const job = recruitments.find(item => item.id === opening);
  if (!saved || !job) return <Screen>
    <Heading title="評価基準の確認" /><Notice>確認する版を評価管理から選んでください。</Notice>
    <Actions><ActionLink href="/criteria">評価管理に戻る</ActionLink></Actions>
  </Screen>;
  return <Screen>
    <Heading title="評価基準を保存しました" description={`${job.name}（${job.type}・${job.year}年度）`} />
    <Notice>評価基準 v1.{saved.number} を保存しました。</Notice>
    <Panel title="適用内容">
      <p>{saved.values.weights.map(({ title, points }) => `${title} ${points}点`).join(" + ")}</p>
      <p>{latest?.number === saved.number
        ? "新しい基準は今後の評価に適用されます。既存の判定履歴には、判断時に使用した基準の版を保持します。"
        : "この版は履歴に保存されています。"}</p>
      <Actions><ActionLink href="/criteria" tone="primary">評価管理に戻る</ActionLink>{latest && <ActionLink href={criteriaPath("edit", latest)}>最新版を編集</ActionLink>}<ActionLink href="/candidates">候補者一覧へ</ActionLink></Actions>
    </Panel>
  </Screen>;
}
