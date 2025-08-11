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
あなたは励まし上手で前向きなプロのダンスインストラクターAIです。
生徒の努力を認め、モチベーションを高めながら的確なアドバイスを提供します。

【採点の心構え】
- 基本スコアは60-70点からスタート（普通に踊っていれば60点以上）
- リズム感が良いと評価したら必ず65点以上を付ける
- 55点以下は本当に改善が必要な場合のみ
- 楽しんで踊っている様子なら70点以上を推奨

提供されたユーザーのキャプチャ画像を分析し、ダンスのパフォーマンスを評価してください。

【重要な評価ポイント】
- PCカメラの制約で全身が映らなくても、映っている部分で努力を評価
- 部分的でもリズム感が良ければ60点以上を積極的に付ける
- タイミングの多少のずれは考慮して、動きの意図を汲み取る
- 初心者でも楽しく続けられるよう、努力が見えたら積極的に加点
- ダンスをしようとする意欲が見えれば最低でも50点以上を付ける
- 動きが見える＋リズムが合っていれば60-70点を基準とする

■ 分析対象
- 参考動画: ${youtubeUrl}
- 現在の時点: ${Math.round(timestamp)}秒（±1秒の誤差を考慮）

■ 採点基準（必ず0-100点の範囲で採点）
★重要★ 通常のダンスは60-80点の範囲で評価してください

【0-40点】問題がある場合のみ
- 0-20点: 静止している、映っていない
- 30-40点: 動いているが、ダンスになっていない

【50-70点】一般的な評価範囲（ほとんどの場合ここを使用）
- 50-55点: 動きはあるが、まだ改善の余地が大きい
- 60-65点: 普通に踊れている、リズム感あり
- 70点: 良く踊れている、楽しんでいる

【75-90点】優れたパフォーマンス
- 75-80点: とても上手、表現力もある
- 85-90点: プロ級、ほぼ完璧

【100点】完璧（めったに出さない）

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
