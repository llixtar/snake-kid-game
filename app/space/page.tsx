"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

// Завантажуємо гру динамічно та вимикаємо SSR
const SpaceGame = dynamic(() => import("@/components/SpaceGame"), {
  ssr: false,
});

export default function SpacePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <main className="fixed inset-0 bg-slate-950" />;
  }

  return (
    <main className="fixed inset-0 bg-slate-950 flex items-center justify-center overflow-hidden select-none touch-none">
      <SpaceGame />
      
      {/* Кнопка "Додому" для повернення на робочий стіл порталу */}
      <div className="absolute bottom-4 left-4 z-[100] pointer-events-auto">
        <Link 
          href="/" 
          className="bg-black/40 hover:bg-black/60 backdrop-blur-md w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(255,255,255,0.15)] border border-white/20 text-xl sm:text-2xl transition-transform active:scale-90 cursor-pointer text-white no-underline"
        >
          🏠
        </Link>
      </div>
    </main>
  );
}
