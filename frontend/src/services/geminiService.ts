import { GoogleGenerativeAI } from "@google/generative-ai";

// Vite環境変数を使用
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY environment variable is not set.");
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const analyzeMovement = async (
  youtubeUrl: string,
  timestamp: number,
  userFrame: string
): Promise<string> => {
  if (!genAI) {
    return "フィードバックの生成に失敗しました。APIキーが設定されていません。";
  }

  const prompt = `
あなたは厳格かつ励ます姿勢を持つプロのダンスインストラクターAIです。

提供されたユーザーのキャプチャ画像を分析し、ダンスのパフォーマンスを評価してください。

■ 分析対象
- 参考動画: ${youtubeUrl}
- 現在の時点: ${Math.round(timestamp)}秒

■ 採点基準（必ず0-100点の範囲で採点）
【0-20点】動いていない、または全く違う動作をしている
- 0点: 完全に静止している、画面に映っていない
- 10点: わずかに動いているが、ダンスとは無関係
- 20点: ダンスしようとしているが、基本姿勢が取れていない

【21-40点】動きはあるが、お手本とかなり異なる
- 30点: 体は動いているが、タイミングやポーズが大きくずれている
- 40点: 大まかな動きの方向は合っているが、細部が不正確

【41-60点】基本的な動きは捉えているが、改善が必要
- 50点: 主要な動きは再現できているが、手足の角度や位置に誤差がある
- 60点: 全体的な流れは良いが、キレや表現力が不足

【61-80点】良いパフォーマンス、細部の調整が必要
- 70点: ポーズは正確だが、動きの流れやリズム感に改善の余地あり
- 80点: 高い再現度、プロに近いレベルだが、わずかな改善点あり

【81-100点】優秀〜完璧なパフォーマンス
- 90点: ほぼ完璧、微細な表現力の違いのみ
- 100点: お手本と完全に一致、プロレベルの完璧な再現

■ フィードバック形式（簡潔に！踊りながら読めるように）
以下のフォーマットに厳密に従って回答してください。

【スコア】<<0から100の整数値>>
【良い点】<<最大15文字>>
【改善点】<<最大15文字>>
【アドバイス】<<最大20文字>>
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: userFrame,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    return "フィードバックの生成に失敗しました。APIキーまたはネットワーク接続を確認してください。";
  }
};
