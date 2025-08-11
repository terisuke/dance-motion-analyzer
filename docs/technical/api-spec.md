# API仕様書 - Gemini API統合ガイド

## 1. 概要

Dance Motion AnalyzerはサーバーサイドAPIを持たず、**Gemini APIのみ**を直接利用します。このドキュメントでは、Gemini APIの活用方法と、クライアントサイドでの実装パターンを説明します。

## 2. Gemini API統合

### 2.1 API初期化

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

// APIキー設定（環境変数から取得）
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

// クライアント初期化
const genAI = new GoogleGenerativeAI(API_KEY);

// モデル設定
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048,
  },
});
```

### 2.2 マルチモーダルリクエスト

#### リクエスト構造

```typescript
interface GeminiRequest {
  // テキストプロンプト
  prompt: string;
  
  // 画像データ（オプション）
  image?: {
    data: string;      // Base64エンコード
    mimeType: string;  // "image/jpeg" | "image/png"
  };
  
  // 動画参照（YouTube URL）
  videoContext?: {
    url: string;
    timestamp: number;
  };
}
```

#### 実装例

```typescript
class GeminiDanceCoach {
  private model: GenerativeModel;
  
  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });
  }
  
  async analyzeMovement(
    youtubeUrl: string,
    timestamp: number,
    userFrameBase64: string
  ): Promise<DanceAnalysis> {
    const prompt = this.buildPrompt(youtubeUrl, timestamp);
    
    try {
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: userFrameBase64,
            mimeType: "image/jpeg"
          }
        }
      ]);
      
      const response = await result.response;
      return this.parseResponse(response.text());
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new GeminiAPIError(error.message);
    }
  }
  
  private buildPrompt(url: string, time: number): string {
    return `
      役割: あなたはプロのダンスインストラクターです。
      
      タスク: YouTube動画のダンスとユーザーの動きを比較分析してください。
      
      参照動画: ${url}
      現在時間: ${time}秒
      
      分析項目:
      1. ポーズの正確性（0-100点）
      2. タイミング（perfect/good/needs_work）
      3. 表現力（energetic/moderate/needs_more）
      4. 全体的な流れ（smooth/choppy）
      
      出力形式（JSON）:
      {
        "score": 数値,
        "timing": "文字列",
        "expression": "文字列",
        "flow": "文字列",
        "goodPoints": ["良い点1", "良い点2"],
        "improvements": ["改善点1", "改善点2"],
        "specificAdvice": "具体的なアドバイス",
        "encouragement": "励ましの言葉"
      }
      
      重要: 必ずJSON形式で回答し、日本語で記述してください。
    `;
  }
  
  private parseResponse(text: string): DanceAnalysis {
    try {
      // JSONブロックを抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }
      
      const data = JSON.parse(jsonMatch[0]);
      
      return {
        score: data.score || 0,
        timing: data.timing || 'unknown',
        expression: data.expression || 'unknown',
        flow: data.flow || 'unknown',
        goodPoints: data.goodPoints || [],
        improvements: data.improvements || [],
        specificAdvice: data.specificAdvice || '',
        encouragement: data.encouragement || ''
      };
      
    } catch (error) {
      console.error('Parse error:', error);
      return this.getDefaultAnalysis();
    }
  }
  
  private getDefaultAnalysis(): DanceAnalysis {
    return {
      score: 0,
      timing: 'unknown',
      expression: 'unknown',
      flow: 'unknown',
      goodPoints: [],
      improvements: [],
      specificAdvice: '分析を続けてください',
      encouragement: '頑張ってください！'
    };
  }
}
```

### 2.3 レート制限とエラーハンドリング

```typescript
class GeminiAPIManager {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private minInterval = 1000; // 1秒間隔
  
  async queueRequest<T>(
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        await this.delay(this.minInterval - timeSinceLastRequest);
      }
      
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        this.lastRequestTime = Date.now();
      }
    }
    
    this.isProcessing = false;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// エラーハンドリング
class GeminiErrorHandler {
  static handle(error: any): ErrorResponse {
    if (error.message?.includes('quota')) {
      return {
        type: 'QUOTA_EXCEEDED',
        message: 'API利用制限に達しました。しばらくお待ちください。',
        retryAfter: 60000
      };
    }
    
    if (error.message?.includes('invalid_api_key')) {
      return {
        type: 'INVALID_API_KEY',
        message: 'APIキーが無効です。設定を確認してください。',
        retryAfter: null
      };
    }
    
    if (error.message?.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        message: 'リクエストがタイムアウトしました。',
        retryAfter: 5000
      };
    }
    
    return {
      type: 'UNKNOWN',
      message: 'エラーが発生しました。',
      retryAfter: 3000
    };
  }
}
```

## 3. YouTube API統合（IFrame API）

### 3.1 YouTube Player埋め込み

```typescript
interface YouTubePlayerConfig {
  videoId: string;
  containerId: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onTimeUpdate?: (time: number) => void;
}

class YouTubePlayerManager {
  private player: YT.Player | null = null;
  private timeUpdateInterval: number | null = null;
  
  async initialize(config: YouTubePlayerConfig): Promise<void> {
    // YouTube IFrame APIの読み込み
    await this.loadYouTubeAPI();
    
    // プレーヤー作成
    this.player = new YT.Player(config.containerId, {
      videoId: config.videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        cc_load_policy: 0
      },
      events: {
        onReady: () => {
          config.onReady?.();
          this.startTimeTracking(config.onTimeUpdate);
        },
        onStateChange: (event) => {
          config.onStateChange?.(event.data);
        }
      }
    });
  }
  
  private loadYouTubeAPI(): Promise<void> {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }
      
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      
      window.onYouTubeIframeAPIReady = () => resolve();
    });
  }
  
  private startTimeTracking(callback?: (time: number) => void) {
    if (!callback) return;
    
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.player && this.player.getCurrentTime) {
        callback(this.player.getCurrentTime());
      }
    }, 100); // 100ms間隔で更新
  }
  
  // 制御メソッド
  play() { this.player?.playVideo(); }
  pause() { this.player?.pauseVideo(); }
  seekTo(seconds: number) { this.player?.seekTo(seconds, true); }
  setPlaybackRate(rate: number) { this.player?.setPlaybackRate(rate); }
  
  destroy() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    this.player?.destroy();
  }
}
```

### 3.2 YouTube URL解析

```typescript
class YouTubeURLParser {
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }
  
  static buildEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  static buildWatchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  
  static validateUrl(url: string): boolean {
    return this.extractVideoId(url) !== null;
  }
}
```

## 4. MediaPipe API（クライアントサイド）

### 4.1 Pose Detection設定

```typescript
interface MediaPipeConfig {
  modelComplexity: 0 | 1 | 2;  // 0: Lite, 1: Full, 2: Heavy
  smoothLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}

class MediaPipePoseDetector {
  private pose: Pose | null = null;
  private config: MediaPipeConfig = {
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  };
  
  async initialize(
    onResults: (landmarks: NormalizedLandmarkList) => void
  ): Promise<void> {
    const { Pose } = await import('@mediapipe/pose');
    
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });
    
    this.pose.setOptions(this.config);
    
    this.pose.onResults((results) => {
      if (results.poseLandmarks) {
        onResults(results.poseLandmarks);
      }
    });
  }
  
  async processFrame(
    videoElement: HTMLVideoElement | HTMLImageElement
  ): Promise<void> {
    if (!this.pose) {
      throw new Error('Pose detector not initialized');
    }
    
    await this.pose.send({ image: videoElement });
  }
  
  updateConfig(config: Partial<MediaPipeConfig>) {
    this.config = { ...this.config, ...config };
    this.pose?.setOptions(this.config);
  }
  
  close() {
    this.pose?.close();
  }
}
```

### 4.2 キーポイントデータ構造

```typescript
// MediaPipe Pose Landmarkの定義
enum PoseLandmark {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  MOUTH_LEFT = 9,
  MOUTH_RIGHT = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32
}

interface Keypoint {
  x: number;      // 正規化されたX座標 [0, 1]
  y: number;      // 正規化されたY座標 [0, 1]
  z: number;      // 深度（相対的）
  visibility?: number;  // 可視性スコア [0, 1]
}

// 骨格接続定義
const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5],
  [5, 6], [6, 8], [9, 10], [11, 12], [11, 13],
  [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
  [18, 20], [11, 23], [12, 24], [23, 24], [23, 25],
  [24, 26], [25, 27], [26, 28], [27, 29], [28, 30],
  [29, 31], [30, 32], [27, 31], [28, 32]
];
```

## 5. データ形式とインターフェース

### 5.1 アプリケーション全体のデータ型

```typescript
// ダンス分析結果
interface DanceAnalysis {
  score: number;                // 0-100
  timing: TimingQuality;        // タイミング評価
  expression: ExpressionLevel;  // 表現力評価
  flow: FlowQuality;           // 流れの評価
  goodPoints: string[];        // 良い点
  improvements: string[];      // 改善点
  specificAdvice: string;      // 具体的アドバイス
  encouragement: string;       // 励まし
}

type TimingQuality = 'perfect' | 'good' | 'needs_work';
type ExpressionLevel = 'energetic' | 'moderate' | 'needs_more';
type FlowQuality = 'smooth' | 'choppy';

// セッションデータ
interface DanceSession {
  id: string;
  youtubeUrl: string;
  startTime: Date;
  endTime?: Date;
  analyses: TimestampedAnalysis[];
  averageScore: number;
}

interface TimestampedAnalysis {
  timestamp: number;
  analysis: DanceAnalysis;
  userFrame?: string;  // Base64画像
}

// アプリケーション状態
interface AppState {
  // YouTube関連
  youtubeUrl: string;
  videoId: string | null;
  currentTime: number;
  isPlaying: boolean;
  
  // MediaPipe関連
  isWebcamActive: boolean;
  userKeypoints: Keypoint[];
  
  // Gemini分析関連
  isAnalyzing: boolean;
  currentAnalysis: DanceAnalysis | null;
  analysisHistory: TimestampedAnalysis[];
  
  // UI状態
  showSettings: boolean;
  playbackSpeed: number;
  analysisInterval: number;  // 秒
}
```

### 5.2 設定とオプション

```typescript
interface AppSettings {
  // Gemini API設定
  gemini: {
    apiKey: string;
    model: 'gemini-1.5-flash' | 'gemini-1.5-pro';
    temperature: number;
    analysisInterval: number;  // 秒
  };
  
  // MediaPipe設定
  mediaPipe: {
    modelComplexity: 0 | 1 | 2;
    minConfidence: number;
    smoothing: boolean;
  };
  
  // UI設定
  ui: {
    theme: 'light' | 'dark';
    language: 'ja' | 'en';
    showKeypoints: boolean;
    showSkeleton: boolean;
  };
  
  // パフォーマンス設定
  performance: {
    videoQuality: 'low' | 'medium' | 'high';
    skipFrames: number;
    maxFPS: number;
  };
}

// デフォルト設定
const DEFAULT_SETTINGS: AppSettings = {
  gemini: {
    apiKey: '',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    analysisInterval: 3
  },
  mediaPipe: {
    modelComplexity: 1,
    minConfidence: 0.5,
    smoothing: true
  },
  ui: {
    theme: 'dark',
    language: 'ja',
    showKeypoints: true,
    showSkeleton: true
  },
  performance: {
    videoQuality: 'medium',
    skipFrames: 0,
    maxFPS: 30
  }
};
```

## 6. エラーコードとメッセージ

```typescript
enum ErrorCode {
  // Gemini API関連
  GEMINI_API_KEY_MISSING = 'E001',
  GEMINI_API_KEY_INVALID = 'E002',
  GEMINI_QUOTA_EXCEEDED = 'E003',
  GEMINI_REQUEST_FAILED = 'E004',
  
  // YouTube関連
  YOUTUBE_INVALID_URL = 'E101',
  YOUTUBE_VIDEO_NOT_FOUND = 'E102',
  YOUTUBE_EMBED_BLOCKED = 'E103',
  
  // MediaPipe関連
  CAMERA_ACCESS_DENIED = 'E201',
  CAMERA_NOT_FOUND = 'E202',
  MEDIAPIPE_LOAD_FAILED = 'E203',
  
  // その他
  NETWORK_ERROR = 'E301',
  BROWSER_NOT_SUPPORTED = 'E302'
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.GEMINI_API_KEY_MISSING]: 'Gemini APIキーが設定されていません',
  [ErrorCode.GEMINI_API_KEY_INVALID]: 'Gemini APIキーが無効です',
  [ErrorCode.GEMINI_QUOTA_EXCEEDED]: 'API利用制限に達しました',
  [ErrorCode.GEMINI_REQUEST_FAILED]: 'AI分析に失敗しました',
  
  [ErrorCode.YOUTUBE_INVALID_URL]: '有効なYouTube URLを入力してください',
  [ErrorCode.YOUTUBE_VIDEO_NOT_FOUND]: '動画が見つかりません',
  [ErrorCode.YOUTUBE_EMBED_BLOCKED]: 'この動画は埋め込みが許可されていません',
  
  [ErrorCode.CAMERA_ACCESS_DENIED]: 'カメラへのアクセスを許可してください',
  [ErrorCode.CAMERA_NOT_FOUND]: 'カメラが見つかりません',
  [ErrorCode.MEDIAPIPE_LOAD_FAILED]: '姿勢推定モデルの読み込みに失敗しました',
  
  [ErrorCode.NETWORK_ERROR]: 'ネットワークエラーが発生しました',
  [ErrorCode.BROWSER_NOT_SUPPORTED]: 'このブラウザはサポートされていません'
};
```

## 7. パフォーマンス最適化

```typescript
// 画像圧縮ユーティリティ
class ImageOptimizer {
  static async compressFrame(
    canvas: HTMLCanvasElement,
    quality: number = 0.7
  ): Promise<string> {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              resolve(base64.split(',')[1]);
            };
            reader.readAsDataURL(blob);
          }
        },
        'image/jpeg',
        quality
      );
    });
  }
  
  static resizeCanvas(
    source: HTMLCanvasElement,
    maxWidth: number = 640,
    maxHeight: number = 480
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    let { width, height } = source;
    
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width *= ratio;
      height *= ratio;
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(source, 0, 0, width, height);
    
    return canvas;
  }
}
```

## まとめ

Dance Motion Analyzerは、従来のような複雑なAPIサーバーを持たず、**Gemini APIを直接活用**することで：

1. **開発の簡素化**: バックエンド開発不要
2. **コスト削減**: サーバー費用ゼロ
3. **スケーラビリティ**: 自動的に無限スケール
4. **保守性向上**: 更新箇所が最小限

これがAIファーストアーキテクチャの真の価値です。

---
*最終更新: 2025年1月*
