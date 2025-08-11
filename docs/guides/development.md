# 開発ガイド - AIファースト開発手法

## 📖 Gemini-First開発哲学

### 従来の開発 vs AIファースト開発

| 観点 | 従来 | AIファースト |
|------|------|-------------|
| **アプローチ** | ボトムアップ（詳細から構築） | トップダウン（AI活用から設計） |
| **複雑性** | 複雑なロジック実装 | AIに委譲 |
| **開発時間** | 週〜月単位 | 時間〜日単位 |
| **コード量** | 数千行 | 数百行 |
| **メンテナンス** | 継続的な更新必要 | AI改善で自動向上 |

## 🚀 開発フロー

### 1. AI Studioでプロトタイプ生成（Day 0）

```bash
# プロンプトでアプリ全体を生成
1. docs/ai-studio-prompt-youtube.md を使用
2. AI Studioで生成
3. ローカルで動作確認
```

### 2. カスタマイズ（Day 1）

```typescript
// 生成されたコードをカスタマイズ
// 例: フィードバックの日本語化強化

const improvedPrompt = `
  あなたは日本のプロダンスインストラクターです。
  以下の観点で分析してください：
  
  1. リズム感（ビートとの同期）
  2. アイソレーション（部位別の動き）
  3. グルーヴ（全体の流れ）
  4. パワー（動きの強さ）
  5. オリジナリティ（個性）
  
  K-POPダンス特有の「ポイント振付」にも言及してください。
`;
```

### 3. デプロイ（Day 1）

```bash
# 即座に公開
vercel --prod
```

## 🎯 コーディング規約（シンプル版）

### TypeScript/React

```typescript
// ✅ Good: シンプルで読みやすい
const DanceCoach: React.FC = () => {
  const [score, setScore] = useState(0);
  const { analyze } = useGeminiCoach();
  
  const handleAnalysis = async () => {
    const result = await analyze();
    setScore(result.score);
  };
  
  return <div>{score}</div>;
};

// ❌ Bad: 不要な複雑性
class ComplexDanceAnalyzer extends Component {
  // 100行のロジック...
}
```

### Gemini API活用パターン

```typescript
// パターン1: シンプルな分析
const simpleAnalysis = async (imageData: string) => {
  const prompt = "この動きを評価してください";
  return await gemini.analyze(prompt, imageData);
};

// パターン2: コンテキスト付き分析
const contextualAnalysis = async (
  youtubeUrl: string,
  timestamp: number,
  imageData: string
) => {
  const prompt = `
    YouTube: ${youtubeUrl}
    時間: ${timestamp}秒
    この時点の動きと比較してください
  `;
  return await gemini.analyze(prompt, imageData);
};

// パターン3: 構造化出力
const structuredAnalysis = async (data: string) => {
  const prompt = `
    以下のJSON形式で回答してください：
    {
      "score": 0-100の数値,
      "feedback": "文字列"
    }
  `;
  const result = await gemini.analyze(prompt, data);
  return JSON.parse(result);
};
```

## 🧪 テスト戦略（最小限）

### 1. Gemini API モックテスト

```typescript
// __tests__/gemini.test.ts
jest.mock('@google/generative-ai');

test('Gemini分析が正しく動作する', async () => {
  const mockAnalyze = jest.fn().mockResolvedValue({
    score: 85,
    feedback: 'Great!'
  });
  
  const result = await mockAnalyze();
  expect(result.score).toBe(85);
});
```

### 2. UIスナップショットテスト

```typescript
// __tests__/App.test.tsx
import { render } from '@testing-library/react';

test('UIが正しくレンダリングされる', () => {
  const { container } = render(<App />);
  expect(container).toMatchSnapshot();
});
```

### 3. E2Eテスト（オプション）

```typescript
// e2e/dance.spec.ts
test('ダンス分析フロー', async ({ page }) => {
  await page.goto('/');
  await page.fill('#youtube-url', 'https://youtube.com/...');
  await page.click('#start-camera');
  await expect(page.locator('#score')).toBeVisible();
});
```

## 🔍 デバッグテクニック

### Gemini APIデバッグ

```typescript
// デバッグ用ラッパー
class GeminiDebugger {
  private enableLogging = true;
  
  async analyze(prompt: string, image: string) {
    console.group('🤖 Gemini API Call');
    console.log('Prompt:', prompt.slice(0, 100) + '...');
    console.log('Image size:', image.length);
    console.time('API Response Time');
    
    try {
      const result = await gemini.generateContent([prompt, image]);
      console.log('Response:', result.response.text().slice(0, 200));
      return result;
    } finally {
      console.timeEnd('API Response Time');
      console.groupEnd();
    }
  }
}
```

### MediaPipeデバッグ

```javascript
// ビジュアルデバッグ
function debugPose(landmarks) {
  // キーポイントを大きく表示
  landmarks.forEach((point, i) => {
    ctx.fillStyle = 'red';
    ctx.font = '12px Arial';
    ctx.fillText(i.toString(), point.x * width, point.y * height);
  });
}
```

## 📈 パフォーマンス最適化

### 1. Gemini API最適化

```typescript
// バッチ処理で効率化
class GeminiBatcher {
  private queue: Request[] = [];
  private processing = false;
  
  async add(request: Request) {
    this.queue.push(request);
    if (!this.processing) {
      this.process();
    }
  }
  
  private async process() {
    this.processing = true;
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 5); // 5件ずつ
      await Promise.all(batch.map(r => this.executeRequest(r)));
      await this.delay(1000); // レート制限対策
    }
    this.processing = false;
  }
}
```

### 2. React最適化

```typescript
// メモ化で再レンダリング削減
const VideoPlayer = memo(({ url }) => {
  return <YouTube url={url} />;
});

// 遅延ロード
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Virtual Scrolling for履歴
import { FixedSizeList } from 'react-window';
```

### 3. 画像最適化

```typescript
// 画像圧縮パイプライン
class ImagePipeline {
  static async optimize(canvas: HTMLCanvasElement): Promise<string> {
    // 1. リサイズ
    const resized = this.resize(canvas, 640, 480);
    
    // 2. 圧縮
    const compressed = await this.compress(resized, 0.7);
    
    // 3. Base64変換
    return this.toBase64(compressed);
  }
  
  private static resize(
    canvas: HTMLCanvasElement,
    maxWidth: number,
    maxHeight: number
  ): HTMLCanvasElement {
    // リサイズロジック
  }
}
```

## 🚀 CI/CD（超シンプル版）

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: vercel/action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## 🎨 UI/UX開発

### Tailwind CSS活用

```tsx
// コンポーネント例
const ScoreDisplay = ({ score }: { score: number }) => (
  <div className="
    bg-gradient-to-r from-purple-500 to-pink-500
    text-white text-6xl font-bold
    rounded-2xl p-8 shadow-2xl
    transform hover:scale-105 transition-all
  ">
    {score}
    <span className="text-2xl">/100</span>
  </div>
);
```

### アニメーション

```css
/* Framer Motion使用 */
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  {feedback}
</motion.div>
```

## 📊 分析とモニタリング

### Google Analytics 4

```typescript
// イベントトラッキング
gtag('event', 'dance_analysis', {
  youtube_url: url,
  score: score,
  timestamp: new Date().toISOString()
});
```

### エラー追跡

```typescript
// Sentryインテグレーション（オプション）
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [new Sentry.BrowserTracing()],
});
```

## 🔧 開発ツール

### 推奨VS Code設定

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["className=\"([^\"]*)", "([^\"]*)]"]
  ]
}
```

### デバッグ設定

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug React",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

## 💡 ベストプラクティス

### 1. AIプロンプトエンジニアリング

```typescript
// ✅ Good: 具体的で構造化されたプロンプト
const goodPrompt = `
  役割: プロのダンスコーチ
  タスク: 動きを分析
  形式: JSON
  言語: 日本語
`;

// ❌ Bad: 曖昧なプロンプト
const badPrompt = "ダンスを見て";
```

### 2. エラーハンドリング

```typescript
// ✅ Good: ユーザーフレンドリーなエラー処理
try {
  const result = await gemini.analyze();
} catch (error) {
  if (error.message.includes('quota')) {
    showToast('しばらくお待ちください');
  } else {
    showToast('もう一度お試しください');
  }
}
```

### 3. パフォーマンス

```typescript
// ✅ Good: 適切なデバウンス
const debouncedAnalyze = useMemo(
  () => debounce(analyze, 3000),
  []
);
```

## 🎯 プロダクション準備チェックリスト

- [ ] 環境変数設定
- [ ] APIキー保護
- [ ] エラーハンドリング
- [ ] レート制限対策
- [ ] 画像圧縮
- [ ] PWA設定
- [ ] アナリティクス
- [ ] SEO最適化
- [ ] アクセシビリティ
- [ ] パフォーマンステスト

## 📚 学習リソース

### Gemini API
- [公式ドキュメント](https://ai.google.dev/docs)
- [プロンプトエンジニアリング](https://ai.google.dev/docs/prompting)
- [ベストプラクティス](https://ai.google.dev/docs/best-practices)

### React/TypeScript
- [React公式](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### MediaPipe
- [Pose Detection](https://google.github.io/mediapipe/solutions/pose)
- [JavaScript API](https://google.github.io/mediapipe/solutions/pose.html#javascript-solution-api)

---

**Remember**: AIファースト開発では、複雑なロジックを書く代わりに、適切なプロンプトを書くことが重要です。

*最終更新: 2025年1月*
