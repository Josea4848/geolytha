import { useEffect, useMemo, useState } from 'react';
import { deepestAt, formatMa, getInterval } from '../domain/chronology';
import { Linked } from './Linked';
import { InfoTip } from './InfoTip';
import { DateText } from './DateText';
import type { TaxaFile, Taxon, TaxonGroup } from '../domain/schema';
import { clean, GROUP_LABEL, loadTaxa, matches, overlaps, pbdbUrl, span, typicalAge } from '../domain/taxa';
import { useTime } from '../state/store';
import { useMediaQuery } from './hooks';
import { KIND_LABEL, mediaForTaxon, mediaListForTaxon } from '../domain/media';
import textsRaw from '../data/taxa/texts.json';
import type { TaxonTexts, TextEvidence } from '../domain/schema';
import { getReference } from '../domain/chronology';
import { ConfidenceBadge } from './Panels';

export function useTaxa() {
  const [data, setData] = useState<TaxaFile | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { loadTaxa().then(setData, () => setError(true)); }, []);
  return { data, error };
}

const fmtRange = (r: { max: number | null; min: number | null } | null) =>
  !r || r.max === null ? '—' : r.min !== null && r.min !== r.max ? `${formatMa(r.max)} – ${formatMa(r.min)}` : formatMa(r.max);

function TaxonCard({ t, onOpen, selected }: { t: Taxon; onOpen: () => void; selected: boolean }) {
  const [o, y] = span(t);
  const img = mediaForTaxon(t.id);
  return (
    <button className={`taxon-card g-${t.group} ${selected ? 'sel' : ''}`} onClick={onOpen} aria-pressed={selected}>
      <span className="tc-img">
        {img ? <img src={img.url} alt="" loading="lazy" /> : <span className="tc-noimg">sem imagem</span>}
        {img && <span className={`tc-kind k-${img.kind}`}>{KIND_LABEL[img.kind]}</span>}
      </span>
      <span className="tc-group">{GROUP_LABEL[t.group]}</span>
      <span className="tc-name"><i>{t.name}</i></span>
      {t.commonName && <span className="tc-common">{t.commonName}</span>}
      <span className="tc-range"><DateText>{formatMa(o)}</DateText> → <DateText>{t.extant ? 'presente' : formatMa(y)}</DateText></span>
    </button>
  );
}

export function OrganismsTab() {
  const { focusId, selectedTaxonId, selectTaxon } = useTime();
  const { data, error } = useTaxa();
  const iv = getInterval(focusId)!;
  const [onlyHere, setOnlyHere] = useState(true);
  const [group, setGroup] = useState<TaxonGroup | 'all'>('all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    if (!data) return [];
    return data.taxa
      .filter((t) => !onlyHere || q || overlaps(t, iv.start.ma, iv.end.ma))
      .filter((t) => group === 'all' || t.group === group)
      .filter((t) => matches(t, q))
      .sort((a, b) => span(b)[0] - span(a)[0]);
  }, [data, onlyHere, group, q, iv]);

  const groups = useMemo(() => [...new Set(data?.taxa.map((t) => t.group))], [data]);

  return (
    <div className="tab-body species">
      <div className="sp-filters">
        <input className="sp-search" type="search" placeholder="Buscar gênero, nome popular ou família" value={q}
          onChange={(e) => setQ(e.target.value)} aria-label="Buscar organismos" />
        <label className="sp-toggle">
          <input type="checkbox" checked={onlyHere} onChange={(e) => setOnlyHere(e.target.checked)} />
          Só de {iv.name.pt}
        </label>
        <select className="sp-select" value={group} onChange={(e) => setGroup(e.target.value as TaxonGroup | 'all')} aria-label="Filtrar por grupo">
          <option value="all">Todos os grupos</option>
          {groups.map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
        </select>
      </div>

      {error ? <p className="empty">Falha ao carregar os organismos.</p>
        : !data ? <p className="empty">Carregando organismos…</p>
        : list.length === 0 ? (
          <p className="empty">
            Nenhum organismo do catálogo {q ? 'corresponde à busca' : `registrado para ${iv.name.pt}`}. O catálogo ainda é pequeno ({data.taxa.length} gêneros); a ausência aqui não significa ausência de vida no intervalo.
          </p>
        ) : (
          <div className="sp-grid">
            {list.map((t) => <TaxonCard key={t.id} t={t} selected={t.id === selectedTaxonId} onOpen={() => selectTaxon(t.id)} />)}
          </div>
        )}
      <p className="muted small sp-source">Gêneros representativos · dados do Paleobiology Database (CC0), {data?.fetchedAt ?? '…'} · imagens do Wikimedia Commons</p>
    </div>
  );
}

export function TaxonPanel() {
  const { selectedTaxonId, selectTaxon, focus } = useTime();
  const { data } = useTaxa();
  const t = data?.taxa.find((x) => x.id === selectedTaxonId);
  const narrow = useMediaQuery('(max-width: 900px)');
  const [mini, setMini] = useState(false);
  useEffect(() => setMini(false), [selectedTaxonId]);
  if (!t || !data) return null;
  const showOnMap = () => {
    setMini(true);
    requestAnimationFrame(() => document.querySelector('.geo-stage')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  if (mini) {
    return (
      <div className="taxon-mini" role="region" aria-label={`Ficha de ${t.name} minimizada`}>
        <button className="taxon-mini-open" onClick={() => setMini(false)} aria-label={`Reabrir ficha de ${t.name}`}>
          <i>{t.name}</i> <span aria-hidden="true">▲</span>
        </button>
        <button className="taxon-mini-close" onClick={() => selectTaxon(null)} aria-label="Fechar ficha">×</button>
      </div>
    );
  }
  const [o, y] = span(t);
  const contemporaries = data.taxa.filter((x) => x.id !== t.id && overlaps(x, o, y));
  const goTo = deepestAt(typicalAge(t));
  const c = t.classification;
  const withPaleo = t.localities.filter((l) => l.plon != null).length;

  return (
    <aside className="event-panel taxon-panel" role="dialog" aria-label={t.name}>
      <button className="close" onClick={() => selectTaxon(null)} aria-label="Fechar">×</button>
      <TaxonGallery id={t.id} />
      <span className="eyebrow">{GROUP_LABEL[t.group]} · gênero</span>
      <h2><i>{t.name}</i></h2>
      <p className="muted">{t.authority}{t.commonName ? ` · ${t.commonName}` : ''}</p>
      <TaxonTextBlock id={t.id} />

      <h3>Intervalo de ocorrência <InfoTip>Calculado pelo PBDB a partir das ocorrências cadastradas. Cada data é a faixa do intervalo estratigráfico do registro, e o total pode incluir identificações duvidosas ou revisadas.</InfoTip></h3>
      <dl className="kv">
        <dt>Primeiro registro</dt><dd>{fmtRange(t.range.first)}{t.range.earlyInterval ? ` (${t.range.earlyInterval})` : ''}</dd>
        <dt>Último registro</dt><dd>{t.extant ? 'vivente' : `${fmtRange(t.range.last)}${t.range.lateInterval ? ` (${t.range.lateInterval})` : ''}`}</dd>
        <dt>Ocorrências no PBDB</dt><dd>{t.pbdb.occurrences}</dd>
      </dl>
      {goTo && <button className="link" onClick={() => focus(goTo.id)}>Ir para {goTo.name.pt} →</button>}

      <h3>Classificação (PBDB) <InfoTip>Os níveis de classificação seguem o PBDB, que usa ranks tradicionais e às vezes difere de classificações filogenéticas atuais.</InfoTip></h3>
      <dl className="kv">
        <dt>Filo</dt><dd>{clean(c.phylum) ?? 'não especificado'}</dd>
        <dt>Classe</dt><dd>{clean(c.class) ?? 'não especificada'}</dd>
        <dt>Ordem</dt><dd>{clean(c.order) ?? 'não especificada'}</dd>
        <dt>Família</dt><dd>{clean(c.family) ?? 'não especificada'}</dd>
      </dl>

      <h3>Localidades fósseis <InfoTip>Os pontos marcam onde os fósseis foram coletados. Não são a área de distribuição do organismo.</InfoTip></h3>
      <p>
        {t.localities.length} coleções com coordenadas.
        {t.mapAge !== null
          ? ` ${withPaleo} delas aparecem no globo e no mapa, reposicionadas para ${formatMa(t.mapAge)}.`
          : ' Sem reconstrução geográfica disponível para a idade deste organismo.'}
      </p>
      {narrow && t.mapAge !== null && withPaleo > 0 && (
        <button className="btn-map" onClick={showOnMap}>Ver no mapa ↓</button>
      )}


      {contemporaries.length > 0 && (
        <>
          <h3>Contemporâneos no catálogo</h3>
          <div className="contemp">
            {contemporaries.map((x) => (
              <button key={x.id} className="chip small" onClick={() => selectTaxon(x.id)}><i>{x.name}</i></button>
            ))}
          </div>
        </>
      )}

      <h3>Fonte</h3>
      <p className="small">
        <a href={pbdbUrl(t)} target="_blank" rel="noreferrer">Ficha no Paleobiology Database</a> (taxon_no {t.pbdb.taxonNo}),
        consultada em {t.pbdb.fetchedAt}. Licença CC0.
      </p>
    </aside>
  );
}

const TEXTS = (textsRaw as TaxonTexts).texts;
const FIELD: Record<string, string> = { identity: 'O que era', anatomy: 'Anatomia', habitat: 'Hábitat', diet: 'Alimentação', behavior: 'Comportamento', significance: 'Importância' };
export const EVIDENCE_LABEL: Record<TextEvidence, string> = {
  fossil_direct: 'Evidência fóssil direta',
  comparative_anatomy: 'Inferência por anatomia comparada',
  geochemical: 'Evidência química',
  hypothesis: 'Hipótese / interpretação',
};
const cite = (id: string) => {
  const r = getReference(id);
  if (!r) return id;
  const a = r.author.filter((x) => !x.literal);
  const etal = r.author.some((x) => x.literal);
  const who = a.length === 1 && !etal ? a[0].family : a.length === 2 && !etal ? `${a[0].family} & ${a[1].family}` : `${a[0]?.family} et al.`;
  return { label: `${who} ${r.issued['date-parts'][0][0]}`, url: r.DOI ? `https://doi.org/${r.DOI}` : r.URL };
};

function TaxonTextBlock({ id }: { id: string }) {
  const t = TEXTS[id];
  if (!t) {
    return (
      <>
        <h3>Descrição</h3>
        <p className="empty">Ficha ainda não curada. Nenhum texto é exibido sem fonte primária.</p>
      </>
    );
  }
  const order = ['identity', 'anatomy', 'habitat', 'diet', 'behavior', 'significance'];
  const sections = [...t.sections].sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field));
  return (
    <>
      <h3>Descrição</h3>
      <p className="tx-summary"><Linked text={t.summary} self={id} /></p>
      {sections.map((sec, k) => (
        <div key={k} className={`tx-sec ev-${sec.evidence}`}>
          <div className="tx-head">
            <strong>{FIELD[sec.field]}</strong>
            <span className="tx-ev">{EVIDENCE_LABEL[sec.evidence]}</span>
            <ConfidenceBadge c={sec.confidence} />
          </div>
          <p>
            <Linked text={sec.text} self={id} />{' '}
            <span className="tx-cite">
              ({sec.refs.map((r, i) => { const c = cite(r); return typeof c === 'string' ? c : <a key={r} href={c.url} target="_blank" rel="noreferrer">{c.label}{i < sec.refs.length - 1 ? '; ' : ''}</a>; })})
            </span>
          </p>
        </div>
      ))}
      <p className="note">Sobre estes textos <InfoTip>Textos baseados nos resumos publicados das fontes citadas. Ainda sem revisão de especialista.</InfoTip></p>
    </>
  );
}

function TaxonGallery({ id }: { id: string }) {
  const list = mediaListForTaxon(id);
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [id]);
  const img = list[Math.min(i, list.length - 1)];
  if (!img) return null;
  return (
    <figure className="tp-fig">
      <img src={img.url} alt={img.caption} />
      {list.length > 1 && (
        <div className="tp-thumbs" role="tablist" aria-label="Imagens do organismo">
          {list.map((m, k) => (
            <button key={m.id} role="tab" aria-selected={k === i} onClick={() => setI(k)} title={KIND_LABEL[m.kind]}>
              <img src={m.url} alt="" /><span>{KIND_LABEL[m.kind]}</span>
            </button>
          ))}
        </div>
      )}
      <figcaption>
        <span className={`tc-kind k-${img.kind}`}>{KIND_LABEL[img.kind]}</span> {img.caption}
        <br /><span className="muted">{img.credit} · <a href={img.sourceUrl} target="_blank" rel="noreferrer">{img.license}</a> · Wikimedia Commons</span>
      </figcaption>
    </figure>
  );
}
