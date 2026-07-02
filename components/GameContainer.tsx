"use client";

import { useEffect, useRef, useState } from "react";

interface Position {
  x: number;
  y: number;
}

interface BodyPart {
  x: number;
  y: number;
  angle: number;
}

type FruitType = "apple" | "banana" | "watermelon" | "cherry" | "grape" | "tomato" | "cucumber" | "poop";

interface Fruit {
  id: number;
  x: number;
  y: number;
  type: FruitType;
}

const CHUNK_SIZE = 300;

const pseudoRandom = (x: number, y: number) => {
  let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

const getEnvironmentObject = (col: number, row: number) => {
  const seed = pseudoRandom(col, row);
  const baseX = col * CHUNK_SIZE + CHUNK_SIZE / 2;
  const baseY = row * CHUNK_SIZE + CHUNK_SIZE / 2;
  const offsetX = (pseudoRandom(col + 1, row) - 0.5) * CHUNK_SIZE * 0.6;
  const offsetY = (pseudoRandom(col, row + 1) - 0.5) * CHUNK_SIZE * 0.6;
  const x = baseX + offsetX;
  const y = baseY + offsetY;
  
  const sizeFactor = pseudoRandom(col + 2, row + 2);

  if (seed < 0.04) {
    return { type: 'puddle', x, y, radius: 80 + sizeFactor * 70, seed }; 
  } else if (seed < 0.08) {
    return { type: 'stump', x, y, radius: 60, seed }; 
  } else if (seed < 0.12) {
    return { type: 'stone', x, y, radius: 50 + sizeFactor * 40, seed }; 
  }
  return null;
};

class GameAudio {
  private ctx: AudioContext | null = null;
  private lastSlitherTime = 0;

  init() {
    if (this.ctx) return;
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  private resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playStart() {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const playNote = (freq: number, time: number, duration: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.15, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    playNote(523.25, now, 0.4); // C5
    playNote(659.25, now + 0.1, 0.4); // E5
    playNote(783.99, now + 0.2, 0.4); // G5
    playNote(1046.50, now + 0.3, 0.6); // C6
  }

  playEat() {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    try {
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.08);
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch (e) {
      // Fallback
    }

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
    
    oscGain.gain.setValueAtTime(0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playCrash() {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.25);
    
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(300, now);
    lp.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    osc.connect(lp);
    lp.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playPoop() {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.5); 
      
      mod.frequency.value = 18; 
      modGain.gain.value = 50; 
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.5);
      
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      mod.connect(modGain);
      modGain.connect(osc.frequency);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      mod.start(now);
      osc.start(now);
      
      mod.stop(now + 0.5);
      osc.stop(now + 0.5);
    } catch (e) {
      // Fallback
    }
  }

  playVictory() {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const playSynthNote = (freq: number, time: number, duration: number, type: OscillatorType = "triangle", vol = 0.15) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    playSynthNote(261.63, now, 0.3);
    playSynthNote(329.63, now + 0.15, 0.3);
    playSynthNote(392.00, now + 0.3, 0.3);
    playSynthNote(523.25, now + 0.45, 0.3);
    playSynthNote(659.25, now + 0.6, 0.3);
    playSynthNote(783.99, now + 0.75, 0.3);
    
    playSynthNote(523.25, now + 0.9, 1.2, "sine", 0.1);
    playSynthNote(659.25, now + 0.9, 1.2, "sine", 0.1);
    playSynthNote(783.99, now + 0.9, 1.2, "sine", 0.1);
    playSynthNote(1046.50, now + 0.9, 1.5, "triangle", 0.1);
  }

  playSlither() {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    if (Date.now() - this.lastSlitherTime < 220) return;
    this.lastSlitherTime = Date.now();

    try {
      const bufferSize = this.ctx.sampleRate * 0.06;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.012, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      
      noise.start(now);
    } catch (e) {
      // Fallback
    }
  }

  playSplash() {
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(1500, now + 0.15);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      // Also a quick noise pop
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      noise.connect(filter);
      noiseGain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.15);
      noise.start(now);
    } catch (e) {
      // Fallback
    }
  }
}

export default function GameContainer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audio = useRef<GameAudio | null>(null);
  const eatAnimationTimer = useRef<number>(0);
  
  // --- СТАНИ КВЕСТІВ ТА UI ---
  const [uiState, setUiState] = useState<'START' | 'PLAYING' | 'VICTORY'>('START');
  const [questUI, setQuestUI] = useState({ fruit: 'apple' as FruitType, target: 5, progress: 0 });
  
  const gameStateRef = useRef<'START' | 'PLAYING' | 'VICTORY'>('START');
  const questRef = useRef({ fruit: 'apple' as FruitType, target: 5, progress: 0 });
  const prevQuestFruit = useRef<FruitType | null>(null);

  const snakePos = useRef<Position>({ x: 0, y: 0 });
  const direction = useRef<Position>({ x: 0, y: 0 });
  const currentAngle = useRef<number>(-Math.PI / 2);
  
  const bodyLength = useRef<number>(14); 
  const snakeHistory = useRef<BodyPart[]>([]);
  const segmentSpacing = 5;

  const fruits = useRef<Fruit[]>([]);
  const maxFruits = 18; 

  const isBlinking = useRef<boolean>(false);
  const nextBlinkTime = useRef<number>(Date.now() + 2000);
  const isTongueOut = useRef<boolean>(false);
  const tongueTimer = useRef<number>(0);
  const animationTime = useRef<number>(0);
  
  const fogTimer = useRef<number>(0);
  const stunTimer = useRef<number>(0); 
  const splashTimer = useRef<number>(0); 
  const splashDrops = useRef<{x:number, y:number, r:number, speed:number}[]>([]);

  const snakeColor = useRef<{main: string, dark: string}>({ main: "#22c55e", dark: "#15803d" });

  const isPressing = useRef<boolean>(false);
  const touchStart = useRef<Position>({ x: 0, y: 0 });

  const BASE_SPEED = 4.5;

  const fruitConfigs: Record<FruitType, { emoji: string; main: string; dark: string; glow1: string, glow2: string }> = {
    apple: { emoji: "🍎", main: "#ef4444", dark: "#b91c1c", glow1: "rgba(239, 68, 68, 0.3)", glow2: "rgba(239, 68, 68, 0.1)" },
    banana: { emoji: "🍌", main: "#facc15", dark: "#ca8a04", glow1: "rgba(250, 204, 21, 0.3)", glow2: "rgba(250, 204, 21, 0.1)" },
    watermelon: { emoji: "🍉", main: "#ec4899", dark: "#be185d", glow1: "rgba(236, 72, 153, 0.3)", glow2: "rgba(236, 72, 153, 0.1)" },
    cherry: { emoji: "🍒", main: "#e11d48", dark: "#9f1239", glow1: "rgba(225, 29, 72, 0.3)", glow2: "rgba(225, 29, 72, 0.1)" },
    grape: { emoji: "🍇", main: "#a855f7", dark: "#7e22ce", glow1: "rgba(168, 85, 247, 0.3)", glow2: "rgba(168, 85, 247, 0.1)" },
    tomato: { emoji: "🍅", main: "#f97316", dark: "#c2410c", glow1: "rgba(249, 115, 22, 0.3)", glow2: "rgba(249, 115, 22, 0.1)" },
    cucumber: { emoji: "🥒", main: "#22c55e", dark: "#15803d", glow1: "rgba(34, 197, 94, 0.3)", glow2: "rgba(34, 197, 94, 0.1)" },
    poop: { emoji: "💩", main: "#854d0e", dark: "#422006", glow1: "rgba(133, 77, 14, 0.3)", glow2: "rgba(133, 77, 14, 0.1)" } 
  };

  // --- ЛОГІКА ГЕНЕРАЦІЇ КВЕСТУ ---
  const generateNewQuest = () => {
    const regularTypes: FruitType[] = ["apple", "banana", "watermelon", "cherry", "grape", "tomato", "cucumber"];
    
    // Шукаємо фрукт, якого не було минулого разу
    let newFruit = regularTypes[Math.floor(Math.random() * regularTypes.length)];
    while (newFruit === prevQuestFruit.current) {
      newFruit = regularTypes[Math.floor(Math.random() * regularTypes.length)];
    }
    
    // Цифра від 2 до 8 (щоб не було занадто нудно або довго)
    const newTarget = Math.floor(Math.random() * 7) + 2; 

    prevQuestFruit.current = newFruit;
    questRef.current = { fruit: newFruit, target: newTarget, progress: 0 };
    setQuestUI({ fruit: newFruit, target: newTarget, progress: 0 });
    
    gameStateRef.current = 'START';
    setUiState('START');
    
    // Скидаємо керування
    direction.current = { x: 0, y: 0 };
    isPressing.current = false;
  };

  // Перший квест при завантаженні
  useEffect(() => {
    generateNewQuest();
    audio.current = new GameAudio();
  }, []);

  const startGame = () => {
    gameStateRef.current = 'PLAYING';
    setUiState('PLAYING');
    audio.current?.playStart();
  };

  const createSmartFruit = (id: number, existingFruits: Fruit[], customRange?: number): Fruit => {
    const regularTypes: FruitType[] = ["apple", "banana", "watermelon", "cherry", "grape", "tomato", "cucumber"];
    let randomType: FruitType;
    
    if (Math.random() < 0.12) {
      randomType = "poop";
    } else {
      // Підігруємо малому: 35% шанс, що з'явиться саме той фрукт, який потрібен по квесту
      if (Math.random() < 0.35) {
        randomType = questRef.current.fruit;
      } else {
        randomType = regularTypes[Math.floor(Math.random() * regularTypes.length)];
      }
    }

    const range = customRange || 1800; 
    let newX = 0, newY = 0;
    let isValidPosition = false;
    let attempts = 0;

    while (!isValidPosition && attempts < 50) {
      newX = snakePos.current.x + (Math.random() - 0.5) * range;
      newY = snakePos.current.y + (Math.random() - 0.5) * range;
      isValidPosition = true;

      for (const fruit of existingFruits) {
        if (fruit.id === id) continue;
        const dx = fruit.x - newX;
        const dy = fruit.y - newY;
        if (Math.sqrt(dx * dx + dy * dy) < 140) {
          isValidPosition = false; break;
        }
      }

      if (isValidPosition) {
        const col = Math.floor(newX / CHUNK_SIZE);
        const row = Math.floor(newY / CHUNK_SIZE);
        for (let c = col - 1; c <= col + 1; c++) {
          for (let r = row - 1; r <= row + 1; r++) {
            const envObj = getEnvironmentObject(c, r);
            if (envObj) {
              const dx = envObj.x - newX;
              const dy = envObj.y - newY;
              if (Math.sqrt(dx * dx + dy * dy) < envObj.radius + 40) {
                isValidPosition = false; break;
              }
            }
          }
          if (!isValidPosition) break;
        }
      }
      attempts++;
    }

    return { id, x: newX, y: newY, type: randomType };
  };

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

    if (fruits.current.length === 0) {
      for (let i = 0; i < maxFruits; i++) {
        fruits.current.push(createSmartFruit(i, fruits.current, i < 8 ? 800 : 2000));
      }
    }

    if (snakeHistory.current.length === 0) {
      for (let i = 0; i < 300; i++) {
        snakeHistory.current.push({ x: 0, y: i * BASE_SPEED, angle: -Math.PI / 2 });
      }
    }

    let animationFrameId: number;

    const gameLoop = () => {
      animationTime.current += 0.15;

      // Рух обробляємо ТІЛЬКИ якщо ми в стані гри
      if (gameStateRef.current === 'PLAYING') {
        if (stunTimer.current > 0) {
          stunTimer.current--; 
        } else {
          const isMoving = direction.current.x !== 0 || direction.current.y !== 0;
          if (isMoving) {
            audio.current?.playSlither();
            let currentSpeed = BASE_SPEED;
            const curCol = Math.floor(snakePos.current.x / CHUNK_SIZE);
            const curRow = Math.floor(snakePos.current.y / CHUNK_SIZE);
            
            for (let c = curCol - 1; c <= curCol + 1; c++) {
              for (let r = curRow - 1; r <= curRow + 1; r++) {
                const envObj = getEnvironmentObject(c, r);
                if (envObj && envObj.type === 'puddle') {
                  const dx = envObj.x - snakePos.current.x;
                  const dy = envObj.y - snakePos.current.y;
                  if (Math.sqrt(dx * dx + dy * dy) < envObj.radius) {
                    currentSpeed = BASE_SPEED * 0.4; 
                    if (splashTimer.current <= 0) {
                      splashTimer.current = 100;
                      audio.current?.playSplash();
                      splashDrops.current = Array.from({length: 15}).map(() => ({
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * window.innerHeight * 0.5,
                        r: Math.random() * 8 + 4,
                        speed: Math.random() * 3 + 2
                      }));
                    }
                  }
                }
              }
            }

            const nextX = snakePos.current.x + direction.current.x * currentSpeed;
            const nextY = snakePos.current.y + direction.current.y * currentSpeed;

            const nextCol = Math.floor(nextX / CHUNK_SIZE);
            const nextRow = Math.floor(nextY / CHUNK_SIZE);
            let hitSolid = false;

            for (let c = nextCol - 1; c <= nextCol + 1; c++) {
              for (let r = nextRow - 1; r <= nextRow + 1; r++) {
                const envObj = getEnvironmentObject(c, r);
                if (envObj && (envObj.type === 'stone' || envObj.type === 'stump')) {
                  const dx = envObj.x - nextX;
                  const dy = envObj.y - nextY;
                  if (Math.sqrt(dx * dx + dy * dy) < envObj.radius + 22) {
                    hitSolid = true;
                  }
                }
              }
            }

            if (hitSolid) {
              stunTimer.current = 80; 
              snakePos.current.x -= direction.current.x * 12;
              snakePos.current.y -= direction.current.y * 12;
              direction.current = { x: 0, y: 0 };
              isPressing.current = false;
              audio.current?.playCrash();
            } else {
              snakePos.current.x = nextX;
              snakePos.current.y = nextY;
              currentAngle.current = Math.atan2(direction.current.y, direction.current.x);
            }
          }

          snakeHistory.current.unshift({ x: snakePos.current.x, y: snakePos.current.y, angle: currentAngle.current });
          if (snakeHistory.current.length > bodyLength.current * segmentSpacing + 10) {
            snakeHistory.current.length = bodyLength.current * segmentSpacing + 10;
          }
        }

        fruits.current.forEach((fruit) => {
          const dx = snakePos.current.x - fruit.x;
          const dy = snakePos.current.y - fruit.y;
          if (Math.sqrt(dx * dx + dy * dy) < 45) {
            
            if (fruit.type === "poop") {
              fogTimer.current = 300;
              audio.current?.playPoop();
            } else {
              bodyLength.current += 1;
              audio.current?.playEat();
              eatAnimationTimer.current = 15;
              
              // --- ЛОГІКА ВИКОНАННЯ КВЕСТУ ---
              if (fruit.type === questRef.current.fruit) {
                questRef.current.progress += 1;
                setQuestUI({ ...questRef.current }); // Оновлюємо UI
                
                // Якщо зібрали все!
                if (questRef.current.progress >= questRef.current.target) {
                  gameStateRef.current = 'VICTORY';
                  setUiState('VICTORY');
                  direction.current = { x: 0, y: 0 }; // Зупиняємо змію
                  isPressing.current = false;
                  audio.current?.playVictory();
                }
              }
            }
            
            snakeColor.current = { main: fruitConfigs[fruit.type].main, dark: fruitConfigs[fruit.type].dark };
            const regeneratedFruit = createSmartFruit(fruit.id, fruits.current, 1800);
            Object.assign(fruit, regeneratedFruit);
          }
        });

        // Переміщуємо фрукти, які опинилися занадто далеко від змії, ближче до неї,
        // щоб дитина завжди знаходила фрукти поруч, навіть якщо поповзе в інший бік від початку
        fruits.current.forEach((fruit) => {
          const dx = snakePos.current.x - fruit.x;
          const dy = snakePos.current.y - fruit.y;
          if (dx * dx + dy * dy > 2200 * 2200) {
            const regeneratedFruit = createSmartFruit(fruit.id, fruits.current, 1800);
            Object.assign(fruit, regeneratedFruit);
          }
        });
      }

      if (Date.now() > nextBlinkTime.current) {
        if (!isBlinking.current) {
          isBlinking.current = true;
          setTimeout(() => { isBlinking.current = false; nextBlinkTime.current = Date.now() + Math.random() * 4000 + 2000; }, 150);
        }
      }
      tongueTimer.current++;
      if (!isTongueOut.current && tongueTimer.current > 120 && Math.random() < 0.02 && stunTimer.current === 0) {
        isTongueOut.current = true;
        tongueTimer.current = 0;
        setTimeout(() => { isTongueOut.current = false; }, 300);
      }

      // --- МАЛЮВАННЯ В СВІТІ ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.fillStyle = "#0f5132"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const startCol = Math.floor((snakePos.current.x - centerX) / CHUNK_SIZE);
      const endCol = startCol + Math.ceil(canvas.width / CHUNK_SIZE) + 1;
      const startRow = Math.floor((snakePos.current.y - centerY) / CHUNK_SIZE);
      const endRow = startRow + Math.ceil(canvas.height / CHUNK_SIZE) + 1;

      for (let col = startCol; col <= endCol; col++) {
        for (let row = startRow; row <= endRow; row++) {
          const envObj = getEnvironmentObject(col, row);
          const blockCenterX = centerX + (col * CHUNK_SIZE + CHUNK_SIZE / 2 - snakePos.current.x);
          const blockCenterY = centerY + (row * CHUNK_SIZE + CHUNK_SIZE / 2 - snakePos.current.y);

          if (envObj) {
            const screenX = centerX + (envObj.x - snakePos.current.x);
            const screenY = centerY + (envObj.y - snakePos.current.y);

            ctx.save();
            ctx.translate(screenX, screenY);

            if (envObj.type === 'puddle') {
              const pSizeX = envObj.radius; const pSizeY = envObj.radius * 0.6;
              ctx.fillStyle = "#0284c7"; ctx.beginPath(); 
              ctx.ellipse(0, 0, pSizeX, pSizeY, envObj.seed * Math.PI, 0, Math.PI * 2); 
              ctx.ellipse(pSizeX * 0.3, pSizeY * 0.2, pSizeX * 0.8, pSizeY * 0.9, envObj.seed * Math.PI * 1.5, 0, Math.PI * 2); 
              ctx.fill();
              ctx.fillStyle = "rgba(255, 255, 255, 0.25)"; ctx.beginPath(); 
              ctx.ellipse(-pSizeX * 0.3, -pSizeY * 0.3, pSizeX * 0.2, pSizeY * 0.1, envObj.seed * Math.PI, 0, Math.PI * 2); 
              ctx.fill();
            } else if (envObj.type === 'stump') {
              const r = envObj.radius;
              ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0, r * 0.4, r * 0.7, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = "#451a03"; ctx.fillRect(-r * 0.5, -r * 0.35, r, r * 0.7);
              ctx.beginPath(); ctx.moveTo(-r*0.5, r*0.35); ctx.lineTo(-r*0.8, r*0.5); ctx.lineTo(-r*0.2, r*0.35); ctx.fill();
              ctx.beginPath(); ctx.moveTo(r*0.5, r*0.35); ctx.lineTo(r*0.8, r*0.5); ctx.lineTo(r*0.2, r*0.35); ctx.fill();
              ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.ellipse(0, -r * 0.35, r * 0.5, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
              ctx.strokeStyle = "#78350f"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -r * 0.35, r * 0.25, r * 0.1, 0, 0, Math.PI * 2); ctx.stroke();
            } else if (envObj.type === 'stone') {
              const r = envObj.radius; ctx.rotate(envObj.seed * Math.PI * 2);
              ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0, r * 0.4, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = "#64748b"; ctx.beginPath();
              ctx.moveTo(r, 0); ctx.lineTo(r*0.7, r*0.8); ctx.lineTo(-r*0.6, r*0.8); ctx.lineTo(-r, 0); ctx.lineTo(-r*0.7, -r*0.8); ctx.lineTo(r*0.6, -r*0.8);
              ctx.closePath(); ctx.fill();
              ctx.strokeStyle = "#475569"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.2); ctx.lineTo(r * 0.2, 0); ctx.stroke();
              ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r*0.1, -r*0.4); ctx.lineTo(-r*0.2, r*0.1); ctx.stroke();
            }
            ctx.restore();
          } else {
            const sway = Math.sin(animationTime.current * 0.2 + pseudoRandom(col, row) * 100) * 12; 
            ctx.save(); ctx.translate(blockCenterX, blockCenterY);
            ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 3; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-10 + sway/2, -10, -15 + sway, -18);
            ctx.moveTo(0, 2); ctx.quadraticCurveTo(sway/2, -12, sway, -22); ctx.moveTo(5, 0); ctx.quadraticCurveTo(10 + sway/2, -10, 15 + sway, -16);
            ctx.stroke(); ctx.restore();
          }
        }
      }

      fruits.current.forEach((fruit) => {
        const fruitScreenX = centerX + (fruit.x - snakePos.current.x);
        const fruitScreenY = centerY + (fruit.y - snakePos.current.y);

        if (fruitScreenX > -50 && fruitScreenX < canvas.width + 50 && fruitScreenY > -50 && fruitScreenY < canvas.height + 50) {
          const fruitFloat = Math.sin(animationTime.current * 0.5 + fruit.id) * 4;
          const cfg = fruitConfigs[fruit.type];

          ctx.save();
          // Підсвічуємо фрукт ще сильніше, якщо він зараз потрібен по квесту
          if (fruit.type === questRef.current.fruit) {
             ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; 
             ctx.beginPath(); ctx.arc(fruitScreenX, fruitScreenY + fruitFloat, 45, 0, Math.PI * 2); ctx.fill();
          }
          
          ctx.fillStyle = cfg.glow2; ctx.beginPath(); ctx.arc(fruitScreenX, fruitScreenY + fruitFloat, 35, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = cfg.glow1; ctx.beginPath(); ctx.arc(fruitScreenX, fruitScreenY + fruitFloat, 20, 0, Math.PI * 2); ctx.fill();
          ctx.font = "40px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(fruitScreenX, fruitScreenY + 20, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillText(cfg.emoji, fruitScreenX, fruitScreenY + fruitFloat);
          ctx.restore();
        }
      });

      for (let i = bodyLength.current - 1; i > 0; i--) {
        const historyIndex = i * segmentSpacing;
        const part = snakeHistory.current[historyIndex] || snakeHistory.current[snakeHistory.current.length - 1];
        if (!part) continue;

        let screenX = centerX + (part.x - snakePos.current.x);
        let screenY = centerY + (part.y - snakePos.current.y);
        const waveIndex = i / bodyLength.current; 
        const wave = Math.sin(animationTime.current - i * 0.3) * 6 * waveIndex;
        screenX += Math.cos(part.angle + Math.PI / 2) * wave;
        screenY += Math.sin(part.angle + Math.PI / 2) * wave;

        const radius = 22 * (1 - (i / bodyLength.current) * 0.8);
        ctx.save(); ctx.translate(screenX, screenY); ctx.rotate(part.angle);
        ctx.fillStyle = i % 2 === 0 ? snakeColor.current.main : snakeColor.current.dark;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();

        if (i % 2 === 0 && radius > 10) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.35)"; ctx.beginPath();
          ctx.moveTo(-radius * 0.4, 0); ctx.lineTo(0, -radius * 0.3); ctx.lineTo(radius * 0.4, 0); ctx.lineTo(0, radius * 0.3); ctx.fill();
        }
        ctx.restore();
      }

      ctx.save();
      let lungeX = 0;
      let lungeY = 0;
      let headScale = 1.0;
      if (eatAnimationTimer.current > 0) {
        const t = (15 - eatAnimationTimer.current) / 15;
        const dist = Math.sin(t * Math.PI) * 16; // Lunging forward 16px
        lungeX = Math.cos(currentAngle.current) * dist;
        lungeY = Math.sin(currentAngle.current) * dist;
        headScale = 1.0 + Math.sin(t * Math.PI) * 0.45; // Scaling up to 1.45x
        eatAnimationTimer.current--;
      }
      ctx.translate(centerX + lungeX, centerY + lungeY);
      let headDrawAngle = currentAngle.current;
      
      // Якщо перемога — змія радісно крутить головою
      if (gameStateRef.current === 'VICTORY') {
        headDrawAngle += Math.sin(animationTime.current * 4) * 0.3;
      } else if (stunTimer.current > 0) {
        headDrawAngle += Math.sin(animationTime.current * 3) * 0.5; 
      }
      ctx.rotate(headDrawAngle);
      ctx.scale(headScale, headScale);

      if (isTongueOut.current && stunTimer.current === 0 && gameStateRef.current === 'PLAYING') {
        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(45, 0); ctx.moveTo(45, 0); ctx.lineTo(52, -5); ctx.moveTo(45, 0); ctx.lineTo(52, 5); ctx.stroke();
      }

      ctx.fillStyle = snakeColor.current.main; ctx.beginPath();
      ctx.moveTo(28, 0); ctx.bezierCurveTo(28, -15, 12, -22, -10, -22); ctx.bezierCurveTo(-22, -22, -22, 22, -10, 22); ctx.bezierCurveTo(12, 22, 28, 15, 28, 0); ctx.fill();

      const eyeOffsetForward = 8; const eyeOffsetSide = 12;

      if (stunTimer.current > 0 && gameStateRef.current === 'PLAYING') {
        ctx.strokeStyle = snakeColor.current.dark; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(eyeOffsetForward - 4, -eyeOffsetSide - 4); ctx.lineTo(eyeOffsetForward + 4, -eyeOffsetSide + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(eyeOffsetForward - 4, -eyeOffsetSide + 4); ctx.lineTo(eyeOffsetForward + 4, -eyeOffsetSide - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(eyeOffsetForward - 4, eyeOffsetSide - 4); ctx.lineTo(eyeOffsetForward + 4, eyeOffsetSide + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(eyeOffsetForward - 4, eyeOffsetSide + 4); ctx.lineTo(eyeOffsetForward + 4, eyeOffsetSide - 4); ctx.stroke();
        
        for (let s = 0; s < 3; s++) {
          const angle = animationTime.current * 0.5 + (s * Math.PI * 2) / 3;
          const distance = 35 + Math.sin(animationTime.current + s) * 5;
          ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, 4, 0, Math.PI * 2); ctx.fill();
        }
      } else if (isBlinking.current) {
        ctx.strokeStyle = snakeColor.current.dark; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(eyeOffsetForward - 4, -eyeOffsetSide); ctx.lineTo(eyeOffsetForward + 5, -eyeOffsetSide); ctx.moveTo(eyeOffsetForward - 4, eyeOffsetSide); ctx.lineTo(eyeOffsetForward + 5, eyeOffsetSide); ctx.stroke();
      } else {
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(eyeOffsetForward, -eyeOffsetSide, 6, 4, 0, 0, Math.PI * 2); ctx.ellipse(eyeOffsetForward, eyeOffsetSide, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.ellipse(eyeOffsetForward + 2, -eyeOffsetSide, 2, 3, 0, 0, Math.PI * 2); ctx.ellipse(eyeOffsetForward + 2, eyeOffsetSide, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(eyeOffsetForward + 3, -eyeOffsetSide - 1, 1, 0, Math.PI * 2); ctx.arc(eyeOffsetForward + 3, eyeOffsetSide - 1, 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      if (splashTimer.current > 0) {
        splashTimer.current--;
        const opacity = Math.min(1, splashTimer.current / 30);
        ctx.save(); ctx.fillStyle = `rgba(14, 165, 233, ${0.1 * opacity})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(56, 189, 248, ${0.7 * opacity})`;
        splashDrops.current.forEach(drop => {
          drop.y += drop.speed; ctx.beginPath(); ctx.ellipse(drop.x, drop.y, drop.r, drop.r * 1.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * opacity})`; ctx.beginPath(); ctx.arc(drop.x - drop.r * 0.3, drop.y - drop.r * 0.5, drop.r * 0.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(56, 189, 248, ${0.7 * opacity})`; 
        });
        ctx.restore();
      }

      if (fogTimer.current > 0) {
        fogTimer.current--;
        const opacity = Math.min(1, fogTimer.current / 60); 
        ctx.save();
        const fogGrd = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, canvas.width * 0.6);
        fogGrd.addColorStop(0, `rgba(34, 197, 94, 0)`); fogGrd.addColorStop(0.3, `rgba(21, 128, 61, ${0.8 * opacity})`); fogGrd.addColorStop(1, `rgba(2, 44, 34, ${0.98 * opacity})`); 
        ctx.fillStyle = fogGrd; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'PLAYING' || stunTimer.current > 0) return; 
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") direction.current = { x: 0, y: -1 };
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") direction.current = { x: 0, y: 1 };
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") direction.current = { x: -1, y: 0 };
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") direction.current = { x: 1, y: 0 };
    };

    const handleKeyUp = () => { if (gameStateRef.current === 'PLAYING' && stunTimer.current === 0) direction.current = { x: 0, y: 0 }; };

    const startAction = (clientX: number, clientY: number) => {
      if (gameStateRef.current !== 'PLAYING' || stunTimer.current > 0) return;
      isPressing.current = true;
      touchStart.current = { x: clientX, y: clientY };
    };

    const moveAction = (clientX: number, clientY: number) => {
      if (!isPressing.current || gameStateRef.current !== 'PLAYING' || stunTimer.current > 0) return;
      const dx = clientX - touchStart.current.x;
      const dy = clientY - touchStart.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        direction.current = { x: dx / Math.sqrt(dx * dx + dy * dy), y: dy / Math.sqrt(dx * dx + dy * dy) };
      }
    };

    const endAction = () => {
      isPressing.current = false;
      if (gameStateRef.current === 'PLAYING' && stunTimer.current === 0) direction.current = { x: 0, y: 0 };
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousedown", (e) => startAction(e.clientX, e.clientY));
    canvas.addEventListener("mousemove", (e) => moveAction(e.clientX, e.clientY));
    window.addEventListener("mouseup", endAction);

    canvas.addEventListener("touchstart", (e) => startAction(e.touches[0].clientX, e.touches[0].clientY));
    canvas.addEventListener("touchmove", (e) => moveAction(e.touches[0].clientX, e.touches[0].clientY));
    canvas.addEventListener("touchend", endAction);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mouseup", endAction);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden touch-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HUD (Інтерфейс під час гри) */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-black/60 text-white font-bold px-5 py-3 rounded-full border-2 border-white/20 shadow-lg backdrop-blur-sm flex items-center gap-4">
          <span className="text-4xl filter drop-shadow-md">{fruitConfigs[questUI.fruit].emoji}</span>
          <span className="text-3xl font-black text-white tracking-widest">
            {questUI.progress} / <span className="text-yellow-400">{questUI.target}</span>
          </span>
        </div>
      </div>

      {/* OVERLAY: СТАРТ / НОВЕ ЗАВДАННЯ */}
      {uiState === 'START' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white/95 rounded-[3rem] p-10 flex flex-col items-center gap-8 shadow-2xl border-4 border-slate-200 transform hover:scale-105 transition-transform">
            
            <div className="flex items-center gap-6 animate-bounce">
              <span className="text-8xl">{fruitConfigs[questUI.fruit].emoji}</span>
              <span className="text-[7rem] font-black text-slate-800 leading-none">{questUI.target}</span>
            </div>

            <button 
              onClick={startGame}
              className="bg-green-500 text-white rounded-full p-6 shadow-[0_8px_0_rgb(21,128,61)] active:shadow-[0_0px_0_rgb(21,128,61)] active:translate-y-2 transition-all hover:bg-green-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="currentColor" className="ml-2">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY: ПЕРЕМОГА */}
      {uiState === 'VICTORY' && (
        <div className="absolute inset-0 bg-green-500/80 backdrop-blur-md flex items-center justify-center z-50 animate-in zoom-in duration-300">
          <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center gap-8 shadow-2xl">
            
            <div className="text-9xl animate-bounce">🏆</div>
            
            <div className="flex items-center gap-4">
              <span className="text-6xl">{fruitConfigs[questUI.fruit].emoji}</span>
              <span className="text-5xl font-black text-green-500">
                {questUI.target} / {questUI.target}
              </span>
            </div>

            <button 
              onClick={generateNewQuest}
              className="bg-yellow-400 text-slate-900 rounded-full p-6 shadow-[0_8px_0_rgb(202,138,4)] active:shadow-[0_0px_0_rgb(202,138,4)] active:translate-y-2 transition-all hover:bg-yellow-300 mt-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}