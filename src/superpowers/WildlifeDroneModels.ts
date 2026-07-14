/**
 * ========================================================================
 * WILDLIFE TRACKING DRONES — Adapted from bountywarz Drone Models
 * ========================================================================
 * 
 * ADAPTED FROM: bountywarz/shared/drone-models.js
 * 
 * Stylized 3D tracking drone models for wildlife observation.
 * Golden-hour palette, cyan accents, low-poly aesthetic.
 */

import * as THREE from 'three';

export class WildlifeDroneModels {
  /**
   * Build a wildlife observation drone
   * Silent propellers, thermal camera, GPS tracker
   */
  static buildObserverDrone(color: number = 0xc9a44a): THREE.Group {
    const group = new THREE.Group();

    // Body — flattened octahedron (wider than tall)
    const body = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 0),
      new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.5,
        roughness: 0.3,
        emissive: color,
        emissiveIntensity: 0.05
      })
    );
    body.scale.set(1.2, 0.6, 1);
    group.add(body);

    // Silent propeller arms
    const armMat = new THREE.MeshPhysicalMaterial({
      color: 0x222244,
      metalness: 0.4,
      roughness: 0.5
    });
    
    const angles = [0.15, Math.PI - 0.15, Math.PI + 0.15, -0.15];
    angles.forEach((a) => {
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.45, 4),
        armMat
      );
      arm.rotation.z = Math.PI / 2;
      arm.position.set(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22);
      group.add(arm);

      const motor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 0.08, 8),
        new THREE.MeshPhysicalMaterial({
          color: 0x555577,
          metalness: 0.7,
          roughness: 0.3
        })
      );
      motor.position.set(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45);
      group.add(motor);

      // Silent propellers (cyan glow)
      const prop = new THREE.Mesh(
        new THREE.RingGeometry(0.03, 0.12, 12),
        new THREE.MeshBasicMaterial({
          color: 0x4ad6ff,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide
        })
      );
      prop.position.set(Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45);
      group.add(prop);
    });

    // Thermal camera (forward-facing)
    const camera = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.1, 0.2),
      new THREE.MeshPhysicalMaterial({
        color: 0x111111,
        metalness: 0.8,
        roughness: 0.2
      })
    );
    camera.position.set(0, 0, 0.45);
    group.add(camera);

    // Camera lens glow
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff3b5c,
        transparent: true,
        opacity: 0.6
      })
    );
    lens.position.set(0, 0, 0.55);
    group.add(lens);

    // GPS antenna
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4),
      new THREE.MeshBasicMaterial({ color: 0xcccccc })
    );
    antenna.position.set(0, 0.4, 0);
    group.add(antenna);

    // Status LED
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0x3dff9a,
        transparent: true,
        opacity: 0.8
      })
    );
    led.position.set(0, 0.35, 0.2);
    group.add(led);

    return group;
  }

  /**
   * Build a marine tracking buoy
   * For ocean-based wildlife tracking
   */
  static buildMarineTracker(color: number = 0x12e0ff): THREE.Group {
    const group = new THREE.Group();

    // Main buoy body
    const buoy = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 12),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.3,
        roughness: 0.4,
        emissive: color,
        emissiveIntensity: 0.1
      })
    );
    buoy.scale.set(1, 0.6, 1);
    group.add(buoy);

    // Solar panel ring
    const solar = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.6, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0x1a1a2e,
        metalness: 0.9,
        roughness: 0.1,
        side: THREE.DoubleSide
      })
    );
    solar.rotation.x = -Math.PI / 2;
    solar.position.y = 0.25;
    group.add(solar);

    // Antenna mast
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    mast.position.y = 0.6;
    group.add(mast);

    // Satellite dish
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({
        color: 0xeeeeee,
        metalness: 0.8,
        roughness: 0.2
      })
    );
    dish.position.y = 0.9;
    group.add(dish);

    // Tracking beacon light
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9
      })
    );
    beacon.position.y = 1.0;
    group.add(beacon);

    // Underwater sensor array
    const sensor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.15, 0.4, 6),
      new THREE.MeshStandardMaterial({
        color: 0x333355,
        metalness: 0.5,
        roughness: 0.5
      })
    );
    sensor.position.y = -0.4;
    group.add(sensor);

    return group;
  }

  /**
   * Build a ground sensor node
   * Hidden cameras/microphones for terrestrial tracking
   */
  static buildGroundSensor(): THREE.Group {
    const group = new THREE.Group();

    // Camouflaged housing
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.2, 0.4),
      new THREE.MeshStandardMaterial({
        color: 0x4a3728, // Bark brown
        roughness: 0.9,
        metalness: 0.1
      })
    );
    group.add(housing);

    // Camera lens (disguised as knot)
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshPhysicalMaterial({
        color: 0x111111,
        metalness: 0.9,
        roughness: 0.1
      })
    );
    lens.position.set(0, 0.05, 0.2);
    group.add(lens);

    // Microphone holes
    for (let i = 0; i < 3; i++) {
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.05, 4),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      hole.position.set(-0.08 + i * 0.08, 0.08, 0.15);
      group.add(hole);
    }

    return group;
  }
}

export default WildlifeDroneModels;
