# AI Studio Build プロンプト - Dance Motion Analyzer MVP (YouTube統合版)

以下のプロンプトをGoogle AI Studio Buildに入力してください。

---

## プロンプト

YouTube動画を参照しながらリアルタイムでダンスを学習できるAIコーチングアプリケーションを作成してください。Gemini APIのYouTube動画理解機能を最大限活用します。

### 核心的なイノベーション
- **Gemini APIがYouTube動画を直接理解**し、ユーザーの動きと比較
- 動画のダウンロードや複雑な処理は一切不要
- YouTube URLを入力するだけで即座に練習開始

### アプリケーション要件

**目的**: YouTubeのダンス動画を見ながら、自分の動きをWebカメラで撮影し、Gemini AIがリアルタイムでコーチングするWebアプリ

### 必須機能

1. **シンプルな2画面レイアウト**
   - 左側: YouTube埋め込みプレーヤー（URLを入力して表示）
   - 右側: Webカメラのリアルタイム映像
   - Webカメラ映像にのみMediaPipeで骨格オーバーレイ

2. **YouTube統合**
   - URLを入力するだけで動画を埋め込み
   - YouTube IFrame APIで再生時間を取得
   - 再生/一時停止/スロー再生コントロール

3. **ユーザー姿勢推定**
   - MediaPipe Poseでユーザーの動きのみを分析
   - 33点の3Dキーポイントをリアルタイム検出
   - 骨格を視覚的に表示

4. **Gemini AI分析（革新的機能）**
   ```typescript
   // Geminiに送信するデータ
   {
     youtubeUrl: "https://youtube.com/watch?v=...",
     currentTimestamp: 15.5, // 現在の再生位置（秒）
     userPoseImage: base64Image, // ユーザーの現在のフレーム
     userKeypoints: [...], // MediaPipeのキーポイント
     prompt: "このYouTube動画の現在の時間の動きと、ユーザーの動きを比較して、具体的なアドバイスをください"
   }
   ```

5. **AIフィードバック生成**
   - Geminiが動画の内容を理解して比較
   - タイミング、姿勢、表現力を総合評価
   - 日本語で具体的なアドバイス

6. **革新的なUI/UX**
   - YouTube URL入力バー（上部中央）
   - リアルタイムスコア表示（大きく中央に）
   - AIフィードバックをチャット風に表示
   - ダークモードとライトモード切り替え

### 技術実装

**コアとなるGemini API活用**:
```typescript
// useGeminiCoach.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export const useGeminiCoach = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.7,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    }
  });
  
  const analyzeMovement = async (
    youtubeUrl: string,
    timestamp: number,
    userFrame: string,
    userKeypoints: any[]
  ) => {
    const prompt = `
あなたはプロのダンスインストラクターです。

YouTube動画: ${youtubeUrl}
現在の再生時間: ${timestamp}秒

この動画の${timestamp}秒時点でのダンサーの動きと、
提供された画像のユーザーの動きを比較してください。

ユーザーの姿勢データ:
${JSON.stringify(userKeypoints.slice(0, 5))} // 主要な関節のみ

以下の観点で分析してください：
1. 動きの正確性（ポーズが合っているか）
2. タイミング（音楽に合っているか）
3. 表現力（動きの大きさや流れ）

フィードバックは以下の形式で：
【スコア】0-100点
【良い点】1つ
【改善点】1つ
【具体的アドバイス】1-2文

励ましの言葉を含めて、日本語で回答してください。
`;

    try {
      // YouTube URLとユーザー画像を同時に分析
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: userFrame, mimeType: "image/jpeg" } }
      ]);
      
      return result.response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      return 'フィードバックの生成に失敗しました。';
    }
  };
  
  return { analyzeMovement };
};
```

**YouTube Player統合**:
```typescript
// YouTubePlayer.tsx
import React, { useEffect, useRef, useState } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  onTimeUpdate: (time: number) => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
  videoId, 
  onTimeUpdate 
}) => {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // YouTube IFrame API読み込み
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          'playsinline': 1,
          'controls': 1,
          'rel': 0
        },
        events: {
          'onReady': () => setIsReady(true),
          'onStateChange': onPlayerStateChange
        }
      });
    };
    
    // 再生時間を定期的に取得
    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        onTimeUpdate(playerRef.current.getCurrentTime());
      }
    }, 100); // 100msごと
    
    return () => clearInterval(interval);
  }, [videoId]);
  
  return <div id="youtube-player" className="w-full h-full" />;
};
```

**メインアプリ構造**:
```typescript
// App.tsx
import React, { useState, useRef, useCallback } from 'react';
import { YouTubePlayer } from './components/YouTubePlayer';
import { WebcamCapture } from './components/WebcamCapture';
import { usePoseDetection } from './hooks/usePoseDetection';
import { useGeminiCoach } from './hooks/useGeminiCoach';

function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const webcamRef = useRef<HTMLVideoElement>(null);
  const keypoints = usePoseDetection(webcamRef);
  const { analyzeMovement } = useGeminiCoach(process.env.REACT_APP_GEMINI_API_KEY!);
  
  // YouTube URLからVideo IDを抽出
  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : '';
  };
  
  // URLを入力して動画を設定
  const handleSetVideo = () => {
    const id = extractVideoId(youtubeUrl);
    if (id) {
      setVideoId(id);
    }
  };
  
  // 定期的に分析（3秒ごと）
  useEffect(() => {
    const interval = setInterval(async () => {
      if (videoId && keypoints.length > 0 && !isAnalyzing) {
        setIsAnalyzing(true);
        
        // Webカメラの現在のフレームを取得
        const canvas = document.createElement('canvas');
        const video = webcamRef.current;
        if (video) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg').split(',')[1];
          
          // Gemini APIで分析
          const result = await analyzeMovement(
            youtubeUrl,
            currentTime,
            imageData,
            keypoints
          );
          
          // フィードバックを解析
          const scoreMatch = result.match(/【スコア】(\d+)/);
          if (scoreMatch) {
            setScore(parseInt(scoreMatch[1]));
          }
          
          setFeedback(result);
        }
        
        setIsAnalyzing(false);
      }
    }, 3000); // 3秒ごと
    
    return () => clearInterval(interval);
  }, [videoId, keypoints, currentTime, isAnalyzing]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* ヘッダー */}
      <div className="bg-black/30 backdrop-blur-lg p-4">
        <h1 className="text-3xl font-bold text-white text-center mb-4">
          🕺 AI Dance Coach
        </h1>
        
        {/* YouTube URL入力 */}
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="YouTube URLを入力（例: https://youtube.com/watch?v=...）"
            className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20"
          />
          <button
            onClick={handleSetVideo}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition"
          >
            動画を設定
          </button>
        </div>
      </div>
      
      {/* メインコンテンツ */}
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* YouTube動画 */}
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-4">
            <h2 className="text-xl font-semibold text-white mb-3">
              📹 お手本動画
            </h2>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {videoId ? (
                <YouTubePlayer 
                  videoId={videoId} 
                  onTimeUpdate={setCurrentTime}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  YouTube URLを入力してください
                </div>
              )}
            </div>
            {currentTime > 0 && (
              <div className="mt-2 text-white/70 text-sm">
                再生時間: {Math.floor(currentTime)}秒
              </div>
            )}
          </div>
          
          {/* Webカメラ */}
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-4">
            <h2 className="text-xl font-semibold text-white mb-3">
              🎥 あなたの動き
            </h2>
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
              <WebcamCapture ref={webcamRef} />
              {keypoints.length > 0 && (
                <PoseOverlay keypoints={keypoints} />
              )}
            </div>
            <div className="mt-2 text-white/70 text-sm">
              {keypoints.length > 0 ? '姿勢検出中...' : 'カメラを起動してください'}
            </div>
          </div>
        </div>
        
        {/* スコアとフィードバック */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* スコア */}
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">スコア</h3>
            <div className="text-6xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {score !== null ? score : '--'}
            </div>
            <div className="text-white/70 mt-2">/ 100</div>
          </div>
          
          {/* AIフィードバック */}
          <div className="lg:col-span-2 bg-black/30 backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              💡 AIコーチからのアドバイス
            </h3>
            <div className="bg-white/5 rounded-lg p-4 min-h-[120px]">
              {isAnalyzing ? (
                <div className="flex items-center gap-2 text-white/70">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  分析中...
                </div>
              ) : feedback ? (
                <div className="text-white whitespace-pre-wrap">{feedback}</div>
              ) : (
                <div className="text-white/50">
                  動画を再生してダンスを始めてください
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
```

### デザイン仕様

**カラーパレット**:
- 背景: グラデーション（紫→青→インディゴ）
- カード: 半透明黒（backdrop-blur）
- アクセント: ピンク→紫のグラデーション
- テキスト: 白（透明度調整）

**レイアウト**:
- レスポンシブグリッド
- モバイル: 縦積み
- デスクトップ: 2カラム

**アニメーション**:
- スコア変更時: スムーズトランジション
- フィードバック表示: フェードイン
- ローディング: スピナー

### 革新的な特徴

1. **YouTube URL直接処理**
   - 動画ダウンロード不要
   - 著作権問題なし
   - 即座に練習開始

2. **Gemini AIの動画理解**
   - 動画の内容を直接理解
   - タイムスタンプごとの動き把握
   - 音楽との同期も評価

3. **シンプルな実装**
   - バックエンド不要
   - 複雑な動画処理不要
   - APIキー1つで動作

4. **コスト効率**
   - サーバー費用ゼロ
   - ストレージ不要
   - Gemini API使用料のみ

### 環境変数

```env
REACT_APP_GEMINI_API_KEY=your_api_key_here
```

### デプロイ設定（Vercel）

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "create-react-app",
  "environmentVariables": {
    "REACT_APP_GEMINI_API_KEY": "@gemini_api_key"
  }
}
```

このアプリケーションを完全に動作するReactコードとして生成してください。
YouTube URLを入力するだけで、Gemini AIがリアルタイムでダンスコーチングを提供する革新的なMVPを作成してください。

---

## 使用方法

1. 上記プロンプトをコピー
2. [Google AI Studio](https://aistudio.google.com/)にアクセス
3. "Build"セクションを選択  
4. プロンプトを貼り付けて実行
5. 生成されたコードをダウンロード
6. Gemini APIキーを設定してデプロイ

## 期待される成果

- YouTube URL入力だけで即座に練習開始
- Gemini AIが動画を直接理解して比較
- リアルタイムフィードバック
- サーバーレスで低コスト運用
- 著作権問題を回避

## この実装の革新性

従来の複雑な処理フロー（動画ダウンロード→フレーム抽出→姿勢推定→比較）を、
Gemini APIの動画理解機能で一気に簡略化。これこそがAI時代の新しい開発手法です。
