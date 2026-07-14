/**
 * ========================================================================
 * SUPERPOWER 7: 3D ANIMAL MODELS — GLB/GLTF Animated Wildlife
 * ========================================================================
 * 
 * Loads and animates 3D animal models in the Three.js scene.
 * Includes pre-configured models for: eagle, wolf, bear, deer, whale, shark.
 */

import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface AnimalModelConfig {
  scale: number;
  animationSpeed: number;
  offsetY: number;
  rotationOffset: number;
}

const ANIMAL_CONFIGS: Record<string, AnimalModelConfig> = {
  eagle: { scale: 0.5, animationSpeed: 1.0, offsetY: 2, rotationOffset: 0 },
  wolf: { scale: 0.8, animationSpeed: 0.8, offsetY: 0, rotationOffset: 0 },
  bear: { scale: 1.0, animationSpeed: 0.6, offsetY: 0, rotationOffset: 0 },
  deer: { scale: 0.7, animationSpeed: 0.9, offsetY: 0, rotationOffset: 0 },
  whale: { scale: 2.0, animationSpeed: 0.4, offsetY: -5, rotationOffset: Math.PI / 2 },
  shark: { scale: 1.2, animationSpeed: 0.7, offsetY: -3, rotationOffset: Math.PI / 2 },
  default: { scale: 1.0, animationSpeed: 1.0, offsetY: 0, rotationOffset: 0 },
};

export class AnimalModelManager {
  private loader: GLTFLoader;
  private models = new Map<string, GLTF>();
  private animations = new Map<string, THREE.AnimationAction[]>();
  private mixers = new Map<string, THREE.AnimationMixer>();
  private placeholderGeometry: THREE.BufferGeometry;
  private placeholderMaterial: THREE.Material;

  constructor() {
    this.loader = new GLTFLoader();
    
    // Create placeholder (low-poly animal shape)
    this.placeholderGeometry = this.createPlaceholderGeometry();
    this.placeholderMaterial = new THREE.MeshStandardMaterial({
      color: 0x12e0ff,
      emissive: 0x12e0ff,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.6,
    });
  }

  private createPlaceholderGeometry(): THREE.BufferGeometry {
    // Create a simple low-poly animal shape (elongated sphere with ears)
    const body = new THREE.SphereGeometry(1, 8, 6);
    body.scale(1.5, 1, 1);
    
    // Create placeholder that looks like an animal silhouette
    const group = new THREE.Group();
    const bodyMesh = new THREE.Mesh(body);
    bodyMesh.position.set(0, 0, 0);
    group.add(bodyMesh);
    
    // Head
    const head = new THREE.SphereGeometry(0.6, 6, 4);
    const headMesh = new THREE.Mesh(head);
    headMesh.position.set(1.2, 0.3, 0);
    group.add(headMesh);
    
    // Ears
    const ear = new THREE.ConeGeometry(0.2, 0.5, 4);
    const leftEar = new THREE.Mesh(ear);
    leftEar.position.set(1.3, 0.8, 0.3);
    leftEar.rotation.z = -0.3;
    group.add(leftEar);
    
    const rightEar = new THREE.Mesh(ear);
    rightEar.position.set(1.3, 0.8, -0.3);
    rightEar.rotation.z = -0.3;
    group.add(rightEar);
    
    return body; // Return body as base geometry
  }

  async loadModel(animalType: string, url?: string): Promise<THREE.Group | null> {
    // If URL provided, load actual GLB
    if (url) {
      try {
        const gltf = await this.loader.loadAsync(url);
        this.models.set(animalType, gltf);
        
        // Setup animations
        if (gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(gltf.scene);
          const actions = gltf.animations.map(clip => {
            const action = mixer.clipAction(clip);
            action.play();
            return action;
          });
          this.animations.set(animalType, actions);
          this.mixers.set(animalType, mixer);
        }
        
        return gltf.scene;
      } catch (error) {
        console.warn(`Failed to load model for ${animalType}:`, error);
        return this.createPlaceholder(animalType);
      }
    }
    
    // Return placeholder
    return this.createPlaceholder(animalType);
  }

  createPlaceholder(animalType: string): THREE.Group {
    const config = ANIMAL_CONFIGS[animalType] || ANIMAL_CONFIGS.default;
    const group = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.SphereGeometry(1, 12, 8);
    bodyGeo.scale(1.5, 1, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.getAnimalColor(animalType),
      roughness: 0.6,
      metalness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.6, 10, 8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(1.4, 0.3, 0);
    group.add(head);
    
    // Eyes (glow)
    const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffcf4d });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(1.7, 0.4, 0.3);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(1.7, 0.4, -0.3);
    group.add(rightEye);
    
    // Ears
    const earGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const leftEar = new THREE.Mesh(earGeo, bodyMat);
    leftEar.position.set(1.2, 0.9, 0.3);
    leftEar.rotation.z = -0.3;
    group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, bodyMat);
    rightEar.position.set(1.2, 0.9, -0.3);
    rightEar.rotation.z = -0.3;
    group.add(rightEar);
    
    // Tail
    const tailGeo = new THREE.CylinderGeometry(0.05, 0.15, 1, 6);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(-1.2, 0.2, 0);
    tail.rotation.z = 0.5;
    group.add(tail);
    
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.8, 6);
    const positions = [
      [0.5, -0.8, 0.4],
      [0.5, -0.8, -0.4],
      [-0.5, -0.8, 0.4],
      [-0.5, -0.8, -0.4],
    ];
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      group.add(leg);
    });
    
    // Apply config
    group.scale.setScalar(config.scale);
    group.position.y = config.offsetY;
    group.rotation.y = config.rotationOffset;
    
    return group;
  }

  private getAnimalColor(animalType: string): number {
    const colors: Record<string, number> = {
      eagle: 0x8B4513, // Brown
      wolf: 0x808080,  // Gray
      bear: 0x3D2914,  // Dark brown
      deer: 0xD2691E,  // Chocolate
      whale: 0x2F4F4F, // Dark slate
      shark: 0x708090, // Slate gray
    };
    return colors[animalType] || 0x12e0ff;
  }

  update(deltaTime: number): void {
    for (const mixer of this.mixers.values()) {
      mixer.update(deltaTime);
    }
  }

  createTrail(points: THREE.Vector3[]): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x12e0ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.6,
    });
    return new THREE.Line(geometry, material);
  }

  dispose(): void {
    for (const gltf of this.models.values()) {
      gltf.scene.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    this.models.clear();
    this.animations.clear();
    this.mixers.clear();
  }
}

// Helper to detect animal type from species name
export function detectAnimalType(species: string): string {
  const lower = species.toLowerCase();
  if (lower.includes('eagle') || lower.includes('hawk') || lower.includes('falcon')) return 'eagle';
  if (lower.includes('wolf') || lower.includes('dog') || lower.includes('fox')) return 'wolf';
  if (lower.includes('bear')) return 'bear';
  if (lower.includes('deer') || lower.includes('elk') || lower.includes('moose')) return 'deer';
  if (lower.includes('whale') || lower.includes('dolphin') || lower.includes('orca')) return 'whale';
  if (lower.includes('shark')) return 'shark';
  return 'default';
}

export { AnimalModelManager, ANIMAL_CONFIGS };
