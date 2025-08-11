# AI Studio Build プロンプト - Dance Motion Analyzer MVP

以下のプロンプトをGoogle AI Studio Buildに入力してください。

---

## プロンプト

リアルタイムダンス分析アプリケーションのMVPを作成してください。

### アプリケーション要件

**目的**: ユーザーがWebカメラで自分のダンスを撮影し、参照動画と比較して、AIコーチからフィードバックを受けるWebアプリ

### 必須機能

1. **2画面レイアウト**
   - 左側: 参照動画（ローカルファイルアップロード or YouTube埋め込み）
   - 右側: Webカメラのリアルタイム映像
   - 両画面に姿勢推定の骨格をオーバーレイ表示

2. **姿勢推定機能**
   - MediaPipe Pose（https://google.github.io/mediapipe/）を使用
   - 33点の3Dキーポイントをリアルタイム検出
   - 骨格を緑線、関節を赤点で描画

3. **動作比較分析**
   - 参照動画とユーザーの姿勢キーポイントをリアルタイム比較
   - 簡易的な類似度スコア計算（0-100点）
   - スコアをプログレスバーで視覚的に表示

4. **Gemini AIフィードバック**
   - Gemini APIを使用してコーチングアドバイスを生成
   - 以下の情報をプロンプトに含める：
     - 現在のスコア
     - 最も差が大きい身体部位
     - キャプチャした画像フレーム（参照とユーザー）
   - フィードバックは日本語で、具体的かつ励ましのトーンで

5. **UI/UXデザイン**
   - モダンでクリーンなデザイン（Tailwind CSS推奨）
   - グラデーション背景（紫〜青系）
   - レスポンシブ対応
   - 直感的な操作ボタン配置

### 技術仕様

**フレームワーク**: React 18 + TypeScript

**主要ライブラリ**:
```json
{
  "@mediapipe/pose": "latest",
  "@mediapipe/camera_utils": "latest",
  "@mediapipe/drawing_utils": "latest",
  "@google/generative-ai": "latest",
  "tailwindcss": "latest"
}
```

**ファイル構造**:
```
src/
  components/
    VideoPlayer.tsx      # 参照動画プレーヤー
    WebcamCapture.tsx    # Webカメラキャプチャ
    PoseOverlay.tsx      # 骨格オーバーレイ
    ScoreDisplay.tsx     # スコア表示
    AIFeedback.tsx       # フィードバック表示
  hooks/
    usePoseDetection.ts  # MediaPipe統合
    useGeminiAI.ts       # Gemini API統合
    useSimilarity.ts     # 類似度計算
  App.tsx
  index.tsx
```

### コンポーネント実装例

```typescript
// usePoseDetection.ts
import { Pose, Results } from '@mediapipe/pose';

export const usePoseDetection = (videoRef: RefObject<HTMLVideoElement>) => {
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    pose.onResults((results: Results) => {
      if (results.poseLandmarks) {
        setKeypoints(results.poseLandmarks);
      }
    });
    
    // Process video frames
    const processFrame = async () => {
      if (videoRef.current) {
        await pose.send({ image: videoRef.current });
      }
      requestAnimationFrame(processFrame);
    };
    processFrame();
    
    return () => pose.close();
  }, [videoRef]);
  
  return keypoints;
};
```

```typescript
// useGeminiAI.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export const useGeminiAI = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const generateFeedback = async (
    score: number,
    referenceFrame: string,
    userFrame: string,
    keypointDifferences: any
  ) => {
    const prompt = `
あなたはプロのダンスインストラクターです。
生徒のダンスを分析してアドバイスをしてください。

現在のスコア: ${score}/100

最も改善が必要な部位:
${JSON.stringify(keypointDifferences)}

具体的で建設的なアドバイスを1-2文で日本語で提供してください。
励ましの言葉も含めてください。
`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: referenceFrame, mimeType: "image/jpeg" } },
      { inlineData: { data: userFrame, mimeType: "image/jpeg" } }
    ]);
    
    return result.response.text();
  };
  
  return { generateFeedback };
};
```

### UI実装の要点

1. **レイアウト**: CSS Grid or Flexboxで2カラムレイアウト
2. **カラースキーム**: 
   - Primary: #667eea (紫)
   - Secondary: #764ba2 (濃い紫)
   - Success: #48bb78 (緑)
   - Warning: #f6ad55 (オレンジ)

3. **アニメーション**: 
   - スコア変更時にスムーズなトランジション
   - フィードバック表示時にフェードイン効果

4. **エラーハンドリング**:
   - カメラアクセス拒否時の代替UI
   - API接続エラー時の再試行機能

### 動作フロー

1. ユーザーが参照動画を選択/アップロード
2. 「カメラ開始」ボタンをクリック
3. MediaPipeが両方の映像から姿勢を検出
4. リアルタイムでスコア計算・表示
5. スコアが閾値を下回ったら（または定期的に）Gemini APIを呼び出し
6. AIフィードバックを画面下部に表示

### 追加の考慮事項

- **パフォーマンス**: requestAnimationFrameでフレームレート制御
- **プライバシー**: Webカメラ映像はローカル処理のみ
- **アクセシビリティ**: キーボード操作対応、ARIA属性
- **PWA対応**: オフライン時の基本機能維持

### デプロイ設定

Vercelへのデプロイを想定：
```json
{
  "build": {
    "env": {
      "REACT_APP_GEMINI_API_KEY": "@gemini_api_key"
    }
  }
}
```

このアプリケーションを完全に動作するReactコードとして生成してください。
MediaPipeとGemini APIの統合を含め、すべての機能が実装されたMVPを提供してください。

---

## 使用方法

1. 上記プロンプトをコピー
2. [Google AI Studio](https://aistudio.google.com/)にアクセス
3. "Build"セクションを選択
4. プロンプトを貼り付けて実行
5. 生成されたコードをダウンロード
6. 必要に応じて微調整

## 期待される出力

- 完全に動作するReactアプリケーション
- MediaPipe統合済み
- Gemini API統合済み
- レスポンシブUI
- 日本語フィードバック機能

## カスタマイズポイント

生成後、以下の点を調整可能：
- APIキーの環境変数化
- デザインのブランディング
- フィードバック頻度の調整
- スコア計算アルゴリズムの改良
