"use client";

import dynamic from "next/dynamic";

// Завантажуємо гру динамічно та вимикаємо SSR (серверний рендеринг) для неї
const GameContainer = dynamic(() => import("../components/GameContainer"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="fixed inset-0 bg-slate-900 flex items-center justify-center overflow-hidden select-none touch-none">
      <GameContainer />
    </main>
  );
}