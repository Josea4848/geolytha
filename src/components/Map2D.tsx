import { geoCentroid, geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import { useEffect, useRef } from 'react';
import { MAP_COLORS } from '../domain/paleogeo';
import { usePrefersReducedMotion, useWidth } from './hooks';

/**
 * Mapa plano em projeção de área igual (Equal Earth). Também é o fallback sem WebGL.
 * Com localidades fósseis, gira suavemente para centralizá-las (sem animação se o usuário preferir menos movimento).
 */
export function Map2D({ data, points = [] }: { data: FeatureCollection | null; points?: [number, number][] }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lambdaRef = useRef(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width) return;
    const height = Math.round(width * 0.487);
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = (lambda: number) => {
      const proj = geoEqualEarth().rotate([lambda, 0]).fitExtent([[4, 4], [width - 4, height - 4]], { type: 'Sphere' });
      const path = geoPath(proj, ctx);
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = MAP_COLORS.ocean; ctx.fill();
      ctx.beginPath(); path(geoGraticule10()); ctx.strokeStyle = MAP_COLORS.graticule; ctx.lineWidth = 0.6; ctx.stroke();
      if (data) {
        ctx.beginPath(); path(data); ctx.fillStyle = MAP_COLORS.land; ctx.fill();
        ctx.strokeStyle = MAP_COLORS.coast; ctx.lineWidth = 0.4; ctx.stroke();
      }
      for (const p of points) {
        const xy = proj(p);
        if (!xy) continue;
        ctx.beginPath(); ctx.arc(xy[0], xy[1], 3.2, 0, 2 * Math.PI);
        ctx.fillStyle = MAP_COLORS.fossil; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = 'rgba(127,127,127,.6)'; ctx.lineWidth = 1; ctx.stroke();
    };

    const center = points.length ? geoCentroid({ type: 'MultiPoint', coordinates: points }) : null;
    const from = lambdaRef.current;
    let to = center && Number.isFinite(center[0]) ? -center[0] : 0;
    to = from + ((((to - from) % 360) + 540) % 360) - 180; // caminho mais curto
    if (reduced || Math.abs(to - from) < 0.5) { lambdaRef.current = to; draw(to); return; }

    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 900);
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      lambdaRef.current = from + (to - from) * e;
      draw(lambdaRef.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [data, width, points, reduced]);

  return (
    <div ref={wrapRef} className="map2d">
      <canvas ref={canvasRef} style={{ width: '100%' }} aria-hidden="true" />
    </div>
  );
}
