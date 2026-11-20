/** Ícones de traço fino (estilo cartográfico), herdam a cor do texto. */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function TabIcon({ name }: { name: 'overview' | 'organisms' | 'events' | 'sources' }) {
  return (
    <svg className="tab-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      {name === 'overview' && (
        // rosa dos ventos
        <g {...P}><circle cx="12" cy="12" r="9" /><path d="M12 4l2.2 7.8L12 20l-2.2-8.2z" /><path d="M4 12h2M18 12h2" /></g>
      )}
      {name === 'organisms' && (
        // amonite (espiral)
        <g {...P}><path d="M12 12a1.5 1.5 0 1 1 1.5 1.5A3 3 0 1 1 15 9a4.5 4.5 0 1 1-6 6 6 6 0 1 1 9-9" /><path d="M18 6l1.5-1.5" /></g>
      )}
      {name === 'events' && (
        // marco / estrela de mapa
        <g {...P}><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" /></g>
      )}
      {name === 'sources' && (
        // livro aberto
        <g {...P}><path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z" /><path d="M12 6.5v13" /></g>
      )}
    </svg>
  );
}
