import { useEffect, useRef } from 'react';
import { ancestors, byRank, childrenOf, formatMa, getInterval, inkFor, RANK_LABEL } from '../domain/chronology';
import type { Interval, Rank } from '../domain/schema';
import { useTime } from '../state/store';

const RANKS: Rank[] = ['eon', 'era', 'period', 'epoch'];
const PLURAL: Record<Rank, string> = { eon: 'éons', era: 'eras', period: 'períodos', epoch: 'épocas' };
const ART: Record<Rank, string> = { eon: 'um éon', era: 'uma era', period: 'um período', epoch: 'uma época' };

/**
 * Versão do funil para celular: cada nível (éon → era → período → época) é uma faixa horizontal
 * que se arrasta com o dedo (rolagem nativa com "snap"). O item selecionado desliza sozinho
 * para o centro sempre que o intervalo muda, venha a mudança de onde vier.
 */
export function TimeLadder() {
  const { focusId, focus } = useTime();
  const iv = getInterval(focusId)!;
  const path = [...ancestors(focusId), iv];

  const rows = RANKS.map((rank, i) => {
    const parent = i === 0 ? null : path[i - 1];
    const items: Interval[] = i === 0 ? byRank('eon') : parent ? childrenOf(parent.id) : [];
    return { rank, items, selectedId: path[i]?.id, parent };
  });

  return (
    <section className="ladder" aria-label="Posição na escala do tempo geológico">
      {rows.map((row, i) => {
        let empty = '';
        if (!row.items.length) {
          const prevRow = rows[i - 1];
          empty = row.parent
            ? `${row.parent.name.pt} não tem ${PLURAL[row.rank]} formais na ICS`
            : prevRow?.items.length ? `Escolha ${ART[prevRow.rank]} acima` : '';
        }
        return (
          <div className="ladder-row" key={row.rank}>
            <span className={`ladder-rank ${row.selectedId === focusId ? 'on' : ''}`}>{RANK_LABEL[row.rank]}</span>
            {row.items.length ? (
              <Track items={row.items} selectedId={row.selectedId} focusId={focusId} onPick={focus} />
            ) : (
              <span className="ladder-empty">{empty}</span>
            )}
          </div>
        );
      })}
    </section>
  );
}

function Track({ items, selectedId, focusId, onPick }: { items: Interval[]; selectedId?: string; focusId: string; onPick: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // centraliza o item selecionado sempre que ele muda
  useEffect(() => {
    const track = ref.current;
    const el = track?.querySelector<HTMLElement>('.sel');
    if (!track || !el) return;
    // rola só a faixa (não a página) até centralizar o item
    const left = el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2;
    track.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [selectedId]);
  return (
    <div className="ladder-track" ref={ref} role="list">
      {items.map((it) => {
        const sel = it.id === selectedId;
        return (
          <button key={it.id} role="listitem" className={`ladder-chip ${sel ? 'sel' : ''} ${selectedId && !sel ? 'dim' : ''}`}
            aria-current={it.id === focusId ? 'true' : undefined}
            style={{ '--c': it.color, '--ink': inkFor(it.color) } as React.CSSProperties}
            onClick={() => onPick(it.id)}>
            <span>{it.name.pt}</span>
            <small>{formatMa(it.start.ma)}</small>
          </button>
        );
      })}
    </div>
  );
}
