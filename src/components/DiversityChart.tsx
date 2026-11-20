import { scaleLinear } from 'd3-scale';
import div from '../data/diversity/marine-genera.json';
import { events, extinctionLabel, extinctionNumber, formatMa } from '../domain/chronology';
import { useWidth } from './hooks';

const bins = div.bins as { name: string; start: number; end: number; genera: number }[];
const H = 150;
const M = { l: 40, r: 8, t: 8, b: 20 };

/**
 * Gêneros de animais marinhos por idade (PBDB, dados brutos). As linhas vermelhas são as cinco grandes
 * extinções. `window` recorta o eixo do tempo; `highlight` destaca um intervalo.
 */
export function DiversityChart({ window: win, highlight, compact }: { window?: [number, number]; highlight?: [number, number]; compact?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [t0, t1] = win ?? [bins[0].start, 0];
  const shown = bins.filter((b) => b.start > t1 && b.end < t0);
  const x = scaleLinear().domain([t0, t1]).range([M.l, Math.max(M.l + 10, width - M.r)]);
  const yMax = Math.max(...shown.map((b) => b.genera), 1);
  const h = compact ? 110 : H;
  const y = scaleLinear().domain([0, yMax]).nice().range([h - M.b, M.t]);
  const exts = events.filter((e) => e.type === 'mass_extinction' && e.time.start.ma <= t0 && e.time.start.ma >= t1);
  const d = shown.map((b, i) => `${i ? 'L' : 'M'}${x(Math.min(b.start, t0))},${y(b.genera)}H${x(Math.max(b.end, t1))}`).join('');
  const area = shown.length ? `${d}V${y(0)}H${x(Math.min(shown[0].start, t0))}Z` : '';

  return (
    <figure className="divchart">
      <div ref={ref}>
        {width > 0 && (
          <svg width={width} height={h} role="img" aria-label={`Número de gêneros de animais marinhos entre ${formatMa(t0)} e ${formatMa(t1)}`}>
            {highlight && (
              <rect className="dc-hl" x={x(Math.min(highlight[0], t0))} y={M.t}
                width={Math.max(2, x(Math.max(highlight[1], t1)) - x(Math.min(highlight[0], t0)))} height={h - M.t - M.b} />
            )}
            {y.ticks(3).map((v) => (
              <g key={v}><line className="dc-grid" x1={M.l} x2={width - M.r} y1={y(v)} y2={y(v)} /><text className="dc-tick" x={M.l - 4} y={y(v) + 3} textAnchor="end">{v}</text></g>
            ))}
            <path className="dc-area" d={area} />
            <path className="dc-line" d={d} />
            {shown.map((b) => (
              <rect key={b.name} x={x(Math.min(b.start, t0))} y={M.t} width={Math.max(1, x(Math.max(b.end, t1)) - x(Math.min(b.start, t0)))} height={h - M.t - M.b} fill="transparent">
                <title>{`${b.name} (${formatMa(b.start)} – ${formatMa(b.end)}): ${b.genera} gêneros`}</title>
              </rect>
            ))}
            {exts.map((e) => (
              <g key={e.id} className="dc-ext"><line x1={x(e.time.start.ma)} x2={x(e.time.start.ma)} y1={M.t} y2={h - M.b} /><text x={x(e.time.start.ma)} y={M.t + 9} textAnchor="middle" className="dc-ext-n">{extinctionNumber(e.id)}ª</text><title>{extinctionLabel(e.id)}: {e.name.pt}</title></g>
            ))}
            {x.ticks(compact ? 4 : 6).map((v) => <text key={v} className="dc-tick" x={x(v)} y={h - 5} textAnchor="middle">{formatMa(v)}</text>)}
          </svg>
        )}
      </div>
      <figcaption className="small muted">
        Gêneros de animais marinhos por idade, segundo o Paleobiology Database (dados brutos, sem correção de amostragem; consultado em {div.fetchedAt}).
        {' '}Linhas vermelhas: grandes extinções.
      </figcaption>
    </figure>
  );
}
