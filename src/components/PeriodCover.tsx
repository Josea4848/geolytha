import { useState } from 'react';
import { duration, formatAge, formatDuration, getInterval, neighbor, RANK_LABEL } from '../domain/chronology';
import { coverFor, cropStyle, imgSrc, KIND_LABEL } from '../domain/media';
import { useTime } from '../state/store';
import { useSwipe } from './hooks';
import { DateText, UnitsNote } from './DateText';

/** "Capa" do intervalo: ilustração, nome, datas e navegação anterior/próximo. */
export function PeriodCover() {
  const { focusId, focus } = useTime();
  const iv = getInterval(focusId)!;
  const cover = coverFor(focusId);
  const prev = neighbor(focusId, -1);
  const next = neighbor(focusId, 1);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = cover ? imgSrc(cover.media) : undefined;
  const showImg = cover && url && failedUrl !== url;
  // deslizar para a esquerda = próximo (mais recente); para a direita = anterior
  const swipe = useSwipe(() => next && focus(next.id), () => prev && focus(prev.id));

  return (
    <section className="cover" {...swipe} style={{ '--band': iv.color } as React.CSSProperties} aria-label={`${RANK_LABEL[iv.rank]} ${iv.name.pt}`}>
      <div className="cover-media">
        {/* sem recorte definido: fundo desfocado da própria imagem + imagem inteira por cima (nada é cortado) */}
        {showImg && !cover.media.crop && (
          <img key={url + '-bg'} src={url} alt="" aria-hidden="true"
            className={`cover-bg ${loadedUrl === url ? 'ready' : ''}`} />
        )}
        {showImg && (
          <img
            key={url}
            src={url}
            alt={cover.media.caption}
            className={`${loadedUrl === url ? 'ready' : ''} ${cover.media.crop ? '' : 'cover-whole'}`}
            style={cover.media.crop ? cropStyle(cover.media) : undefined}
            onLoad={() => setLoadedUrl(url)}
            onError={() => setFailedUrl(url)}
          />
        )}
      </div>
      <div className="cover-shade" />

      <button className="cover-nav prev" disabled={!prev} onClick={() => prev && focus(prev.id)}
        aria-label={prev ? `Anterior: ${prev.name.pt}` : 'Sem intervalo anterior'}>
        <span aria-hidden="true">‹</span>{prev && <small>{prev.name.pt}</small>}
      </button>
      <button className="cover-nav next" disabled={!next} onClick={() => next && focus(next.id)}
        aria-label={next ? `Próximo: ${next.name.pt}` : 'Sem próximo intervalo'}>
        {next && <small>{next.name.pt}</small>}<span aria-hidden="true">›</span>
      </button>

      <div className="cover-text">
        <span className="eyebrow">{RANK_LABEL[iv.rank]}</span>
        <h2 aria-live="polite">{iv.name.pt}</h2>
        <p className="cover-range">
          <DateText>{formatAge(iv.start)}</DateText> → <DateText>{formatAge(iv.end)}</DateText> <span>· {formatDuration(duration(iv))}</span>
        </p>
        <UnitsNote />
      </div>

      {cover ? (
        <p className="cover-credit">
          <span className="kind">{KIND_LABEL[cover.media.kind]}{cover.event ? ` · ${cover.event}` : cover.from.id !== iv.id ? ` · ${cover.from.name.pt}` : ''}</span>
          {' '}{cover.media.credit} ·{' '}
          <a href={cover.media.sourceUrl} target="_blank" rel="noreferrer">{cover.media.license}</a>
        </p>
      ) : (
        <p className="cover-credit"><span className="kind">Sem ilustração com fonte para este intervalo</span></p>
      )}
    </section>
  );
}
