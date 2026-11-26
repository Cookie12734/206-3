"use client";

import { ActionLink, Actions, Badge, Button, DataTable, Heading, Notice, Panel, Screen } from "../_components/screen";
import { useDemoValue } from "../_lib/demo-storage";

export default function Operations() {
  const [retry, setRetry] = useDemoValue("analysis-retry", false);
  return <Screen>
    <Heading title="運用・処理ログ" description="AI処理の失敗とデータ管理の状態を確認します。" />
    <Notice tone={retry ? "info" : "error"}>{retry ? "候補者 D の再実行を受け付けました（デモ）。" : "候補者 D のAI解析でエラーが発生しました。書類は保持されています。"}</Notice>
    <Panel title="処理状況">
      <DataTable headings={["対象", "処理", "状態", "最終実行", "操作"]} rows={[
        ["APP-021 / 候補者 D", "AI適合度解析", <Badge key="status" tone={retry ? "waiting" : "error"}>{retry ? "再解析待ち" : "APIタイムアウト"}</Badge>,
          "10/05 10:26", <Button key="retry" disabled={retry} onClick={() => setRetry(true)}>{retry ? "再実行を受付済み" : "再実行する →"}</Button>],
        ["APP-024 / 候補者 A", "OCR・評価計算", "完了", "10/03 14:20", "v1.2 / 86.25点"],
      ]} />
      <p>最新応募の送信から2時間後に再実行できます。確認済み抽出情報は保持します。</p>
    </Panel>
    <Panel title="データ管理（設定例）">
      <DataTable headings={["項目", "設定", "状態"]} rows={[
        ["自動バックアップ", "毎日 02:00 / 応募者・スコアDB", "前回成功"],
        ["保存期間経過後の削除", "365日 / 組織の規程に応じて設定", "有効"],
        ["操作・AI処理ログ", "担当者、日時、処理内容、評価基準の版を記録", "記録中"],
      ]} />
    </Panel>
    <Actions><ActionLink href="/candidates">候補者一覧に戻る</ActionLink></Actions>
  </Screen>;
}
