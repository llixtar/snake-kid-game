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

type FruitType = "apple" | "banana" | "watermelon" | "cherry" | "grape" | "tomato" | "cucumber";

interface Fruit {
  id: number;
  x: number;
  y: number;
  type: FruitType;
  emoji: string;
  size: number;
}

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
}

export default function GameContainer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audio = useRef<GameAudio | null>(null);
  const eatAnimationTimer = useRef<number>(0);
  
  useEffect(() => {
    audio.current = new GameAudio();
  }, []);
  
  const [score, setScore] = useState<number>(0);

  const snakePos = useRef<Position>({ x: 0, y: 0 });
  const direction = useRef<Position>({ x: 0, y: 0 });
  const currentAngle = useRef<number>(0);
  
  // Стартова довжина тепер менша, і росте вона повільніше
  const bodyLength = useRef<number>(15); 
  const snakeHistory = useRef<BodyPart[]>([]);
  const segmentSpacing = 8;

  const fruits = useRef<Fruit[]>([]);
  const maxFruits = 35; // Трохи зменшили загальну кількість

  const isBlinking = useRef<boolean>(false);
  const nextBlinkTime = useRef<number>(Date.now() + 2000);
  const isTongueOut = useRef<boolean>(false);
  const tongueTimer = useRef<number>(0);
  const animationTime = useRef<number>(0);

  const isPressing = useRef<boolean>(false);
  const touchStart = useRef<Position>({ x: 0, y: 0 });

  const speed = 4.5;

  const fruitEmojis: Record<FruitType, string> = {
    apple: "🍎", banana: "🍌", watermelon: "🍉", cherry: "🍒",
    grape: "🍇", tomato: "🍅", cucumber: "🥒"
  };

  // Ще більша кучність (розширений радіус відштовхування)
  const createSmartFruit = (id: number, existingFruits: Fruit[], customRange?: number): Fruit => {
    const types: FruitType[] = ["apple", "banana", "watermelon", "cherry", "grape", "tomato", "cucumber"];
    const randomType = types[Math.floor(Math.random() * types.length)];
    // Розкидаємо на більшу площу
    const range = customRange || 2000; 
    
    let newX = 0;
    let newY = 0;
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
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Збільшили мінімальну дистанцію між фруктами до 200px
        if (distance < 200) {
          isValidPosition = false;
          break;
        }
      }
      attempts++;
    }

    return { id, x: newX, y: newY, type: randomType, emoji: fruitEmojis[randomType], size: 40 };
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
        fruits.current.push(createSmartFruit(i, fruits.current, i < 10 ? 1000 : 2500));
      }
    }

    if (snakeHistory.current.length === 0) {
      for (let i = 0; i < 300; i++) {
        snakeHistory.current.push({ x: 0, y: 0, angle: 0 });
      }
    }

    let animationFrameId: number;

    const gameLoop = () => {
      animationTime.current += 0.15;

      const isMoving = direction.current.x !== 0 || direction.current.y !== 0;
      if (isMoving) {
        audio.current?.playSlither();
        snakePos.current.x += direction.current.x * speed;
        snakePos.current.y += direction.current.y * speed;
        currentAngle.current = Math.atan2(direction.current.y, direction.current.x);
      }

      snakeHistory.current.unshift({ x: snakePos.current.x, y: snakePos.current.y, angle: currentAngle.current });
      if (snakeHistory.current.length > bodyLength.current * segmentSpacing) {
        snakeHistory.current.pop();
      }

      // Перевірка поїдання
      fruits.current.forEach((fruit) => {
        const dx = snakePos.current.x - fruit.x;
        const dy = snakePos.current.y - fruit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 45) {
          // Ростемо лише на +1 сегмент (не буде розтягуватись на весь екран)
          bodyLength.current += 1;
          setScore((prev) => prev + 1);
          audio.current?.playEat();
          eatAnimationTimer.current = 15;
          
          const regeneratedFruit = createSmartFruit(fruit.id, fruits.current, 2500);
          Object.assign(fruit, regeneratedFruit);
        }
      });

      // Переміщуємо фрукти, які опинилися занадто далеко від змії, ближче до неї,
      // щоб дитина завжди знаходила фрукти поруч, навіть якщо поповзе в інший бік від початку
      fruits.current.forEach((fruit) => {
        const dx = snakePos.current.x - fruit.x;
        const dy = snakePos.current.y - fruit.y;
        if (dx * dx + dy * dy > 2200 * 2200) {
          const regeneratedFruit = createSmartFruit(fruit.id, fruits.current, 2000);
          Object.assign(fruit, regeneratedFruit);
        }
      });

      // Очі та язик
      if (Date.now() > nextBlinkTime.current) {
        if (!isBlinking.current) {
          isBlinking.current = true;
          setTimeout(() => {
            isBlinking.current = false;
            nextBlinkTime.current = Date.now() + Math.random() * 4000 + 2000;
          }, 150);
        }
      }
      tongueTimer.current++;
      if (!isTongueOut.current && tongueTimer.current > 120 && Math.random() < 0.02) {
        isTongueOut.current = true;
        tongueTimer.current = 0;
        setTimeout(() => { isTongueOut.current = false; }, 300);
      }

      // --- МАЛЮВАННЯ ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Трава (сітка)
      ctx.strokeStyle = "#1e293b"; 
      ctx.lineWidth = 2;
      const gridSize = 140;
      const offsetX = -snakePos.current.x % gridSize;
      const offsetY = -snakePos.current.y % gridSize;

      for (let x = offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = offsetY; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Фрукти
      fruits.current.forEach((fruit) => {
        const fruitScreenX = centerX + (fruit.x - snakePos.current.x);
        const fruitScreenY = centerY + (fruit.y - snakePos.current.y);

        if (
          fruitScreenX > -50 && fruitScreenX < canvas.width + 50 && 
          fruitScreenY > -50 && fruitScreenY < canvas.height + 50
        ) {
          const fruitFloat = Math.sin(animationTime.current * 0.5 + fruit.id) * 4;
          
          ctx.save();
          ctx.font = `${fruit.size}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath();
          ctx.ellipse(fruitScreenX, fruitScreenY + 20, 15, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillText(fruit.emoji, fruitScreenX, fruitScreenY + fruitFloat);
          ctx.restore();
        }
      });

      // --- ТІЛО ЗМІЇ (Новий дизайн) ---
      for (let i = bodyLength.current - 1; i > 0; i--) {
        const historyIndex = i * segmentSpacing;
        const part = snakeHistory.current[historyIndex] || snakeHistory.current[snakeHistory.current.length - 1];
        
        let screenX = centerX + (part.x - snakePos.current.x);
        let screenY = centerY + (part.y - snakePos.current.y);

        const waveIndex = i / bodyLength.current; 
        const wave = Math.sin(animationTime.current - i * 0.4) * 6 * waveIndex; // Хвиля трохи м'якша
        screenX += Math.cos(part.angle + Math.PI / 2) * wave;
        screenY += Math.sin(part.angle + Math.PI / 2) * wave;

        const radius = 22 * (1 - (i / bodyLength.current) * 0.7); // Тіло трохи тонше

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(part.angle); // Повертаємо кожен сегмент за його кутом руху

        // Основний колір сегмента
        ctx.fillStyle = i % 2 === 0 ? "#16a34a" : "#15803d"; // Більш природні зелені відтінки
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();

        // Візерунок (зміїний ромбик на спині)
        if (i % 2 === 0 && radius > 8) {
          ctx.fillStyle = "#86efac"; // Світло-зелений візерунок
          ctx.beginPath();
          ctx.moveTo(-radius * 0.4, 0);
          ctx.lineTo(0, -radius * 0.3);
          ctx.lineTo(radius * 0.4, 0);
          ctx.lineTo(0, radius * 0.3);
          ctx.fill();
        }
        ctx.restore();
      }

      // --- ГОЛОВА ЗМІЇ (Нова форма) ---
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
      ctx.rotate(currentAngle.current);
      ctx.scale(headScale, headScale);

      if (isTongueOut.current) {
        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(45, 0);
        ctx.moveTo(45, 0); ctx.lineTo(52, -5); ctx.moveTo(45, 0); ctx.lineTo(52, 5); ctx.stroke();
      }

      // Змінили форму на видовжений овал (зміїну голову)
      ctx.fillStyle = "#16a34a";
      ctx.beginPath(); 
      ctx.ellipse(4, 0, 26, 22, 0, 0, Math.PI * 2); // Видовжуємо по осі X
      ctx.fill();

      // Надбрівні дуги (для характеру)
      ctx.fillStyle = "#15803d";
      ctx.beginPath(); 
      ctx.ellipse(8, -12, 10, 6, Math.PI/8, 0, Math.PI * 2);
      ctx.ellipse(8, 12, 10, 6, -Math.PI/8, 0, Math.PI * 2);
      ctx.fill();

      // Очі
      ctx.fillStyle = "#ffffff";
      const eyeOffsetForward = 10;
      const eyeOffsetSide = 12;

      if (isBlinking.current) {
        ctx.strokeStyle = "#15803d"; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(eyeOffsetForward - 4, -eyeOffsetSide); ctx.lineTo(eyeOffsetForward + 5, -eyeOffsetSide);
        ctx.moveTo(eyeOffsetForward - 4, eyeOffsetSide); ctx.lineTo(eyeOffsetForward + 5, eyeOffsetSide);
        ctx.stroke();
      } else {
        // Очі трохи овальні
        ctx.beginPath(); 
        ctx.ellipse(eyeOffsetForward, -eyeOffsetSide, 7, 5, 0, 0, Math.PI * 2); 
        ctx.ellipse(eyeOffsetForward, eyeOffsetSide, 7, 5, 0, 0, Math.PI * 2); 
        ctx.fill();
        
        // Зміїна (вертикальна) зіниця
        ctx.fillStyle = "#000000"; 
        ctx.beginPath(); 
        ctx.ellipse(eyeOffsetForward + 2, -eyeOffsetSide, 2, 4, 0, 0, Math.PI * 2); 
        ctx.ellipse(eyeOffsetForward + 2, eyeOffsetSide, 2, 4, 0, 0, Math.PI * 2); 
        ctx.fill();
        
        ctx.fillStyle = "#ffffff"; 
        ctx.beginPath(); 
        ctx.arc(eyeOffsetForward + 3, -eyeOffsetSide - 2, 1.5, 0, Math.PI * 2); 
        ctx.arc(eyeOffsetForward + 3, eyeOffsetSide - 2, 1.5, 0, Math.PI * 2); 
        ctx.fill();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") direction.current = { x: 0, y: -1 };
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") direction.current = { x: 0, y: 1 };
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") direction.current = { x: -1, y: 0 };
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") direction.current = { x: 1, y: 0 };
    };

    const handleKeyUp = () => { direction.current = { x: 0, y: 0 }; };

    const startAction = (clientX: number, clientY: number) => {
      isPressing.current = true;
      touchStart.current = { x: clientX, y: clientY };
    };

    const moveAction = (clientX: number, clientY: number) => {
      if (!isPressing.current) return;
      const dx = clientX - touchStart.current.x;
      const dy = clientY - touchStart.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        direction.current = { x: dx / distance, y: dy / distance };
      }
    };

    const endAction = () => {
      isPressing.current = false;
      direction.current = { x: 0, y: 0 };
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
    <div className="relative w-full h-full select-none">
      <canvas ref={canvasRef} className="block w-full h-full bg-slate-900" />
      
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
        <div className="bg-black/60 text-white font-bold px-4 py-2 rounded-full border border-green-500 shadow-lg backdrop-blur-sm text-lg flex items-center gap-2">
          <span>З'їдено:</span>
          <span className="text-green-400 text-xl font-black">{score}</span>
        </div>
      </div>
    </div>
  );
}