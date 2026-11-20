# 206-3
AIを活用した一次選考支援システム

## ローカル開発環境

Django 5.2 LTS は `backend/`、Next.js（TypeScript・App Router・CSS Modules）は `frontend/` にあります。PostgreSQL は既存の Docker Compose で起動します。Windows では [Python 3.14.10](https://www.python.org/downloads/release/python-31410/#files)、Node.js 24 LTS、Docker Desktop を用意します。以下は PowerShell の例です。

### PostgreSQL

リポジトリ直下で実行します。初回はコピーした `.env` の `POSTGRES_PASSWORD` を自分の開発用パスワードに変更してから DB を起動します。

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

```powershell
docker compose up -d --wait
```

初回のみ、管理接続でアプリ用の `salt_web` を作成します。`-U` と `-d` の値はルートの `.env` の `POSTGRES_USER` と `POSTGRES_DB` に合わせます（下記はひな形の値です）。

```powershell
docker compose exec db psql -U salt -d salt
```

```sql
CREATE ROLE salt_web LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
    NOREPLICATION NOBYPASSRLS IN ROLE salt_app;
\password salt_web
\q
```

すでに作成済みの場合は、既存の `salt_web` とパスワードを使用します

### Django

リポジトリ直下から実行します。`python --version` で `Python 3.14.10` と表示されることを確認してください。複数のバージョンが入っている場合は、`py -3.14 --version` で同じ表示を確認し、下記の `python -m venv .venv` を `py -3.14 -m venv .venv` に置き換えられます。

既存の `.venv` が Python 3.13 で作られている場合は、Django を停止し、仮想環境を有効化していれば `deactivate` します。`backend/` に移動してから `Rename-Item .venv .venv-python313` で別名に退避し、新しい仮想環境を作ります。退避先がすでにある場合は別名を選びます。

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

初回は次のコマンドで開発用のキーを生成し、`backend/.env` の `DJANGO_SECRET_KEY` に設定します。`DB_PASSWORD` は `salt_web` のパスワード、`DB_NAME` と `DB_PORT` はルートの `.env` と同じ値に設定します。

```powershell
.\.venv\Scripts\python.exe -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

`backend/.env` で `#` などを含む値は、たとえば `DJANGO_SECRET_KEY='生成した値'` のように引用符で囲めます。

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver
```

別の端末で `Invoke-RestMethod http://127.0.0.1:8000/api/health/` を実行し、`status` が `ok` なら Django から PostgreSQL に接続できています。初回の `migrate` は既存の `staff` と Django の認証をどう接続するか決めた後、スキーマ変更用の接続で実行します。移行前は開発サーバーに未適用のマイグレーション警告が出ます。[企業分離と実行時の権限](docs/database.md#アプリ用の接続と企業context)も参照してください。

### Next.js

別の PowerShell を開き、リポジトリ直下から実行します。

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

`http://localhost:3000/` で SALT の初期画面を確認できます。`npm.cmd run lint` と `npm.cmd run build` でコードとビルドを確認できます。

ルートと `backend/` の実際の `.env` は、メンバーごとのローカル設定です。AWS の認証情報は S3・Textract を組み込む段階で設定します。

## 開発用データベース

Docker ComposeでPostgreSQL 18.7を起動します。初回起動時に、2026/11/17改訂のテーブル設計書に基づく26テーブルを自動作成します。企業テーブルと、企業ID・複合外部キー・RLSによる企業別のデータ分離を含みます。各メンバーのPCに同じ構成のDBを用意するための設定で、保存データ自体はメンバー間で共有されません。

### ファイル構成

```text
docker-compose.yml             PostgreSQLの起動・永続化・ヘルスチェック
.env.example                   個人用設定のひな形
db/init/001_create_tables.sql   26テーブル・制約・索引の作成
db/init/shared/tenant_security.sql  RLS・アプリ権限・企業ID変更禁止（上記から読込）
db/migrations/001_add_companies.sql 旧25テーブルからの単一企業データ移行
db/scripts/create_company_admin.sql 企業と初期リーダーの一括登録
db/tests/schema_smoke.sql      保存・制約・企業分離の動作確認
db/tests/tenant_isolation.sql  上記テストから読み込む企業分離テスト
docs/database.md               設計書との対応、アプリ側の検証事項
```

### 初回起動

Docker Desktopを起動し、Linuxコンテナを使用してください。このREADMEがあるディレクトリで実行します。

```powershell
Copy-Item .env.example .env
```

`.env`の`POSTGRES_PASSWORD`を自分の開発環境用の値に変更します。`.env`はGit管理対象外です。すでに`.env`がある場合は上書きせず、必要な変数を追加してください。

macOS / Linuxではコピーに`cp .env.example .env`を使用します。

```sh
docker compose up -d --wait
docker compose ps
docker compose logs db
```

`db`が`healthy`になれば起動完了です。初回はイメージのダウンロードと初期化に時間がかかります。テーブル一覧は次のコマンドで確認できます。

```sh
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt public.*"'
```

初期ユーザーやサンプルデータは登録しません。`POSTGRES_USER`はDB接続用ユーザーであり、アプリの`staff`テーブルに登録する採用担当者とは別です。設計書の初期値が空欄の日時項目などは、INSERT時にアプリから指定します。

### 接続設定

| 項目 | PC上のアプリ・DBクライアントから | 同じCompose内の別コンテナから |
| --- | --- | --- |
| ホスト | `127.0.0.1` | `db` |
| ポート | `.env`の`POSTGRES_PORT`（初期値`5432`） | `5432` |
| データベース | `.env`の`POSTGRES_DB`（例：`salt`） | 同左 |
| ユーザー | `.env`の`POSTGRES_USER`（例：`salt`） | 同左 |
| パスワード | `.env`の`POSTGRES_PASSWORD` | 同左 |

文字コードはUTF8、DBの既定タイムゾーンは`Asia/Tokyo`です。ホストへのポート公開は`127.0.0.1`に限定しています。別のDBが5432番を使用している場合は、`.env`の`POSTGRES_PORT`を`5433`などに変更してください。

この接続表の`POSTGRES_USER`は、初期化・移行・運営スクリプト用の管理ユーザーです。通常のアプリ接続には使用しません。初期化SQLは、RLSが適用される`NOLOGIN`の権限ロール`salt_app`を作ります。アプリ専用のログインロール作成と、企業IDをトランザクション内に設定する手順は[DB設計の補足](docs/database.md#アプリ用の接続と企業context)を参照してください。

今後アプリのコンテナを追加する場合は、`depends_on`の`condition: service_healthy`でDBの起動完了を待つようにします。

### 停止と再開

```sh
docker compose down
docker compose up -d --wait
```

データは名前付きボリュームに残ります。コンテナを作り直しても保持されます。

### SQLを変更した場合

`db/init`のSQLは、データ領域が空の初回だけ実行されます。GitからSQLの変更を取得したり、コンテナを再起動したりするだけでは、既存DBには反映されません。

開発データを捨ててよい場合だけ、以下でDBを作り直します。**このComposeプロジェクトのボリュームと保存データを削除します。**

```sh
docker compose down --volumes
docker compose up -d --wait
```

残したいデータがある場合は削除せず、[旧25テーブルからの移行手順](docs/database.md#旧25テーブルからの移行)を使用してください。用意した移行SQLは、既存データがすべて同一企業に属することを確認した場合専用です。企業が混在しているデータには、所属先の対応表を使う移行が別途必要です。初期化SQLは空のDB専用で、既存DBへの再実行は想定していません。

初期化SQLがエラーになった場合は`docker compose logs db`で原因を確認してください。SQLを直すだけでは途中まで作成されたデータ領域を再初期化できないため、使い捨ての開発DBなら上記の手順で作り直します。

`.env`のDB名・ユーザー・パスワードも初期化時に使用されます。作成済みのDBに対し`.env`を書き換えるだけでは、DB内の認証情報は変更されません。

### SQLの動作確認

使い捨ての開発DBで、管理ユーザーから次のコマンドを実行できます。A社・B社の26テーブルをつないだ保存、従来の18種類の不正データ、企業間の参照・閲覧・更新・削除の拒否、企業停止、接続の企業IDリセットを確認します。テストデータは最後にロールバックしますが、IDの採番値は進みます。

```sh
docker compose cp db db:/tmp
docker compose exec db sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/db/tests/schema_smoke.sql'
```

各検証の`PASS`、`ROLLBACK`、最後の企業IDリセットの`PASS`が表示されれば成功です。このテストは、[DB設計の補足](docs/database.md)に記載した役割・担当募集・ファイル・外部送信などのアプリ側検証を代替するものではありません。

### GitHubでの管理

Compose設定・初期化SQL・`.env.example`・ドキュメントをコミットします。`.env`、DBの実データ、実在する応募者のデータや認証情報はコミットしません。DBの変更時は、初期化SQLと既存環境向けマイグレーションの両方をチームで確認してください。

PostgreSQLのバージョンは`docker-compose.yml`の`18.7-bookworm`に固定しています。更新時は全員で同じタグに変更し、メジャーバージョンを上げる際は既存ボリュームの移行方法も確認します。

仕様の根拠とアプリ実装時の注意点は[DB設計の補足](docs/database.md)を参照してください。
