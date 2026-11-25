"use client";

import { ActionLink, Actions, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { useDemoValue } from "../../_lib/demo-storage";
import { defaultCriteria } from "../_lib/criteria";

export default function CriteriaSaved() {
  const [criteria] = useDemoValue("criteria", defaultCriteria);
  return <Screen>
    <Heading title="評価基準を保存しました" description={`${criteria.job} / 中途採用`} />
    <Notice>✓ 評価基準 v1.3 を保存しました（デモ）。</Notice>
    <Panel title="適用内容">
      <p>{criteria.weights.map(({ title, points }) => `${title} ${points}点`).join(" + ")}</p>
      <p>新しい基準は今後の評価に適用されます。既存の判定履歴には、判断時に使用した基準の版を保持します。</p>
      <Actions><ActionLink href="/criteria">基準の編集に戻る</ActionLink><ActionLink href="/candidates" tone="primary">候補者一覧へ</ActionLink></Actions>
    </Panel>
  </Screen>;
}
