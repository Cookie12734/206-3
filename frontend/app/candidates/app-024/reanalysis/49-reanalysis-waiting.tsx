"use client";

import { ActionLink, Actions, Badge, Details, Heading, Notice, Panel, Screen } from "../../../_components/screen";
import { useDemoValue } from "../../../_lib/demo-storage";
import type { Submission } from "../../../apply/_lib/application";
import { sampleId } from "../../../surveys/_lib/survey";
import { candidatePath } from "../../_lib/candidates";

export default function ReanalysisWaiting() {
  const [submission] = useDemoValue<Submission | null>(`application-submitted:mid-career:${sampleId}`, null);
  const docs = submission ? [submission.application.resume?.name, submission.application.history?.name].filter(Boolean).join("、") : "履歴書_修正版.pdf、職務経歴書.pdf";
  return <Screen>
    <Heading title="応募内容の再解析を待っています" description="候補者 A / APP-024｜Webエンジニア / 中途採用" />
    <Panel title="最新の応募内容">
      <Details rows={[
        ["最終送信日時", submission?.sentAt ?? "2026/10/20 12:30"],
        ["解析予定日時", submission?.scheduledAt ?? "2026/10/20 14:30"],
        ["現在のスコア", <Badge key="status" tone="waiting">再解析待ち</Badge>], ["提出書類", docs],
      ]} />
      <Notice>応募内容が更新されました。最新の解析が完了するまで、更新前のスコアは順位付け・判断に使用しません。</Notice>
      <p>再送信があった場合は、新しい最終送信日時から2時間後へ予約を更新します。</p>
    </Panel>
    <Actions><ActionLink href="/candidates">候補者一覧へ戻る</ActionLink><ActionLink href={candidatePath}>前回の評価を確認</ActionLink></Actions>
  </Screen>;
}
