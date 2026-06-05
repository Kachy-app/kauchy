"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";

interface QRScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
  orderData?: { id: string; status: string };
}

export default function QRScannerOverlay({
  isOpen,
  onClose,
  onScanSuccess,
}: QRScannerOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef(false);
  const [scanState, setScanState] = useState<
    "scanning" | "success" | "error" | "no-camera"
  >("scanning");
  const [cameraReady, setCameraReady] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Continuously grab frames and decode QR codes with jsQR.
  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || scannedRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          scannedRef.current = true;
          setScanState("success");
          if (navigator.vibrate) navigator.vibrate(60);
          const result = code.data;
          setTimeout(() => onScanSuccess(result), 900);
          return;
        }
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [onScanSuccess]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
          rafRef.current = requestAnimationFrame(scanLoop);
        };
      }
    } catch {
      setScanState("no-camera");
    }
  }, [scanLoop]);

  useEffect(() => {
    if (isOpen) {
      scannedRef.current = false;
      setScanState("scanning");
      setIsClosing(false);
      startCamera();
      return () => {
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      stopCamera();
      onClose();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-300 ${isClosing ? "opacity-0" : "animate-scannerFadeIn"}`}
    >
      {/* Camera feed background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-[env(safe-area-inset-top,16px)] pb-4 z-20">
        <span className="text-white font-semibold text-base drop-shadow-lg">Scan QR code</span>
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white text-xl hover:bg-white/20 transition-all active:scale-90"
          aria-label="Close scanner"
        >
          ✕
        </button>
      </div>

      {/* Instruction text */}
      <div className="absolute top-[16%] left-0 right-0 flex flex-col items-center z-20 pointer-events-none px-6 text-center">
        <p className="text-white/90 text-base sm:text-lg font-medium tracking-wide drop-shadow-lg">
          Point your camera at the QR code
        </p>
        <p className="text-white/50 text-xs sm:text-sm mt-1">
          It will be scanned automatically
        </p>
      </div>

      {/* Viewfinder — the box-shadow creates a Telegram-style dimmed surround
          with a clear rounded-square cutout in the middle. */}
      <div
        className="relative w-[270px] h-[270px] sm:w-[290px] sm:h-[290px] z-10 rounded-[28px] animate-viewfinderIn"
        style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)" }}
      >
        {/* Corner brackets */}
        <Corner position="top-left" state={scanState} />
        <Corner position="top-right" state={scanState} />
        <Corner position="bottom-left" state={scanState} />
        <Corner position="bottom-right" state={scanState} />

        {/* Scan line */}
        {scanState === "scanning" && cameraReady && (
          <div className="absolute left-3 right-3 h-[2px] animate-scanLine z-20">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-[#34D399] to-transparent rounded-full shadow-[0_0_12px_2px_rgba(52,211,153,0.5)]" />
          </div>
        )}

        {/* Success overlay */}
        {scanState === "success" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center animate-scannerFadeIn">
            <div className="absolute inset-0 rounded-[28px] bg-[#34D399]/15 animate-scanSuccess" />
            <div className="w-16 h-16 rounded-full bg-[#34D399] flex items-center justify-center shadow-[0_0_30px_8px_rgba(52,211,153,0.4)] animate-scannerFadeIn">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-white font-semibold mt-4 text-sm drop-shadow-lg">
              QR Code captured!
            </p>
          </div>
        )}

        {/* No camera fallback */}
        {scanState === "no-camera" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 animate-scannerFadeIn">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.5 7.5V6a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v1.5" />
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <circle cx="12" cy="14" r="3" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </div>
            <p className="text-white/80 text-sm font-medium">Camera unavailable</p>
            <p className="text-white/40 text-xs text-center px-6">
              Allow camera access or check your device settings
            </p>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-[12%] left-0 right-0 flex justify-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md">
          <div className={`w-2 h-2 rounded-full ${scanState === "scanning" ? "bg-[#34D399] animate-pulse" : scanState === "success" ? "bg-[#34D399]" : "bg-red-400"}`} />
          <span className="text-white/70 text-xs font-medium">
            {scanState === "scanning"
              ? cameraReady ? "Scanning..." : "Starting camera..."
              : scanState === "success"
                ? "Captured"
                : "No camera"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Corner bracket sub-component ─── */

function Corner({
  position,
  state,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  state: "scanning" | "success" | "error" | "no-camera";
}) {
  const size = 36;
  const thickness = 3;
  const color = state === "success" ? "#34D399" : "#ffffff";

  const positionClasses: Record<string, string> = {
    "top-left": "top-0 left-0",
    "top-right": "top-0 right-0",
    "bottom-left": "bottom-0 left-0",
    "bottom-right": "bottom-0 right-0",
  };

  const borderClasses: Record<string, string> = {
    "top-left": "border-t border-l rounded-tl-[28px]",
    "top-right": "border-t border-r rounded-tr-[28px]",
    "bottom-left": "border-b border-l rounded-bl-[28px]",
    "bottom-right": "border-b border-r rounded-br-[28px]",
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} ${borderClasses[position]} animate-cornerPulse transition-colors duration-500`}
      style={{
        width: size,
        height: size,
        borderColor: color,
        borderWidth: thickness,
        filter: state === "success" ? `drop-shadow(0 0 8px ${color})` : `drop-shadow(0 0 4px rgba(255,255,255,0.3))`,
      }}
    />
  );
}
