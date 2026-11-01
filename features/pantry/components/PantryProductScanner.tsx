"use client";

import { useEffect, useRef } from "react";

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

type PantryProductScannerProps = {
  onDetected: (barcode: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
  cameraError: string;
  unsupportedError: string;
  cancelLabel: string;
  instruction: string;
};

export function PantryProductScanner({
  onDetected,
  onError,
  onClose,
  cameraError,
  unsupportedError,
  cancelLabel,
  instruction,
}: PantryProductScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onDetectedRef.current = onDetected;
    onErrorRef.current = onError;
    onCloseRef.current = onClose;
  }, [onClose, onDetected, onError]);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let animationFrame = 0;
    let stopped = false;

    const startScanner = async () => {
      const Detector = (
        window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }
      ).BarcodeDetector;

      if (!Detector) {
        onErrorRef.current(unsupportedError);
        onCloseRef.current();
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) {
          throw new Error("Barcode scanner video element is unavailable.");
        }

        video.srcObject = stream;
        await video.play();

        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });

        const detectBarcode = async () => {
          if (stopped) return;

          try {
            const [match] = await detector.detect(video);
            if (match?.rawValue) {
              onDetectedRef.current(match.rawValue);
              return;
            }
          } catch (error) {
            console.error("Failed to scan product barcode:", error);
            onErrorRef.current(cameraError);
            onCloseRef.current();
            return;
          }

          animationFrame = requestAnimationFrame(() => {
            void detectBarcode();
          });
        };

        void detectBarcode();
      } catch (error) {
        console.error("Failed to access camera for barcode scanning:", error);
        onErrorRef.current(cameraError);
        onCloseRef.current();
      }
    };

    void startScanner();

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraError, unsupportedError]);

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <video
        ref={videoRef}
        aria-label={instruction}
        className="max-h-64 w-full rounded-lg bg-black object-cover"
        muted
        playsInline
      />
      <p className="text-sm text-slate-300">{instruction}</p>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
