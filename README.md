# 206-3
AIを活用した一次選考支援システム

## 開発用データベース

Docker ComposeでPostgreSQL 18.7を起動します。初回起動時に、テーブル設計書に基づく25テーブルを自動作成します。各メンバーのPCに同じ構成のDBを用意するための設定で、保存データ自体はメンバー間で共有されません。

### ファイル構成

```text
docker-compose.yml             PostgreSQLの起動・永続化・ヘルスチェック
.env.example                   個人用設定のひな形
db/init/001_create_tables.sql   テーブル・制約・索引の作成
db/tests/schema_smoke.sql      保存と制約の動作確認（初期化時には実行しない）
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

今後アプリのコンテナを追加する場合は、`depends_on`の`condition: service_healthy`でDBの起動完了を待つようにします。この構成のDBユーザーは公式イメージが作る管理ユーザーです。本番用の権限設計・公開設定は別途用意します。

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

残したいデータがある場合は削除せず、変更用のマイグレーションSQLを別途作成・共有してください。初期化SQLは空のDB専用で、既存DBへの再実行は想定していません。

初期化SQLがエラーになった場合は`docker compose logs db`で原因を確認してください。SQLを直すだけでは途中まで作成されたデータ領域を再初期化できないため、使い捨ての開発DBなら上記の手順で作り直します。

`.env`のDB名・ユーザー・パスワードも初期化時に使用されます。作成済みのDBに対し`.env`を書き換えるだけでは、DB内の認証情報は変更されません。

### SQLの動作確認

使い捨ての開発DBで、次のコマンドを実行できます。25テーブルをつないだ保存と18種類の不正データの拒否を確認します。テストデータは最後にロールバックしますが、IDの採番値は進みます。

```sh
docker compose cp db/tests/schema_smoke.sql db:/tmp/schema_smoke.sql
docker compose exec db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/schema_smoke.sql'
```

`PASS`と`ROLLBACK`が表示されれば成功です。このテストは、[DB設計の補足](docs/database.md)に記載したアプリ側の業務検証を代替するものではありません。

### GitHubでの管理

Compose設定・初期化SQL・`.env.example`・ドキュメントをコミットします。`.env`、DBの実データ、実在する応募者のデータや認証情報はコミットしません。DBの変更時は、初期化SQLと既存環境向けマイグレーションの両方をチームで確認してください。

PostgreSQLのバージョンは`docker-compose.yml`の`18.7-bookworm`に固定しています。更新時は全員で同じタグに変更し、メジャーバージョンを上げる際は既存ボリュームの移行方法も確認します。

仕様の根拠とアプリ実装時の注意点は[DB設計の補足](docs/database.md)を参照してください。
