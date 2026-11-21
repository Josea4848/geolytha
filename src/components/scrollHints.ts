/**
 * Indica que ainda há conteúdo para rolar: marca as áreas roláveis com data-sf
 * ("s" início, "e" fim) e o CSS esmaece a borda correspondente.
 * Horizontal na régua do tempo e nas abas; vertical nas demais.
 */
const H = '.ladder-track, .tabs';
const V = '.tab-panel, .geo-caption, .event-panel, .search-box ul, .about-pop';

function update(el: HTMLElement, horizontal: boolean) {
  const pos = horizontal ? el.scrollLeft : el.scrollTop;
  const max = horizontal ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
  const flags = `${pos > 2 ? 's' : ''}${pos < max - 2 ? 'e' : ''}`;
  if (el.dataset.sf !== flags) el.dataset.sf = flags;
}

function updateAll() {
  document.querySelectorAll<HTMLElement>(H).forEach((el) => update(el, true));
  document.querySelectorAll<HTMLElement>(V).forEach((el) => update(el, false));
}

export function installScrollHints() {
  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(updateAll); };
  document.addEventListener('scroll', (e) => {
    const el = e.target as HTMLElement;
    if (el instanceof HTMLElement) {
      if (el.matches(H)) update(el, true);
      else if (el.matches(V)) update(el, false);
    }
  }, { capture: true, passive: true });
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);
  // imagens que terminam de carregar mudam a altura do conteúdo
  document.addEventListener('load', schedule, true);
  schedule();
}
