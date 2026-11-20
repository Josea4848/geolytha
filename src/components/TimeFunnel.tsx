import { ancestors, byRank, childrenOf, duration, EARTH_START, events, extinctionLabel, extinctionNumber, formatMa, getInterval, inkFor, neighbor, RANK_LABEL } from '../domain/chronology';
import type { Interval } from '../domain/schema';
import { useTime } from '../state/store';
import { useSwipe, useWidth } from './hooks';

const ROW = 24;
const GAP = 16; // altura do "funil" entre um nível e o seguinte
const LABEL_W = 62;
const INFO_W = 230;

type Level = { items: Interval[]; start: number; end: number; selectedId?: string; rankLabel: string };

/**
 * Funil temporal: cada linha é um nível da escala (éon → era → período → época), mostrando só
 * os intervalos dentro do item escolhido na linha de cima. Cada linha é proporcional ao seu "pai";
 * o trapézio entre as linhas mostra o trecho que foi ampliado.
 */
export function TimeFunnel() {
  const { focusId, focus, selectEvent, selectedEventId } = useTime();
  const [ref, width] = useWidth<HTMLDivElement>();
  const iv = getInterval(focusId)!;
  const swipe = useSwipe(() => { const n = neighbor(focusId, 1); if (n) focus(n.id); }, () => { const p = neighbor(focusId, -1); if (p) focus(p.id); });
  const path = [...ancestors(focusId), iv];

  const levels: Level[] = [{ items: byRank('eon'), start: EARTH_START, end: 0, selectedId: path[0].id, rankLabel: RANK_LABEL.eon }];
  for (let i = 0; i < path.length; i++) {
    const kids = childrenOf(path[i].id);
    if (!kids.length) break;
    levels.push({ items: kids, start: path[i].start.ma, end: path[i].end.ma, selectedId: path[i + 1]?.id, rankLabel: RANK_LABEL[kids[0].rank] });
  }

  const barW = Math.max(120, width - LABEL_W - (width > 760 ? INFO_W : 0));
  const xOf = (lv: Level, ma: number) => LABEL_W + ((lv.start - ma) / (lv.start - lv.end)) * barW;
  const yOf = (i: number) => i * (ROW + GAP);
  // sempre 4 linhas (éon, era, período, época); as vazias explicam por quê
  const RANKS_ALL = ['eon', 'era', 'period', 'epoch'] as const;
  const lastSel = getInterval(levels[levels.length - 1].selectedId ?? '');
  const empties = RANKS_ALL.slice(levels.length).map((rk, k) => ({
    rank: rk,
    msg: lastSel && k === 0
      ? `${lastSel.name.pt} não tem ${PLURAL[rk]} formais na escala da ICS`
      : lastSel ? ''
      : !levels[levels.length - 1].items.some((it) => childrenOf(it.id).length) ? (k === 0 ? `Nenhum intervalo desta linha tem ${PLURAL[rk]} formais na ICS` : '')
      : `Escolha ${ART[RANKS_ALL[levels.length - 1 + k]]} acima para ver ${ART_PL[rk]}`,
  }));
  const height = 4 * ROW + 3 * GAP + 22;
  const last = levels[levels.length - 1];
  const lastEvents = events.filter((e) => e.time.start.ma <= last.start && e.time.start.ma >= last.end);
  const totalShare = (duration(iv) / EARTH_START) * 100;
  const parent = path[path.length - 2];

  return (
    <section className="funnel" {...swipe} aria-label="Posição na escala do tempo geológico">
      <div ref={ref} className="funnel-wrap">
        <svg width={width} height={height} role="group">
          {levels.map((lv, i) => {
            const y = yOf(i);
            const sel = lv.items.find((it) => it.id === lv.selectedId);
            return (
              <g key={i}>
                <text x={0} y={y + ROW / 2 + 4} className={`funnel-rank ${sel?.id === focusId || (!sel && i === levels.length - 1) ? 'on' : ''}`}>{lv.rankLabel}</text>
                {lv.items.map((it) => {
                  const x0 = xOf(lv, it.start.ma);
                  const x1 = xOf(lv, it.end.ma);
                  const w = Math.max(1, x1 - x0);
                  const isSel = it.id === lv.selectedId;
                  const isFocus = it.id === focusId;
                  const dim = lv.selectedId && !isSel;
                  const label = it.name.pt;
                  const text = w > label.length * 6.6 + 10 ? label : w > 18 ? label[0] : '';
                  return (
                    <g key={it.id} className={`funnel-cell ${dim ? 'dim' : ''} ${isFocus ? 'focus' : ''}`}
                      role="button" tabIndex={0} aria-label={`${RANK_LABEL[it.rank]} ${label}`} aria-current={isFocus ? 'true' : undefined}
                      onClick={() => focus(it.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focus(it.id); } }}>
                      <title>{`${label} · ${formatMa(it.start.ma)} – ${formatMa(it.end.ma)}`}</title>
                      <rect x={x0} y={y} width={w} height={ROW} fill={it.color} />
                      {text && <text x={x0 + w / 2} y={y + ROW / 2 + 4} textAnchor="middle" fill={inkFor(it.color)}>{text}</text>}
                    </g>
                  );
                })}
                {/* funil até a linha seguinte */}
                {sel && levels[i + 1] && (
                  <path className="funnel-cone"
                    d={`M${xOf(lv, sel.start.ma)},${y + ROW} L${xOf(lv, sel.end.ma)},${y + ROW} L${LABEL_W + barW},${y + ROW + GAP} L${LABEL_W},${y + ROW + GAP} Z`}
                    style={{ fill: sel.color }} />
                )}
              </g>
            );
          })}

          {empties.map((em, k) => {
            const y = yOf(levels.length + k);
            return (
              <g key={em.rank} className="funnel-empty">
                <text x={0} y={y + ROW / 2 + 4} className="funnel-rank">{RANK_LABEL[em.rank]}</text>
                <rect x={LABEL_W} y={y} width={barW} height={ROW} />
                {em.msg && <text x={LABEL_W + barW / 2} y={y + ROW / 2 + 4} textAnchor="middle">{em.msg}</text>}
              </g>
            );
          })}

          {/* marcos e extinções no nível mais detalhado */}
          {/* marcos primeiro e extinções por cima, para que os números fiquem sempre legíveis */}
          {[...lastEvents].sort((a, b) => Number(a.type === 'mass_extinction') - Number(b.type === 'mass_extinction')).map((e) => {
            const x = xOf(last, e.time.start.ma);
            const y = yOf(levels.length - 1) + ROW + 9;
            const n = e.type === 'mass_extinction' ? extinctionNumber(e.id) : null;
            return (
              <g key={e.id} className={`funnel-ev ${n ? 'ext' : ''} ${selectedEventId === e.id ? 'sel' : ''}`} role="button" tabIndex={0}
                aria-label={extinctionLabel(e.id) ? `${extinctionLabel(e.id)}: ${e.name.pt}` : e.name.pt} onClick={() => selectEvent(e.id)}
                onKeyDown={(k) => { if (k.key === 'Enter') selectEvent(e.id); }}>
                <title>{extinctionLabel(e.id) ? `${extinctionLabel(e.id)}: ` : ''}{e.name.pt}</title>
                {n ? (
                  <>
                    <circle cx={x} cy={y} r={6.5} className="funnel-ext-dot" />
                    <text x={x} y={y + 3.2} textAnchor="middle" className="funnel-ext-n">{n}</text>
                  </>
                ) : <path d={`M${x},${y - 5}L${x + 5},${y}L${x},${y + 5}L${x - 5},${y}Z`} />}
                <rect x={x - 8} y={y - 8} width={16} height={16} fill="transparent" />
              </g>
            );
          })}
          <text x={LABEL_W} y={height - 2} className="funnel-axis">{formatMa(last.start)}</text>
          <text x={LABEL_W + barW} y={height - 2} className="funnel-axis" textAnchor="end">{formatMa(last.end)}</text>
        </svg>

        {width > 760 && (
          <div className="funnel-info" style={{ width: INFO_W - 16 }}>
            <span className="eyebrow">Você está em</span>
            <strong>{RANK_LABEL[iv.rank]} {iv.name.pt}</strong>
            {parent && <span>{fmtPct((duration(iv) / duration(parent)) * 100)} {ofRank(parent)}</span>}
            <span>{fmtPct(totalShare)} da história da Terra</span>
          </div>
        )}
      </div>
    </section>
  );
}

const PLURAL = { eon: 'éons', era: 'eras', period: 'períodos', epoch: 'épocas' } as const;
const ART = { eon: 'um éon', era: 'uma era', period: 'um período', epoch: 'uma época' } as const;
const ART_PL = { eon: 'os éons', era: 'as eras', period: 'os períodos', epoch: 'as épocas' } as const;
const fmtPct = (p: number) => `${new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: p < 1 ? 2 : 3 }).format(p)}%`;

/** "do período Jurássico", "da era Mesozoica" etc. */
export const ofRank = (p: Interval) => `${p.rank === 'era' || p.rank === 'epoch' ? 'da' : 'do'} ${RANK_LABEL[p.rank].toLowerCase()} ${p.name.pt}`;
