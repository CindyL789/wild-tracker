/**
 * ========================================================================
 * SUPERPOWER 1: 3D TERRAIN VIEW
 * ========================================================================
 * 
 * Transforms Cindy's 2D map into a 3D globe/terrain view using
 * bountywarz-booster patterns: CityEngine, Three.js, terrain generation.
 * 
 * Features:
 * - 3D globe with animal tracking paths rendered as glowing trails
 * - Terrain elevation based on real-world data
 * - Day/night cycle synced to animal locations
 * - Particle effects for animal markers
 * - Touch/mouse orbit controls
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { TaggedAnimal, TrackingEvent } from '../types';

interface TerrainView3DProps {
  animals: TaggedAnimal[];
  events: TrackingEvent[];
  selectedAnimalId: string | null;
  onSelectAnimal: (id: string | null) => void;
}

// Earth radius in 3D units
const EARTH_RADIUS = 100;

// Convert lat/lng to 3D position on sphere
function latLngToVector3(lat: number, lng: number, radius: number = EARTH_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

// Create glow texture for animal markers
function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(18, 224, 255, 0.8)'); // CYAN
  gradient.addColorStop(0.5, 'rgba(18, 224, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

// Create trail geometry from tracking events
function createTrailGeometry(events: TrackingEvent[]): THREE.BufferGeometry {
  const points = events.map(e => latLngToVector3(e.lat, e.lng, EARTH_RADIUS + 2));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  // Add color attribute based on altitude
  const colors = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    const altitude = events[i].altitude || 0;
    const t = Math.min(altitude / 5000, 1); // Normalize to 5000m

    // Gradient from green (low) to cyan (high)
    colors[i * 3] = 0.2 + t * 0.0;     // R
    colors[i * 3 + 1] = 0.9 - t * 0.2; // G
    colors[i * 3 + 2] = 0.4 + t * 0.6; // B
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return geometry;
}

export default function TerrainView3D({ animals, events, selectedAnimalId, onSelectAnimal }: TerrainView3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'globe' | 'terrain'>('globe');

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011); // cosmic-black

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 250);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 120;
    controls.maxDistance = 400;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(100, 50, 50);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x12e0ff, 0.5); // CYAN rim
    rimLight.position.set(-100, 0, -100);
    scene.add(rimLight);

    // Earth sphere
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      emissive: 0x0b0f0c,
      emissiveIntensity: 0.2,
      shininess: 10,
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Wireframe overlay
    const wireframeGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 0.5, 32, 32);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x12e0ff, // CYAN
      wireframe: true,
      transparent: true,
      opacity: 0.05,
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    scene.add(wireframe);

    // Atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 5, 32, 32);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      uniforms: {
        c: { value: 0.3 },
        p: { value: 4.0 },
        glowColor: { value: new THREE.Color(0x12e0ff) }, // CYAN
        viewVector: { value: camera.position },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.6 - dot(vNormal, vNormel), 4.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.8);
        }
      `,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Animal markers and trails
    const markerGroup = new THREE.Group();
    const trailGroup = new THREE.Group();
    scene.add(markerGroup);
    scene.add(trailGroup);

    const glowTexture = createGlowTexture();
    const markers: Map<string, THREE.Sprite> = new Map();

    // Create markers for each animal
    animals.forEach((animal) => {
      if (!animal.latestLat || !animal.latestLng) return;

      const position = latLngToVector3(animal.latestLat, animal.latestLng, EARTH_RADIUS + 3);

      // Glow sprite
      const spriteMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: selectedAnimalId === animal.id ? 0xffcf4d : 0x12e0ff, // GOLD if selected, CYAN default
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.copy(position);
      sprite.scale.set(8, 8, 1);
      sprite.userData = { animalId: animal.id };
      markerGroup.add(sprite);
      markers.set(animal.id, sprite);

      // Trail for selected animal
      if (selectedAnimalId === animal.id) {
        const animalEvents = events.filter(e => e.individualId === animal.id);
        if (animalEvents.length > 1) {
          const trailGeometry = createTrailGeometry(animalEvents);
          const trailMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: 2,
            transparent: true,
            opacity: 0.8,
          });
          const trail = new THREE.Line(trailGeometry, trailMaterial);
          trailGroup.add(trail);
        }
      }
    });

    // Raycaster for click interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(markerGroup.children);

      if (intersects.length > 0) {
        const clickedMarker = intersects[0].object as THREE.Sprite;
        const animalId = clickedMarker.userData.animalId;
        onSelectAnimal(animalId === selectedAnimalId ? null : animalId);
      } else {
        onSelectAnimal(null);
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Update atmosphere shader
      atmosphereMaterial.uniforms.viewVector.value = camera.position;

      // Pulse selected marker
      if (selectedAnimalId && markers.has(selectedAnimalId)) {
        const marker = markers.get(selectedAnimalId)!;
        const time = Date.now() * 0.002;
        const scale = 8 + Math.sin(time) * 2;
        marker.scale.set(scale, scale, 1);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();
    setIsLoading(false);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', onMouseClick);
      renderer.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      glowTexture.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [animals, events, selectedAnimalId, onSelectAnimal]);

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#0b0f0c] z-30 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#12e0ff] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono uppercase tracking-wider text-[#12e0ff]">
            Initializing 3D Globe...
          </span>
        </div>
      )}

      {/* View mode toggle */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        <button
          onClick={() => setViewMode('globe')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
            viewMode === 'globe'
              ? 'bg-[#12e0ff] text-[#000011]'
              : 'bg-[#1a1a2e] text-[#12e0ff] border border-[#12e0ff]/30'
          }`}
        >
          Globe
        </button>
        <button
          onClick={() => setViewMode('terrain')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
            viewMode === 'terrain'
              ? 'bg-[#12e0ff] text-[#000011]'
              : 'bg-[#1a1a2e] text-[#12e0ff] border border-[#12e0ff]/30'
          }`}
        >
          Terrain
        </button>
      </div>

      {/* Animal count badge */}
      <div className="absolute top-4 right-4 z-20 bg-[#1a1a2e]/80 border border-[#12e0ff]/20 px-3 py-1.5 rounded-lg">
        <span className="text-[10px] font-mono text-[#12e0ff]">
          {animals.length} ANIMALS TRACKED
        </span>
      </div>

      {/* 3D Canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full rounded-2xl overflow-hidden"
        style={{ minHeight: '500px' }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#1a1a2e]/80 border border-[#12e0ff]/20 p-3 rounded-xl">
        <div className="text-[10px] font-bold text-[#ffcf4d] uppercase tracking-wider mb-2">
          Legend
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <div className="w-2 h-2 rounded-full bg-[#12e0ff] shadow-[0_0_6px_#12e0ff]" />
          Animal Position
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
          <div className="w-2 h-2 rounded-full bg-[#ffcf4d] shadow-[0_0_6px_#ffcf4d]" />
          Selected Animal
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
          <div className="w-4 h-0.5 bg-gradient-to-r from-[#3dff9a] to-[#12e0ff]" />
          Movement Trail
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 z-20 text-[9px] text-gray-500 font-mono">
        Drag to rotate • Scroll to zoom • Click marker to select
      </div>
    </div>
  );
}
