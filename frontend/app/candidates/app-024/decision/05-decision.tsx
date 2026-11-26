"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, Actions, Button, Field, Heading, Notice, Panel, Screen } from "../../../_components/screen";
import { useDemoValue } from "../../../_lib/demo-storage";
import type { Submission } from "../../../apply/_lib/application";
import { sampleId } from "../../../surveys/_lib/survey";
import { candidatePath, type Decision } from "../../_lib/candidates";
import styles from "../_components/candidate-review.module.css";

export default function ConfirmDecision() {
  const router = useRouter();
  const [saved, setSaved] = useDemoValue<Decision | null>("candidate-decision", null);
  const [submission] = useDemoValue<Submission | null>(`application-submitted:mid-career:${sampleId}`, null);
  const [chosenResult, setResult] = useState<string>();
  const [writtenReason, setReason] = useState<string>();
  const result = chosenResult ?? saved?.result ?? "";
  const reason = writtenReason ?? saved?.reason ?? "";
  const resultLabel = result === "次選考へ" ? "次選考への進出" : result;
  return <Screen>
    <Heading title="最終判断を確認" description="候補者 A / APP-024　登録前に、根拠と判断内容を確認してください。" />
    <form className={styles.form} onSubmit={(event) => {
      event.preventDefault();
      if (!result || !reason.trim() || submission) return;
      const recordedAt = new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date());
      setSaved({ result, reason: reason.trim(), recordedAt });
      router.push(`${candidatePath}/decision/complete`);
    }}>
      <Panel title="採用担当者による判断">
        <p><strong>候補者 A　/　86.25点</strong></p>
        <fieldset><legend>選考結果（必須）</legend>
          <div className={styles.options}>{["次選考へ", "見送り", "保留"].map((label) =>
            <label key={label}><input type="radio" required name="decision" value={label} checked={result === label}
              onChange={() => setResult(label)} />{label}</label>)}</div>
        </fieldset>
        <Field label="判断理由（必須）"><textarea required aria-describedby="reason-example" value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
        <p id="reason-example" className={styles.small}>記入例：確認した経験・資格と、募集要件に照らして判断した根拠を記載してください。</p>
        <Notice><label className={styles.confirm}><input type="checkbox" required />原本・抽出情報・スコア内訳を確認し、採用担当者として判断します。</label></Notice>
        <p className={styles.small}>記録者：採用担当者　/　参照した評価基準：v1.2</p>
        {submission && <Notice tone="warning">最新の応募内容を解析するまで、最終判断は登録できません。</Notice>}
        <Actions><ActionLink href={candidatePath}>詳細に戻る</ActionLink>
          <Button tone="primary" type="submit" disabled={!result || Boolean(submission)}>{`${resultLabel || "選考結果"}を${saved ? "更新" : "登録"}`}</Button></Actions>
      </Panel>
    </form>
    <Notice>ここで登録した結果はデモ用にブラウザー内へ保存されます。</Notice>
  </Screen>;
}
