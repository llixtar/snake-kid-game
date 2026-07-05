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
  type: "heart" | "gun" | "fuel" | "bulldozer";
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

// --- СИНТЕЗАТОР ЗВУКІВ (WEB AUDIO API) ---
class SoundEffects {
  private ctx: AudioContext | null = null;
  private motorOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  // Запуск звуку мотора
  startEngine() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      this.stopEngine();

      this.motorOsc = this.ctx.createOscillator();
      this.motorGain = this.ctx.createGain();

      this.motorOsc.type = "sawtooth";
      this.motorOsc.frequency.setValueAtTime(45, this.ctx.currentTime); // Низький гул мотора

      this.motorGain.gain.setValueAtTime(0.04, this.ctx.currentTime); // Тихий фоновий звук

      this.motorOsc.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);
      this.motorOsc.start(0);
    } catch (e) {
      console.error(e);
    }
  }

  // Зміна тональності мотора в залежності від швидкості/гальмування
  updateEngine(multiplier: number, isBraking: boolean) {
    if (!this.ctx || !this.motorOsc) return;

    let targetFreq = 45 + (multiplier - 1) * 35; // Росте з прискоренням
    if (isBraking) {
      targetFreq = Math.max(30, targetFreq - 15); // Падає при гальмуванні
    }

    this.motorOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
  }

  // Зупинка мотора
  stopEngine() {
    if (this.motorOsc) {
      try {
        this.motorOsc.stop();
        this.motorOsc.disconnect();
      } catch (e) {}
      this.motorOsc = null;
    }
    if (this.motorGain) {
      try {
        this.motorGain.disconnect();
      } catch (e) {}
      this.motorGain = null;
    }
  }

  // Постріл з кулемета
  playLaser() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(700, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // Підбір серця (Приємний дзвіночок)
  playHeart() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.4);
  }

  // Зіткнення гравця (Аварія)
  playCrash() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.exponentialRampToValueAtTime(10, now + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(now + 0.4);
  }

  // Знищення ворога кулею (Вибух авто)
  playExplosion() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(550, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(now + 0.25);
  }
}

export default function RacingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Стани UI
  const [uiState, setUiState] = useState<'START' | 'COUNTDOWN' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [countdown, setCountdown] = useState(3);
  const [fuel, setFuel] = useState(100);
  
  // Рефи для гри (щоб не рендерити компонент на кожен кадр)
  const gameStateRef = useRef<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const fuelRef = useRef(100);
  const animationTime = useRef(0);
  const colorRef = useRef('#ef4444');
  const isMoving = useRef(false);
  
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
  const bulldozerTimer = useRef(0);
  const invulnTimer = useRef(0); 
  const crashTimer = useRef(0); 
  
  // Звуковий рушій
  const sfx = useRef<SoundEffects | null>(null);

  // Ініціалізація звуків
  useEffect(() => {
    sfx.current = new SoundEffects();
    return () => {
      sfx.current?.stopEngine();
    };
  }, []);

  // Оновлюємо реф кольору при зміні стану
  useEffect(() => {
    colorRef.current = selectedColor;
  }, [selectedColor]);

  // Таймер відліку
  useEffect(() => {
    if (uiState === 'COUNTDOWN') {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setUiState('PLAYING');
            gameStateRef.current = 'PLAYING';
            sfx.current?.startEngine();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [uiState]);

  // --- МАЛЮВАННЯ MAШИНКИ ---
  const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isPlayer: boolean, angle = 0, isBulldozer = false) => {
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

    // Ківш бульдозера
    if (isBulldozer) {
      ctx.fillStyle = "#eab308"; // Жовтий ківш
      ctx.beginPath();
      ctx.roundRect(-CAR_WIDTH/2 - 12, -CAR_HEIGHT/2 - 25, CAR_WIDTH + 24, 18, 4);
      ctx.fill();
      
      // Кріплення ковша
      ctx.fillStyle = "#475569";
      ctx.fillRect(-CAR_WIDTH/2 - 6, -CAR_HEIGHT/2 - 10, 8, 25);
      ctx.fillRect(CAR_WIDTH/2 - 2, -CAR_HEIGHT/2 - 10, 8, 25);
    }

    // Зброя на машині (якщо активна)
    if (isPlayer && gunTimer.current > 0) {
      ctx.fillStyle = "#475569";
      ctx.fillRect(-CAR_WIDTH/2 + 4, -CAR_HEIGHT/2 - 10, 6, 15);
      ctx.fillRect(CAR_WIDTH/2 - 10, -CAR_HEIGHT/2 - 10, 6, 15);
    }

    // Світіння при невразливості або активній зброї
    if (isPlayer) {
      if (gunTimer.current > 0) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#f43f5e"; 
      } else if (invulnTimer.current > 0) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#3b82f6"; 
      }
    }

    // Основний корпус
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-CAR_WIDTH/2, -CAR_HEIGHT/2, CAR_WIDTH, CAR_HEIGHT, 12);
    ctx.fill();

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
    setUiState('COUNTDOWN');
    setCountdown(3);
    scoreRef.current = 0;
    setScore(0);
    livesRef.current = 3;
    setLives(3);
    fuelRef.current = 100;
    setFuel(100);
    enemies.current = [];
    items.current = [];
    bullets.current = [];
    particles.current = [];
    gunTimer.current = 0;
    bulldozerTimer.current = 0;
    invulnTimer.current = 0;
    crashTimer.current = 0;
    isMoving.current = false;
    
    const cw = canvasRef.current.width;
    const ch = canvasRef.current.height;
    playerPos.current = { x: cw / 2, y: ch - 100 };
    targetPos.current = { x: cw / 2, y: ch - 100 };
  };

  // Повернення до вибору кольору (екран START)
  const resetToStartMenu = () => {
    sfx.current?.stopEngine();
    gameStateRef.current = 'START';
    setUiState('START');
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
        if (!isMoving.current) {
          sfx.current?.updateEngine(0, true);
          for (let p = particles.current.length - 1; p >= 0; p--) {
            const part = particles.current[p];
            part.x += part.vx;
            part.y += part.vy;
            part.life--;
            if (part.life <= 0) particles.current.splice(p, 1);
          }
        } else {
          fuelRef.current -= 0.03;
          setFuel(Math.max(0, Math.floor(fuelRef.current)));
          if (fuelRef.current <= 0) {
            sfx.current?.stopEngine();
            gameStateRef.current = 'GAMEOVER';
            setUiState('GAMEOVER');
          }

          // Рух машинки до targetPos
          if (crashTimer.current > 0) {
          crashTimer.current--;
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

        // Визначаємо чи користувач гальмує (тягне назад)
        const isBraking = targetPos.current.y > playerPos.current.y + 15;

        // Динамічна швидкість дороги
        const crashSlowdown = crashTimer.current > 0 ? 0.2 : 1.0;
        const speedMultiplier = (1 + (ch - 80 - playerPos.current.y) / (ch / 2) * 1.5) * crashSlowdown;
        const currentRoadSpeed = baseSpeed.current * speedMultiplier;
        roadOffset.current += currentRoadSpeed;

        // Оновлюємо звук двигуна
        sfx.current?.updateEngine(speedMultiplier, isBraking);

        // Нараховуємо очки за рух
        if (animationTime.current % 10 === 0 && crashTimer.current === 0) {
          scoreRef.current += Math.floor(currentRoadSpeed / 2);
          setScore(scoreRef.current);
        }

        // Таймери
        if (invulnTimer.current > 0) invulnTimer.current--;
        if (bulldozerTimer.current > 0) bulldozerTimer.current--;
        if (gunTimer.current > 0) {
          gunTimer.current--;
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
            // Звук пострілу
            sfx.current?.playLaser();
          }
        }

        // Рух куль
        for (let b = bullets.current.length - 1; b >= 0; b--) {
          const bullet = bullets.current[b];
          bullet.y -= bullet.speed;

          let bulletHit = false;
          for (let i = enemies.current.length - 1; i >= 0; i--) {
            const enemy = enemies.current[i];
            const distEBX = Math.abs(enemy.x - bullet.x);
            const distEBY = Math.abs(enemy.y - bullet.y);

            if (distEBX < CAR_WIDTH * 0.7 && distEBY < CAR_HEIGHT * 0.6) {
              enemies.current.splice(i, 1);
              bulletHit = true;
              scoreRef.current += 150;
              setScore(scoreRef.current);

              // Звук вибуху ворога
              sfx.current?.playExplosion();

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

          if (bulldozerTimer.current > 120) {
            spawnTimer.current = 15;
          } else {
            spawnTimer.current = Math.max(35, 90 - scoreRef.current / 400);
          }
        }

        // Спавн предметів
        itemSpawnTimer.current--;
        
        // Перевіряємо, чи немає критичного рівня палива без каністри на дорозі
        const hasFuelOnRoad = items.current.some(item => item.type === 'fuel');
        if (fuelRef.current < 50 && !hasFuelOnRoad && itemSpawnTimer.current > 15) {
          itemSpawnTimer.current = 15; // Прискорюємо появу каністри
        }

        if (itemSpawnTimer.current <= 0) {
          const lanes = 3;
          const laneWidth = ROAD_WIDTH / lanes;
          const lane = Math.floor(Math.random() * lanes);
          const ix = cw / 2 - ROAD_WIDTH / 2 + lane * laneWidth + laneWidth / 2;
          
          let type: 'heart' | 'gun' | 'fuel' | 'bulldozer' = 'fuel';
          const rand = Math.random();
          
          if (fuelRef.current < 50 && !hasFuelOnRoad) {
             type = 'fuel'; // Гарантований спавн палива при критичному рівні
          } else {
             // Рандомний розподіл: 45% паливо, 25% зброя, 15% бульдозер, 15% серце (тільки якщо життів < 3)
             if (rand < 0.15 && livesRef.current < 3) {
                type = 'heart';
             } else if (rand < 0.6) {
                type = 'fuel';
             } else if (rand < 0.85) {
                type = 'gun';
             } else {
                type = 'bulldozer';
             }
          }

          items.current.push({ x: ix, y: -50, type });
          itemSpawnTimer.current = 150 + Math.random() * 100;
        }

        // Рух та зіткнення предметів
        for (let i = items.current.length - 1; i >= 0; i--) {
          const item = items.current[i];
          item.y += currentRoadSpeed;

          const distX = Math.abs(item.x - playerPos.current.x);
          const distY = Math.abs(item.y - playerPos.current.y);

          if (distX < CAR_WIDTH * 0.8 && distY < CAR_HEIGHT * 0.8) {
            if (item.type === 'heart') {
              if (livesRef.current < 3) {
                livesRef.current += 1;
                setLives(livesRef.current);
              }
            } else if (item.type === 'gun') {
              gunTimer.current = 360; 
            } else if (item.type === 'fuel') {
              fuelRef.current = Math.min(100, fuelRef.current + 40);
              setFuel(fuelRef.current);
            } else if (item.type === 'bulldozer') {
              bulldozerTimer.current = 400; 
            }
            
            // Звук підбору
            sfx.current?.playHeart();

            const particleColor = item.type === 'heart' ? '#ef4444' : item.type === 'fuel' ? '#eab308' : item.type === 'bulldozer' ? '#f97316' : '#ec4899';
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

          const distX = Math.abs(enemy.x - playerPos.current.x);
          const distY = Math.abs(enemy.y - playerPos.current.y);
          
          if (distX < CAR_WIDTH * 0.85 && distY < CAR_HEIGHT * 0.85) {
            if (bulldozerTimer.current > 0) {
              enemies.current.splice(i, 1);
              scoreRef.current += 150;
              setScore(scoreRef.current);
              sfx.current?.playExplosion();
              for (let p = 0; p < 15; p++) {
                particles.current.push({ x: enemy.x, y: enemy.y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, color: enemy.color, life: 30, maxLife: 30 });
              }
              continue;
            } else if (invulnTimer.current === 0 && crashTimer.current === 0) {
              livesRef.current -= 1;
              setLives(livesRef.current);
              invulnTimer.current = 120; 
              crashTimer.current = 45; 
              
              // Звук аварії
              sfx.current?.playCrash();

              for (let p = 0; p < 15; p++) {
                particles.current.push({
                  x: (enemy.x + playerPos.current.x)/2,
                  y: (enemy.y + playerPos.current.y)/2,
                  vx: (Math.random() - 0.5) * 10,
                  vy: (Math.random() - 0.5) * 10,
                  color: "#f59e0b",
                  life: 30,
                  maxLife: 30
                });
              }

              targetPos.current.y = ch - 80;

              if (livesRef.current <= 0) {
                sfx.current?.stopEngine();
                gameStateRef.current = 'GAMEOVER';
                setUiState('GAMEOVER');
              }
            }
          }

          if (enemy.y > ch + 100) {
            enemies.current.splice(i, 1);
          }
        }

        // Оновлення частинок
        for (let p = particles.current.length - 1; p >= 0; p--) {
          const part = particles.current[p];
          part.x += part.vx;
          part.y += part.vy;
          part.life--;
          if (part.life <= 0) {
            particles.current.splice(p, 1);
          }
        }
        } // Close else branch for !isMoving.current
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
        let icon = '❤️';
        if (item.type === 'gun') icon = '🔫';
        if (item.type === 'fuel') icon = '⛽';
        if (item.type === 'bulldozer') icon = '🚜';
        ctx.fillText(icon, 0, floatY);
        ctx.restore();
      });

      // --- МАЛЮВАННЯ КУЛЬ ---
      ctx.fillStyle = "#fef08a"; 
      bullets.current.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "rgba(253,224,71,0.4)";
        ctx.beginPath();
        ctx.arc(b.x, b.y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fef08a"; 
      });

      // --- МАЛЮВАННЯ ВОРОГІВ ---
      enemies.current.forEach(e => {
        drawCar(ctx, e.x, e.y, e.color, false, Math.PI);
      });

      // --- МАЛЮВАННЯ ГРАВЦЯ ---
      if (gameStateRef.current !== 'START') {
        if (invulnTimer.current === 0 || Math.floor(animationTime.current / 8) % 2 === 0) {
          const spinAngle = crashTimer.current > 0 ? (crashTimer.current / 45) * Math.PI * 4 : 0;
          const showBulldozer = bulldozerTimer.current > 0 && (bulldozerTimer.current > 120 || Math.floor(animationTime.current / 6) % 2 === 0);
          drawCar(ctx, playerPos.current.x, playerPos.current.y, colorRef.current, true, spinAngle, showBulldozer); 
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
      isMoving.current = true;
      if (e.touches && e.touches[0]) {
        updateTargetPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleTouchEnd = () => { isMoving.current = false; };

    const handleMouseMove = (e: MouseEvent) => updateTargetPos(e.clientX, e.clientY);
    const handleMouseDown = (e: MouseEvent) => { isMoving.current = true; updateTargetPos(e.clientX, e.clientY); };
    const handleMouseUp = () => { isMoving.current = false; };
    const handleMouseLeave = () => { isMoving.current = false; };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
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

      {/* FUEL BAR */}
      {uiState !== 'START' && uiState !== 'GAMEOVER' && (
        <div className="absolute right-4 bottom-4 flex flex-col items-center gap-2 pointer-events-none z-10">
          <div className="w-6 h-48 sm:h-64 bg-black/40 rounded-full border border-white/20 p-1 flex flex-col justify-end backdrop-blur-sm overflow-hidden">
            <div 
              className="w-full rounded-full transition-all duration-300"
              style={{ 
                height: `${fuel}%`, 
                backgroundColor: fuel > 50 ? '#22c55e' : fuel > 20 ? '#eab308' : '#ef4444',
                boxShadow: fuel > 20 ? '0 0 10px currentColor' : 'none'
              }}
            />
          </div>
          <div className="bg-black/60 p-2 rounded-full border border-white/20 backdrop-blur-sm">
            <span className="text-xl">⛽</span>
          </div>
        </div>
      )}

      {/* OVERLAY: COUNTDOWN */}
      {uiState === 'COUNTDOWN' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto">
          <div className="text-[10rem] sm:text-[15rem] font-black text-white animate-ping drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
            {countdown > 0 ? countdown : '🏁'}
          </div>
        </div>
      )}

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
            
            <button 
              onClick={resetToStartMenu}
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
