import { useEffect, useRef, useState } from 'react';
import { GeoViewer } from './components/GeoViewer';
import { EventPanel, EventsTab, OverviewTab, SourcesTab } from './components/Panels';
import { PeriodCover } from './components/PeriodCover';
import { TimeFunnel } from './components/TimeFunnel';
import { TimeLadder } from './components/TimeLadder';
import { useMediaQuery } from './components/hooks';
import { SearchPalette } from './components/SearchPalette';
import { TabIcon } from './components/icons';
import { OrganismsTab, TaxonPanel } from './components/Species';
import { childrenOf, chronoMeta, eventsWithin, getInterval, neighbor } from './domain/chronology';
import { useTime } from './state/store';

/** ←/→ intervalo anterior/seguinte, ↑ nível acima, ↓ primeiro subintervalo, Esc fecha painéis. */
function useKeyboardNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      const el = e.target as HTMLElement;
      // não sequestra as setas de campos de texto, listas e abas
      if (el.closest?.('input, textarea, select, [contenteditable="true"], [role="tablist"]')) return;
      const { focusId, focus, selectEvent, selectTaxon } = useTime.getState();
      if (e.key === 'Escape') { selectEvent(null); selectTaxon(null); return; }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const iv = getInterval(focusId)!;
      const target =
        e.key === 'ArrowLeft' ? neighbor(focusId, -1)?.id
        : e.key === 'ArrowRight' ? neighbor(focusId, 1)?.id
        : e.key === 'ArrowUp' ? iv.parentId
        : childrenOf(focusId)[0]?.id;
      e.preventDefault(); // evita rolar a página
      if (target) focus(target);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

const REPO_URL = 'https://github.com/Josea4848/geolytha';

function AboutData() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="about" ref={ref}>
      <button className="about-btn" aria-expanded={open} onClick={() => setOpen(!open)}>Sobre<span className="hide-narrow"> os dados</span></button>
      {open && (
        <div className="about-pop" role="dialog" aria-label="Sobre os dados">
          <button className="about-close" onClick={() => setOpen(false)} aria-label="Fechar">×</button>
          <p>Limites cronológicos e cores conferidos com a carta ICS {chronoMeta.version} em {chronoMeta.consultedAt}.</p>
          <p>Paleogeografia: Merdith et al. (2021), CC BY 4.0. Organismos: Paleobiology Database (CC0). Imagens: Wikimedia Commons, com autor e licença em cada uma.</p>
          <p><strong>Protótipo:</strong> nenhum conteúdo foi revisado ainda por especialista.</p>
          <p><strong>Uso de IA:</strong> o código, a curadoria dos dados e os textos foram produzidos com auxílio de inteligência artificial (Claude, da Anthropic), sob direção humana. Cada afirmação científica é ligada a uma fonte citada; nenhuma imagem foi gerada por IA.</p>
          <p>Código aberto (licença MIT): <a href={REPO_URL} target="_blank" rel="noreferrer">github.com/Josea4848/geolytha</a>. Correções e contribuições são bem-vindas.</p>
          <p className="muted small kbd-help">Teclado: ←/→ intervalo anterior/seguinte · ↑ nível acima · ↓ subdivisão · Ctrl+K ou / busca · Esc fecha painéis.</p>
        </div>
      )}
    </div>
  );
}

type Tab = 'organisms' | 'overview' | 'events' | 'sources';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'organisms', label: 'Organismos' },
  { id: 'events', label: 'Eventos' },
  { id: 'sources', label: 'Fontes' },
];

function DetailTabs() {
  const [tab, setTab] = useState<Tab>('overview');
  const { focusId } = useTime();
  const iv = getInterval(focusId)!;
  const nEvents = eventsWithin(iv.start.ma, iv.end.ma).length;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex((t) => t.id === tab);
    const n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setTab(n.id);
    document.getElementById(`tab-${n.id}`)?.focus();
  };
  return (
    <section className="details">
      <div className="tabs" role="tablist" aria-label="Detalhes do intervalo" onKeyDown={onKey}>
        {TABS.map((t) => (
          <button key={t.id} id={`tab-${t.id}`} role="tab" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}>
            <TabIcon name={t.id} />{t.label}{t.id === 'events' && nEvents > 0 && <span className="count">{nEvents}</span>}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'organisms' && <OrganismsTab />}
        {tab === 'overview' && <OverviewTab />}
        {tab === 'events' && <EventsTab />}
        {tab === 'sources' && <SourcesTab />}
      </div>
    </section>
  );
}

export default function App() {
  useKeyboardNav();
  const narrow = useMediaQuery('(max-width: 640px)');
  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" aria-hidden="true" width={32} height={32} />
          <h1>Geolytha</h1>
        </div>
        <SearchPalette />
        <a className="repo-link" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="Código-fonte no GitHub" title="Código-fonte no GitHub">
          <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
        </a>
        <AboutData />
      </header>

      {narrow ? <TimeLadder /> : <TimeFunnel />}

      <main className="stage">
        <div className="stage-main">
          <PeriodCover />
          <DetailTabs />
        </div>
        <GeoViewer />
      </main>
      <EventPanel />
      <TaxonPanel />
    </div>
  );
}
