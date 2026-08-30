import * as THREE from 'three';

/**
 * Built-in Sample 3D Models & Procedural Demo Scenes
 * Allows immediate testing of navigation & VR features without needing an external file.
 */

// Remote Khronos sample models (CORS-friendly CDNs)
export const REMOTE_SAMPLES = {
  'damaged-helmet': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
  'duck': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
  'flight-helmet': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/FlightHelmet/glTF/FlightHelmet.gltf',
  'cesium-man': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb'
};

/**
 * Creates a modern architectural art pavilion scene for spatial walkthroughs in VR
 */
export function createPavilionDemo() {
  const group = new THREE.Group();
  group.name = "Modern Art Pavilion (Demo Scene)";

  // Main Floor
  const floorGeo = new THREE.BoxGeometry(24, 0.4, 24);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x222630,
    roughness: 0.2,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  group.add(floor);

  // Reflective center pool/pedestal
  const poolGeo = new THREE.CylinderGeometry(4, 4, 0.1, 32);
  const poolMat = new THREE.MeshStandardMaterial({
    color: 0x0a1020,
    roughness: 0.05,
    metalness: 0.9
  });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.position.y = 0.06;
  pool.receiveShadow = true;
  group.add(pool);

  // Modern Pillars / Columns
  const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, 5, 24);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.2
  });

  const pillarCoords = [
    [-8, -8], [8, -8], [-8, 8], [8, 8],
    [-8, 0], [8, 0], [0, -8], [0, 8]
  ];

  pillarCoords.forEach(([x, z]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, 2.5, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  });

  // Floating Center Sculpture (Torus Knot)
  const knotGeo = new THREE.TorusKnotGeometry(1.2, 0.38, 128, 32);
  const knotMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.25,
    roughness: 0.15,
    metalness: 0.85,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });
  const knot = new THREE.Mesh(knotGeo, knotMat);
  knot.position.set(0, 2.8, 0);
  knot.castShadow = true;
  group.add(knot);

  // Modern Cantilevered Roof
  const roofGeo = new THREE.BoxGeometry(20, 0.3, 20);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x1e222d,
    roughness: 0.4
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 5.15, 0);
  roof.castShadow = true;
  group.add(roof);

  // Skylight cutout in roof
  const skylightGeo = new THREE.RingGeometry(0.5, 3.5, 32);
  const skylightMat = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
  });
  const skylight = new THREE.Mesh(skylightGeo, skylightMat);
  skylight.rotation.x = Math.PI / 2;
  skylight.position.set(0, 5.2, 0);
  group.add(skylight);

  // Gallery Display Pedestals with Artifacts
  const pedGeo = new THREE.CylinderGeometry(0.6, 0.7, 1.0, 16);
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });

  // Artifact 1: Icosahedron
  const ped1 = new THREE.Mesh(pedGeo, pedMat);
  ped1.position.set(-5, 0.5, -4);
  ped1.castShadow = true;
  const ico = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.2, metalness: 0.8 })
  );
  ico.position.set(-5, 1.6, -4);
  ico.castShadow = true;
  group.add(ped1, ico);

  // Artifact 2: Dodecahedron
  const ped2 = new THREE.Mesh(pedGeo, pedMat);
  ped2.position.set(5, 0.5, -4);
  ped2.castShadow = true;
  const dodec = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.6 })
  );
  dodec.position.set(5, 1.6, -4);
  dodec.castShadow = true;
  group.add(ped2, dodec);

  // Artifact 3: Octahedron
  const ped3 = new THREE.Mesh(pedGeo, pedMat);
  ped3.position.set(-5, 0.5, 4);
  ped3.castShadow = true;
  const octa = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.7 })
  );
  octa.position.set(-5, 1.6, 4);
  octa.castShadow = true;
  group.add(ped3, octa);

  return {
    scene: group,
    animations: [],
    name: "Modern Art Pavilion"
  };
}

/**
 * Creates a Sci-Fi Holo-Hub with glowing rings and holographic energy core
 */
export function createSciFiHubDemo() {
  const group = new THREE.Group();
  group.name = "Sci-Fi Holo-Hub (Demo Scene)";

  // Hexagonal Platform
  const hexGeo = new THREE.CylinderGeometry(8, 9, 0.6, 6);
  const hexMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.8
  });
  const hex = new THREE.Mesh(hexGeo, hexMat);
  hex.position.y = -0.3;
  hex.receiveShadow = true;
  group.add(hex);

  // Glowing Outer Ring
  const ringGeo = new THREE.TorusGeometry(6.5, 0.1, 16, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  // Holo Core Center Sphere
  const coreGeo = new THREE.SphereGeometry(1.2, 32, 32);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    transmission: 0.9,
    opacity: 1,
    transparent: true,
    roughness: 0.1,
    ior: 1.5
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(0, 2.5, 0);
  group.add(core);

  // Surrounding Orbiting Rings
  for (let i = 0; i < 3; i++) {
    const orbitGeo = new THREE.TorusGeometry(2.0 + i * 0.5, 0.04, 16, 64);
    const orbitMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.1
    });
    const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
    orbitMesh.position.set(0, 2.5, 0);
    orbitMesh.rotation.set(i * 0.6, i * 0.8, 0);
    group.add(orbitMesh);
  }

  // 6 Energy Pylons around perimeter
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const px = Math.cos(angle) * 5.5;
    const pz = Math.sin(angle) * 5.5;

    const pylonBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.45, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
    );
    pylonBase.position.set(px, 1.4, pz);
    pylonBase.castShadow = true;
    group.add(pylonBase);

    // Glowing tip
    const pylonTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    pylonTip.position.set(px, 2.9, pz);
    group.add(pylonTip);
  }

  return {
    scene: group,
    animations: [],
    name: "Sci-Fi Holo-Hub"
  };
}

/**
 * Creates a Geometric PBR Showcase with various complex materials
 */
export function createGeometricShowcaseDemo() {
  const group = new THREE.Group();
  group.name = "Geometric Materials Showcase (Demo Scene)";

  // Base platform
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6.5, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.5 })
  );
  base.position.y = -0.2;
  base.receiveShadow = true;
  group.add(base);

  const materials = [
    { name: "Gold", mat: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 }) },
    { name: "Emerald Glass", mat: new THREE.MeshPhysicalMaterial({ color: 0x10b981, roughness: 0.05, transmission: 0.9, thickness: 1.2 }) },
    { name: "Ruby Clearcoat", mat: new THREE.MeshPhysicalMaterial({ color: 0xef4444, metalness: 0.1, roughness: 0.3, clearcoat: 1.0 }) },
    { name: "Frosted Chrome", mat: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.4 }) },
    { name: "Obsidian", mat: new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.2, roughness: 0.05 }) },
  ];

  materials.forEach((item, idx) => {
    const angle = (idx / materials.length) * Math.PI * 2;
    const r = 3.5;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    // Pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.7, 1.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6 })
    );
    ped.position.set(x, 0.6, z);
    ped.castShadow = true;
    ped.receiveShadow = true;
    group.add(ped);

    // Sphere
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), item.mat);
    sphere.position.set(x, 1.7, z);
    sphere.castShadow = true;
    group.add(sphere);
  });

  return {
    scene: group,
    animations: [],
    name: "Geometric Showcase"
  };
}
