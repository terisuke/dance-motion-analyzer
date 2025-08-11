# 環境構築ガイド - Gemini-First開発

## 📋 必要なもの（超シンプル）

### 必須要件
- **Node.js**: 18.0以上
- **Gemini API Key**: [Google AI Studio](https://aistudio.google.com/)で取得（無料）
- **モダンブラウザ**: Chrome/Safari/Edge最新版
- **Webカメラ**: 内蔵または外付け

### 不要なもの ❌
- Python
- Docker  
- データベース
- クラウドサーバー
- 複雑な設定

## 🚀 30秒セットアップ

### Option 1: AI Studioで自動生成（推奨）

```bash
# 1. Google AI Studioにアクセス
open https://aistudio.google.com/

# 2. "Build"セクションを選択

# 3. プロンプトを貼り付け（docs/ai-studio-prompt-youtube.md）

# 4. 生成されたコードをダウンロード

# 5. 展開して起動
cd generated-app
npm install
npm start
```

### Option 2: このリポジトリを使用

```bash
# 1. クローン
git clone https://github.com/your-org/dance-motion-analyzer.git
cd dance-motion-analyzer

# 2. 依存関係インストール（30秒）
npm install

# 3. 環境変数設定（10秒）
echo "REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here" > .env

# 4. 起動（10秒）
npm start
```

完了！🎉 `http://localhost:3000` で起動します。

## 🔑 Gemini APIキーの取得

### ステップ1: Google AI Studioアクセス
```bash
open https://aistudio.google.com/
```

### ステップ2: APIキー作成
1. 右上の「Get API Key」をクリック
2. 「Create API Key」を選択
3. キーをコピー

### ステップ3: 環境変数設定
```bash
# .envファイル作成
REACT_APP_GEMINI_API_KEY=AIzaSy...（コピーしたキー）
```

## 📁 最小限のプロジェクト構造

```
dance-motion-analyzer/
├── src/
│   ├── App.tsx              # メインアプリ
│   ├── hooks/
│   │   ├── useGeminiCoach.ts    # Gemini API
│   │   └── usePoseDetection.ts  # MediaPipe
│   └── components/
│       ├── YouTubePlayer.tsx    # YouTube埋め込み
│       └── WebcamCapture.tsx    # カメラ
├── .env                     # APIキー
├── package.json            # 依存関係
└── README.md               # ドキュメント
```

## 🎮 開発サーバーコマンド

```bash
# 開発サーバー起動
npm start

# ビルド（本番用）
npm run build

# テスト実行
npm test

# コード整形
npm run format
```

## 📦 package.json（最小構成）

```json
{
  "name": "dance-motion-analyzer",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mediapipe/pose": "^0.5.0",
    "@google/generative-ai": "^0.1.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "browserslist": {
    "production": [">0.2%", "not dead"],
    "development": ["last 1 chrome version"]
  }
}
```

## 🌍 即座にデプロイ

### Vercelでデプロイ（3分）

```bash
# 1. Vercel CLIインストール
npm i -g vercel

# 2. デプロイ
vercel

# 3. 環境変数設定
vercel env add REACT_APP_GEMINI_API_KEY

# 完了！URLが表示されます
```

### Netlifyでデプロイ（代替）

```bash
# 1. ビルド
npm run build

# 2. Netlify CLIインストール
npm i -g netlify-cli

# 3. デプロイ
netlify deploy --dir=build --prod

# 4. 環境変数はダッシュボードで設定
```

## 🔧 トラブルシューティング

### よくある問題と即座の解決

#### 1. "Gemini API Key Invalid"
```bash
# APIキーを再確認
echo $REACT_APP_GEMINI_API_KEY

# .envファイルを再読み込み
npm start
```

#### 2. "Camera access denied"
```javascript
// ブラウザ設定でカメラを許可
// Chrome: chrome://settings/content/camera
```

#### 3. "YouTube video not playing"
```javascript
// CORS問題の場合、ローカルサーバーで実行
npm start  # localhost:3000で動作
```

#### 4. MediaPipeロードエラー
```javascript
// CDNから直接読み込み
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>
```

## 🚀 クイックスタート例

### 最小限の動作確認コード

```typescript
// App.tsx
import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

function App() {
  const [feedback, setFeedback] = useState('');
  
  const analyzeDance = async () => {
    const genAI = new GoogleGenerativeAI(
      process.env.REACT_APP_GEMINI_API_KEY!
    );
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });
    
    const result = await model.generateContent(
      "ダンスの基本的なアドバイスをください"
    );
    
    setFeedback(result.response.text());
  };
  
  return (
    <div>
      <h1>Dance Analyzer</h1>
      <button onClick={analyzeDance}>分析開始</button>
      <p>{feedback}</p>
    </div>
  );
}

export default App;
```

## 💡 開発のヒント

### パフォーマンス最適化
```javascript
// 画像圧縮でAPI呼び出しを高速化
canvas.toDataURL('image/jpeg', 0.7); // 70%品質

// フレームスキップで負荷軽減
if (frameCount++ % 3 === 0) {
  // 3フレームごとに処理
}
```

### デバッグ方法
```javascript
// Gemini APIレスポンス確認
console.log('Gemini Response:', response.text());

// MediaPipeデバッグ
window.MEDIAPIPE_DEBUG = true;
```

## 📊 推奨開発環境

### VS Code拡張機能
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets"
  ]
}
```

### Chrome拡張機能
- React Developer Tools
- Gemini API Tester（カスタム）

## 🎯 次のステップ

1. **基本動作確認**
   - YouTube URL入力
   - カメラ起動
   - Gemini API応答確認

2. **カスタマイズ**
   - UIデザイン調整
   - フィードバック頻度変更
   - 言語設定

3. **公開**
   - Vercelデプロイ
   - カスタムドメイン設定
   - アナリティクス追加

## 📚 参考リンク

- [Gemini API Docs](https://ai.google.dev/docs)
- [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose)
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)
- [React Docs](https://react.dev/)

---

**重要**: このプロジェクトはサーバー不要！Gemini APIキーさえあれば、すぐに動作します。

*最終更新: 2025年1月*
