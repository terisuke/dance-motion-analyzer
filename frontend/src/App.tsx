import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ClerkProvider, SignIn, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import YouTubePlayerWrapper from './components/YouTubePlayerWrapper';
import WebcamView from './components/WebcamView';
import { analyzeMovement } from './services/geminiService';
import type { ParsedFeedback, WebcamViewHandles, YouTubePlayer } from './types';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Helper functions (既存のまま)
const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const parseGeminiFeedback = (text: string): ParsedFeedback => {
    const scoreMatch = text.match(/【スコア】\s*(\d+)/);
    const goodPointMatch = text.match(/【良い点】\s*([\s\S]*?)(?=\n【|$)/);
    const improvementPointMatch = text.match(/【改善点】\s*([\s\S]*?)(?=\n【|$)/);
    const adviceMatch = text.match(/【アドバイス】\s*([\s\S]*?)(?=\n【|$)/);

    const extractFirstPoint = (text: string | null): string => {
        if (!text) return "";
        const cleaned = text.replace(/^[-・•]\s*/gm, "").trim();
        const lines = cleaned.split('\n').filter(line => line.trim());
        return lines[0] || "";
    };

    return {
        score: scoreMatch ? parseInt(scoreMatch[1], 10) : null,
        goodPoint: goodPointMatch ? extractFirstPoint(goodPointMatch[1]) : "良い動き！",
        improvementPoint: improvementPointMatch ? extractFirstPoint(improvementPointMatch[1]) : "もう少し大きく",
        advice: adviceMatch ? extractFirstPoint(adviceMatch[1]) : "リズムを意識して",
        raw: text,
    };
};

// Icon Components
const SparklesIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

// Main Dance Analyzer Component
function DanceAnalyzer() {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [videoId, setVideoId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<ParsedFeedback | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState('');

    const playerRef = useRef<YouTubePlayer | null>(null);
    const webcamRef = useRef<WebcamViewHandles>(null);
    const analysisIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    
    const handleSetVideo = () => {
        const id = extractVideoId(youtubeUrl);
        setVideoId(id);
        setFeedback(null);
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
        if (playerRef.current.getPlayerState() !== 1) return; 

        setIsAnalyzing(true);
        setAnalysisError('');

        try {
            const frame = webcamRef.current.captureFrame();
            if (!frame) {
                setAnalysisError('カメラのフレームを取得できませんでした。');
                return;
            }
            const time = playerRef.current.getCurrentTime();
            
            const result = await analyzeMovement(youtubeUrl, time, frame);
            const parsed = parseGeminiFeedback(result);
            setFeedback(parsed);
        } catch (error) {
            console.error('Analysis error:', error);
            setAnalysisError('分析中にエラーが発生しました。');
        } finally {
            setIsAnalyzing(false);
        }
    }, [youtubeUrl]);

    useEffect(() => {
        if (videoId) {
            analysisIntervalRef.current = setInterval(performAnalysis, 5000);
            return () => {
                if (analysisIntervalRef.current) {
                    clearInterval(analysisIntervalRef.current);
                }
            };
        }
    }, [videoId, performAnalysis]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* URL入力 */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4">YouTube動画を設定</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="YouTube URLを入力"
                            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                        />
                        <button
                            onClick={handleSetVideo}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            設定
                        </button>
                    </div>
                    {analysisError && (
                        <p className="text-red-400 text-sm mt-2">{analysisError}</p>
                    )}
                </div>

                {/* メインコンテンツ */}
                {videoId && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <YouTubePlayerWrapper
                                videoId={videoId}
                                onReady={handlePlayerReady}
                            />
                        </div>
                        <div className="space-y-4">
                            <WebcamView ref={webcamRef} />
                        </div>
                    </div>
                )}

                {/* フィードバック表示 */}
                {feedback && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">AIフィードバック</h3>
                            {feedback.score !== null && (
                                <div className="text-3xl font-bold text-blue-400">
                                    {feedback.score}点
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-500/10 rounded-lg p-4">
                                <h4 className="text-green-400 font-medium mb-2">良い点</h4>
                                <p className="text-white">{feedback.goodPoint}</p>
                            </div>
                            <div className="bg-yellow-500/10 rounded-lg p-4">
                                <h4 className="text-yellow-400 font-medium mb-2">改善点</h4>
                                <p className="text-white">{feedback.improvementPoint}</p>
                            </div>
                            <div className="bg-blue-500/10 rounded-lg p-4">
                                <h4 className="text-blue-400 font-medium mb-2">アドバイス</h4>
                                <p className="text-white">{feedback.advice}</p>
                            </div>
                        </div>
                    </div>
                )}

                {isAnalyzing && (
                    <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                        <SparklesIcon className="inline-block w-5 h-5 mr-2 animate-pulse" />
                        分析中...
                    </div>
                )}
            </div>
        </div>
    );
}

// Main App with Clerk
function App() {
    return (
        <ClerkProvider publishableKey={clerkPubKey}>
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
                {/* Header */}
                <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            💃 Dance Motion Analyzer
                        </h1>
                        
                        <SignedIn>
                            <UserButton 
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        avatarBox: "w-10 h-10"
                                    }
                                }}
                            />
                        </SignedIn>
                    </div>
                </header>

                <SignedIn>
                    <DanceAnalyzer />
                </SignedIn>
                
                <SignedOut>
                    <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
                        <SignIn 
                            appearance={{
                                elements: {
                                    rootBox: "mx-auto",
                                    card: "bg-gray-900/50 backdrop-blur-lg"
                                }
                            }}
                        />
                    </div>
                </SignedOut>
            </div>
        </ClerkProvider>
    );
}

export default App;