export const demoFixtures = [
    {
        id: "aurora-landing",
        name: "Aurora Landing",
        prompt: "a landing page with aurora effects",
        code: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurora Landing</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      color: white;
      overflow: hidden;
      position: relative;
    }
    .aurora {
      position: absolute;
      inset: 0;
      opacity: 0.6;
      animation: aurora 20s ease-in-out infinite;
      background: radial-gradient(circle at 20% 50%, rgba(125,244,255,0.3) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(255,106,213,0.3) 0%, transparent 50%),
                  radial-gradient(circle at 40% 20%, rgba(124,58,237,0.3) 0%, transparent 50%);
    }
    @keyframes aurora {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(20px, -20px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
    }
    .content {
      position: relative;
      z-index: 1;
      text-align: center;
      max-width: 600px;
      padding: 40px;
    }
    h1 { font-size: 3rem; margin-bottom: 20px; text-shadow: 0 2px 10px rgba(0,0,0,0.3); }
    p { font-size: 1.2rem; opacity: 0.9; margin-bottom: 30px; }
    button {
      background: rgba(255,255,255,0.2);
      border: 2px solid white;
      color: white;
      padding: 12px 30px;
      font-size: 1rem;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.3s;
      backdrop-filter: blur(10px);
    }
    button:hover {
      background: white;
      color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div class="aurora"></div>
  <div class="content">
    <h1>Aurora Dreams</h1>
    <p>Experience the magic of the northern lights in your browser</p>
    <button onclick="alert('Welcome to Aurora Dreams!')">Get Started</button>
  </div>
</body>
</html>`
    },
    {
        id: "pomodoro-app",
        name: "Pomodoro App",
        prompt: "a pomodoro timer with juice",
        code: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pomodoro Timer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', sans-serif;
      background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .timer {
      background: white;
      padding: 60px;
      border-radius: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      min-width: 400px;
    }
    .display {
      font-size: 5rem;
      font-weight: bold;
      color: #FF6B6B;
      margin: 20px 0;
      font-variant-numeric: tabular-nums;
    }
    .controls {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin-top: 30px;
    }
    button {
      padding: 15px 30px;
      font-size: 1rem;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: bold;
    }
    .start {
      background: #4ECDC4;
      color: white;
    }
    .start:hover {
      background: #45b8af;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(78,205,196,0.4);
    }
    .reset {
      background: #FFE66D;
      color: #333;
    }
    .reset:hover {
      background: #ffd93d;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(255,230,109,0.4);
    }
    .label {
      font-size: 1.2rem;
      color: #666;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="timer">
    <div class="label">FOCUS TIME</div>
    <div class="display" id="display">25:00</div>
    <div class="controls">
      <button class="start" onclick="toggleTimer()">Start</button>
      <button class="reset" onclick="resetTimer()">Reset</button>
    </div>
  </div>
  <script>
    let minutes = 25;
    let seconds = 0;
    let interval = null;
    const display = document.getElementById('display');
    const startBtn = document.querySelector('.start');
    
    function updateDisplay() {
      const m = String(minutes).padStart(2, '0');
      const s = String(seconds).padStart(2, '0');
      display.textContent = m + ':' + s;
    }
    
    function toggleTimer() {
      if (interval) {
        clearInterval(interval);
        interval = null;
        startBtn.textContent = 'Start';
      } else {
        startBtn.textContent = 'Pause';
        interval = setInterval(() => {
          if (seconds === 0) {
            if (minutes === 0) {
              clearInterval(interval);
              interval = null;
              startBtn.textContent = 'Start';
              alert('Time is up! Take a break! 🎉');
              return;
            }
            minutes--;
            seconds = 59;
          } else {
            seconds--;
          }
          updateDisplay();
        }, 1000);
      }
    }
    
    function resetTimer() {
      clearInterval(interval);
      interval = null;
      minutes = 25;
      seconds = 0;
      startBtn.textContent = 'Start';
      updateDisplay();
    }
  </script>
</body>
</html>`
    },
    {
        id: "particle-toy",
        name: "Particle Toy",
        prompt: "an interactive particle playground",
        code: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Particle Playground</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0a;
      overflow: hidden;
      cursor: crosshair;
    }
    canvas {
      display: block;
      width: 100vw;
      height: 100vh;
    }
    .info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: white;
      font-family: monospace;
      font-size: 14px;
      background: rgba(0,0,0,0.5);
      padding: 15px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }
  </style>
</head>
<body>
  <div class="info">
    Click and drag to create particles<br>
    Move your mouse to interact
  </div>
  <canvas id="canvas"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    let mouseX = 0;
    let mouseY = 0;
    let mouseDown = false;
    
    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.size = Math.random() * 3 + 1;
        this.life = 1;
        this.decay = Math.random() * 0.01 + 0.005;
        this.hue = Math.random() * 60 + 180;
      }
      
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 100) {
          const force = (100 - dist) / 100;
          this.vx -= (dx / dist) * force * 0.5;
          this.vy -= (dy / dist) * force * 0.5;
        }
        
        this.vx *= 0.98;
        this.vy *= 0.98;
      }
      
      draw() {
        ctx.fillStyle = \`hsla(\${this.hue}, 70%, 60%, \${this.life})\`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    function animate() {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (mouseDown && Math.random() < 0.3) {
        particles.push(new Particle(mouseX, mouseY));
      }
      
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        
        if (particles[i].life <= 0) {
          particles.splice(i, 1);
        }
      }
      
      requestAnimationFrame(animate);
    }
    
    canvas.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    
    canvas.addEventListener('mousedown', () => mouseDown = true);
    canvas.addEventListener('mouseup', () => mouseDown = false);
    
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
    
    animate();
  </script>
</body>
</html>`
    }
];
