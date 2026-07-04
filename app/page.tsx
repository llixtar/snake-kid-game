"use client";

import Link from "next/link";

export default function KidsPortal() {
  return (
    <main className="fixed inset-0 bg-gradient-to-b from-blue-500 to-yellow-400 flex flex-col items-center justify-center overflow-hidden select-none touch-none">
      
      {/* Верхній статус-бар (Заголовок по центру) */}
      <div className="absolute top-0 w-full pt-8 pb-4 px-6 flex justify-center items-center text-white font-black text-3xl sm:text-5xl z-10 pointer-events-none drop-shadow-lg text-center leading-tight">
        Портал дитячих ігор
      </div>

      {/* Контейнер для іконок ігор */}
      <div className="relative z-10 flex flex-wrap gap-8 sm:gap-12 p-6 sm:p-10 justify-center items-center max-w-5xl mt-16 sm:mt-24">
        
        {/* Гра 1: Змійка */}
        <Link href="/snake">
          <div className="group flex flex-col items-center gap-3 cursor-pointer transform transition-all duration-300 hover:scale-110 active:scale-95">
            <div className="w-28 h-28 sm:w-40 sm:h-40 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-[2rem] shadow-[0_10px_25px_rgba(16,185,129,0.5)] flex items-center justify-center border-[3px] border-white/30 group-hover:border-white/80 group-hover:shadow-[0_15px_35px_rgba(16,185,129,0.7)] relative overflow-hidden">
              <span className="text-[4rem] sm:text-[6rem] filter drop-shadow-lg group-hover:animate-bounce">🐍</span>
              
              {/* Відблиск на іконці */}
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-[2rem]" />
            </div>
            <span className="text-xl sm:text-3xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-wide bg-black/20 px-5 py-1.5 rounded-full border border-white/10">
              Змійка
            </span>
          </div>
        </Link>

        {/* Гра 2: Гонки */}
        <Link href="/racing">
          <div className="group flex flex-col items-center gap-3 cursor-pointer transform transition-all duration-300 hover:scale-110 active:scale-95">
            <div className="w-28 h-28 sm:w-40 sm:h-40 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-[2rem] shadow-[0_10px_25px_rgba(59,130,246,0.5)] flex items-center justify-center border-[3px] border-white/30 group-hover:border-white/80 group-hover:shadow-[0_15px_35px_rgba(59,130,246,0.7)] relative overflow-hidden">
              <span className="text-[4rem] sm:text-[6rem] filter drop-shadow-lg group-hover:animate-bounce">🏎️</span>
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-[2rem]" />
            </div>
            <span className="text-xl sm:text-3xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-wide bg-black/20 px-5 py-1.5 rounded-full border border-white/10">
              Гонки
            </span>
          </div>
        </Link>

      </div>

    </main>
  );
}