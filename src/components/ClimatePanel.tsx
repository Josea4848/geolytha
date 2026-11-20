import { scaleLinear } from 'd3-scale';
import gmst from '../data/climate/gmst-scotese.json';
import { events, formatMa, getInterval } from '../domain/chronology';
import { useTime } from '../state/store';
import { useWidth } from './hooks';

const series = (gmst.series as { ma: number; gmst: number }[]).slice().sort((a, b) => b.ma - a.ma);
const OLDEST = series[0].ma;
const TODAY = series[series.length - 1].gmst;
/** Escala de cores: azul (frio) → bege (próximo de hoje, ~14,6 °C) → laranja → vermelho (estufa). */
export const tempColor = scaleLinear<string>().domain([6, 14.6, 24, 34]).range(['#2c6fb7', '#b9c9c9', '#e39a3b', '#b5361f']).clamp(true);
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v);

/** Temperatura média global estimada (Scotese) com o intervalo atual em destaque. */
export function ClimatePanel() {
  const { focusId } = useTime();
  const iv = getInterval(focusId)!;
  const [ref, width] = useWidth<HTMLDivElement>();

  const noCover = iv.end.ma > OLDEST || (iv.start.ma > OLDEST && !series.some((s) => s.ma <= iv.start.ma && s.ma >= iv.end.ma && s.ma < OLDEST));
  if (noCover) {
    return <p className="empty">Sem estimativa de temperatura global com fonte para {iv.name.pt}: a série usada cobre só os últimos {OLDEST} milhões de anos.</p>;
  }
  // pontos dentro do intervalo (ou o mais próximo, se o intervalo for curto)
  let inside = series.filter((s) => s.ma <= iv.start.ma && s.ma >= iv.end.ma);
  const approx = inside.length === 0;
  if (approx) {
    const m = (iv.start.ma + iv.end.ma) / 2;
    inside = [series.reduce((b, s) => (Math.abs(s.ma - m) < Math.abs(b.ma - m) ? s : b))];
  }
  const vals = inside.map((s) => s.gmst);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const meanV = vals.reduce((a, b) => a + b, 0) / vals.length;

  const H = 120, M = { l: 32, r: 8, t: 8, b: 18 };
  const x = scaleLinear().domain([OLDEST, 0]).range([M.l, Math.max(M.l + 10, width - M.r)]);
  const y = scaleLinear().domain([5, 35]).range([H - M.b, M.t]);
  const exts = events.filter((e) => e.type === 'mass_extinction');

  return (
    <div className="climate">
      <p className="climate-value">
        <span className="big" style={{ color: tempColor(meanV) }}>{lo === hi ? `~${fmt(meanV)} °C` : `${fmt(lo)}–${fmt(hi)} °C`}</span>
        <span>
          temperatura média global estimada {approx ? `(ponto mais próximo: ${inside[0].ma} Ma)` : `em ${inside.length} ${inside.length === 1 ? 'ponto' : 'pontos'} da série`}
          {' · '}hoje: {fmt(TODAY)} °C
        </span>
      </p>
      <div ref={ref}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`Temperatura média global estimada nos últimos ${OLDEST} milhões de anos`}>
            <rect className="dc-hl" x={x(Math.min(iv.start.ma, OLDEST))} y={M.t} width={Math.max(2, x(iv.end.ma) - x(Math.min(iv.start.ma, OLDEST)))} height={H - M.t - M.b} />
            {[10, 20, 30].map((v) => (
              <g key={v}><line className="dc-grid" x1={M.l} x2={width - M.r} y1={y(v)} y2={y(v)} /><text className="dc-tick" x={M.l - 4} y={y(v) + 3} textAnchor="end">{v}°</text></g>
            ))}
            {exts.map((e) => <line key={e.id} className="dc-ext-l" x1={x(e.time.start.ma)} x2={x(e.time.start.ma)} y1={M.t} y2={H - M.b}><title>{e.name.pt}</title></line>)}
            {series.slice(1).map((s, k) => {
              const p = series[k];
              return <line key={s.ma} x1={x(p.ma)} y1={y(p.gmst)} x2={x(s.ma)} y2={y(s.gmst)} stroke={tempColor((p.gmst + s.gmst) / 2)} strokeWidth={2} />;
            })}
            {series.map((s) => <circle key={s.ma} cx={x(s.ma)} cy={y(s.gmst)} r={2.4} fill={tempColor(s.gmst)}><title>{`${s.ma} Ma: ${fmt(s.gmst)} °C`}</title></circle>)}
            {x.ticks(5).map((v) => <text key={v} className="dc-tick" x={x(v)} y={H - 4} textAnchor="middle">{formatMa(v)}</text>)}
          </svg>
        )}
      </div>
      <div className="temp-legend" aria-hidden="true">
        <span>mais frio</span>
        <span className="temp-bar" style={{ background: `linear-gradient(90deg, ${[6, 10, 14.6, 19, 24, 29, 34].map((v) => tempColor(v)).join(', ')})` }} />
        <span>mais quente</span>
        <span className="muted">6 °C · hoje 14,6 °C · 34 °C</span>
      </div>
      <p className="note">
        Estimativas de modelo, sem faixa de incerteza no conjunto de dados (Scotese et al. 2021; dados CC BY 4.0, média global calculada neste projeto).
        Outras reconstruções chegam a valores diferentes, em geral mais quentes (Judd et al. 2024).
      </p>
    </div>
  );
}
