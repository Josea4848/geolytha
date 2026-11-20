import type { FeatureCollection } from 'geojson';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { formatMa, getInterval, getReference, formatReference } from '../domain/chronology';
import { loadSnapshot, MODEL_LIMIT_MA, nearestSnapshot, reconstructions } from '../domain/paleogeo';
import { useTime } from '../state/store';
import { usePrefersReducedMotion } from './hooks';
import { Map2D } from './Map2D';
import { ConfidenceBadge } from './Panels';
import { useTaxa } from './Species';

export type GeoPoint = [number, number];

const Globe3D = lazy(() => import('./Globe3D').then((m) => ({ default: m.Globe3D })));

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

type Mode = 'globe' | 'map';

export function GeoViewer() {
  const { t, focusId, selectedTaxonId, selectTaxon } = useTime();
  const { data: taxa } = useTaxa();
  const taxon = taxa?.taxa.find((x) => x.id === selectedTaxonId && x.mapAge !== null);
  const points = useMemo<GeoPoint[]>(
    () => (taxon ? taxon.localities.filter((l) => l.plon != null && l.plat != null).map((l) => [l.plon!, l.plat!]) : []),
    [taxon],
  );
  const reduced = usePrefersReducedMotion();
  const [hasGL, setHasGL] = useState(webglAvailable);
  const [mode, setMode] = useState<Mode>(() => (webglAvailable() ? 'globe' : 'map'));
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const onGLError = useCallback(() => { setHasGL(false); setMode('map'); }, []);

  const near = taxon
    ? { snapshot: reconstructions.snapshots.find((x) => x.age.ma === taxon.mapAge)!, delta: 0 }
    : nearestSnapshot(t);
  const snapId = near?.snapshot.id;

  useEffect(() => {
    if (!near) return;
    let alive = true;
    setStatus('loading');
    loadSnapshot(near.snapshot)
      .then((fc) => { if (alive) { setData(fc); setStatus('idle'); } })
      .catch(() => alive && setStatus('error'));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapId]);

  const iv = getInterval(focusId)!;

  if (!near) {
    return (
      <figure className="geo">
        <div className="geo-none">
          <strong>Sem reconstrução geográfica</strong>
          <p>
            Para {iv.name.pt} (idade de referência {formatMa(t)}) não existe reconstrução global de continentes que
            seja cientificamente defensável. O modelo usado aqui cobre até {formatMa(MODEL_LIMIT_MA)}.
            Nenhum mapa é mostrado para não sugerir uma precisão que os dados não têm.
          </p>
        </div>
      </figure>
    );
  }

  const { snapshot, delta } = near;
  const ref = getReference(snapshot.refs[0]);
  const dataRef = snapshot.refs[1] ? getReference(snapshot.refs[1]) : undefined;

  return (
    <figure className="geo">
      <div className="geo-toolbar" role="tablist" aria-label="Modo de visualização">
        <button role="tab" aria-selected={mode === 'globe'} disabled={!hasGL} onClick={() => setMode('globe')}
          title={hasGL ? '' : 'WebGL indisponível neste dispositivo'}>Globo 3D</button>
        <button role="tab" aria-selected={mode === 'map'} onClick={() => setMode('map')}>Mapa plano</button>
        <span className="geo-status" aria-live="polite">
          {status === 'loading' ? 'Carregando reconstrução…' : status === 'error' ? 'Falha ao carregar a reconstrução.' : ''}
        </span>
      </div>

      <div className="geo-stage" role="img"
        aria-label={`Reconstrução paleogeográfica de ${formatMa(snapshot.age.ma)}, modelo ${reconstructions.model}`}>
        {mode === 'globe' && hasGL ? (
          <Suspense fallback={<div className="globe-canvas" />}>
            <Globe3D data={data} points={points} reduced={reduced} onError={onGLError} />
          </Suspense>
        ) : (
          <Map2D data={data} points={points} />
        )}
        <div className="geo-age">{formatMa(snapshot.age.ma)}</div>
      </div>

      <figcaption className="geo-caption">
        <div className="geo-line">
          <strong>Reconstrução de {formatMa(snapshot.age.ma)}</strong>
          <ConfidenceBadge c={snapshot.confidence} />
        </div>
        {taxon && (
          <p className="geo-taxon">
            <span className="dot" aria-hidden="true" /> Localidades fósseis de <i>{taxon.name}</i> ({points.length}), reposicionadas para {formatMa(snapshot.age.ma)}.
            Os pontos marcam onde os fósseis foram coletados e não são a área de distribuição do organismo.{' '}
            <button className="link" onClick={() => selectTaxon(null)}>Voltar ao intervalo</button>
          </p>
        )}
        {!taxon && Math.abs(delta) > 0.5 && (
          <p className="geo-delta">
            O meio do intervalo selecionado é ~{Math.round(t)} Ma. Este é o instantâneo disponível mais próximo,
            {' '}~{Math.round(Math.abs(delta))} milhões de anos {delta > 0 ? 'mais antigo' : 'mais recente'}.
          </p>
        )}
        <p className="muted small">{reconstructions.layerDescription}</p>
        <details className="geo-more">
          <summary>Fonte, licença e limitações</summary>
          <ul>
            {reconstructions.limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <p className="muted small">
            Modelo: {ref ? formatReference(ref) : reconstructions.modelName}{' '}
            {ref?.DOI && <a href={`https://doi.org/${ref.DOI}`} target="_blank" rel="noreferrer">DOI</a>}
            {dataRef?.DOI && <> · Dados: <a href={`https://doi.org/${dataRef.DOI}`} target="_blank" rel="noreferrer">{reconstructions.modelVersion ?? 'Zenodo'}</a></>}
          </p>
          <p className="muted small">{reconstructions.licenseNote}</p>
        </details>
        <p className="attribution">
          {reconstructions.attribution}{' '}
          {reconstructions.license === 'CC-BY-4.0'
            ? <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>
            : <span className="badge pending">licença a confirmar</span>}
        </p>
      </figcaption>
    </figure>
  );
}
