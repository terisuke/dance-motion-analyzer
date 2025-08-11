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
あなたはプロのダンスインストラクターAIです。

提供されたYouTube動画とユーザーのキャプチャ画像を分析し、ダンスのパフォーマンスを評価してください。

■ 分析対象
- YouTube動画: ${youtubeUrl}
- 動画の再生時間: ${Math.round(timestamp)}秒時点

■ 分析の観点
1.  **ポーズの正確性**: ${Math.round(timestamp)}秒時点のお手本ダンサーのポーズと、ユーザーのポーズがどれだけ一致しているか。特に体幹、腕、脚の角度や位置に注目してください。
2.  **タイミング**: 動きがお手本のタイミングと合っているか。
3.  **表現力**: 動きの大きさ、キレ、滑らかさなど、ポーズだけではわからない表現の部分を評価してください。

■ フィードバック形式
以下のフォーマットに厳密に従って、日本語で、かつポジティブで励ますようなトーンで回答してください。

【スコア】<<0から100の整数値>>
【良い点】<<特に優れていた点を1つ、具体的に記述>>
【改善点】<<最も改善すべき点を1つ、具体的に記述>>
【具体的アドバイス】<<改善点に対する実践的なアドバイスを1～2文で記述>>
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
