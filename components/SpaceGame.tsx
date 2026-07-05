"use client";

import { useEffect, useRef, useState } from "react";

// Типи зброї та кораблів
type WeaponType = "LASER" | "PLASMA" | "SPREAD" | "ROCKET";
type ShipDesign = "Striker" | "Cruiser" | "Phantom";

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: WeaponType;
  damage: number;
  color: string;
  size: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  type: "normal" | "fast" | "boss" | "bomb";
  color: string;
  vx?: number; // для боса та бомби
  bombCooldown?: number; // таймер випуску бомби для боса
}

interface UpgradeItem {
  x: number;
  y: number;
  type: "GUNS" | "WEAPON" | "BOMB" | "HEART" | "SPEED";
  emoji: string;
  color: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

interface Explosion {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
}

// Звукові ефекти (Web Audio API)
class SpaceAudio {
  private ctx: AudioContext | null = null;

  init() {
    if (this.ctx) return;
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("Failed to init audio context:", e);
    }
  }

  private resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playShoot(type: WeaponType) {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === "LASER") {
        osc.type = "square";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      } else if (type === "PLASMA") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      } else if (type === "SPREAD") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      } else { // ROCKET
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.25);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playExplosion(type: "normal" | "boss" | "fast") {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dur = type === "boss" ? 0.8 : 0.25;

      const bufferSize = this.ctx.sampleRate * dur;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(type === "boss" ? 300 : 800, now);
      filter.frequency.exponentialRampToValueAtTime(40, now + dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(type === "boss" ? 0.3 : 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch (e) {}
  }

  playDamage() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch(e) {}
  }

  playShockwave() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(50, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.5);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch(e) {}
  }

  playUpgrade() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; 
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.2);
      });
    } catch(e) {}
  }

  playGameOver() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(40, now + 1.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    } catch(e) {}
  }

  playVictory() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.25);
      });
    } catch(e) {}
  }
}

const drawShip = (ctx: CanvasRenderingContext2D, design: ShipDesign, x: number, y: number, size: number, guns: number) => {
  ctx.save();
  ctx.translate(x, y);

  // Малюємо корпус
  if (design === "Striker") {
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.8, size);
    ctx.lineTo(0, size * 0.5);
    ctx.lineTo(-size * 0.8, size);
    ctx.closePath();
    ctx.fill();

    // Кабіна
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.1, size * 0.2, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Акценти
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-size * 0.4, size * 0.5, size * 0.2, size * 0.3);
    ctx.fillRect(size * 0.2, size * 0.5, size * 0.2, size * 0.3);

  } else if (design === "Cruiser") {
    ctx.fillStyle = "#94a3b8";
    // Основний корпус
    ctx.fillRect(-size * 0.3, -size * 0.8, size * 0.6, size * 1.5);
    // Крила
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, 0);
    ctx.lineTo(-size, size * 0.5);
    ctx.lineTo(-size * 0.3, size * 0.8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.3, 0);
    ctx.lineTo(size, size * 0.5);
    ctx.lineTo(size * 0.3, size * 0.8);
    ctx.fill();

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(0, -size * 0.4, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (design === "Phantom") {
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.2);
    ctx.quadraticCurveTo(size * 1.2, size * 0.5, size * 0.8, size);
    ctx.lineTo(0, size * 0.6);
    ctx.lineTo(-size * 0.8, size);
    ctx.quadraticCurveTo(-size * 1.2, size * 0.5, 0, -size * 1.2);
    ctx.fill();

    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.lineTo(size * 0.3, size * 0.2);
    ctx.lineTo(-size * 0.3, size * 0.2);
    ctx.fill();
  }

  // Домальовуємо гармати (залежно від кількості)
  ctx.fillStyle = "#475569";
  const drawGun = (gx: number, gy: number) => {
    ctx.fillRect(gx - 3, gy - 15, 6, 25);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(gx - 2, gy - 15, 4, 4);
    ctx.fillStyle = "#475569";
  };

  if (guns === 1 || guns === 3 || guns === 5) {
    drawGun(0, -size * 1.1); // Центр
  }
  if (guns >= 2) {
    drawGun(-size * 0.5, -size * 0.2);
    drawGun(size * 0.5, -size * 0.2);
  }
  if (guns >= 4) {
    drawGun(-size * 0.8, size * 0.3);
    drawGun(size * 0.8, size * 0.3);
  }

  ctx.restore();
};

function ShipPreview({ design }: { design: ShipDesign }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Малюємо вогник двигуна
    const flameSize = 8 + Math.random() * 6;
    const gradFlame = ctx.createLinearGradient(0, 15, 0, 15 + flameSize);
    gradFlame.addColorStop(0, "#facc15");
    gradFlame.addColorStop(0.5, "#f97316");
    gradFlame.addColorStop(1, "rgba(239, 68, 68, 0)");
    ctx.fillStyle = gradFlame;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 5, canvas.height / 2 + 6);
    ctx.lineTo(canvas.width / 2, canvas.height / 2 + 6 + flameSize);
    ctx.lineTo(canvas.width / 2 + 5, canvas.height / 2 + 6);
    ctx.closePath();
    ctx.fill();

    drawShip(ctx, design, canvas.width / 2, canvas.height / 2, 14, 1);
  }, [design]);

  return <canvas ref={canvasRef} width={40} height={40} className="w-[40px] h-[40px] block" />;
}

export default function SpaceGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sfx = useRef<SpaceAudio | null>(null);

  const [uiState, setUiState] = useState<"START" | "COUNTDOWN" | "PLAYING" | "GAMEOVER" | "VICTORY">("START");
  const [selectedDesign, setSelectedDesign] = useState<ShipDesign>("Striker");
  const [countdown, setCountdown] = useState(3);
  
  // UI States mapped from refs for React rendering
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);

  const gameStateRef = useRef<"START" | "COUNTDOWN" | "PLAYING" | "GAMEOVER" | "VICTORY">("START");
  const isMoving = useRef(false);
  const animationTime = useRef(0);
  
  const shipPos = useRef({ x: 0, y: 0 });
  const targetPos = useRef({ x: 0, y: 0 });

  const bullets = useRef<Bullet[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const upgrades = useRef<UpgradeItem[]>([]);
  const stars = useRef<Star[]>([]);
  const particles = useRef<Explosion[]>([]);
  const shockwaves = useRef<Shockwave[]>([]);

  const shootCooldown = useRef(0);
  const enemySpawnTimer = useRef(0);
  const upgradeSpawnTimer = useRef(0);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);

  const gunsCount = useRef(1);
  const currentWeapon = useRef<WeaponType>("LASER");
  const speedBoostTimer = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(5);
  const waveRef = useRef(1);
  const bossActive = useRef(false);
  const enemyIdCounter = useRef(0);
  const bossSpawnTriggerScore = useRef(0);
  const hasInteractedThisWave = useRef(false);

  useEffect(() => {
    sfx.current = new SpaceAudio();
  }, []);

  const initGame = (isNextWave = false) => {
    setCountdown(3);
    setUiState("COUNTDOWN");
    gameStateRef.current = "COUNTDOWN";
    sfx.current?.init();

    if (!isNextWave) {
      scoreRef.current = 0;
      setScore(0);
      gunsCount.current = 1;
      currentWeapon.current = "LASER";
      waveRef.current = 1;
      setWave(1);
    }
    
    // Встановлюємо поріг для боса від поточних очок
    bossSpawnTriggerScore.current = scoreRef.current + 250;
    hasInteractedThisWave.current = false;
    
    // Поповнюємо життя на початку або при новій хвилі (до максимуму 5)
    livesRef.current = 5;
    setLives(5);

    speedBoostTimer.current = 0;
    bossActive.current = false;
    enemySpawnTimer.current = 20; // Перший спавн майже одразу!
    bullets.current = [];
    enemies.current = [];
    upgrades.current = [];
    particles.current = [];
    shockwaves.current = [];

    if (countdownTimer.current) clearInterval(countdownTimer.current);

    let count = 3;
    countdownTimer.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(countdownTimer.current!);
        setUiState("PLAYING");
        gameStateRef.current = "PLAYING";
        
        if (canvasRef.current) {
          shipPos.current = {
            x: canvasRef.current.width / 2,
            y: canvasRef.current.height - 100
          };
          targetPos.current = { ...shipPos.current };
        }
      }
    }, 1000);
  };

    // Прибираємо стару копію drawShip

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    stars.current = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 3 + 1,
      alpha: Math.random()
    }));

    let animationFrameId: number;

    const gameLoop = () => {
      animationTime.current++;
      const cw = canvas.width;
      const ch = canvas.height;

      if (gameStateRef.current === "PLAYING") {
        // Рух корабля (рухається до targetPos)
        const speedMult = speedBoostTimer.current > 0 ? 0.3 : 0.15;
        const dx = targetPos.current.x - shipPos.current.x;
        const dy = targetPos.current.y - shipPos.current.y;
        shipPos.current.x += dx * speedMult;
        shipPos.current.y += dy * speedMult;

          if (shipPos.current.x < 35) shipPos.current.x = 35;
          if (shipPos.current.x > cw - 35) shipPos.current.x = cw - 35;
          if (shipPos.current.y < 35) shipPos.current.y = 35;
          if (shipPos.current.y > ch - 60) shipPos.current.y = ch - 60;

          if (speedBoostTimer.current > 0) speedBoostTimer.current--;

          // Стрільба
          shootCooldown.current--;
          if (shootCooldown.current <= 0) {
            let fireRate = 18;
            if (currentWeapon.current === "PLASMA") fireRate = 25;
            if (currentWeapon.current === "SPREAD") fireRate = 22;
            if (currentWeapon.current === "ROCKET") fireRate = 35;
            
            // Якщо є прискорення, стріляємо швидше
            if (speedBoostTimer.current > 0) fireRate = Math.floor(fireRate * 0.6);

            shootCooldown.current = fireRate;
            sfx.current?.playShoot(currentWeapon.current);

            const count = gunsCount.current;
            const wType = currentWeapon.current;

            if (wType === "LASER") {
              const spreadWidth = 24;
              const startX = shipPos.current.x - ((count - 1) * spreadWidth) / 2;
              for (let i = 0; i < count; i++) {
                bullets.current.push({
                  x: startX + i * spreadWidth,
                  y: shipPos.current.y - 30,
                  vx: 0,
                  vy: -12,
                  type: "LASER",
                  damage: 1,
                  color: "#fef08a",
                  size: 4
                });
              }
            } else if (wType === "PLASMA") {
              const spreadWidth = 30;
              const startX = shipPos.current.x - ((count - 1) * spreadWidth) / 2;
              for (let i = 0; i < count; i++) {
                bullets.current.push({
                  x: startX + i * spreadWidth,
                  y: shipPos.current.y - 30,
                  vx: 0,
                  vy: -9,
                  type: "PLASMA",
                  damage: 2.5,
                  color: "#3b82f6",
                  size: 8
                });
              }
            } else if (wType === "SPREAD") {
              const baseAngle = -Math.PI / 2;
              const angleDiff = 0.2;
              const startAngle = baseAngle - ((count - 1) * angleDiff) / 2;
              for (let i = 0; i < count; i++) {
                const angle = startAngle + i * angleDiff;
                bullets.current.push({
                  x: shipPos.current.x,
                  y: shipPos.current.y - 30,
                  vx: Math.cos(angle) * 10,
                  vy: Math.sin(angle) * 10,
                  type: "SPREAD",
                  damage: 1.2,
                  color: "#a855f7",
                  size: 5
                });
              }
            } else if (wType === "ROCKET") {
              const spreadWidth = 40;
              const startX = shipPos.current.x - ((count - 1) * spreadWidth) / 2;
              for (let i = 0; i < count; i++) {
                bullets.current.push({
                  x: startX + i * spreadWidth,
                  y: shipPos.current.y - 30,
                  vx: 0,
                  vy: -7,
                  type: "ROCKET",
                  damage: 5,
                  color: "#f97316",
                  size: 10
                });
              }
            }
          }

          // Рух куль
          for (let b = bullets.current.length - 1; b >= 0; b--) {
            const bullet = bullets.current[b];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            if (bullet.y < -50 || bullet.x < -50 || bullet.x > cw + 50) {
              bullets.current.splice(b, 1);
            }
          }

          // Логіка хвиль та боса
          if (scoreRef.current >= bossSpawnTriggerScore.current && !bossActive.current) {
            // Спавн боса!
            bossActive.current = true;
            enemies.current = []; // Прибираємо звичайних ворогів
            
            // HP боса залежить від сили зброї гравця (більш м'який баланс)
            let powerMultiplier = 1.0;
            if (currentWeapon.current === "PLASMA") powerMultiplier = 1.25;
            if (currentWeapon.current === "SPREAD") powerMultiplier = 1.5;
            if (currentWeapon.current === "ROCKET") powerMultiplier = 1.8;
            powerMultiplier *= (1 + (gunsCount.current - 1) * 0.22);

            const baseHp = 70 + waveRef.current * 50;
            const bossHp = Math.floor(baseHp * powerMultiplier * 1.2);

            enemies.current.push({
              id: enemyIdCounter.current++,
              x: cw / 2,
              y: -100,
              width: 150,
              height: 120,
              hp: bossHp,
              maxHp: bossHp,
              speed: 0.3,
              type: "boss",
              color: "#ef4444",
              vx: 1.5 + waveRef.current * 0.2
            });
          }

          // Логіка поведінки боса (випуск бомб)
          if (bossActive.current) {
            const boss = enemies.current.find(e => e.type === "boss");
            if (boss) {
              if (boss.bombCooldown === undefined) {
                boss.bombCooldown = 90;
              }
              boss.bombCooldown--;
              if (boss.bombCooldown <= 0) {
                boss.bombCooldown = 120 + Math.random() * 120; // раз на 2-4 секунди
                sfx.current?.playShoot("PLASMA");
                
                enemies.current.push({
                  id: enemyIdCounter.current++,
                  x: boss.x,
                  y: boss.y + 40,
                  width: 35,
                  height: 35,
                  hp: 3, // можна розбити 3 звичайними лазерами або 1 потужнішим
                  maxHp: 3,
                  speed: 2 + waveRef.current * 0.2,
                  type: "bomb",
                  color: "#ef4444",
                  vx: (Math.random() - 0.5) * 3
                });
              }
            }
          }

          // Спавн НЛО
          if (!bossActive.current) {
            enemySpawnTimer.current--;
            if (enemySpawnTimer.current <= 0) {
              enemySpawnTimer.current = Math.max(30, 90 - waveRef.current * 8 - scoreRef.current / 150);
              
              const rand = Math.random();
              let type: "normal" | "fast" = "normal";

              // HP ворогів динамічно підлаштовується під силу зброї (м'якше)
              let powerMultiplier = 1.0;
              if (currentWeapon.current === "PLASMA") powerMultiplier = 1.2;
              if (currentWeapon.current === "SPREAD") powerMultiplier = 1.35;
              if (currentWeapon.current === "ROCKET") powerMultiplier = 1.5;
              powerMultiplier *= (1 + (gunsCount.current - 1) * 0.18);

              let hp = Math.ceil((waveRef.current + Math.floor(scoreRef.current / 300)) * powerMultiplier * 0.7);
              let speed = 0.5 + Math.random() * 0.5 + waveRef.current * 0.15;
              let size = 45;
              let color = "#10b981";

              if (rand < 0.3) {
                type = "fast";
                hp = Math.max(1, hp - 1);
                speed = speed * 1.5;
                size = 35;
                color = "#eab308";
              }

              enemies.current.push({
                id: enemyIdCounter.current++,
                x: Math.random() * (cw - size * 2) + size,
                y: -50,
                width: size,
                height: size * 0.7,
                hp: hp,
                maxHp: hp,
                speed: speed,
                type: type,
                color: color
              });
            }
          }

          // Спавн апгрейдів
          upgradeSpawnTimer.current--;
          if (upgradeSpawnTimer.current <= 0) {
            upgradeSpawnTimer.current = 400 + Math.random() * 300; // Частіше (раз на 6-10 секунд)

            const rand = Math.random();
            let type: UpgradeItem["type"] = "GUNS";
            let emoji = "🔫";
            let color = "#38bdf8";

            if (livesRef.current < 5 && rand < 0.2) {
              type = "HEART"; emoji = "❤️"; color = "#ef4444";
            } else if (rand < 0.4) {
              type = "BOMB"; emoji = "🛡️"; color = "#10b981"; // Використовуємо іконку щита для бомби
            } else if (rand < 0.6) {
              type = "SPEED"; emoji = "⚡"; color = "#eab308";
            } else if (rand < 0.8) {
              type = "WEAPON"; emoji = "🔮"; color = "#a855f7";
            }

            upgrades.current.push({
              x: Math.random() * (cw - 80) + 40,
              y: -50,
              type, emoji, color
            });
          }

          // Рух ворогів
          for (let e = enemies.current.length - 1; e >= 0; e--) {
            const enemy = enemies.current[e];
            
            if (enemy.type === "boss") {
              enemy.y += enemy.speed;
              if (enemy.y > ch * 0.2) {
                enemy.speed = 0; // Бос зупиняється зверху
              }
              // Рух боса вліво-вправо
              enemy.x += enemy.vx || 0;
              if (enemy.x < enemy.width / 2 || enemy.x > cw - enemy.width / 2) {
                enemy.vx = -(enemy.vx || 0);
              }
            } else {
              enemy.y += enemy.speed;
              if (enemy.type === "bomb" && enemy.vx) {
                enemy.x += enemy.vx;
                // Відбивання бомби від бічних меж екрана
                if (enemy.x < enemy.width / 2 || enemy.x > cw - enemy.width / 2) {
                  enemy.vx = -enemy.vx;
                }
              }
            }

            const isGameOverLimit = enemy.y > ch - 100;
            const distToShipX = Math.abs(enemy.x - shipPos.current.x);
            const distToShipY = Math.abs(enemy.y - shipPos.current.y);
            const hasCollidedWithShip = distToShipX < enemy.width / 2 + 25 && distToShipY < enemy.height / 2 + 25;

            if (isGameOverLimit || hasCollidedWithShip) {
              if (hasCollidedWithShip) {
                sfx.current?.playDamage();
                createExplosion(shipPos.current.x, shipPos.current.y, "#ef4444", 15);
                if (enemy.type === "boss") {
                  livesRef.current -= 5; // Бос вбиває одразу
                } else {
                  livesRef.current -= 1; // Бомби та НЛО забирають по 1 життю
                }
                setLives(Math.max(0, livesRef.current));
              } else if (isGameOverLimit) {
                // Якщо за межу залетіло звичайне НЛО — забираємо життя. Бомби можна пропускати!
                if (enemy.type !== "bomb") {
                  sfx.current?.playDamage();
                  createExplosion(shipPos.current.x, shipPos.current.y, "#ef4444", 15);
                  livesRef.current -= 1;
                  setLives(Math.max(0, livesRef.current));
                }
              }
              
              enemies.current.splice(e, 1);

              if (livesRef.current <= 0) {
                sfx.current?.playGameOver();
                gameStateRef.current = "GAMEOVER";
                setUiState("GAMEOVER");
                isMoving.current = false;
                break;
              }
              continue;
            }

            // Колізія з кулями
            for (let b = bullets.current.length - 1; b >= 0; b--) {
              const bullet = bullets.current[b];
              const distBX = Math.abs(bullet.x - enemy.x);
              const distBY = Math.abs(bullet.y - enemy.y);

              if (distBX < enemy.width / 2 + bullet.size && distBY < enemy.height / 2 + bullet.size) {
                enemy.hp -= bullet.damage;
                createSparkles(bullet.x, bullet.y, bullet.color, bullet.type === "ROCKET" ? 15 : 5);
                bullets.current.splice(b, 1);

                if (enemy.hp <= 0) {
                  sfx.current?.playExplosion(enemy.type);
                  createExplosion(enemy.x, enemy.y, enemy.color, enemy.type === "boss" ? 50 : 20);
                  
                  if (enemy.type === "boss") {
                    scoreRef.current += 1000;
                    setScore(scoreRef.current);
                    sfx.current?.playVictory();
                    gameStateRef.current = "VICTORY";
                    setUiState("VICTORY");
                    isMoving.current = false;
                  } else {
                    scoreRef.current += enemy.type === "fast" ? 25 : (enemy.type === "bomb" ? 5 : 15);
                    setScore(scoreRef.current);
                  }
                  
                  enemies.current.splice(e, 1);
                  break;
                }
              }
            }
          }

          // Апгрейди
          for (let u = upgrades.current.length - 1; u >= 0; u--) {
            const item = upgrades.current[u];
            item.y += 2.5;

            const distX = Math.abs(item.x - shipPos.current.x);
            const distY = Math.abs(item.y - shipPos.current.y);

            if (distX < 45 && distY < 45) {
              sfx.current?.playUpgrade();
              createExplosion(item.x, item.y, item.color, 12);

              if (item.type === "GUNS") {
                gunsCount.current = Math.min(5, gunsCount.current + 1);
              } else if (item.type === "WEAPON") {
                const weaponOrder: WeaponType[] = ["LASER", "PLASMA", "SPREAD", "ROCKET"];
                const currentIdx = weaponOrder.indexOf(currentWeapon.current);
                if (currentIdx < weaponOrder.length - 1) {
                  currentWeapon.current = weaponOrder[currentIdx + 1];
                } else {
                  // Якщо вже ROCKET (максимальна зброя), то додаємо ще одну пушку
                  gunsCount.current = Math.min(5, gunsCount.current + 1);
                }
              } else if (item.type === "HEART") {
                livesRef.current = Math.min(5, livesRef.current + 1);
                setLives(livesRef.current);
              } else if (item.type === "SPEED") {
                speedBoostTimer.current = 400; // ~6.5 секунд турбо
              } else if (item.type === "BOMB") {
                // Вибухова хвиля знищує всіх видимих звичайних ворогів
                sfx.current?.playShockwave();
                shockwaves.current.push({
                  x: shipPos.current.x,
                  y: shipPos.current.y,
                  radius: 10,
                  maxRadius: Math.max(cw, ch),
                  life: 30
                });
                
                for (let e = enemies.current.length - 1; e >= 0; e--) {
                  if (enemies.current[e].type !== "boss") {
                    createExplosion(enemies.current[e].x, enemies.current[e].y, enemies.current[e].color, 15);
                    scoreRef.current += 10;
                    enemies.current.splice(e, 1);
                  } else {
                    // Босу лише наносить сильний дамаг
                    enemies.current[e].hp -= 30;
                    if (enemies.current[e].hp <= 0) {
                      sfx.current?.playExplosion("boss");
                      createExplosion(enemies.current[e].x, enemies.current[e].y, enemies.current[e].color, 50);
                      scoreRef.current += 1000;
                      enemies.current.splice(e, 1);
                      sfx.current?.playVictory();
                      gameStateRef.current = "VICTORY";
                      setUiState("VICTORY");
                      isMoving.current = false;
                    }
                  }
                }
                setScore(scoreRef.current);
              }

              upgrades.current.splice(u, 1);
              continue;
            }

            if (item.y > ch + 50) {
              upgrades.current.splice(u, 1);
            }
          }
        // Закриваємо if (gameStateRef.current === "PLAYING")

        // Рух фону
        stars.current.forEach(star => {
          star.y += star.speed * (speedBoostTimer.current > 0 ? 3.0 : 1.5);
          if (star.y > ch) {
            star.y = -10;
            star.x = Math.random() * cw;
          }
        });

        // Частинки
        for (let p = particles.current.length - 1; p >= 0; p--) {
          const part = particles.current[p];
          part.x += part.vx;
          part.y += part.vy;
          part.life--;
          if (part.life <= 0) particles.current.splice(p, 1);
        }

        // Хвилі (бомби)
        for (let w = shockwaves.current.length - 1; w >= 0; w--) {
          const sw = shockwaves.current[w];
          sw.radius += (sw.maxRadius - sw.radius) * 0.15;
          sw.life--;
          if (sw.life <= 0) shockwaves.current.splice(w, 1);
        }
      }

      // --- МАЛЮВАННЯ ---
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#030712"); 
      grad.addColorStop(1, "#0b1329"); 
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);

      stars.current.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size * (speedBoostTimer.current > 0 && isMoving.current ? 4 : 1));
      });

      // Кордон
      const borderY = ch - 80;
      const borderGrad = ctx.createLinearGradient(0, borderY - 30, 0, ch);
      borderGrad.addColorStop(0, "rgba(239, 68, 68, 0)");
      borderGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.15)");
      borderGrad.addColorStop(1, "rgba(239, 68, 68, 0.4)");
      ctx.fillStyle = borderGrad;
      ctx.fillRect(0, borderY - 30, cw, ch - borderY + 30);

      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, borderY);
      ctx.lineTo(cw, borderY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Хвилі від бомби
      shockwaves.current.forEach(sw => {
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(16, 185, 129, ${sw.life / 30})`;
        ctx.lineWidth = 15 * (sw.life / 30);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${(sw.life / 30) * 0.2})`;
        ctx.fill();
      });

      // Кулі
      bullets.current.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; 
      });

      // Вороги
      enemies.current.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);

        if (e.hp < e.maxHp) {
          const barW = e.width * 0.8;
          const barH = e.type === "boss" ? 8 : 4;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(-barW / 2, -e.height / 2 - 15, barW, barH);
          
          const hpPercent = Math.max(0, Math.min(1, e.hp / e.maxHp));
          const r = Math.floor((1 - hpPercent) * 255);
          const g = Math.floor(hpPercent * 255);
          ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
          
          ctx.fillRect(-barW / 2, -e.height / 2 - 15, barW * hpPercent, barH);
        }

        if (e.type === "boss") {
          // Наш реалістичний іншопланетний бос
          const width = e.width;
          const height = e.height;
          ctx.save();
          
          // Ефект підсвічування
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 20;

          // Корпус saucer-shape
          const gradSaucer = ctx.createRadialGradient(0, 0, width * 0.1, 0, 0, width * 0.5);
          gradSaucer.addColorStop(0, "#450a0a");
          gradSaucer.addColorStop(0.5, "#991b1b");
          gradSaucer.addColorStop(1, "#ef4444");
          ctx.fillStyle = gradSaucer;
          ctx.beginPath();
          ctx.ellipse(0, 0, width * 0.5, height * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Силовий щит / кабіна
          ctx.shadowColor = "#67e8f9";
          ctx.fillStyle = "rgba(6, 182, 212, 0.65)";
          ctx.beginPath();
          ctx.arc(0, -height * 0.12, width * 0.22, Math.PI, 0);
          ctx.fill();

          // Елементи вогнів боса
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#facc15";
          for (let i = -3; i <= 3; i++) {
            if (i === 0) continue;
            ctx.beginPath();
            ctx.arc(i * (width * 0.12), height * 0.05, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Лазерні гармати з боків
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(-width * 0.46, -height * 0.2, 14, height * 0.65);
          ctx.fillRect(width * 0.46 - 14, -height * 0.2, 14, height * 0.65);

          ctx.fillStyle = "#ef4444";
          ctx.fillRect(-width * 0.46 + 2, height * 0.35, 10, 5);
          ctx.fillRect(width * 0.46 - 12, height * 0.35, 10, 5);

          ctx.restore();
        } else if (e.type === "bomb") {
          // Небезпечна космічна міна боса
          const size = e.width;
          ctx.save();
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 15;
          
          // Корпус міни
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
          ctx.fill();
          
          // Шипи міни
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 3;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (size * 0.35), Math.sin(a) * (size * 0.35));
            ctx.lineTo(Math.cos(a) * (size * 0.6), Math.sin(a) * (size * 0.6));
            ctx.stroke();
          }
          
          // Блимаючий центр
          const pulse = Math.floor(animationTime.current / 8) % 2 === 0;
          ctx.fillStyle = pulse ? "#f43f5e" : "#fda4af";
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        } else {
          ctx.font = `${e.width}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🛸", 0, 0);
        }

        ctx.restore();
      });

      // Апгрейди
      upgrades.current.forEach(u => {
        ctx.save();
        ctx.translate(u.x, u.y);
        const scale = 1 + Math.sin(animationTime.current * 0.15) * 0.15;
        ctx.scale(scale, scale);
        ctx.shadowColor = u.color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = u.color;
        ctx.font = "32px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(u.emoji, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // Літачок
      if (gameStateRef.current !== "START" && gameStateRef.current !== "COUNTDOWN") {
        ctx.save();
        ctx.translate(shipPos.current.x, shipPos.current.y);

        if (true) {
          const flameSize = speedBoostTimer.current > 0 ? 30 + Math.random() * 20 : 15 + Math.random() * 15;
          const gradFlame = ctx.createLinearGradient(0, 20, 0, 20 + flameSize);
          gradFlame.addColorStop(0, speedBoostTimer.current > 0 ? "#38bdf8" : "#facc15");
          gradFlame.addColorStop(0.5, speedBoostTimer.current > 0 ? "#818cf8" : "#f97316");
          gradFlame.addColorStop(1, "rgba(239, 68, 68, 0)");
          ctx.fillStyle = gradFlame;
          ctx.beginPath();
          ctx.moveTo(-10, 20);
          ctx.lineTo(0, 20 + flameSize);
          ctx.lineTo(10, 20);
          ctx.closePath();
          ctx.fill();
        }

        // Малюємо вибраний дизайн
        drawShip(ctx, selectedDesign, 0, 0, 30, gunsCount.current);

        // Якщо прискорення, малюємо ауру
        if (speedBoostTimer.current > 0) {
          ctx.strokeStyle = `rgba(234, 179, 8, ${0.4 + Math.sin(animationTime.current * 0.3) * 0.2})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, -40);
          ctx.lineTo(35, 30);
          ctx.lineTo(-35, 30);
          ctx.closePath();
          ctx.stroke();
        }

        ctx.restore();
      } else if (gameStateRef.current === "COUNTDOWN") {
        drawShip(ctx, selectedDesign, cw / 2, ch - 150, 30, 1);
      }

      // Частинки
      particles.current.forEach(p => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [selectedDesign]);

  const createExplosion = (x: number, y: number, color: string, count = 20) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particles.current.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: Math.random() * 6 + 4,
        life: 30, maxLife: 30
      });
    }
  };

  const createSparkles = (x: number, y: number, color: string, count = 5) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.5 - Math.PI / 2;
      const speed = Math.random() * 3 + 1;
      particles.current.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: Math.random() * 3 + 2,
        life: 15, maxLife: 15
      });
    }
  };

  const handleStartInteraction = (clientX: number, clientY: number) => {
    if (gameStateRef.current !== "PLAYING") return;
    isMoving.current = true;
    hasInteractedThisWave.current = true;
    targetPos.current = { x: clientX, y: clientY };
  };

  const handleMoveInteraction = (clientX: number, clientY: number) => {
    if (gameStateRef.current !== "PLAYING") return;
    targetPos.current = { x: clientX, y: clientY };
  };

  const handleEndInteraction = () => {
    isMoving.current = false;
  };

  return (
    <div 
      className="relative w-full h-full select-none overflow-hidden touch-none"
      onMouseDown={(e) => handleStartInteraction(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMoveInteraction(e.clientX, e.clientY)}
      onMouseUp={handleEndInteraction}
      onMouseLeave={handleEndInteraction}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        handleStartInteraction(touch.clientX, touch.clientY);
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        handleMoveInteraction(touch.clientX, touch.clientY);
      }}
      onTouchEnd={handleEndInteraction}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* --- HUD --- */}
      {uiState === "PLAYING" && (
        <>
          {/* Бали та хвиля ліворуч */}
          <div className="absolute top-4 left-4 flex flex-col gap-0.5 pointer-events-none select-none">
            <div className="text-white font-black text-2xl sm:text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {score}
            </div>
            <div className="text-blue-300 font-bold text-xs sm:text-sm drop-shadow-md uppercase tracking-wider">
              Хвиля {wave}
            </div>
          </div>

          {/* Життя праворуч */}
          <div className="absolute top-4 right-4 flex gap-1 pointer-events-none select-none">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`text-2xl sm:text-3xl filter drop-shadow-md transition-all ${i < lives ? "opacity-100 scale-100" : "opacity-20 scale-75 grayscale"}`}>
                ❤️
              </span>
            ))}
          </div>
        </>
      )}

      {/* --- ЕКРАН СТАРТУ --- */}
      {uiState === "START" && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-50 text-center">
          <div className="max-w-md w-full bg-gradient-to-b from-slate-900 to-indigo-950 p-8 rounded-[2.5rem] border-[3px] border-indigo-500/30 shadow-[0_20px_50px_rgba(99,102,241,0.3)]">
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-wide drop-shadow-md">
              ЗОРЕЛІТ 🚀
            </h1>
            <p className="text-indigo-300 font-bold mb-6 text-sm sm:text-base">
              Обери свій бойовий корабель!
            </p>

            <div className="mb-8 flex flex-col gap-3">
              {(["Striker", "Cruiser", "Phantom"] as ShipDesign[]).map(design => (
                <button
                  key={design}
                  onClick={() => setSelectedDesign(design)}
                  className={`w-full py-4 px-6 rounded-2xl flex items-center justify-between border-2 transition-all transform active:scale-95 ${
                    selectedDesign === design
                      ? "bg-indigo-600/50 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      : "bg-black/40 border-white/10 hover:bg-white/5"
                  }`}
                >
                  <span className="text-white font-bold text-xl">{design}</span>
                  {/* Замість емодзі малюємо реальний кораблик на канвасі */}
                  <ShipPreview design={design} />
                </button>
              ))}
            </div>

            <button
              onClick={() => initGame(false)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-2xl sm:text-3xl py-4 rounded-3xl shadow-[0_8px_20px_rgba(16,185,129,0.4)] border border-emerald-300/30 transform active:scale-95 transition-all"
            >
              ПОЛЕТІЛИ! 🚀
            </button>
          </div>
        </div>
      )}

      {/* --- ЕКРАН ПЕРЕМОГИ (БОС ЗНИЩЕНИЙ) --- */}
      {uiState === "VICTORY" && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-50 text-center">
          <div className="max-w-md w-full bg-gradient-to-b from-slate-900 to-emerald-950 p-8 rounded-[2.5rem] border-[3px] border-emerald-500/30 shadow-[0_20px_50px_rgba(16,185,129,0.25)]">
            <span className="text-6xl sm:text-8xl block mb-4 animate-bounce">🏆🎉</span>
            <h2 className="text-4xl sm:text-5xl font-black text-emerald-400 mb-2 tracking-wide drop-shadow-md uppercase">
              Боса знищено!
            </h2>
            <p className="text-emerald-200 font-bold mb-6 text-sm sm:text-base">
              Ти захистив галактику! Готовий до наступної хвилі?
            </p>

            <button
              onClick={() => {
                waveRef.current += 1;
                setWave(waveRef.current);
                initGame(true); // Запуск наступної хвилі зі збереженням очок
              }}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-2xl sm:text-3xl py-4 rounded-3xl shadow-[0_8px_20px_rgba(16,185,129,0.4)] border border-emerald-400/30 transform active:scale-95 transition-all"
            >
              ПРОДОВЖИТИ 🚀
            </button>
          </div>
        </div>
      )}

      {/* --- ЕКРАН ВІДЛІКУ --- */}
      {uiState === "COUNTDOWN" && (
        <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center z-40 pointer-events-none select-none">
          <div className="text-yellow-400 font-black text-[8rem] sm:text-[12rem] animate-ping duration-1000">
            {countdown > 0 ? countdown : "СТАРТ!"}
          </div>
        </div>
      )}

      {/* --- ЕКРАН ГЕЙМОВЕРУ --- */}
      {uiState === "GAMEOVER" && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-50 text-center">
          <div className="max-w-md w-full bg-gradient-to-b from-slate-900 to-red-950 p-8 rounded-[2.5rem] border-[3px] border-red-500/30 shadow-[0_20px_50px_rgba(239,68,68,0.25)]">
            <span className="text-6xl sm:text-8xl block mb-4 animate-bounce">💥🚀</span>
            <h2 className="text-4xl sm:text-5xl font-black text-red-500 mb-2 tracking-wide drop-shadow-md">
              ГРУ ЗАКІНЧЕНО
            </h2>
            <p className="text-red-300 font-bold mb-6 text-sm sm:text-base">
              Вороги прорвали оборону!
            </p>

            <div className="bg-black/30 border border-red-500/10 rounded-2xl py-4 px-6 mb-8">
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">РЕЗУЛЬТАТ (ХВИЛЯ {wave})</p>
              <p className="text-white font-black text-4xl sm:text-5xl mt-1">{score}</p>
            </div>

            <button
              onClick={() => initGame(false)} // Повний рестарт
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-black text-2xl sm:text-3xl py-4 rounded-3xl shadow-[0_8px_20px_rgba(239,68,68,0.4)] border border-red-400/30 transform active:scale-95 transition-all"
            >
              СПРОБУВАТИ ЗНОВУ 🔄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
