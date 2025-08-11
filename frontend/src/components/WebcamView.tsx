import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { PoseLandmarker, DrawingUtils, FilesetResolver } from '@mediapipe/tasks-vision';
import type { WebcamViewHandles } from '../types';

const lerp = (start: number, end: number, amount: number) => {
    return start + (end - start) * amount;
};

const WebcamView = forwardRef<WebcamViewHandles, {}>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameId = useRef<number | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        await setupWebcam();
        if(isMounted) setIsLoading(false);
        
      } catch (e: any) {
        if(isMounted) {
            console.error("Failed to initialize MediaPipe or Webcam:", e);
            setError(`初期化エラー: ${e.message}. カメラのアクセス許可を確認してください。`);
            setIsLoading(false);
        }
      }
    };

    const setupWebcam = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("お使いのブラウザはカメラアクセスをサポートしていません。");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", predictWebcam);
        }
    };

    const predictWebcam = () => {
      if (!isMounted || !videoRef.current || !canvasRef.current || !poseLandmarkerRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const poseLandmarker = poseLandmarkerRef.current;
      
      if (video.readyState < 2) {
          animationFrameId.current = requestAnimationFrame(predictWebcam);
          return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const canvasCtx = canvas.getContext("2d")!;
      const drawingUtils = new DrawingUtils(canvasCtx);
      
      const startTimeMs = performance.now();
      const results = poseLandmarker.detectForVideo(video, startTimeMs);

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (results.landmarks) {
        for (const landmark of results.landmarks) {
          drawingUtils.drawLandmarks(landmark, {
            radius: (data) => lerp(5, 1, (data.from!.z + 1) / 2),
            color: '#a78bfa', // violet-400
            fillColor: '#a78bfa'
          });
          drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
              color: '#f472b6', // pink-400
              lineWidth: 3
          });
        }
      }
      canvasCtx.restore();

      animationFrameId.current = requestAnimationFrame(predictWebcam);
    };

    setupMediaPipe();
    
    return () => {
        isMounted = false;
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        poseLandmarkerRef.current?.close();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (videoRef.current && canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Flip the image horizontally to match the user's perspective
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg').split(',')[1];
        }
      }
      return null;
    },
  }));

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden relative aspect-video">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400"></div>
            <p className="ml-3 text-white">カメラを起動中...</p>
        </div>
      )}
      {error && (
         <div className="absolute inset-0 flex items-center justify-center z-20 p-4">
            <p className="text-center text-red-400">{error}</p>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-500 ${isLoading || error ? 'opacity-0' : 'opacity-100'}`}
      />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-10 transform -scale-x-100" />
    </div>
  );
});

export default WebcamView;