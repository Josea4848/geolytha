const UNITS: Record<string, string> = {
  Ma: 'milhões de anos atrás (mega-annum)',
  Ga: 'bilhões de anos atrás (giga-annum)',
};

/** Data geológica em destaque; "Ma"/"Ga" ganham explicação ao passar o mouse ou tocar. */
export function DateText({ children }: { children: string }) {
  const parts = children.split(/\b(Ma|Ga)\b/);
  return (
    <span className="date">
      {parts.map((p, i) => (UNITS[p] ? <abbr key={i} title={UNITS[p]}>{p}</abbr> : p))}
    </span>
  );
}

export function UnitsNote() {
  return <span className="units-note">Ma = milhões de anos atrás · Ga = bilhões de anos atrás</span>;
}
