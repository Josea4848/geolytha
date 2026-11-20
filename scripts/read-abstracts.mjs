// Ferramenta de curadoria: mostra metadados e resumo de artigos a partir do DOI
// (Crossref → Semantic Scholar → PubMed). Os textos das fichas devem se apoiar no que estes resumos dizem.
// Uso: node scripts/read-abstracts.mjs <doi> [doi...]
const UA = { 'User-Agent': 'Geolytha/0.1 (prototipo educativo)' };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const json = async (url) => { try { const r = await fetch(url, { headers: UA }); return r.ok ? await r.json() : null; } catch { return null; } };
const text = async (url) => { try { const r = await fetch(url, { headers: UA }); return r.ok ? await r.text() : null; } catch { return null; } };

for (const doi of process.argv.slice(2)) {
  const cr = (await json(`https://api.crossref.org/works/${encodeURIComponent(doi)}`))?.message;
  let abstract = strip(cr?.abstract);
  let via = abstract ? 'Crossref' : '';
  if (!abstract) {
    await pause(1200);
    const ss = await json(`https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=abstract`);
    if (ss?.abstract) { abstract = ss.abstract; via = 'Semantic Scholar'; }
  }
  if (!abstract) {
    await pause(500);
    const ids = (await json(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=${encodeURIComponent(doi + '[doi]')}`))?.esearchresult?.idlist;
    if (ids?.length) {
      const xml = await text(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml&id=${ids[0]}`);
      const m = [...(xml ?? '').matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((x) => strip(x[1])).join(' ');
      if (m) { abstract = m; via = `PubMed ${ids[0]}`; }
    }
  }
  const authors = (cr?.author ?? []).map((a) => a.family).slice(0, 4).join(', ');
  console.log(`\n## ${doi}\n${cr?.title?.[0]} | ${authors} | ${cr?.['container-title']?.[0]} ${cr?.volume ?? ''}:${cr?.page ?? cr?.['article-number'] ?? ''} (${cr?.issued?.['date-parts']?.[0]?.[0]})`);
  console.log(abstract ? `[${via}] ${abstract}` : '(resumo indisponível)');
  await pause(800);
}
