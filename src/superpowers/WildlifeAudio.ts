/**
 * ========================================================================
 * SUPERPOWER 8: SOUND DESIGN — Ambient Wildlife Spatial Audio
 * ========================================================================
 * 
 * Spatial audio system for immersive wildlife tracking experience.
 * Includes ambient loops, animal calls, weather sounds, and UI feedback.
 */

interface SoundConfig {
  volume: number;
  loop: boolean;
  spatial: boolean;
  maxDistance: number;
  refDistance: number;
  rolloffFactor: number;
}

interface SoundBank {
  [key: string]: {
    url: string;
    config: SoundConfig;
  };
}

// Default sound bank (URLs would point to actual audio files)
const DEFAULT_SOUND_BANK: SoundBank = {
  // Ambient loops
  'ambient_forest': {
    url: '/audio/ambient/forest-loop.mp3',
    config: { volume: 0.3, loop: true, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  'ambient_ocean': {
    url: '/audio/ambient/ocean-waves.mp3',
    config: { volume: 0.4, loop: true, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  'ambient_wind': {
    url: '/audio/ambient/wind-loop.mp3',
    config: { volume: 0.2, loop: true, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  'ambient_night': {
    url: '/audio/ambient/night-crickets.mp3',
    config: { volume: 0.25, loop: true, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  
  // Animal calls
  'eagle_call': {
    url: '/audio/animals/eagle-screech.mp3',
    config: { volume: 0.6, loop: false, spatial: true, maxDistance: 500, refDistance: 10, rolloffFactor: 1 }
  },
  'wolf_howl': {
    url: '/audio/animals/wolf-howl.mp3',
    config: { volume: 0.7, loop: false, spatial: true, maxDistance: 1000, refDistance: 20, rolloffFactor: 0.8 }
  },
  'bear_growl': {
    url: '/audio/animals/bear-growl.mp3',
    config: { volume: 0.8, loop: false, spatial: true, maxDistance: 300, refDistance: 5, rolloffFactor: 1.2 }
  },
  'deer_call': {
    url: '/audio/animals/deer-call.mp3',
    config: { volume: 0.5, loop: false, spatial: true, maxDistance: 400, refDistance: 15, rolloffFactor: 1 }
  },
  'whale_song': {
    url: '/audio/animals/whale-song.mp3',
    config: { volume: 0.4, loop: false, spatial: true, maxDistance: 2000, refDistance: 50, rolloffFactor: 0.5 }
  },
  
  // Weather sounds
  'rain_light': {
    url: '/audio/weather/rain-light.mp3',
    config: { volume: 0.35, loop: true, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  'rain_heavy': {
    url: '/audio/weather/rain-heavy.mp3',
    config: { volume: 0.5, loop: true, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  'thunder': {
    url: '/audio/weather/thunder.mp3',
    config: { volume: 0.8, loop: false, spatial: true, maxDistance: 2000, refDistance: 100, rolloffFactor: 0.5 }
  },
  'wind_strong': {
    url: '/audio/weather/wind-strong.mp3',
    config: { volume: 0.4, loop: true, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  
  // UI sounds
  'ui_click': {
    url: '/audio/ui/click.mp3',
    config: { volume: 0.3, loop: false, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  'ui_hover': {
    url: '/audio/ui/hover.mp3',
    config: { volume: 0.15, loop: false, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  'ui_select': {
    url: '/audio/ui/select.mp3',
    config: { volume: 0.4, loop: false, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  'ui_success': {
    url: '/audio/ui/success.mp3',
    config: { volume: 0.5, loop: false, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
  'ui_alert': {
    url: '/audio/ui/alert.mp3',
    config: { volume: 0.6, loop: false, spatial: false, maxDistance: 0, refDistance: 0, rolloffFactor: 0 }
  },
};

export class WildlifeAudioEngine {
  private ctx: AudioContext | null = null;
  private sounds = new Map<string, AudioBuffer>();
  private activeSources = new Map<string, AudioBufferSourceNode[]>();
  private gainNodes = new Map<string, GainNode>();
  private pannerNodes = new Map<string, PannerNode>();
  private masterGain: GainNode | null = null;
  private soundBank: SoundBank;
  private isMuted = false;
  private globalVolume = 1.0;

  constructor(soundBank: SoundBank = DEFAULT_SOUND_BANK) {
    this.soundBank = soundBank;
  }

  async init(): Promise<void> {
    if (this.ctx) return;
    
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.globalVolume;
    this.masterGain.connect(this.ctx.destination);

    // Pre-load all sounds
    await this.preloadSounds();
  }

  private async preloadSounds(): Promise<void> {
    if (!this.ctx) return;

    const promises = Object.entries(this.soundBank).map(async ([key, sound]) => {
      try {
        const response = await fetch(sound.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
        this.sounds.set(key, audioBuffer);
      } catch (error) {
        console.warn(`Failed to load sound: ${key}`, error);
      }
    });

    await Promise.all(promises);
  }

  play(soundKey: string, position?: { x: number; y: number; z: number }): void {
    if (!this.ctx || this.isMuted) return;
    
    const buffer = this.sounds.get(soundKey);
    if (!buffer) {
      console.warn(`Sound not found: ${soundKey}`);
      return;
    }

    const sound = this.soundBank[soundKey];
    if (!sound) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = sound.config.loop;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = sound.config.volume;

    if (sound.config.spatial && position) {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = sound.config.refDistance;
      panner.maxDistance = sound.config.maxDistance;
      panner.rolloffFactor = sound.config.rolloffFactor;
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;

      source.connect(panner);
      panner.connect(gainNode);
      
      this.pannerNodes.set(soundKey, panner);
    } else {
      source.connect(gainNode);
    }

    gainNode.connect(this.masterGain!);
    
    source.start(0);
    
    // Track active sources
    if (!this.activeSources.has(soundKey)) {
      this.activeSources.set(soundKey, []);
    }
    this.activeSources.get(soundKey)!.push(source);
    this.gainNodes.set(soundKey, gainNode);

    // Clean up when done
    source.onended = () => {
      const sources = this.activeSources.get(soundKey);
      if (sources) {
        const index = sources.indexOf(source);
        if (index > -1) sources.splice(index, 1);
      }
    };
  }

  stop(soundKey: string): void {
    const sources = this.activeSources.get(soundKey);
    if (sources) {
      sources.forEach(source => {
        try {
          source.stop();
        } catch (e) {
          // Already stopped
        }
      });
      this.activeSources.delete(soundKey);
    }
  }

  stopAll(): void {
    for (const [key, sources] of this.activeSources) {
      sources.forEach(source => {
        try {
          source.stop();
        } catch (e) {
          // Already stopped
        }
      });
    }
    this.activeSources.clear();
  }

  setVolume(soundKey: string, volume: number): void {
    const gainNode = this.gainNodes.get(soundKey);
    if (gainNode) {
      gainNode.gain.setTargetAtTime(volume, this.ctx!.currentTime, 0.1);
    }
  }

  setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.globalVolume, this.ctx!.currentTime, 0.1);
    }
  }

  mute(): void {
    this.isMuted = true;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.1);
    }
  }

  unmute(): void {
    this.isMuted = false;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.globalVolume, this.ctx!.currentTime, 0.1);
    }
  }

  updateListenerPosition(position: { x: number; y: number; z: number }, orientation: { fx: number; fy: number; fz: number; ux: number; uy: number; uz: number }): void {
    if (!this.ctx) return;
    
    this.ctx.listener.positionX.value = position.x;
    this.ctx.listener.positionY.value = position.y;
    this.ctx.listener.positionZ.value = position.z;
    
    this.ctx.listener.forwardX.value = orientation.fx;
    this.ctx.listener.forwardY.value = orientation.fy;
    this.ctx.listener.forwardZ.value = orientation.fz;
    this.ctx.listener.upX.value = orientation.ux;
    this.ctx.listener.upY.value = orientation.uy;
    this.ctx.listener.upZ.value = orientation.uz;
  }

  updateSoundPosition(soundKey: string, position: { x: number; y: number; z: number }): void {
    const panner = this.pannerNodes.get(soundKey);
    if (panner) {
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
    }
  }

  // Play ambient soundscape based on environment
  playAmbient(environment: 'forest' | 'ocean' | 'mountain' | 'night'): void {
    this.stop('ambient_forest');
    this.stop('ambient_ocean');
    this.stop('ambient_wind');
    this.stop('ambient_night');

    switch (environment) {
      case 'forest':
        this.play('ambient_forest');
        break;
      case 'ocean':
        this.play('ambient_ocean');
        break;
      case 'mountain':
        this.play('ambient_wind');
        break;
      case 'night':
        this.play('ambient_night');
        break;
    }
  }

  // Play weather sounds
  playWeather(condition: 'clear' | 'rain' | 'storm' | 'wind'): void {
    this.stop('rain_light');
    this.stop('rain_heavy');
    this.stop('wind_strong');

    switch (condition) {
      case 'rain':
        this.play('rain_light');
        break;
      case 'storm':
        this.play('rain_heavy');
        break;
      case 'wind':
        this.play('wind_strong');
        break;
    }
  }

  // Play animal sound with spatial positioning
  playAnimalSound(animalType: string, position: { x: number; y: number; z: number }): void {
    const soundMap: Record<string, string> = {
      eagle: 'eagle_call',
      wolf: 'wolf_howl',
      bear: 'bear_growl',
      deer: 'deer_call',
      whale: 'whale_song',
    };

    const soundKey = soundMap[animalType];
    if (soundKey) {
      this.play(soundKey, position);
    }
  }

  // UI feedback
  playUI(sound: 'click' | 'hover' | 'select' | 'success' | 'alert'): void {
    const soundMap: Record<string, string> = {
      click: 'ui_click',
      hover: 'ui_hover',
      select: 'ui_select',
      success: 'ui_success',
      alert: 'ui_alert',
    };

    const soundKey = soundMap[sound];
    if (soundKey) {
      this.play(soundKey);
    }
  }

  dispose(): void {
    this.stopAll();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.sounds.clear();
    this.gainNodes.clear();
    this.pannerNodes.clear();
  }
}

// React hook for easy integration
export function useWildlifeAudio() {
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const engineRef = useRef<WildlifeAudioEngine | null>(null);

  useEffect(() => {
    const engine = new WildlifeAudioEngine();
    engineRef.current = engine;
    
    engine.init().then(() => {
      setIsReady(true);
    });

    return () => {
      engine.dispose();
    };
  }, []);

  const play = useCallback((soundKey: string, position?: { x: number; y: number; z: number }) => {
    engineRef.current?.play(soundKey, position);
  }, []);

  const stop = useCallback((soundKey: string) => {
    engineRef.current?.stop(soundKey);
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      engineRef.current?.unmute();
      setIsMuted(false);
    } else {
      engineRef.current?.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  return { isReady, isMuted, play, stop, toggleMute, engine: engineRef.current };
}

// Required import for React hook
import { useState, useEffect, useRef, useCallback } from 'react';

export { WildlifeAudioEngine, DEFAULT_SOUND_BANK };
export type { SoundConfig, SoundBank };
