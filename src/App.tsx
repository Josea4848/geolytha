import { useEffect, useRef, useState } from 'react';
import { GeoViewer } from './components/GeoViewer';
import { EventPanel, EventsTab, OverviewTab, SourcesTab } from './components/Panels';
import { PeriodCover } from './components/PeriodCover';
import { TimeFunnel } from './components/TimeFunnel';
import { SearchPalette } from './components/SearchPalette';
import { TabIcon } from './components/icons';
import { OrganismsTab, TaxonPanel } from './components/Species';
import { ancestors, childrenOf, chronoMeta, eventsWithin, getInterval, neighbor } from './domain/chronology';
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

function Breadcrumb() {
  const { focusId, focus } = useTime();
  const iv = getInterval(focusId)!;
  return (
    <nav aria-label="Posição na escala geológica" className="crumbs-nav">
      <ol className="crumbs">
        <li><button onClick={() => focus('phanerozoic')}>Terra</button></li>
        {ancestors(focusId).map((p) => <li key={p.id}><button onClick={() => focus(p.id)}>{p.name.pt}</button></li>)}
        <li aria-current="location"><strong>{iv.name.pt}</strong></li>
      </ol>
    </nav>
  );
}

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
      <button className="about-btn" aria-expanded={open} onClick={() => setOpen(!open)}>Sobre os dados</button>
      {open && (
        <div className="about-pop" role="dialog" aria-label="Sobre os dados">
          <p>Limites cronológicos e cores conferidos com a carta ICS {chronoMeta.version} em {chronoMeta.consultedAt}.</p>
          <p>Paleogeografia: Merdith et al. (2021), CC BY 4.0. Organismos: Paleobiology Database (CC0). Imagens: Wikimedia Commons, com autor e licença em cada uma.</p>
          <p><strong>Protótipo:</strong> nenhum conteúdo foi revisado ainda por especialista.</p>
          <p className="muted small">Teclado: ←/→ intervalo anterior/seguinte · ↑ nível acima · ↓ subdivisão · Ctrl+K ou / busca · Esc fecha painéis.</p>
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
  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" aria-hidden="true" width={32} height={32} />
          <h1>Geolytha</h1>
        </div>
        <Breadcrumb />
        <SearchPalette />
        <AboutData />
      </header>

      <TimeFunnel />

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
