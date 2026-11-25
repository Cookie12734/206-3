# SALT 開発ルール

このファイルはリポジトリ全体に適用します。開発環境の初期設定と起動手順は [README.md](README.md) を参照してください。

## 作業内容に応じたスキルの実行順

依頼で指定された手順を優先する。以下は標準の順番で、依頼に該当する工程から始め、目的を達成した時点で終了する。

1. **対象を絞る。** 対象画面・操作・期待結果を特定し、該当する仕様と実装だけを読む。Figma の画面をもとに実装する場合は、[Figma MCP での画面取り込み](#figma-mcp-での画面取り込み)に従う。同じ作業中に確認済みの資料や結果は、変更や新しい疑問がある場合に再確認する。
2. **設計を決める。** 新規画面や操作の流れに未決定事項があれば `$impeccable shape` を使う。設計書や Figma で決まっている場合は、その内容で実装に進む。
3. **UI を実装する。** レイアウトや見た目を作るときは `$no-slop-ui` を使い、既存のコンポーネントを優先する。文言の推敲が必要な箇所だけ `$stop-ai-slop-jp` を使う。文章だけの依頼は推敲から始める。
4. **変更を検証する。** ロジックは対象のテストで確認する。表示・操作を確かめる必要があれば、Playwright MCP で変更した箇所と関連する操作を確認する。画面全体のスナップショットの反復取得は避け、見た目の確認が必要な場面でスクリーンショットを使う。修正後はその影響範囲を再確認する。

既存画面の使い勝手のレビューは `$impeccable critique` から始め、依頼された観点を確認する。バックエンドだけの変更など、画面や文言に関係しない作業では、この3スキルと Playwright MCP の呼び出しを省く。

## 画面とAPIのルーティング

| ローカル開発時のURL | 担当 | 現在のルート定義 |
| --- | --- | --- |
| `http://localhost:3000/` | Next.js（画面の表示） | [frontend/app/page.tsx](frontend/app/page.tsx) |
| `http://127.0.0.1:8000/api/health/` | Django（APIの処理） | [backend/config/urls.py](backend/config/urls.py) |

画面を追加するときは、URLに対応するフォルダを `frontend/app/` の下に作り、`page.tsx` を置きます。APIを追加するときは、DjangoのURL設定（`urls.py`）でパスを処理するビューに紐づけます。

たとえばログイン機能を追加する場合、`frontend/app/login/page.tsx` が `/login` の画面を表示し、フォームの送信先としてDjangoに `/api/login/` を追加すると、Djangoが認証を処理します。

## Figma MCP での画面取り込み

Figma の画面を新規実装または変更するときは、実装前に Framelink Figma MCP の `get_figma_data` で対象フレームを読み取ります。

1. 依頼にフレームの URL があれば、ファイルキーを `fileKey` に、URL の `node-id` を `nodeId` に渡します。`node-id=123-456` は `nodeId` に `123:456` と指定します。ファイルやページの URL だけの場合は、指定された画面番号または画面名から対象フレームを探します。ファイルの指定がなければ、[一次選考支援システムの Figma ファイル](https://www.figma.com/design/59LYTnngYnpAqkj8zCAfd5?node-id=0-1)を参照します。
2. 対象フレームのレイアウト、文言、表示状態を確認し、既存の共通コンポーネントと CSS 変数を使って実装します。画面に必要な画像がリポジトリになければ、`download_figma_images` で対象画像を取得します。
3. 実装後は Playwright MCP で画面を開き、Figma の対象フレームと見比べます。依頼に含まれる操作や状態の切り替えも確認します。

## Figma画面番号とファイル名

Figmaに番号が付いている画面を実装するときは、画面本体のファイル名の先頭に、その番号を付けます。番号の先頭のゼロも含めてFigmaの表記に合わせ、`<Figma画面番号>-<画面名>.tsx` の形式にします。画面専用のCSS Modulesを作る場合は、同じ名前で拡張子を `.module.css` にします。

たとえば、Figmaの「01 候補者一覧」を `/candidates` に実装する場合、本体は `frontend/app/candidates/01-candidates.tsx`、専用CSSは `01-candidates.module.css` にします。Next.jsのルート入口は同じフォルダの `page.tsx` に置き、番号付きの画面本体を読み込みます。

画面を追加・変更したら、実装ファイル名の先頭がFigmaの画面番号と一致することを確認します。

## 共通レイアウトとメニュー

- **画面を追加するとき**は、各 `page.tsx` から画面本体を表示します。ヘッダーとサイドメニューは [ルートレイアウト](frontend/app/layout.tsx) が全ページに表示します。
- **共通部分を変更するとき**は、[WorkspaceChrome](frontend/app/_components/workspace-chrome.tsx) と [共通レイアウトのCSS](frontend/app/_components/workspace.module.css) を編集します。ワークスペース名、環境名、利用者の役割はルートレイアウトから渡します。
- **メニューから画面を開けるようにするとき**は、遷移先の `page.tsx` を追加し、[メニュー定義](frontend/app/_components/workspace-navigation.ts) の該当項目に `href` を設定します。たとえば候補者一覧を `/candidates` に作った場合は `href: "/candidates"` を指定します。準備中の項目は `href` を省略すると無効表示になります。現在地の強調とモバイルメニューの開閉は共通部品が担当します。
- **ログアウトを実装するとき**は、ルートレイアウトから `WorkspaceChrome` に `logoutAction` を渡します。

## 色とスタイル

Figmaの共通色は [frontend/app/globals.css](frontend/app/globals.css) の `:root` で管理します。各画面のレイアウトや余白は、その画面のCSS Modulesに書きます。

- 色は用途に合うCSS変数を参照します。たとえば主要ボタンの背景には `var(--color-accent)`、エラー表示には `var(--color-error-text)` と `var(--color-error-surface)` を使います。
- Figmaで新しい色が必要になったら、既存の変数で表せるか確認し、新しい用途なら `:root` に `--color-用途` の形式で追加します。

## APIとデータベース

- 企業データを扱うAPIでは、認証済み担当者や検証済みの公開リンクなどからサーバー側で企業を確定します。アプリ用DB接続で、各トランザクションに企業IDを設定し、役割・担当募集・操作対象も照合します。詳細は [DB設計の補足](docs/database.md) を参照してください。
- スキーマ変更時は、新規環境用の `db/init/` と既存環境用の `db/migrations/` の両方を確認します。実際の `.env`、認証情報、実在する応募者のデータはGit管理の対象外です。

## 変更後の確認

| 変更箇所 | 確認方法（Windows / PowerShell） |
| --- | --- |
| フロントエンド | `frontend/` で `npm.cmd run lint` と `npm.cmd run build` を実行します。 |
| 共通ヘッダー・メニュー | PC幅で本文と現在地表示を確認します。スマートフォン幅ではメニューの開閉、キーボード操作、横方向のはみ出しを確認します。リンクを追加した場合はメニューから遷移先を開きます。 |
| Django | `backend/` で `.\.venv\Scripts\python.exe manage.py check` を実行し、変更したAPIの応答や権限を対象のテストで確認します。 |
| DBスキーマ・企業分離 | [READMEのSQL検証手順](README.md#sqlの動作確認) に従い、使い捨ての開発DBで検証します。 |
