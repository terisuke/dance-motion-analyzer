# Dance Motion Analyzer Backend

## Phase 1 実装完了

### 実装済み機能

#### ✅ データベース基盤
- SQLAlchemyによるORM設定
- PostgreSQL接続管理
- Alembicマイグレーション設定

#### ✅ データベースモデル
- **User**: ユーザー認証とプロフィール管理
- **DanceSession**: ダンス練習セッション記録
- **AnalysisResult**: AI分析結果の保存

#### ✅ APIエンドポイント
- **認証 (`/api/v1/auth/*`)**
  - ユーザー登録
  - ログイン/ログアウト
  - トークンリフレッシュ
  - 現在のユーザー情報取得

- **分析 (`/api/v1/analysis/*`)**
  - セッション作成/取得
  - Gemini APIによるダンス分析
  - 分析結果の保存と取得
  - ユーザー統計情報

- **ユーザー管理 (`/api/v1/users/*`)**
  - プロフィール取得/更新
  - パスワード変更
  - アカウント管理

## セットアップ手順

### 1. 環境変数の設定

```bash
# .envファイルを作成
cd backend
cp ../.env.template .env

# 必要な環境変数を設定
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Docker PostgreSQLの起動

```bash
# プロジェクトルートから
docker-compose up -d db redis

# または個別に起動
docker run -d \
  --name dance-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=dance_analyzer \
  -p 5432:5432 \
  postgres:15-alpine
```

### 3. Python環境のセットアップ

```bash
# 仮想環境の作成
cd backend
python -m venv venv

# 仮想環境の有効化
# Mac/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt
```

### 4. データベースマイグレーション

```bash
# 初回マイグレーションの作成
alembic revision --autogenerate -m "Initial migration"

# マイグレーションの実行
alembic upgrade head
```

### 5. バックエンドサーバーの起動

```bash
# 開発サーバーの起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API テスト

### 1. ヘルスチェック

```bash
curl http://localhost:8000/
# {"status":"healthy","service":"Dance Motion Analyzer Backend","version":"1.0.0"}
```

### 2. ユーザー登録

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "full_name": "Test User"
  }'
```

### 3. ログイン

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass123"
```

### 4. API ドキュメント

FastAPIの自動生成ドキュメント:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 次のステップ (Phase 2)

- [ ] JWT認証のフロントエンド統合
- [ ] Redisキャッシングの実装
- [ ] Celery非同期タスクの設定
- [ ] WebSocketリアルタイム通信
- [ ] ファイルアップロード機能

## トラブルシューティング

### PostgreSQL接続エラー

```bash
# PostgreSQLが起動していることを確認
docker ps | grep postgres

# ログを確認
docker logs dance-postgres
```

### Alembicエラー

```bash
# データベースを初期化
alembic downgrade base
alembic upgrade head
```

### 依存関係エラー

```bash
# 依存関係を再インストール
pip install --upgrade -r requirements.txt
```