# 🚀 Dance Motion Analyzer - クイックスタートガイド

## 📋 前提条件

- Docker Desktop がインストールされていること
- Git がインストールされていること
- Gemini API キーを取得済みであること（[Google AI Studio](https://makersuite.google.com/app/apikey)）

## 🎯 最速セットアップ（5分で起動）

### 1. リポジトリをクローン

```bash
git clone https://github.com/terisuke/dance-motion-analyzer.git
cd dance-motion-analyzer
```

### 2. 環境変数を設定

```bash
# .envファイルを作成
cp .env.template .env

# .envファイルを編集（任意のエディタで開く）
# GEMINI_API_KEY=your_actual_api_key_here に変更
```

### 3. Docker Composeで起動

```bash
docker compose up --build
```

### 4. アプリケーションにアクセス

起動が完了したら、以下のURLにアクセス：

- 🎮 **フロントエンド**: http://localhost:3000
- 🔧 **バックエンドAPI**: http://localhost:8000
- 📚 **APIドキュメント**: http://localhost:8000/docs

## 🎮 使い方

1. http://localhost:3000 にアクセス
2. YouTube URLを入力（ダンス動画のURL）
3. 「動画を設定」をクリック
4. カメラを許可して、動画に合わせて踊る
5. リアルタイムでAIフィードバックを確認

## 🛠 トラブルシューティング

### Docker Composeが起動しない

```bash
# 一度クリーンアップ
docker compose down
docker system prune -f

# 再度起動
docker compose up --build
```

### ポートが使用中のエラー

```bash
# 使用中のポートを確認
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :5432  # PostgreSQL

# 必要に応じてプロセスを終了
kill -9 <PID>
```

### APIキーエラー

- `.env`ファイルのGEMINI_API_KEYが正しく設定されているか確認
- APIキーが有効であることを確認（[Google AI Studio](https://makersuite.google.com/app/apikey)）

## 🔄 サービスの個別起動

### データベースのみ起動（バックエンド開発用）

```bash
docker compose up db redis -d
```

### フロントエンドのみ起動

```bash
docker compose up frontend
```

### バックエンドのみ起動

```bash
docker compose up backend
```

## 📦 開発環境（Docker使わない場合）

### フロントエンド

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173 でアクセス
```

### バックエンド

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# http://localhost:8000 でアクセス
```

## 🧹 クリーンアップ

```bash
# コンテナとボリュームを削除
docker compose down -v

# すべてのDockerリソースをクリーンアップ
docker system prune -af
```

## 📝 その他の情報

- [詳細なREADME](README.md)
- [バックエンド設定](backend/README.md)
- [スコアリング改善について](docs/scoring-improvements.md)

## 💡 ヒント

- **初回起動時**: ビルドに5-10分かかることがあります
- **2回目以降**: キャッシュが効くため30秒程度で起動します
- **開発時**: ファイル変更は自動的に反映されます（ホットリロード）

## 🆘 サポート

問題が解決しない場合は、[GitHub Issues](https://github.com/terisuke/dance-motion-analyzer/issues) で報告してください。