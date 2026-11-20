import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FeatureCollection } from 'geojson';
import { geoCentroid } from 'd3-geo';
import { renderEquirect } from '../domain/paleogeo';

const vert = /* glsl */ `
varying vec2 vUv; varying vec3 vNormal;
void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const frag = /* glsl */ `
uniform sampler2D texA; uniform sampler2D texB; uniform float mixAmt;
varying vec2 vUv; varying vec3 vNormal;
void main() {
  vec3 c = mix(texture2D(texA, vUv).rgb, texture2D(texB, vUv).rgb, mixAmt);
  float light = 0.72 + 0.38 * max(dot(vNormal, normalize(vec3(-0.4, 0.5, 1.0))), 0.0);
  gl_FragColor = vec4(c * light, 1.0);
}`;

/** Globo com crossfade entre instantâneos (sem interpolar polígonos: só a imagem se funde). */
export function Globe3D({ data, points, reduced, onError }: { data: FeatureCollection | null; points: [number, number][]; reduced: boolean; onError: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ setData: (fc: FeatureCollection, pts: [number, number][]) => void } | null>(null);

  useEffect(() => {
    const mount = mountRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onError();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.6, 4.2);
    const blank = new THREE.Texture();
    const uniforms = { texA: { value: blank as THREE.Texture }, texB: { value: blank as THREE.Texture }, mixAmt: { value: 0 } };
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag }));
    scene.add(globe);
    // halo atmosférico discreto
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.03, 64, 32), new THREE.MeshBasicMaterial({ color: 0x7fb7d4, transparent: true, opacity: 0.08, side: THREE.BackSide }));
    scene.add(halo);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !reduced;
    controls.enablePan = false;
    controls.minDistance = 1.6;
    controls.maxDistance = 7;
    controls.rotateSpeed = 0.6;
    // em telas de toque: um dedo rola a página, dois dedos giram e aproximam o globo
    if (window.matchMedia('(pointer: coarse)').matches) {
      controls.touches = { ONE: null as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE };
    }

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // animação de "voo" até um ponto: gira o globo e inclina a câmera com suavização
    let flight: { t0: number; fromRot: number; toRot: number; fromPos: THREE.Vector3; toPos: THREE.Vector3 } | null = null;
    const flyTo = (lon: number, lat: number) => {
      let toRot = -((lon + 90) * Math.PI) / 180;
      const fromRot = globe.rotation.y;
      // caminho angular mais curto
      toRot = fromRot + ((((toRot - fromRot) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      const r = Math.min(camera.position.length(), 3.6);
      const toPos = new THREE.Vector3(0, Math.sin((lat * Math.PI) / 180) * r, Math.cos((lat * Math.PI) / 180) * r);
      if (reduced) { globe.rotation.y = toRot; camera.position.copy(toPos); controls.update(); return; }
      flight = { t0: performance.now(), fromRot, toRot, fromPos: camera.position.clone(), toPos };
    };
    let fade: { t0: number } | null = null;
    let first = true;
    api.current = {
      setData(fc, pts) {
        // com localidades fósseis: gira o globo para o centro delas
        if (pts.length) {
          const [lon, lat] = geoCentroid({ type: 'MultiPoint', coordinates: pts });
          if (Number.isFinite(lon)) flyTo(lon, lat);
        }
        const tex = new THREE.CanvasTexture(renderEquirect(fc, 2048, pts));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        if (first && !pts.length) {
          // abre o globo voltado para o centro de massa das terras emersas deste instantâneo
          const [lon, lat] = geoCentroid(fc);
          if (Number.isFinite(lon)) {
            globe.rotation.y = -((lon + 90) * Math.PI) / 180;
            camera.position.set(0, Math.sin((lat * Math.PI) / 180) * 4.2, Math.cos((lat * Math.PI) / 180) * 4.2);
          }
        }
        if (first || reduced) {
          uniforms.texA.value.dispose();
          uniforms.texA.value = tex;
          uniforms.mixAmt.value = 0;
          first = false;
          return;
        }
        if (fade) { // fade anterior incompleto: conclui imediatamente
          uniforms.texA.value.dispose();
          uniforms.texA.value = uniforms.texB.value;
        }
        uniforms.texB.value = tex;
        uniforms.mixAmt.value = 0;
        fade = { t0: performance.now() };
      },
    };

    let raf = 0;
    const loop = (now: number) => {
      if (flight) {
        const k = Math.min(1, (now - flight.t0) / 1100);
        const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
        globe.rotation.y = flight.fromRot + (flight.toRot - flight.fromRot) * e;
        camera.position.lerpVectors(flight.fromPos, flight.toPos, e);
        if (k >= 1) flight = null;
      }
      if (fade) {
        const k = Math.min(1, (now - fade.t0) / 600);
        uniforms.mixAmt.value = k;
        if (k >= 1) {
          uniforms.texA.value.dispose();
          uniforms.texA.value = uniforms.texB.value;
          uniforms.texB.value = blank;
          uniforms.mixAmt.value = 0;
          fade = null;
        }
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      uniforms.texA.value.dispose();
      uniforms.texB.value.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      api.current = null;
    };
  }, [reduced, onError]);

  useEffect(() => {
    if (data) api.current?.setData(data, points);
  }, [data, points]);

  return <div ref={mountRef} className="globe-canvas" />;
}
