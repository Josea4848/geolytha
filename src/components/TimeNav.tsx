import { useState } from 'react';
import { ancestors, formatAge, getInterval, RANK_LABEL } from '../domain/chronology';
import { useTime } from '../state/store';
import { DateText } from './DateText';
import { useMediaQuery } from './hooks';
import { TimeFunnel } from './TimeFunnel';
import { TimeLadder } from './TimeLadder';

const KEY = 'geolytha.timeline.compact';
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const save = (v: boolean) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* sem armazenamento */ } };

/** Linha do tempo (funil no computador, escada no celular) que pode ser compactada numa faixa de uma linha. */
export function TimeNav() {
  const narrow = useMediaQuery('(max-width: 640px)');
  const [compact, setCompact] = useState(read);
  const { focusId } = useTime();
  const iv = getInterval(focusId)!;
  const path = ancestors(focusId);
  const toggle = () => setCompact((c) => { save(!c); return !c; });

  return (
    <div className={`timenav ${compact ? 'is-compact' : ''}`}>
      <div className="timenav-fold" aria-hidden={compact} inert={compact || undefined}>
        <div className="timenav-inner">{narrow ? <TimeLadder /> : <TimeFunnel />}</div>
      </div>
      <div className="timenav-fold timenav-mini-fold" aria-hidden={!compact} inert={!compact || undefined}>
        <div className="timenav-inner">
          <div className="timenav-mini" style={{ '--band': iv.color } as React.CSSProperties}>
            <span className="timenav-path">{path.map((p) => p.name.pt).join(' › ')}{path.length ? ' › ' : ''}</span>
            <strong>{RANK_LABEL[iv.rank]} {iv.name.pt}</strong>
            <span className="timenav-dates"><DateText>{formatAge(iv.start)}</DateText> → <DateText>{formatAge(iv.end)}</DateText></span>
          </div>
        </div>
      </div>
      <button type="button" className="timenav-toggle" onClick={toggle} aria-expanded={!compact}
        aria-label={compact ? 'Expandir linha do tempo' : 'Compactar linha do tempo'}>
        <span className="chev" aria-hidden="true">▴</span>{compact ? 'Expandir' : 'Compactar'}
      </button>
    </div>
  );
}
