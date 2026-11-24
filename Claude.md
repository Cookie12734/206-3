### 画面とAPIのルーティング

| ローカル開発時のURL | 担当 | 現在のルート定義 |
| --- | --- | --- |
| `http://localhost:3000/` | Next.js（画面の表示） | [frontend/app/page.tsx](frontend/app/page.tsx) |
| `http://127.0.0.1:8000/api/health/` | Django（APIの処理） | [backend/config/urls.py](backend/config/urls.py) |

画面を追加するときは、URLに対応するフォルダを `frontend/app/` の下に作り、`page.tsx` を置きます。APIを追加するときは、DjangoのURL設定（`urls.py`）でパスを処理するビューに紐づけます。

たとえばログイン機能を追加する場合、`frontend/app/login/page.tsx` が `/login` の画面を表示し、フォームの送信先としてDjangoに `/api/login/` を追加すると、Djangoが認証を処理します。
