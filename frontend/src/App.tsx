import React, { useState, useRef, useCallback, useEffect } from 'react';
import YouTubePlayerWrapper from './components/YouTubePlayerWrapper';
import WebcamView from './components/WebcamView';
import { analyzeMovement } from './services/geminiService';
import type { ParsedFeedback, WebcamViewHandles, Theme, YouTubePlayer } from './types';

// Helper to extract YouTube Video ID from various URL formats
const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

// Helper to parse the structured feedback from Gemini
const parseGeminiFeedback = (text: string): ParsedFeedback => {
  const scoreMatch = text.match(/【スコア】\s*(\d+)/);
  const goodPointMatch = text.match(/【良い点】\s*([\s\S]*?)(?=\n【|$)/);
  const improvementPointMatch = text.match(/【改善点】\s*([\s\S]*?)(?=\n【|$)/);
  const adviceMatch = text.match(/【具体的アドバイス】\s*([\s\S]*?)(?=\n【|$)/);

  return {
    score: scoreMatch ? parseInt(scoreMatch[1], 10) : null,
    goodPoint: goodPointMatch ? goodPointMatch[1].trim() : "良い点が見つかりませんでした。",
    improvementPoint: improvementPointMatch ? improvementPointMatch[1].trim() : "改善点が見つかりませんでした。",
    advice: adviceMatch ? adviceMatch[1].trim() : "具体的なアドバイスが見つかりませんでした。",
    raw: text,
  };
};


// Icon Components
const SparklesIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);
const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);
const XCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);


function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ParsedFeedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentTime, setCurrentTime] = useState(0);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const webcamRef = useRef<WebcamViewHandles>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const handleSetVideo = () => {
    const id = extractVideoId(youtubeUrl);
    setVideoId(id);
    setFeedback(null);
    setCurrentTime(0);
    if (!id) {
        setAnalysisError("無効なYouTube URLです。");
    } else {
        setAnalysisError('');
    }
  };

  const handlePlayerReady = (player: YouTubePlayer) => {
    playerRef.current = player;
  };

  const performAnalysis = useCallback(async () => {
    if (!playerRef.current || !webcamRef.current) return;

    // Check if player is playing (state code 1)
    if (playerRef.current.getPlayerState() !== 1) {
        return; 
    }

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const frame = webcamRef.current.captureFrame();
      const time = playerRef.current.getCurrentTime();
      setCurrentTime(time);

      if (frame && youtubeUrl && time > 0) {
        const result = await analyzeMovement(youtubeUrl, time, frame);
        const parsed = parseGeminiFeedback(result);
        setFeedback(parsed);
        if (result.startsWith('フィードバックの生成に失敗しました')) {
             setAnalysisError(result);
        }
      }
    } catch (e: any) {
      console.error("Analysis failed:", e);
      setAnalysisError('分析中に不明なエラーが発生しました。');
    } finally {
      setIsAnalyzing(false);
    }
  }, [youtubeUrl, setFeedback, setAnalysisError, setIsAnalyzing, setCurrentTime]);
  
  useEffect(() => {
    if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
    }
    if (videoId && !isAnalyzing) {
        analysisIntervalRef.current = setInterval(performAnalysis, 5000); // 5秒ごとに分析
    }
    return () => {
        if(analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isAnalyzing, performAnalysis]);


  return (
    <div className={`${theme} font-sans`}>
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-gray-800 dark:text-gray-200 transition-colors duration-300">
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg shadow-sm dark:shadow-slate-800/50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                  🕺 AI Dance Coach
                </h1>
                <div className="w-full sm:max-w-md flex gap-2">
                    <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="YouTube URLをペースト"
                        className="flex-grow px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
                    />
                    <button
                        onClick={handleSetVideo}
                        className="px-5 py-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 dark:focus:ring-offset-slate-900 transition-transform transform hover:scale-105"
                    >
                        設定
                    </button>
                </div>
            </div>
            {analysisError && <p className="text-center text-red-500 mt-2 text-sm">{analysisError}</p>}
          </div>
        </header>

        <main className="container mx-auto p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">📹 お手本動画</h2>
                <div className="aspect-video rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                    <YouTubePlayerWrapper videoId={videoId} onReady={handlePlayerReady} />
                </div>
                {videoId && <p className="text-sm text-gray-500 dark:text-gray-400 text-right">再生時間: {Math.floor(currentTime)}秒</p>}
            </div>
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">🎥 あなたの動き</h2>
                <div className="aspect-video rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                    <WebcamView ref={webcamRef} />
                </div>
            </div>
          </div>
          
          <div className="mt-6">
             <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-violet-500"/>
                    AIコーチからのフィードバック
                </h3>
                {isAnalyzing ? (
                    <div className="flex items-center justify-center min-h-[150px] text-gray-500 dark:text-gray-400">
                       <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500"></div>
                       <span className="ml-3">分析中...</span>
                    </div>
                ) : feedback ? (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-xl p-6 text-center border border-gray-200 dark:border-slate-700">
                            <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-1">シンクロ率</h4>
                            <div className="text-7xl font-bold bg-gradient-to-br from-pink-500 to-violet-500 bg-clip-text text-transparent my-2">
                                {feedback.score ?? '--'}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">/ 100</div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <h5 className="font-semibold text-lg flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircleIcon className="w-6 h-6"/>良い点</h5>
                                <p className="mt-1 text-gray-600 dark:text-gray-300 pl-8">{feedback.goodPoint}</p>
                            </div>
                            <div>
                                <h5 className="font-semibold text-lg flex items-center gap-2 text-amber-600 dark:text-amber-400"><XCircleIcon className="w-6 h-6"/>改善点</h5>
                                <p className="mt-1 text-gray-600 dark:text-gray-300 pl-8">{feedback.improvementPoint}</p>
                            </div>
                            <div>
                                <h5 className="font-semibold text-lg flex items-center gap-2 text-blue-600 dark:text-blue-400"><SparklesIcon className="w-6 h-6"/>アドバイス</h5>
                                <p className="mt-1 text-gray-600 dark:text-gray-300 pl-8">{feedback.advice}</p>
                            </div>
                        </div>
                   </div>
                ) : (
                    <div className="flex items-center justify-center min-h-[150px] text-gray-400 dark:text-gray-500">
                        <p>YouTube動画を設定してダンスを始めると、ここにフィードバックが表示されます。</p>
                    </div>
                )}
             </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;