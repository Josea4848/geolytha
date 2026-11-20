import {
  ancestors, childrenOf, chronoMeta, duration, events, eventsWithin, formatAge, formatDuration,
  formatReference, getInterval, getReference, RANK_LABEL,
  EARTH_START, extinctionLabel,
} from '../domain/chronology';
import { overlaps } from '../domain/taxa';
import { useTaxa } from './Species';
import { DiversityChart } from './DiversityChart';
import { KIND_LABEL, mediaForEvent } from '../domain/media';
import { ClimatePanel } from './ClimatePanel';
import { ofRank } from './TimeFunnel';
import type { Confidence } from '../domain/schema';
import { useTime } from '../state/store';

const CONF: Record<Confidence, string> = {
  established: 'Estabelecido',
  well_supported: 'Bem sustentado',
  debated: 'Em debate',
  speculative: 'Especulativo',
};

export function ConfidenceBadge({ c }: { c: Confidence }) {
  return <span className={`badge conf-${c}`}>{CONF[c]}</span>;
}

function RefList({ ids }: { ids: string[] }) {
  return (
    <ol className="refs">
      {ids.map((id) => {
        const r = getReference(id);
        if (!r) return <li key={id}>Referência ausente: {id}</li>;
        const link = r.DOI ? `https://doi.org/${r.DOI}` : r.URL;
        return (
          <li key={id}>
            {formatReference(r)} {link && <a href={link} target="_blank" rel="noreferrer">{r.DOI ? 'DOI' : 'link'}</a>}
            {r.verificationStatus === 'pending' && <span className="badge pending">a verificar</span>}
          </li>
        );
      })}
    </ol>
  );
}

const PLURAL: Record<string, string> = { eon: 'éons', era: 'eras', period: 'períodos', epoch: 'épocas' };
const listPt = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);
const pct = (p: number) => new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: p < 1 ? 2 : 3 }).format(p);

export function OverviewTab() {
  const { focusId, focus } = useTime();
  const { data: taxa } = useTaxa();
  const iv = getInterval(focusId)!;
  const parents = ancestors(focusId);
  const kids = childrenOf(focusId);
  const nEv = eventsWithin(iv.start.ma, iv.end.ma).length;
  const nTaxa = taxa?.taxa.filter((t) => overlaps(t, iv.start.ma, iv.end.ma)).length;
  const rank = RANK_LABEL[iv.rank].toLowerCase();
  const art = iv.rank === 'era' || iv.rank === 'epoch' ? 'A' : 'O';
  return (
    <div className="tab-body">
      <p className="lede">
        {art} {rank} <strong>{iv.name.pt}</strong> vai de {formatAge(iv.start)} a {formatAge(iv.end)}: cerca de {formatDuration(duration(iv))},
        {' '}ou {pct((duration(iv) / EARTH_START) * 100)}% da história da Terra.
        {parents.length > 0 && <> Faz parte {listPt([...parents].reverse().map((p) => ofRank(p)))}.</>}
        {kids.length > 0 && <> Divide-se em {kids.length} {PLURAL[kids[0].rank]}: {listPt(kids.map((k) => k.name.pt))}.</>}
        {' '}No atlas, há {nTaxa ?? '…'} {nTaxa === 1 ? 'organismo' : 'organismos'} do catálogo e {nEv} {nEv === 1 ? 'marco ou extinção' : 'marcos e extinções'} neste intervalo.
      </p>
      <dl className="facts">
        <div><dt>Duração</dt><dd>{formatDuration(duration(iv))}</dd></div>
        {parents.map((p) => (
          <div key={p.id}><dt>{RANK_LABEL[p.rank]}</dt><dd><button className="link" onClick={() => focus(p.id)}>{p.name.pt}</button></dd></div>
        ))}
      </dl>
      {iv.note && <p className="note">{iv.note}</p>}
      {kids.length > 0 && (
        <section>
          <h3>Subdivisões</h3>
          <div className="kids">
            {kids.map((k) => (
              <button key={k.id} onClick={() => focus(k.id)} style={{ '--chip': k.color } as React.CSSProperties} className="chip small">
                {k.name.pt} <span className="muted">{formatAge(k.start)} – {formatAge(k.end)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3>Clima</h3>
        <ClimatePanel />
        <p className="note">CO₂, O₂ e nível do mar ainda não têm séries cadastradas.</p>
      </section>
    </div>
  );
}

export function EventsTab() {
  const { focusId, selectEvent } = useTime();
  const iv = getInterval(focusId)!;
  const evs = eventsWithin(iv.start.ma, iv.end.ma).sort((a, b) => b.time.start.ma - a.time.start.ma);
  const inPhanerozoic = iv.end.ma < 538.8;
  return (
    <div className="tab-body">
      {inPhanerozoic && <DiversityChart highlight={[iv.start.ma, iv.end.ma]} />}
      {evs.length === 0 && <p className="empty">Nenhum marco ou extinção cadastrado para {iv.name.pt}.</p>}
      <ul className="evlist">
        {evs.map((e) => (
          <li key={e.id}>
            <button className={`ev-card ${e.type === 'mass_extinction' ? 'ext' : ''}`} onClick={() => selectEvent(e.id)}>
              {mediaForEvent(e.id)
                ? <img className="ev-thumb" src={mediaForEvent(e.id)!.url} alt="" loading="lazy" />
                : <span className="ev-icon" aria-hidden="true">{e.type === 'mass_extinction' ? '✕' : '◆'}</span>}
              <span>{extinctionLabel(e.id) && <span className="ext-ord">{extinctionLabel(e.id)}</span>}<strong>{e.name.pt}</strong><br /><span className="muted">{formatAge(e.time.start)}{e.time.end ? ` → ${formatAge(e.time.end)}` : ''}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SourcesTab() {
  const { focusId } = useTime();
  const iv = getInterval(focusId)!;
  return (
    <div className="tab-body">
      <p className="small">
        Cronologia: {chronoMeta.source}, {chronoMeta.version}, conferida em {chronoMeta.consultedAt}.
        Nenhum conteúdo foi revisado ainda por especialista.
      </p>
      <RefList ids={iv.refs} />
    </div>
  );
}

export function EventPanel() {
  const { selectedEventId, selectEvent } = useTime();
  const e = selectedEventId ? events.find((ev) => ev.id === selectedEventId) : undefined;
  if (!e) return null;
  const img = mediaForEvent(e.id);
  return (
    <aside className="event-panel" role="dialog" aria-label={e.name.pt}>
      <button className="close" onClick={() => selectEvent(null)} aria-label="Fechar">×</button>
      {img && (
        <figure className="tp-fig">
          <img src={img.url} alt={img.caption} />
          <figcaption>
            <span className={`tc-kind k-${img.kind}`}>{KIND_LABEL[img.kind]}</span> {img.caption}
            <br /><span className="muted">{img.credit} · <a href={img.sourceUrl} target="_blank" rel="noreferrer">{img.license}</a> · Wikimedia Commons</span>
          </figcaption>
        </figure>
      )}
      <span className="eyebrow">{extinctionLabel(e.id) ? `${extinctionLabel(e.id)} · ` : ''}{TYPE[e.type]}</span>
      <h2>{e.name.pt}</h2>
      <p className="range">
        {formatAge(e.time.start)}{e.time.end ? ` → ${formatAge(e.time.end)}` : ''}
      </p>
      <ConfidenceBadge c={e.confidence} />
      <p>{e.summary}</p>

      {e.diversityLoss && (
        <section className="loss">
          <h3>Dimensão da perda</h3>
          <div className="loss-bar" role="img" aria-label={`Cerca de ${e.diversityLoss.pct}% das espécies marinhas extintas`}>
            <span style={{ width: `${e.diversityLoss.pct}%` }} />
          </div>
          <p><strong>~{e.diversityLoss.pct}%</strong> das espécies marinhas</p>
          <p className="note">{e.diversityLoss.note}</p>
        </section>
      )}

      {e.type === 'mass_extinction' && (
        <DiversityChart compact window={[e.time.start.ma + 40, Math.max(0, (e.time.end?.ma ?? e.time.start.ma) - 40)]}
          highlight={[e.time.start.ma, e.time.end?.ma ?? e.time.start.ma]} />
      )}

      {e.hypotheses && (
        <section>
          <h3>Causas propostas</h3>
          <ul className="hyp">
            {e.hypotheses.map((h, k) => (
              <li key={k}>
                <ConfidenceBadge c={h.confidence} /> {h.text}
                <span className="muted small"> ({h.refs.map((r) => citeShort(r)).join('; ')})</span>
              </li>
            ))}
          </ul>
          <p className="note">"Estabelecido" e "bem sustentado" indicam amplo consenso; "em debate" indica interpretações concorrentes na literatura.</p>
        </section>
      )}


      <h3>Referências</h3>
      <RefList ids={e.refs} />
    </aside>
  );
}

function citeShort(id: string) {
  const r = getReference(id);
  if (!r) return id;
  const a = r.author[0];
  const n = r.author.filter((x) => !x.literal).length;
  const etal = r.author.some((x) => x.literal === 'et al.');
  const who = n === 2 && !etal ? `${a.family} & ${r.author[1].family}` : `${a.family ?? a.literal}${n > 1 || etal ? ' et al.' : ''}`;
  return `${who} ${r.issued['date-parts'][0][0]}`;
}

const TYPE = { milestone: 'Marco evolutivo', radiation: 'Diversificação', mass_extinction: 'Extinção em massa', geologic: 'Evento geológico', climatic: 'Evento climático' } as const;
