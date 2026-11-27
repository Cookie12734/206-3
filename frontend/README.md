# SALT フロントエンド

`npm.cmd run dev` で起動し、`http://localhost:3000/` を開くと採用担当者ログインのデモに進みます。

応募者は案内メールの専用リンク、または選考希望ありのアンケート回答完了画面の「応募手続きへ進む」から入ります。ローカルで応募者ログインを直接確認する場合は、新卒は `http://localhost:3000/apply/new-graduate/login`、中途は `http://localhost:3000/apply/mid-career/login` を開きます。

## 画面の配置

各 URL の `page.tsx` から、同じフォルダにある番号付きの画面本体を読み込みます。複数画面で使う部品とデータ型は、機能内の `_components/` と `_lib/` に置きます。共通レイアウト、フォーム、表は `app/_components/` にあります。

| 機能 | URL | Figma 番号 |
| --- | --- | --- |
| 採用担当者ログイン | `/login` | 00 |
| 候補者一覧・スコア・原本・判断 | `/candidates`、`/candidates/original`、`/candidates/app-024` | 01〜03、05〜06、13、49 |
| 評価基準・帳票・運用・アカウント | `/criteria`、`/reports`、`/operations`、`/accounts` | 04、07〜09、14 |
| 募集と担当者割当 | `/recruitments` | 番号なしの4画面 |
| 応募者ログイン・応募・受付・変更 | `/apply/{new-graduate,mid-career}/login` | 10〜12、15〜16、22〜26、36〜41 |
| アンケート管理・作成・編集 | `/surveys` | 27〜29、47、52、56〜58 |
| アンケート回答・完了 | `/questionnaire/{new-graduate,mid-career}` | 30〜31、42〜46 |
| メール設定・テンプレート | `/mail`、`/surveys/mail/{new-graduate,mid-career}` | 32〜33、50〜51、53〜55 |
| 回答一覧・詳細 | `/answers` | 34〜35、48 |

画面58の入口は `/surveys/missing-new-graduate-mail` です。`/surveys/missing-mid-career-mail`、`/surveys/missing-mail`、`/surveys/published/status` から、ほかの発行状態を確認できます。

UC28・UC47の途中状態は質問エディターの操作で再現できます。直接確認する場合は `/surveys/new` または `/surveys/edit` にクエリを追加します。

| 状態 | `state` の値 |
| --- | --- |
| 記述式・選択式の質問追加、選択肢追加 | `text`、`choice`、`add-option` |
| 選択肢0件、3〜8件 | `options-0`、`options-3` 〜 `options-8` |
| 既存質問の削除 | `remove-first`、`remove-second` |
| 既存質問の選択肢追加・削除 | `append-existing`、`remove-existing`、`remove-option-1` 〜 `remove-option-3` |
| 既存質問の回答形式変更 | `first-choice`、`second-text` |

アンケート設定は同じブラウザー内で共有されます。回答、応募、選考状態などの操作データはタブのセッションに保存します。認証、メール送信、書類送信、AI解析はデモ表示です。
