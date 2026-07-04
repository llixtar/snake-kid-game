"use client";

import React, { useEffect, useRef, useState } from "react";

// --- ТИПИ ТА КОНСТАНТИ ---
const CAR_WIDTH = 50;
const CAR_HEIGHT = 90;
const ROAD_WIDTH = 320; // Ширина дороги

interface Car {
  x: number;
  y: number;
  color: string;
  speed: number;
  lane: number;
}

interface Item {
  x: number;
  y: number;
  type: "heart" | "gun";
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

// Доступні кольори машинок для вибору
const CAR_COLORS = [
  { hex: "#ef4444", label: "Червона" },
  { hex: "#3b82f6", label: "Синя" },
  { hex: "#22c55e", label: "Зелена" },
  { hex: "#ec4899", label: "Рожева" },
  { hex: "#f97316", label: "Помаранчева" },
  { hex: "#eab308", label: "Жовта" },
];

// HTML/CSS іконка машинки для екрану вибору кольору
const CarIcon = ({ color }: { color: string }) => (
  <div className="relative w-12 h-20 bg-slate-800/40 rounded-xl flex items-center justify-center p-1 border border-white/10 shadow-lg select-none">
    {/* Wheels */}
    <div className="absolute -left-1.5 top-3 w-1.5 h-4 bg-slate-900 rounded-sm" />
    <div className="absolute -right-1.5 top-3 w-1.5 h-4 bg-slate-900 rounded-sm" />
    <div className="absolute -left-1.5 bottom-3 w-1.5 h-4 bg-slate-900 rounded-sm" />
    <div className="absolute -right-1.5 bottom-3 w-1.5 h-4 bg-slate-900 rounded-sm" />
    {/* Car body */}
    <div className="w-full h-full rounded-lg flex flex-col justify-between p-1 relative overflow-hidden" style={{ backgroundColor: color }}>
      {/* Lights */}
      <div className="flex justify-between w-full">
        <div className="w-1 h-1 bg-yellow-200 rounded-full" />
        <div className="w-1 h-1 bg-yellow-200 rounded-full" />
      </div>
      {/* Windshield */}
      <div className="w-full h-3 bg-slate-950/80 rounded mt-0.5" />
      {/* Rear window */}
      <div className="w-full h-2.5 bg-slate-950/80 rounded mb-0.5" />
      {/* Taillights */}
      <div className="flex justify-between w-full">
        <div className="w-1.5 h-0.5 bg-red-500" />
        <div className="w-1.5 h-0.5 bg-red-500" />
      </div>
    </div>
  </div>
);

export default function RacingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Стани UI
  const [uiState, setUiState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  
  // Рефи для гри (щоб не рендерити компонент на кожен кадр)
  const gameStateRef = useRef<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animationTime = useRef(0);
  const colorRef = useRef('#ef4444');
  
  // Гравця машинка
  const playerPos = useRef({ x: 0, y: 0 }); 
  const targetPos = useRef({ x: 0, y: 0 }); 
  
  // Дорога
  const roadOffset = useRef(0);
  const baseSpeed = useRef(5); 
  
  // Об'єкти
  const enemies = useRef<Car[]>([]);
  const items = useRef<Item[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  
  // Таймери
  const spawnTimer = useRef(0);
  const itemSpawnTimer = useRef(150);
  const gunTimer = useRef(0);
  const invulnTimer = useRef(0); 
  const crashTimer = useRef(0); // Мікро-стан зіткнення (крутіння/удар)
  
  // Оновлюємо реф кольору при зміні стану
  useEffect(() => {
    colorRef.current = selectedColor;
  }, [selectedColor]);

  // --- МАЛЮВАННЯ MAШИНКИ ---
  const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isPlayer: boolean, angle = 0) => {
    ctx.save();
    ctx.translate(x, y);
    if (angle !== 0) {
      ctx.rotate(angle);
    }
    
    // Тінь
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.roundRect(-CAR_WIDTH/2 + 5, -CAR_HEIGHT/2 + 5, CAR_WIDTH, CAR_HEIGHT, 10);
    ctx.fill();

    // Колеса
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-CAR_WIDTH/2 - 4, -CAR_HEIGHT/2 + 15, 8, 20);
    ctx.fillRect(CAR_WIDTH/2 - 4, -CAR_HEIGHT/2 + 15, 8, 20);
    ctx.fillRect(-CAR_WIDTH/2 - 4, CAR_HEIGHT/2 - 30, 8, 20);
    ctx.fillRect(CAR_WIDTH/2 - 4, CAR_HEIGHT/2 - 30, 8, 20);

    // Зброя на машині (якщо активна)
    if (isPlayer && gunTimer.current > 0) {
      ctx.fillStyle = "#475569";
      // Ліве дуло
      ctx.fillRect(-CAR_WIDTH/2 + 4, -CAR_HEIGHT/2 - 10, 6, 15);
      // Праве дуло
      ctx.fillRect(CAR_WIDTH/2 - 10, -CAR_HEIGHT/2 - 10, 6, 15);
    }

    // Світіння при невразливості або активній зброї
    if (isPlayer) {
      if (gunTimer.current > 0) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#f43f5e"; // Рожеве світіння зброї
      } else if (invulnTimer.current > 0) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#3b82f6"; // Синє світіння щита
      }
    }

    // Основний корпус
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-CAR_WIDTH/2, -CAR_HEIGHT/2, CAR_WIDTH, CAR_HEIGHT, 12);
    ctx.fill();

    // Вимикаємо тінь/світіння для подальших елементів
    ctx.shadowBlur = 0;

    // Бліки (Glassmorphism) на корпусі
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.roundRect(-CAR_WIDTH/2 + 2, -CAR_HEIGHT/2 + 2, CAR_WIDTH/2 - 2, CAR_HEIGHT - 4, 10);
    ctx.fill();

    // Лобове скло
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(18, -10);
    ctx.lineTo(14, -25);
    ctx.lineTo(-14, -25);
    ctx.fill();

    // Заднє скло
    ctx.beginPath();
    ctx.moveTo(-18, 20);
    ctx.lineTo(18, 20);
    ctx.lineTo(14, 30);
    ctx.lineTo(-14, 30);
    ctx.fill();

    // Фари передні (світяться)
    ctx.fillStyle = isPlayer ? "#fef08a" : "#fcd34d"; 
    ctx.beginPath();
    ctx.arc(-CAR_WIDTH/2 + 8, -CAR_HEIGHT/2 + 5, 4, 0, Math.PI * 2);
    ctx.arc(CAR_WIDTH/2 - 8, -CAR_HEIGHT/2 + 5, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Світло від фар
    if (isPlayer && crashTimer.current === 0) {
      const gradL = ctx.createLinearGradient(-CAR_WIDTH/2 + 8, -CAR_HEIGHT/2, -CAR_WIDTH/2 + 8, -CAR_HEIGHT/2 - 60);
      gradL.addColorStop(0, "rgba(253, 224, 71, 0.4)");
      gradL.addColorStop(1, "rgba(253, 224, 71, 0)");
      ctx.fillStyle = gradL;
      ctx.beginPath();
      ctx.moveTo(-CAR_WIDTH/2 + 4, -CAR_HEIGHT/2 + 5);
      ctx.lineTo(-CAR_WIDTH/2 + 12, -CAR_HEIGHT/2 + 5);
      ctx.lineTo(-CAR_WIDTH/2 + 25, -CAR_HEIGHT/2 - 60);
      ctx.lineTo(-CAR_WIDTH/2 - 15, -CAR_HEIGHT/2 - 60);
      ctx.fill();

      const gradR = ctx.createLinearGradient(CAR_WIDTH/2 - 8, -CAR_HEIGHT/2, CAR_WIDTH/2 - 8, -CAR_HEIGHT/2 - 60);
      gradR.addColorStop(0, "rgba(253, 224, 71, 0.4)");
      gradR.addColorStop(1, "rgba(253, 224, 71, 0)");
      ctx.fillStyle = gradR;
      ctx.beginPath();
      ctx.moveTo(CAR_WIDTH/2 - 12, -CAR_HEIGHT/2 + 5);
      ctx.lineTo(CAR_WIDTH/2 - 4, -CAR_HEIGHT/2 + 5);
      ctx.lineTo(CAR_WIDTH/2 + 15, -CAR_HEIGHT/2 - 60);
      ctx.lineTo(CAR_WIDTH/2 - 25, -CAR_HEIGHT/2 - 60);
      ctx.fill();
    }

    // Задні фари (стопи)
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-CAR_WIDTH/2 + 4, CAR_HEIGHT/2 - 5, 10, 4);
    ctx.fillRect(CAR_WIDTH/2 - 14, CAR_HEIGHT/2 - 5, 10, 4);

    ctx.restore();
  };

  const startGame = () => {
    if (!canvasRef.current) return;
    setUiState('PLAYING');
    gameStateRef.current = 'PLAYING';
    scoreRef.current = 0;
    setScore(0);
    livesRef.current = 3;
    setLives(3);
    enemies.current = [];
    items.current = [];
    bullets.current = [];
    particles.current = [];
    gunTimer.current = 0;
    invulnTimer.current = 0;
    crashTimer.current = 0;
    
    const cw = canvasRef.current.width;
    const ch = canvasRef.current.height;
    playerPos.current = { x: cw / 2, y: ch - 100 };
    targetPos.current = { x: cw / 2, y: ch - 100 };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (gameStateRef.current === 'START') {
        playerPos.current = { x: canvas.width / 2, y: canvas.height - 100 };
        targetPos.current = { x: canvas.width / 2, y: canvas.height - 100 };
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const gameLoop = () => {
      animationTime.current += 1;
      const cw = canvas.width;
      const ch = canvas.height;

      // Логіка гри
      if (gameStateRef.current === 'PLAYING') {
        // Рух машинки до targetPos (тільки якщо не в стані аварійного занесення/крутіння)
        if (crashTimer.current > 0) {
          crashTimer.current--;
          // Під час занесення машинку трясе і зносить трохи вниз/вбік
          playerPos.current.y += 2;
          playerPos.current.x += Math.sin(crashTimer.current * 0.5) * 4;
        } else {
          const dx = targetPos.current.x - playerPos.current.x;
          const dy = targetPos.current.y - playerPos.current.y;
          playerPos.current.x += dx * 0.15;
          playerPos.current.y += dy * 0.15;
        }

        // Обмеження машинки по дорозі
        const roadLeft = cw / 2 - ROAD_WIDTH / 2 + CAR_WIDTH / 2;
        const roadRight = cw / 2 + ROAD_WIDTH / 2 - CAR_WIDTH / 2;
        if (playerPos.current.x < roadLeft) playerPos.current.x = roadLeft;
        if (playerPos.current.x > roadRight) playerPos.current.x = roadRight;
        
        if (playerPos.current.y < ch / 2) playerPos.current.y = ch / 2;
        if (playerPos.current.y > ch - 80) playerPos.current.y = ch - 80;

        // Динамічна швидкість дороги (якщо занесення - швидкість падає)
        const crashSlowdown = crashTimer.current > 0 ? 0.2 : 1.0;
        const speedMultiplier = (1 + (ch - 80 - playerPos.current.y) / (ch / 2) * 1.5) * crashSlowdown;
        const currentRoadSpeed = baseSpeed.current * speedMultiplier;
        roadOffset.current += currentRoadSpeed;

        // Нараховуємо очки за рух
        if (animationTime.current % 10 === 0 && crashTimer.current === 0) {
          scoreRef.current += Math.floor(currentRoadSpeed / 2);
          setScore(scoreRef.current);
        }

        // Таймери
        if (invulnTimer.current > 0) invulnTimer.current--;
        if (gunTimer.current > 0) {
          gunTimer.current--;
          // Стрільба автоматично (кожні 12 кадрів)
          if (gunTimer.current % 12 === 0) {
            bullets.current.push({
              x: playerPos.current.x - 12,
              y: playerPos.current.y - CAR_HEIGHT / 2,
              speed: 12,
            });
            bullets.current.push({
              x: playerPos.current.x + 12,
              y: playerPos.current.y - CAR_HEIGHT / 2,
              speed: 12,
            });
          }
        }

        // Рух куль
        for (let b = bullets.current.length - 1; b >= 0; b--) {
          const bullet = bullets.current[b];
          bullet.y -= bullet.speed;

          // Зіткнення кулі з ворожими машинами
          let bulletHit = false;
          for (let i = enemies.current.length - 1; i >= 0; i--) {
            const enemy = enemies.current[i];
            const distEBX = Math.abs(enemy.x - bullet.x);
            const distEBY = Math.abs(enemy.y - bullet.y);

            if (distEBX < CAR_WIDTH * 0.7 && distEBY < CAR_HEIGHT * 0.6) {
              // Знищуємо ворога
              enemies.current.splice(i, 1);
              bulletHit = true;
              scoreRef.current += 150; // Бонусні очки
              setScore(scoreRef.current);

              // Створюємо іскри/вибух машини
              for (let p = 0; p < 12; p++) {
                particles.current.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  color: enemy.color,
                  life: 25,
                  maxLife: 25
                });
              }
              break;
            }
          }

          if (bulletHit || bullet.y < -50) {
            bullets.current.splice(b, 1);
          }
        }

        // Спавн ворогів
        spawnTimer.current--;
        if (spawnTimer.current <= 0) {
          const lanes = 3;
          const laneWidth = ROAD_WIDTH / lanes;
          const lane = Math.floor(Math.random() * lanes);
          const ex = cw / 2 - ROAD_WIDTH / 2 + lane * laneWidth + laneWidth / 2;
          
          const colors = ["#3b82f6", "#eab308", "#f97316", "#a855f7", "#ec4899", "#14b8a6"];
          const ccolor = colors[Math.floor(Math.random() * colors.length)];

          enemies.current.push({
            x: ex,
            y: -100,
            color: ccolor,
            speed: 2 + Math.random() * 3,
            lane
          });

          spawnTimer.current = Math.max(35, 90 - scoreRef.current / 400);
        }

        // Спавн предметів (сердечка та кулемети)
        itemSpawnTimer.current--;
        if (itemSpawnTimer.current <= 0) {
          const lanes = 3;
          const laneWidth = ROAD_WIDTH / lanes;
          const lane = Math.floor(Math.random() * lanes);
          const ix = cw / 2 - ROAD_WIDTH / 2 + lane * laneWidth + laneWidth / 2;
          const type = Math.random() < 0.45 ? 'heart' : 'gun'; // ~45% серце, ~55% кулемет

          items.current.push({ x: ix, y: -50, type });
          itemSpawnTimer.current = 250 + Math.random() * 200; // Наступний спавн
        }

        // Рух та зіткнення предметів
        for (let i = items.current.length - 1; i >= 0; i--) {
          const item = items.current[i];
          item.y += currentRoadSpeed;

          // Зіткнення з гравцем
          const distX = Math.abs(item.x - playerPos.current.x);
          const distY = Math.abs(item.y - playerPos.current.y);

          if (distX < CAR_WIDTH * 0.8 && distY < CAR_HEIGHT * 0.8) {
            if (item.type === 'heart') {
              if (livesRef.current < 3) {
                livesRef.current += 1;
                setLives(livesRef.current);
              }
            } else if (item.type === 'gun') {
              gunTimer.current = 360; // 6 секунд зброї
            }
            
            // Ефект підбору (іскри кольору предмета)
            const particleColor = item.type === 'heart' ? '#ef4444' : '#ec4899';
            for (let p = 0; p < 8; p++) {
              particles.current.push({
                x: item.x,
                y: item.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                color: particleColor,
                life: 15,
                maxLife: 15
              });
            }

            items.current.splice(i, 1);
            continue;
          }

          if (item.y > ch + 100) {
            items.current.splice(i, 1);
          }
        }

        // Рух та зіткнення ворогів
        for (let i = enemies.current.length - 1; i >= 0; i--) {
          const enemy = enemies.current[i];
          enemy.y += currentRoadSpeed + enemy.speed;

          // Перевірка зіткнення з гравцем
          if (invulnTimer.current === 0 && crashTimer.current === 0) {
            const distX = Math.abs(enemy.x - playerPos.current.x);
            const distY = Math.abs(enemy.y - playerPos.current.y);
            
            if (distX < CAR_WIDTH * 0.85 && distY < CAR_HEIGHT * 0.85) {
              // Аварія!
              livesRef.current -= 1;
              setLives(livesRef.current);
              invulnTimer.current = 120; // 2 секунди невразливості
              crashTimer.current = 45; // 0.75 секунди занесення/крутіння
              
              // Запускаємо вибухові іскри аварії
              for (let p = 0; p < 15; p++) {
                particles.current.push({
                  x: (enemy.x + playerPos.current.x)/2,
                  y: (enemy.y + playerPos.current.y)/2,
                  vx: (Math.random() - 0.5) * 10,
                  vy: (Math.random() - 0.5) * 10,
                  color: "#f59e0b", // помаранчеві іскри вогню
                  life: 30,
                  maxLife: 30
                });
              }

              // Відкидаємо ціль назад
              targetPos.current.y = ch - 80;

              if (livesRef.current <= 0) {
                gameStateRef.current = 'GAMEOVER';
                setUiState('GAMEOVER');
              }
            }
          }

          if (enemy.y > ch + 100) {
            enemies.current.splice(i, 1);
          }
        }

        // Оновлення частинок вибуху
        for (let p = particles.current.length - 1; p >= 0; p--) {
          const part = particles.current[p];
          part.x += part.vx;
          part.y += part.vy;
          part.life--;
          if (part.life <= 0) {
            particles.current.splice(p, 1);
          }
        }
      }

      // --- МАЛЮВАННЯ ФОНУ ТА ДОРОГИ ---
      ctx.fillStyle = "#22c55e"; 
      ctx.fillRect(0, 0, cw, ch);

      // Дорога
      ctx.fillStyle = "#334155"; 
      ctx.fillRect(cw / 2 - ROAD_WIDTH / 2, 0, ROAD_WIDTH, ch);
      
      // Бордюри
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(cw / 2 - ROAD_WIDTH / 2 - 10, 0, 10, ch);
      ctx.fillRect(cw / 2 + ROAD_WIDTH / 2, 0, 10, ch);

      // Розмітка
      ctx.fillStyle = "#ffffff";
      const lCount = 3;
      const lWidth = ROAD_WIDTH / lCount;
      
      for (let l = 1; l < lCount; l++) {
        const lineX = cw / 2 - ROAD_WIDTH / 2 + l * lWidth;
        const lineLen = 40;
        const lineGap = 40;
        const totalLine = lineLen + lineGap;
        const offset = roadOffset.current % totalLine;
        
        for (let y = -totalLine; y < ch + totalLine; y += totalLine) {
          ctx.fillRect(lineX - 3, y + offset, 6, lineLen);
        }
      }

      // --- МАЛЮВАННЯ ПРЕДМЕТІВ ---
      items.current.forEach(item => {
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.translate(item.x, item.y);
        const floatY = Math.sin(animationTime.current * 0.15) * 6;

        ctx.font = "32px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.type === 'heart' ? '❤️' : '🔫', 0, floatY);
        ctx.restore();
      });

      // --- МАЛЮВАННЯ КУЛЬ ---
      ctx.fillStyle = "#fef08a"; 
      bullets.current.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Маленький вогняний слід
        ctx.fillStyle = "rgba(253,224,71,0.4)";
        ctx.beginPath();
        ctx.arc(b.x, b.y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fef08a"; 
      });

      // --- МАЛЮВАННЯ ВОРОГІВ ---
      enemies.current.forEach(e => {
        drawCar(ctx, e.x, e.y, e.color, false);
      });

      // --- МАЛЮВАННЯ ГРАВЦЯ ---
      if (gameStateRef.current !== 'START') {
        if (invulnTimer.current === 0 || Math.floor(animationTime.current / 8) % 2 === 0) {
          const spinAngle = crashTimer.current > 0 ? (crashTimer.current / 45) * Math.PI * 4 : 0;
          drawCar(ctx, playerPos.current.x, playerPos.current.y, colorRef.current, true, spinAngle); 
        }
      } else {
        drawCar(ctx, cw / 2, ch - 150, colorRef.current, true);
      }

      // --- МАЛЮВАННЯ ЧАСТИНК ВИБУХУ ---
      particles.current.forEach(p => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + (1 - p.life / p.maxLife) * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    // --- УПРАВЛІННЯ ---
    const updateTargetPos = (clientX: number, clientY: number) => {
      if (gameStateRef.current !== 'PLAYING') return;
      targetPos.current = { x: clientX, y: clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      if (e.touches && e.touches[0]) {
        updateTargetPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleTouchStart = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      if (e.touches && e.touches[0]) {
        updateTargetPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseMove = (e: MouseEvent) => updateTargetPos(e.clientX, e.clientY);
    const handleMouseDown = (e: MouseEvent) => updateTargetPos(e.clientX, e.clientY);

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden touch-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HUD Score */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-black/40 text-white font-bold px-4 py-2 sm:px-6 sm:py-3 rounded-full border border-white/20 shadow-lg backdrop-blur-sm flex items-center gap-3">
          <span className="text-xl sm:text-3xl filter drop-shadow-md">🏆</span>
          <span className="text-lg sm:text-2xl font-black tracking-widest">{score}</span>
        </div>
      </div>

      {/* ЛАЙФБАР */}
      <div className="absolute top-4 right-4 pointer-events-none flex gap-1 bg-black/40 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/20 backdrop-blur-sm">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`text-xl sm:text-3xl transition-all duration-300 ${i <= lives ? 'filter drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] scale-100 opacity-100' : 'grayscale opacity-30 scale-75'}`}>
            ❤️
          </span>
        ))}
      </div>

      {/* OVERLAY: СТАРТ */}
      {uiState === 'START' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto pointer-events-auto">
          <div className="bg-white/95 rounded-[2.5rem] p-6 sm:p-10 flex flex-col items-center gap-5 shadow-2xl border-[3px] border-slate-200 max-w-md w-full animate-in fade-in zoom-in duration-300">
            <span className="text-[4rem] sm:text-[5.5rem] animate-bounce">🏎️</span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 text-center leading-none">Супер Гонки!</h1>
            
            <p className="text-center text-slate-500 font-bold text-sm sm:text-base max-w-xs -mt-2">
              Керуй пальцем, збирай ❤️ та 🔫 для стрільби!
            </p>

            {/* ВИБІР КОЛЬОРУ МАШИНКИ */}
            <div className="w-full flex flex-col gap-3 items-center mt-2">
              <span className="text-base sm:text-lg font-black text-slate-700">Обери колір машинки:</span>
              <div className="grid grid-cols-3 gap-4 justify-center items-center">
                {CAR_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setSelectedColor(c.hex)}
                    className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-all active:scale-95 ${
                      selectedColor === c.hex
                        ? "border-blue-500 bg-blue-50/70 scale-105 shadow-md"
                        : "border-transparent hover:border-slate-200"
                    }`}
                  >
                    <CarIcon color={c.hex} />
                    <span className="text-xs font-bold text-slate-600 mt-1">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full bg-blue-500 text-white rounded-2xl py-4 shadow-[0_5px_0_rgb(29,78,216)] active:shadow-[0_0px_0_rgb(29,78,216)] active:translate-y-1.5 transition-all hover:bg-blue-400 font-black text-xl mt-3"
            >
              ПОЇХАЛИ!
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY: GAMEOVER */}
      {uiState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-red-900/80 backdrop-blur-md flex items-center justify-center z-50 animate-in zoom-in duration-300 pointer-events-auto">
          <div className="bg-white rounded-[3rem] p-10 sm:p-14 flex flex-col items-center gap-6 shadow-2xl border-[3px] border-red-500">
            <div className="text-[6rem] sm:text-[8rem] animate-bounce">💥</div>
            <h2 className="text-4xl sm:text-6xl font-black text-red-600">АВАРІЯ!</h2>
            <div className="text-2xl font-bold text-slate-700">Очки: {score}</div>
            
            {/* Швидкий вибір кольору перед повторною грою */}
            <div className="flex gap-2 items-center bg-slate-100 p-2.5 rounded-2xl">
              {CAR_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    selectedColor === c.hex ? 'border-slate-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            <button 
              onClick={startGame}
              className="bg-red-500 text-white rounded-full px-10 py-4 shadow-[0_6px_0_rgb(185,28,28)] active:shadow-[0_0px_0_rgb(185,28,28)] active:translate-y-2 transition-all hover:bg-red-400 mt-2 text-2xl font-bold"
            >
              Спробувати ще
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
