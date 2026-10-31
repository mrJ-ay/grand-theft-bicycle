// Procedural Web Audio API Sound Engine (No external assets required!)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sirenOsc1 = null;
    this.sirenOsc2 = null;
    this.sirenGain = null;
    this.sirenTimer = null;
    this.isSirenPlaying = false;

    this.musicTimer = null;
    this.isMusicPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 1. 따르릉 자전거 벨소리 (Classic bicycle bell)
  playBell() {
    this.init();
    const now = this.ctx.currentTime;
    
    // Two rapid ring strikes: "따릉- 따릉-"
    [0, 0.14].forEach(offset => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2050, now + offset);
      osc.frequency.exponentialRampToValueAtTime(2000, now + offset + 0.12);
      
      gain.gain.setValueAtTime(0.35, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + offset);
      osc.stop(now + offset + 0.13);
    });
  }

  // 2. 자물쇠 자르는 소리 (Metallic bolt cutting sound)
  playCut() {
    this.init();
    const now = this.ctx.currentTime;
    
    // Heavy metallic clank
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);

    // High frequency metal friction / snap
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'square';
    snapOsc.frequency.setValueAtTime(1400, now + 0.04);
    snapOsc.frequency.exponentialRampToValueAtTime(2600, now + 0.1);

    snapGain.gain.setValueAtTime(0.25, now + 0.04);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    snapOsc.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapOsc.start(now + 0.04);
    snapOsc.stop(now + 0.13);
  }

  // 3. 페달 밟기 / 체인 기어 소리 (Pedaling tick)
  playPedal() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.05);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // 4. 현금 획득 소리 (GTA Cha-Ching!)
  playCash() {
    this.init();
    const now = this.ctx.currentTime;
    const notes = [987.77, 1318.51, 1975.53]; // B5, E6, B6
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0.28, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.26);
    });
  }

  // 5. 충돌 소리 (Crash / hit)
  playCrash() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  // 6. 경찰차 사이렌 루프 (GTA 1 Wailing Police Siren)
  setSiren(active) {
    if (active && !this.isSirenPlaying) {
      this.init();
      this.isSirenPlaying = true;
      
      const now = this.ctx.currentTime;
      this.sirenOsc1 = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      
      this.sirenOsc1.type = 'sawtooth';
      this.sirenOsc1.frequency.setValueAtTime(650, now);
      
      this.sirenGain.gain.setValueAtTime(0.12, now);
      
      this.sirenOsc1.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc1.start(now);

      let up = true;
      this.sirenTimer = setInterval(() => {
        if (!this.ctx || !this.isSirenPlaying) return;
        const cur = this.ctx.currentTime;
        const targetFreq = up ? 980 : 620;
        this.sirenOsc1.frequency.linearRampToValueAtTime(targetFreq, cur + 0.38);
        up = !up;
      }, 400);

    } else if (!active && this.isSirenPlaying) {
      this.isSirenPlaying = false;
      if (this.sirenTimer) clearInterval(this.sirenTimer);
      if (this.sirenGain) {
        this.sirenGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        setTimeout(() => {
          if (this.sirenOsc1) {
            this.sirenOsc1.stop();
            this.sirenOsc1.disconnect();
            this.sirenOsc1 = null;
          }
        }, 250);
      }
    }
  }

  // 7. 검거 BUSTED 사운드
  playBusted() {
    this.setSiren(false);
    this.init();
    const now = this.ctx.currentTime;
    
    // Low dramatic drone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 1.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.21);
  }

  // 8. 펑키 레트로 BGM 비트 (GTA 1 라디오 감성 베이스라인)
  startRetroRadio() {
    if (this.isMusicPlaying) return;
    this.init();
    this.isMusicPlaying = true;
    
    // Funky repetitive bassline pattern
    const bassline = [110, 110, 130.81, 146.83, 110, 164.81, 146.83, 123.47];
    let step = 0;

    this.musicTimer = setInterval(() => {
      if (!this.isMusicPlaying) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bassline[step % bassline.length], now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);

      // Simple hi-hat noise on offbeat
      if (step % 2 === 1) {
        this.playHiHat(now);
      }

      step++;
    }, 220);
  }

  playHiHat(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(8000, time);

    gain.gain.setValueAtTime(0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  stopRetroRadio() {
    this.isMusicPlaying = false;
    if (this.musicTimer) clearInterval(this.musicTimer);
  }
}

window.soundEngine = new SoundEngine();
