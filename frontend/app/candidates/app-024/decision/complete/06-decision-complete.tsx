"use client";

import { ActionLink, Actions, DataTable, Heading, Notice, Panel, Screen } from "../../../../_components/screen";
import { useDemoValue } from "../../../../_lib/demo-storage";
import { decisionExample, type Decision } from "../../../_lib/candidates";

export default function DecisionComplete() {
  const [decision] = useDemoValue<Decision>("candidate-decision", decisionExample);
  const current = decision ?? decisionExample;
  return <Screen>
    <Heading title="選考結果を登録しました" description="候補者 A / APP-024　担当者の判断と根拠を履歴に残しました。" />
    <Notice>{current.result === "次選考へ" ? "✓ 次選考への進出を登録しました（デモ）。" : `✓ 「${current.result}」を登録しました（デモ）。`}</Notice>
    <Panel title="判定履歴"><DataTable headings={["日時", "担当者", "変更内容", "理由"]} rows={[
      [current.recordedAt, "採用担当者", `確認待ち → ${current.result}`, current.reason],
      ["2026/10/05 10:35", "採用担当者", "原本確認", "資格の取得年月を原本と照合"],
      ["2026/10/03 14:20", "システム", "解析・スコア算出", "ルール v1.2 / 86.25点"],
    ]} /></Panel>
    <Actions><ActionLink href="/candidates" tone="primary">候補者一覧へ</ActionLink><ActionLink href="/reports">選考レポートを見る</ActionLink></Actions>
  </Screen>;
}
