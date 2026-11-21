"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  Wand2,
  CornerDownLeft,
  AlertCircle,
} from "lucide-react";

interface BrainDumpProps {
  onAnalyze: (text: string) => Promise<void>;
  isAnalyzing: boolean;
}

// Type declaration for Web Speech API
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

export function BrainDump({ onAnalyze, isAnalyzing }: BrainDumpProps) {
  const [text, setText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // 3D Tilt reactive values
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [3, -3]), {
    stiffness: 200,
    damping: 25,
  });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-3, 3]), {
    stiffness: 200,
    damping: 25,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new (SpeechRecognitionCtor as new () => SpeechRecognitionInstance)();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += transcript + " ";
        } else {
          interimChunk += transcript;
        }
      }

      if (finalChunk) {
        setText((prev) => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} ${finalChunk.trim()}` : finalChunk.trim();
        });
      }
      setInterimText(interimChunk);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setVoiceError("Доступ к микрофону запрещён в настройках браузера.");
      } else if (event.error !== "aborted") {
        setVoiceError(`Ошибка голосового ввода: ${event.error}`);
      }
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    setVoiceError(null);
    if (!speechSupported || !recognitionRef.current) {
      setVoiceError("Ваш браузер не поддерживает Web Speech API (используйте Chrome или Edge).");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText("");
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  };

  const handleSubmit = async () => {
    const combinedText = `${text} ${interimText}`.trim();
    if (!combinedText || isAnalyzing) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText("");
    }

    await onAnalyze(combinedText);
    setText("");
    setInterimText("");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const quickExamples = [
    "Сегодня к 18:00 отправить финансовый отчёт директору, завтра утром записаться к стоматологу, в пятницу обновить портфолио и вечером купить кофе",
    "Срочно исправить критический баг на продакшене до 16:00, на следующей неделе изучить документацию Next.js и ответить на рекламные рассылки",
  ];

  return (
    <div className="perspective-1000">
      <motion.section
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY }}
        className="glass-panel preserve-3d relative overflow-hidden rounded-3xl border border-white/15 p-5 sm:p-6"
      >
        {/* Top ambient glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-3/4 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/15 via-violet-500/15 to-rose-500/15 blur-3xl" />

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15 text-violet-300">
              <Wand2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white sm:text-lg">
                Brain Dump • Умный поток мыслей
              </h2>
              <p className="text-xs text-slate-400">
                Напишите или надиктуйте все дела сплошным текстом — ИИ сам выделит дедлайны, категории и распределит по Матрице Эйзенхауэра
              </p>
            </div>
          </div>

          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-300"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
              </span>
              Слушаю (ru-RU)... Говорите
            </motion.div>
          )}
        </div>

        {/* Input Box */}
        <div className="relative mt-2">
          <textarea
            value={interimText ? `${text}${text ? " " : ""}${interimText}` : text}
            onChange={(e) => {
              setInterimText("");
              setText(e.target.value);
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isAnalyzing}
            rows={3}
            placeholder="Например: «Срочно до 17:00 подготовить презентацию для инвесторов, вечером позвонить курьеру, а в субботу пройти курс по архитектуре БД...»"
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 pr-14 text-sm text-slate-100 placeholder-slate-500 shadow-inner outline-none transition focus:border-cyan-400/50 focus:bg-black/60 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60 sm:text-base"
          />

          {/* Voice Button Inside Input */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={toggleListening}
            disabled={isAnalyzing}
            title={
              isListening
                ? "Остановить голосовой ввод"
                : "Голосовой ввод (Web Speech API, Русский)"
            }
            className={`absolute right-3.5 top-3.5 flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              isListening
                ? "border-rose-400 bg-rose-500/25 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.5)]"
                : "border-white/15 bg-white/5 text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-500/15 hover:text-cyan-300"
            }`}
          >
            {isListening ? (
              <MicOff className="h-5 w-5 animate-pulse" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </motion.button>
        </div>

        {voiceError && (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{voiceError}</span>
          </div>
        )}

        {/* Bottom Action Bar & Quick Samples */}
        <div className="mt-3.5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400">Быстрый тест:</span>
            {quickExamples.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setText(sample)}
                disabled={isAnalyzing}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-left text-[11px] text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200"
              >
                Пример #{idx + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="hidden items-center gap-1 text-[11px] text-slate-500 md:inline-flex">
              <CornerDownLeft className="h-3 w-3" />
              Ctrl + Enter
            </span>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03, translateY: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={isAnalyzing || (!text.trim() && !interimText.trim())}
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/25 via-violet-500/25 to-rose-500/25 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(34,211,238,0.25)] transition hover:border-cyan-300 hover:shadow-[0_0_35px_rgba(34,211,238,0.45)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                  <span>ИИ разбирает задачи...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-cyan-300 transition-transform group-hover:rotate-12" />
                  <span>Разобрать с помощью ИИ</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
