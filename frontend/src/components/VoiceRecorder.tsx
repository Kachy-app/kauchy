"use client";
import React, { useRef, useState, useEffect } from 'react';
import { Mic, Trash2, Check } from 'lucide-react';

/**
 * In-app voice recorder using the MediaRecorder API.
 * Tap the mic to start; while recording, shows a timer with cancel / confirm.
 * On confirm, calls onRecorded with an audio File ready to upload.
 */
export default function VoiceRecorder({
    onRecorded,
    disabled = false,
    className = '',
}: {
    onRecorded: (file: File) => void;
    disabled?: boolean;
    className?: string;
}) {
    const [isRecording, setIsRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const keepRef = useRef(true); // false when the user cancels

    const stopTracks = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };

    // Clean up if the component unmounts mid-recording.
    useEffect(() => () => { stopTracks(); }, []);

    const start = async () => {
        if (disabled) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mr = new MediaRecorder(stream);
            chunksRef.current = [];
            keepRef.current = true;
            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                stopTracks();
                if (keepRef.current && chunksRef.current.length) {
                    const type = mr.mimeType || 'audio/webm';
                    const ext = type.includes('mp4') || type.includes('m4a') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
                    const blob = new Blob(chunksRef.current, { type });
                    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
                    onRecorded(file);
                }
            };
            mr.start();
            recorderRef.current = mr;
            setIsRecording(true);
            setSeconds(0);
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        } catch (e) {
            alert('Microphone access is required to record a voice message.');
        }
    };

    const finish = () => {
        keepRef.current = true;
        recorderRef.current?.stop();
        setIsRecording(false);
    };

    const cancel = () => {
        keepRef.current = false;
        recorderRef.current?.stop();
        setIsRecording(false);
    };

    const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

    if (!isRecording) {
        return (
            <button
                type="button"
                onClick={start}
                disabled={disabled}
                className={`flex items-center justify-center rounded-full transition-colors disabled:opacity-50 ${className}`}
                title="Record voice"
            >
                <Mic size={20} />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <button type="button" onClick={cancel} className="p-2 rounded-full bg-gray-100 dark:bg-zinc-800 text-red-500 hover:bg-gray-200 dark:hover:bg-zinc-700" title="Cancel">
                <Trash2 size={18} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">{mmss}</span>
            </div>
            <button type="button" onClick={finish} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700" title="Use recording">
                <Check size={18} />
            </button>
        </div>
    );
}
