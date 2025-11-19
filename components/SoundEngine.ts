



import { NOTES } from '../constants';

class SoundEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  bgmInterval: number | null = null;
  currentBgmType: 'normal' | 'boss' | 'none' = 'none';
  
  // Special Beam Audio Nodes
  beamOsc: OscillatorNode | null = null;
  beamLfo: OscillatorNode | null = null;
  beamGain: GainNode | null = null;

  // Drone Audio Nodes
  droneOsc: OscillatorNode | null = null;
  droneGain: GainNode | null = null;

  // Boss Hover Audio Nodes
  bossHoverOsc: OscillatorNode | null = null;
  bossHoverGain: GainNode | null = null;
  
  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Master volume
    this.masterGain.connect(this.ctx.destination);
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol: number = 1) {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playShoot() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
    osc.type = 'sawtooth';
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playRicochet() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // High pitched "ping"
    osc.frequency.setValueAtTime(2000, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(3000, this.ctx.currentTime + 0.05);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playHeavyDamage() {
    if (!this.ctx) return;
    // Crunchy noise for part destruction
    const duration = 0.3;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    noise.connect(gain);
    gain.connect(this.masterGain!);
    noise.start();
  }

  playExplosion() {
    if (!this.ctx) return;
    const duration = 0.4;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + duration);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start();
  }
  
  playMassiveExplosion() {
    if (!this.ctx) return;
    // Longer, deeper explosion for Boss
    const duration = 1.5;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i/bufferSize); // Fade out in buffer
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + duration); // sweep down
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start();
  }

  playPowerup() {
    if (!this.ctx) return;
    // Magical ascending chime
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.2;
    gain.connect(this.masterGain!);

    const tones = [660, 880, 1100, 1320];
    tones.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        osc.connect(gain);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.2);
    });
    
    gain.gain.setTargetAtTime(0, now + 0.4, 0.1);
  }

  playEnemyFall() {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.5);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  updateEnemyDrone(enemyCount: number) {
    if (!this.ctx || !this.masterGain) return;

    if (enemyCount > 0) {
        if (!this.droneOsc) {
            this.droneOsc = this.ctx.createOscillator();
            this.droneOsc.type = 'sawtooth';
            this.droneOsc.frequency.value = 50; 
            
            this.droneGain = this.ctx.createGain();
            this.droneGain.gain.value = 0;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 150;

            this.droneOsc.connect(filter);
            filter.connect(this.droneGain);
            this.droneGain.connect(this.masterGain);
            this.droneOsc.start();
        }
        
        const targetVol = Math.min(0.1, enemyCount * 0.02);
        this.droneGain?.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.5);
        this.droneOsc.frequency.setTargetAtTime(50 + (enemyCount * 2), this.ctx.currentTime, 0.5);
    } else {
        if (this.droneGain) {
            this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
        }
    }
  }

  startBeam() {
      if (!this.ctx || this.beamOsc) return;

      // Carrier
      this.beamOsc = this.ctx.createOscillator();
      this.beamOsc.type = 'sawtooth';
      this.beamOsc.frequency.setValueAtTime(110, this.ctx.currentTime);

      // LFO for FM Modulation (Vibrato/Energy feel)
      this.beamLfo = this.ctx.createOscillator();
      this.beamLfo.type = 'square';
      this.beamLfo.frequency.value = 30; // Fast flutter
      
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 50; // Modulation depth

      this.beamLfo.connect(lfoGain);
      lfoGain.connect(this.beamOsc.frequency);

      // Main Gain
      this.beamGain = this.ctx.createGain();
      this.beamGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.beamGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.1);

      this.beamOsc.connect(this.beamGain);
      this.beamGain.connect(this.masterGain!);

      this.beamOsc.start();
      this.beamLfo.start();
  }

  stopBeam() {
      if (!this.ctx) return;
      if (this.beamGain) {
          this.beamGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
          setTimeout(() => {
              this.beamOsc?.stop();
              this.beamLfo?.stop();
              this.beamOsc?.disconnect();
              this.beamLfo?.disconnect();
              this.beamGain?.disconnect();
              this.beamOsc = null;
              this.beamLfo = null;
              this.beamGain = null;
          }, 200);
      }
  }

  playStart() {
    this.playTone(440, 'square', 0.1);
    setTimeout(() => this.playTone(660, 'square', 0.1), 100);
    setTimeout(() => this.playTone(880, 'square', 0.4), 200);
  }

  startBGM() {
    if (this.currentBgmType === 'normal') return;
    this.stopBGM();
    this.currentBgmType = 'normal';

    let noteIdx = 0;
    const loop = () => {
      if (!this.ctx) return;
      
      // Bassline
      const bassNote = NOTES.BASS[noteIdx % NOTES.BASS.length];
      this.playTone(bassNote, 'sawtooth', 0.2, 0.25);
      
      // Arp
      if (noteIdx % 2 === 0) {
        const leadNote = NOTES.LEAD[Math.floor(Math.random() * NOTES.LEAD.length)];
        setTimeout(() => this.playTone(leadNote * 2, 'sine', 0.1, 0.1), 125);
      }

      noteIdx++;
    };
    
    this.bgmInterval = window.setInterval(loop, 250);
  }

  startBossBGM() {
    if (this.currentBgmType === 'boss') return;
    this.stopBGM();
    this.currentBgmType = 'boss';

    // Start Boss Hover
    if (this.ctx && this.masterGain && !this.bossHoverOsc) {
        this.bossHoverOsc = this.ctx.createOscillator();
        this.bossHoverOsc.type = 'sawtooth';
        this.bossHoverOsc.frequency.value = 80;

        this.bossHoverGain = this.ctx.createGain();
        this.bossHoverGain.gain.value = 0;
        this.bossHoverGain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;

        this.bossHoverOsc.connect(filter);
        filter.connect(this.bossHoverGain);
        this.bossHoverGain.connect(this.masterGain);
        this.bossHoverOsc.start();
    }

    let tick = 0;
    const loop = () => {
      if (!this.ctx) return;
      
      // Scary Dissonant Bass (Tritone interval C -> F#)
      const note = tick % 2 === 0 ? 65.41 : 92.50; // C2 then F#2
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note, this.ctx.currentTime);
      // Pitch bend down for menace
      osc.frequency.exponentialRampToValueAtTime(note * 0.8, this.ctx.currentTime + 0.2);
      
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);

      // Industrial Noise "Percussion"
      if (tick % 4 === 0) {
         this.playHeavyDamage(); 
      }

      // High pitched panic noise
      if (Math.random() > 0.7) {
          this.playTone(800 + Math.random() * 500, 'square', 0.1, 0.05);
      }

      tick++;
    };
    
    this.bgmInterval = window.setInterval(loop, 120); // Fast, tense tempo
  }
  
  stopBossHover() {
    if (this.bossHoverOsc && this.ctx) {
        this.bossHoverGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
        setTimeout(() => {
            try {
              this.bossHoverOsc?.stop();
              this.bossHoverOsc?.disconnect();
              this.bossHoverGain?.disconnect();
            } catch(e) {}
            this.bossHoverOsc = null;
            this.bossHoverGain = null;
        }, 600);
    }
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.stopBossHover();
    this.updateEnemyDrone(0);
    this.currentBgmType = 'none';
    this.stopBeam(); 
  }
}

export const soundEngine = new SoundEngine();