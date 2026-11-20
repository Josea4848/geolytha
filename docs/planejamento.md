# Atlas Interativo da História Geológica da Terra — Documento de Planejamento (v0.1)

## Contexto
O usuário pediu **apenas o planejamento** (seção 13 do briefing), sem implementação. Não há código existente: a sessão está numa pasta vazia criada pelo app. Este arquivo **é o entregável**: os 13 itens pedidos, em português. Depois da aprovação, o próximo passo é salvar este conteúdo como `planejamento-atlas-geologico.md` na pasta da sessão (e, se o usuário quiser, publicá-lo como documento compartilhável). Nenhum código será escrito nesta fase.

**Premissas (ajustáveis):** equipe pequena (1–2 devs + 1 revisor científico em meio período); aplicação web estática; conteúdo em pt-BR com estrutura pronta para i18n.

**Aviso de verificação:** datas e licenças citadas abaixo vêm do meu conhecimento e precisam ser conferidas na Etapa 1 (pesquisa). Elas estão aqui para orientar, não como dados finais. Regra 7.6 #9: registrar versão e data de consulta de cada fonte.

---

## 1. Proposta conceitual e identidade visual

**Conceito:** "Atlas de bancada": uma obra de referência científica que se folheia no tempo. O tempo é o eixo principal; geografia e vida são "camadas" que mudam conforme o cursor temporal. Sem pontuação, sem missões, sem mascotes.

**Princípios**
1. **O tempo é o índice.** Toda tela responde a "quando estou?". O cursor temporal é um estado global único.
2. **Divulgação progressiva.** Resumo → detalhe → fonte. No máximo três blocos de informação visíveis por vez.
3. **Incerteza visível.** Cada dado tem um selo de confiabilidade (ver §5) e um "±" quando houver.
4. **Evidência ≠ reconstrução.** Tratamento visual distinto para fotografias de fósseis/afloramentos e para ilustrações artísticas.

**Identidade visual**
- **Paleta:** cores oficiais CGMW/ICS da carta cronoestratigráfica como cor de cada intervalo (é a convenção de mapas geológicos e dá uma identidade "de graça" e com significado). Neutros minerais (ardósia, calcário, basalto) para a interface; azul-oceano dessaturado para os mares nos mapas. Modo escuro "basalto" e modo claro "papel".
- **Tipografia:** serifa editorial para títulos (ex.: Source Serif 4 / Fraunces) + sans de alta legibilidade para a interface e os dados (ex.: Inter / IBM Plex Sans), com algarismos tabulares nas datas.
- **Iconografia:** traço fino, estilo cartográfico; selos de evidência ("Fóssil", "Inferência", "Hipótese", "Reconstrução artística").
- **Movimento:** transições de 300–600 ms só para manter a orientação (por exemplo, o globo faz um crossfade entre reconstruções). Tudo é desativado com `prefers-reduced-motion`.

## 2. Arquitetura de informação e navegação

**Hierarquia temporal:** Éon → Era → Período → Época (→ Idade, só nos dados e não na interface do MVP).

**Estado global (fonte única da verdade):**
`{ t: idade em Ma, foco: intervalo selecionado, nivelZoom, modoGeo: globo|mapa|comparar, seleção?: espécie|evento|marco, comparação?: {tA, tB} }`
Ele é serializado na URL (ex.: `/?t=251.9&foco=permiano&sel=lystrosaurus`), o que dá links compartilháveis, botão "voltar" funcional e citação de uma "vista" exata.

**Seções (rotas):**
- `/` Explorador (tela principal: timeline + globo + painel do período + abas de conteúdo)
- `/extincoes` e `/extincoes/:id`
- `/marcos/:id`
- `/especies` (catálogo global) e `/especies/:id`
- `/comparar?tA=…&tB=…`
- `/fontes` (bibliografia completa, versões das bases e licenças)
- `/sobre` (metodologia, legenda dos selos de confiabilidade, limitações)

**Navegação:** o carrossel de eras/períodos e a timeline proporcional leem e escrevem o mesmo `t` e o mesmo `foco`, por isso ficam sempre sincronizados. Busca global (Ctrl+K) leva a qualquer entidade e posiciona o tempo nela.

## 3. Mapa das telas e componentes

**Explorador, desktop (≥1200 px)**
```
┌──────────────────────────────────────────────────────────────┐
│ Cabeçalho: logo · busca (Ctrl+K) · Comparar · Fontes · tema │
│ Carrossel de eras/períodos  ◀ [Paleozoico ▸ Permiano] ▶     │
│ Timeline proporcional (zoom/pan, marcos ◆, extinções ✕, ▼t) │
├──────────────────────┬───────────────────────────────────────┤
│ Globo 3D / Mapa 2D   │ Painel do período                     │
│ (troca de modo,      │ nome · intervalo ± · era/éon · duração│
│  legenda, fonte e    │ indicadores: temp., CO₂, O₂, nível    │
│  idade da reconstr.) │ do mar (com incerteza) · destaques    │
├──────────────────────┴───────────────────────────────────────┤
│ Abas: Ambientes | Espécies | Eventos | Curiosidades | Fontes│
└──────────────────────────────────────────────────────────────┘
```
**Tablet:** globo e painel empilhados, abas abaixo. **Celular:** timeline compacta fixa no topo (só o nível corrente + mini barra de contexto); o globo vira um cartão recolhível; o painel e as abas ficam em uma coluna; os detalhes abrem em bottom sheet.

**Componentes principais**
| Componente | Responsabilidade |
|---|---|
| `TimeProvider` (store) | estado global `t`/`foco`/seleção ↔ URL |
| `EraCarousel` | navegação discreta entre irmãos do nível atual; anterior/próximo; teclado |
| `ProportionalTimeline` | escala linear em Ma, zoom semântico por nível, marcadores, indicador de posição |
| `GeoViewer` | contêiner com os modos `Globe3D`, `PaleoMap2D`, `CompareGeo`; selo "reconstrução de X Ma (modelo Y)" |
| `PeriodPanel` | ficha do intervalo + `ProxyIndicator` (valor, faixa de incerteza, fonte) |
| `EnvironmentGallery` | cartões de ambiente com selo "artística"/"evidência" |
| `SpeciesCatalog` / `SpeciesCard` / `SpeciesDetail` | filtros, busca e ficha completa com marcação de evidência campo a campo |
| `EventView` (extinções/marcos) | linha do tempo local, gráfico de diversidade, hipóteses com grau de consenso |
| `CitationChip` / `ReferenceList` | citação inline → referência completa (DOI/link) |
| `MediaFigure` | imagem + legenda + crédito + licença + tipo (evidência/artística/diagrama) |
| `SearchPalette` | busca client-side em todas as entidades |
| `ConfidenceBadge` | legenda de confiabilidade reutilizável |

## 4. Fluxos de interação do usuário
1. **Exploração livre:** abrir → visão de éons → clicar em "Fanerozoico" → zoom anima até as eras → carrossel em "Mesozoico" → "Jurássico" → o globo faz crossfade para a reconstrução mais próxima (ex.: 200 Ma) → o painel e as abas atualizam.
2. **Avançar/retroceder:** setas do carrossel ou ←/→ → próximo intervalo irmão; Shift+setas → sobe ou desce de nível.
3. **Marco evolutivo:** clicar em ◆ "Explosão Cambriana" na timeline → `t` vai até o marco → abre o painel lateral com explicação, datas ± e referências.
4. **Espécie:** aba Espécies → filtrar "Anfíbios" → cartão *Eryops* → detalhe → o mapa destaca as localidades fósseis (pontos, PBDB) **separadas** da distribuição inferida (área hachurada, só se houver base) → "Ver contemporâneas" / "Ver em outros períodos".
5. **Extinção:** clicar em ✕ P–Tr → página do evento: antes/depois, grupos afetados, hipóteses com consenso, sobreviventes e grupos que se diversificaram → "Comparar antes × depois" abre `/comparar?tA=255&tB=245`.
6. **Busca:** Ctrl+K "pangeia" → resultados tipados (período, ambiente, termo) → escolher → o contexto temporal é aplicado.
7. **Comparação:** escolher A e B → mapas lado a lado (ou cortina deslizante) + tabela de indicadores + espécies exclusivas e compartilhadas.
8. **Sem WebGL / movimento reduzido:** detecção → `PaleoMap2D` (ortográfico ou Mollweide em SVG/Canvas), com o mesmo conteúdo e sem animação.

## 5. Modelo de dados
Todos os dados são **arquivos estáticos versionados** (JSON/YAML + GeoJSON/TopoJSON), validados por esquema (Zod/JSON Schema) no build. Convenção: **idades em Ma (número, decimal)**, `0 = presente`; Ga só na exibição (≥1000 Ma → "x,xx Ga"). Os componentes nunca contêm datas literais.

**Tipos compartilhados**
```ts
type Age = { ma: number; plusMinus?: number; approx?: boolean };      // ex.: {ma: 251.902, plusMinus: 0.024}
type Confidence = 'established' | 'well_supported' | 'debated' | 'speculative';
type EvidenceKind = 'fossil_direct' | 'comparative_anatomy' | 'hypothesis' | 'artistic';
type RefId = string;                     // chave em references.json (CSL-JSON)
type Sourced<T> = { value: T; evidence?: EvidenceKind; confidence?: Confidence; refs: RefId[]; note?: string };
```

**8.1 Cronologia, `chronology/intervals.json`**
```ts
Interval { id; name: {pt, en}; rank: 'eon'|'era'|'period'|'epoch'|'age';
  parentId?: string; start: Age; end: Age;       // duração é CALCULADA, não armazenada
  colorCGMW: string; status?: 'informal'|'formal'; summaryRef?: ContentId; refs: RefId[] }
ChronoMeta { source: 'ICS International Chronostratigraphic Chart', version: 'vAAAA/MM', consultedAt: date }
```

**8.2 Paleogeografia, `paleogeo/reconstructions.json` + `paleogeo/layers/*.topojson`**
```ts
Reconstruction { id; age: Age; model: 'PALEOMAP'|'Merdith2021'|'Muller2019'|…; modelVersion;
  layers: { coastlines?: path; continents?: path; plateBoundaries?: path; paleoDEM?: rasterPath };
  resolution: string; projection: 'EPSG:4326'; generatedWith: 'pyGPlates x.y'; generatedAt: date;
  limitations: string[]; confidence: Confidence; license: LicenseId; refs: RefId[] }
```
Associação com o tempo: uma função `nearestReconstruction(t)` devolve a reconstrução e `Δt`. Quando `Δt` é diferente de zero, a interface mostra "Reconstrução de 250 Ma (mais próxima disponível)".

**8.3 Paleobiologia, `taxa/*.json`**
```ts
Taxon { id; scientificName; author?; year?; commonName?: {pt,en}; rank: 'species'|'genus'|'clade';
  classification: { kingdom; phylum; class; order?; family? };     // conforme fonte taxonômica atual
  group: 'marine_inv'|'fish'|'amphibian'|'reptile'|'dinosaur'|'bird'|'mammal'|'plant'|'fungus'|'other';
  range: { first: Age; last: Age | 'extant' };  intervals: IntervalId[];  // derivável via range
  fossilLocalities: { pbdbCollectionIds?: number[]; points?: GeoJSON; modernCoords: true };
  inferredDistribution?: Sourced<GeoJSON>;     // só com base publicada
  habitat, physical, diet, behavior, significance: Sourced<string>[];
  fossilEvidence: Sourced<string>[];  extinctionLinks?: EventId[];
  media: MediaId[];  pbdbTaxonNo?: number;  refs: RefId[]; reviewedBy?: string; reviewedAt?: date }
```
Atenção: as localidades fósseis do PBDB vêm em coordenadas atuais e também em paleocoordenadas (`paleolat/lng`, calculadas pelo PBDB com um modelo de placas). Guardar o modelo usado e não misturar com reconstruções de outro modelo sem nota.

**8.4 Eventos, `events/*.json`**
```ts
Event { id; name; type: 'mass_extinction'|'radiation'|'milestone'|'geologic'|'climatic';
  time: { start: Age; end?: Age; peak?: Age };  summary: ContentId;
  hypotheses: { text; confidence: Confidence; refs: RefId[] }[];
  evidence: Sourced<string>[];  consequences: Sourced<string>[];
  affectedTaxa: TaxonId[]; diversifiedAfter: TaxonId[];
  diversityLoss?: Sourced<{ metric: 'species'|'genus'|'family'; pct: number; range?: [number,number] }>;
  refs: RefId[] }
```

**8.5 Conteúdos e mídias**
- `content/*.mdx`: textos explicativos e curiosidades, com citações inline `<Cite id="…"/>` e front-matter `{ id, kind, intervalIds, refs }`.
- `media/media.json`: `Media { id; file; kind: 'photo_evidence'|'artistic_reconstruction'|'diagram'|'map'|'model3d'; caption; alt; credit; license: LicenseId; sourceUrl; basedOnRefs?: RefId[]; aiGenerated: boolean }`. Se `aiGenerated` for verdadeiro, a mídia nunca aparece como evidência.
- `references/references.json`: CSL-JSON (exportável do Zotero), com DOI e `accessed`.
- `licenses/licenses.json`: SPDX/CC IDs, texto curto da atribuição e se permite uso comercial ou derivados.
- `proxies/*.json`: séries de temperatura, CO₂, O₂ e nível do mar `{t, valor, min, max}` com fonte, usadas pelos gráficos do painel.

**Mecanismo de atualização:** mudar dados = PR no repositório. O CI valida os esquemas, confere a integridade referencial (todo `refs`, `media` e `intervalIds` existe), verifica que todo campo `Sourced` tem `refs` não vazios, que toda mídia tem licença e que todo `Interval` cobre o pai sem lacunas nem sobreposições.

## 6. Fontes científicas e bases de dados recomendadas
| Domínio | Fonte | Uso | A verificar na Etapa 1 |
|---|---|---|---|
| Cronologia | ICS: International Chronostratigraphic Chart (stratigraphy.org) + cores CGMW | limites, nomenclatura, cores | versão vigente (última que conheço: v2024/12); a GTS2020 (Gradstein et al.) como apoio para épocas e idades |
| Paleogeografia | PALEOMAP (Scotese): PaleoAtlas for GPlates; PaleoDEMs (Scotese & Wright 2018) | mapas por idade, relevo | licença exata (os PaleoDEMs têm DOI e licença aberta no Zenodo, mas é preciso confirmar), granularidade (~5 Myr) |
| Paleogeografia | Modelos GPlates/EarthByte: Müller et al. 2019 (0–250 Ma), Merdith et al. 2021 (0–1000 Ma), Müller et al. 2022 | linhas de costa, placas, limites | licenças (geralmente CC BY), compatibilidade entre modelos |
| Ferramentas | pyGPlates / GPlates; GPlates Web Service (gws.gplates.org) | gerar camadas offline por idade | termos de uso do web service (preferir geração offline) |
| Fósseis | Paleobiology Database (PBDB), API data1.2 | ocorrências, intervalos, paleocoordenadas, curvas de diversidade | licença CC BY 4.0 (confirmar), citação por download |
| Taxonomia | PBDB + Catalogue of Life / WoRMS (marinhos) / literatura primária | nomes válidos e classificação | divergências entre bases |
| Museus | Natural History Museum (Londres), Smithsonian NMNH, AMNH, Museu Nacional/UFRJ | textos de apoio, imagens | licença de cada imagem (o Smithsonian Open Access é CC0 em parte do acervo) |
| Imagens abertas | Wikimedia Commons (com checagem da origem), Smithsonian Open Access, PhyloPic (silhuetas) | ilustrações e silhuetas | licença por arquivo; PhyloPic tem licenças mistas |
| Clima/proxies | Scotese et al. 2021 (curva de temperatura fanerozoica); Foster et al. 2017 (CO₂); Berner (GEOCARBSULF) / Krause et al. 2018 (O₂); Haq (nível do mar) | indicadores com incerteza | escolher uma série por variável e documentar |
| Extinções | Raup & Sepkoski 1982; Bambach 2006 (Annu. Rev.); revisões recentes por evento (ex.: Schulte et al. 2010 para K–Pg; Burgess et al. 2014 para P–Tr) | dados e hipóteses | atualizar para revisões ≥2020 |
| Duração do dia | Williams 2000 (ritmitos); estudos de ciclostratigrafia (ex.: Meyers & Malinverno 2018) | curiosidades | grau de incerteza |

## 7. Estratégia para as reconstruções paleogeográficas
**Fatos que guiam a estratégia**
- As reconstruções globais confiáveis cobrem bem os **últimos ~540 Ma** (PALEOMAP, Müller). Merdith et al. 2021 chega a **1000 Ma**, com incerteza crescente.
- **Antes de ~1 Ga não existe mapa global defensável.** Para Arqueano e Hadeano: nada de "mapa de continentes". Usar cartões conceituais (oceano global, protocrátons, "Terra-bola-de-neve" no Criogeniano como hipótese ilustrada) com o selo "Esquemático, sem reconstrução geográfica".
- Os modelos diferem entre si. **Um modelo-base por faixa temporal**, sem misturar por camada, e a troca de modelo é sinalizada.

**Pipeline (offline, reprodutível, em `/pipeline`)**
1. Baixar os modelos (arquivos de rotação e polígonos) → pasta isolada, com registro de versão, hash e licença.
2. Script Python + **pyGPlates** reconstrói linhas de costa e polígonos continentais para um **conjunto fixo de idades** (MVP: ~15–20 instantâneos, ex.: 0, 20, 50, 66, 90, 120, 150, 200, 230, 250, 300, 340, 380, 420, 470, 500, 540 Ma + 600, 750, 900 Ma com o modelo de 1 Ga).
3. Simplificar com mapshaper → TopoJSON (meta: <300 KB por idade). Opcional: rasterizar o PaleoDEM em textura WebP de 2048×1024 para relevo e batimetria.
4. Gerar `reconstructions.json` com metadados e limitações.
5. Pontos fósseis: usar as paleocoordenadas do PBDB **calculadas com o mesmo modelo** quando disponíveis; caso contrário, reconstruir via pyGPlates com o mesmo modelo do mapa.

**Visualização**
- **Sem interpolação de polígonos entre idades** (isso inventaria geografia intermediária). A transição é um *crossfade* entre os instantâneos, e o rótulo sempre mostra a idade real da reconstrução exibida.
- O globo mostra "Reconstrução: 200 Ma · Modelo Müller et al. 2019 · Δ +1,4 Myr do tempo selecionado".
- Modo comparação: duas idades lado a lado ou com cortina. A "movimentação das placas" aparece apenas como vetores ou trajetórias calculados pelo modelo (fase futura), nunca desenhados à mão.
- Linhas de costa atuais (opcionais, tracejadas) reconstruídas por rotação para orientar o usuário ("onde está o Brasil hoje"), com a nota de que são contornos atuais deslocados.

## 8. Stack tecnológica recomendada
| Necessidade | Escolha | Justificativa | Alternativa avaliada |
|---|---|---|---|
| Interface | **React + TypeScript + Vite** | tipagem forte para um modelo de dados rico, ecossistema de visualização, build estático | Svelte (bom, mas o ecossistema 3D e de mapas é menor) |
| Roteamento/estado | React Router + **Zustand**, estado espelhado na URL | um estado temporal global e simples | Redux (mais pesado que o necessário) |
| Globo 3D | **Three.js via React Three Fiber**: esfera com textura gerada a partir do GeoJSON (d3-geo → canvas equiretangular → `CanvasTexture`) + OrbitControls | os dados são polígonos sem tiles nem terreno real; controle total do visual e leve | **CesiumJS**: poderoso, mas pensado para a Terra atual, com terreno e tiles, bundle grande e georreferenciamento atual. **MapLibre v5 (globe)**: viável e testar no spike, mas o mapa 2D fica limitado à projeção Mercator, que é inadequada para paleomapas |
| Mapa 2D | **d3-geo** (Mollweide/Robinson, ortográfico como fallback do globo) em Canvas/SVG | projeções de área igual, sem servidor de tiles, mesmo GeoJSON do globo | MapLibre (só Mercator no 2D) |
| Timeline e gráficos | **D3** (escalas, eixos, zoom) com renderização em React | escala proporcional e zoom semântico são o ponto forte do D3 | vis-timeline (pouco controle visual) |
| Animação | CSS/Framer Motion na interface; interpolação de opacidade de shader no globo | respeita `prefers-reduced-motion` | GSAP (desnecessário) |
| Conteúdo | **MDX** + JSON/YAML validados por **Zod** | texto editorial com citações componentizadas, validação no build | CMS headless (adiar: não há justificativa no MVP) |
| Referências | CSL-JSON + **citation-js** | padrão acadêmico, exporta do Zotero | — |
| Busca | **MiniSearch** (índice gerado no build) | client-side, suporta acentos e campos | Algolia (serviço externo desnecessário) |
| Dados geo | Python + pyGPlates + mapshaper (pipeline offline) | reprodutibilidade científica | GPlates Web Service ao vivo (dependência externa e latência) |
| Testes | Vitest + Testing Library; Playwright (fluxos e regressão visual); axe-core | — | — |
| Hospedagem | Site estático (Netlify/Vercel/GitHub Pages) + CDN para texturas | **sem backend ou banco no MVP** | — |

**Decisões que dependem de investigação (spikes da Etapa 3):** (a) globo R3F com textura × MapLibre globe: desempenho e qualidade de borda em GPU integrada; (b) tamanho e qualidade das texturas PaleoDEM; (c) se a licença do PALEOMAP permite redistribuir as camadas geradas.

## 9. Escopo do MVP e versões futuras
**MVP (Fases 1–3, enxuto)**
- Cronologia ICS completa até época (Hadeano → Holoceno), com timeline proporcional, zoom e carrossel sincronizados.
- Painel do período para **todos os períodos**. Campos sem dado ficam visivelmente "Sem estimativa consolidada", e nada é inventado.
- ~12 marcos evolutivos (lista da §3.8 do briefing).
- Globo 3D + mapa 2D com **~15 instantâneos** fanerozoicos + 3 neoproterozoicos, e cartões esquemáticos para o Pré-Cambriano antigo.
- Catálogo inicial com **~40 táxons** distribuídos por grupos e éons (ex.: estromatólitos/cianobactérias, *Dickinsonia*, *Anomalocaris*, *Opabinia*, trilobitas, graptólitos, *Cooksonia*, *Dunkleosteus*, *Tiktaalik*, *Archaeopteris*, *Lepidodendron*, *Meganeura*, *Eryops*, *Dimetrodon*, *Glossopteris*, *Lystrosaurus*, *Coelophysis*, *Ichthyosaurus*, *Archaeopteryx*, *Brachiosaurus*, amonites, *Tyrannosaurus*, *Triceratops*, *Mosasaurus*, primeiras angiospermas (*Archaefructus*), *Purgatorius*, *Basilosaurus*, *Indricotherium*/*Paraceratherium*, *Smilodon*, *Mammuthus primigenius*, *Homo habilis*/*H. erectus*/*H. sapiens* etc.), cada um com ficha e referências. **Lista final validada pelo revisor científico.**
- Busca client-side e página `/fontes`.
- Responsivo, fallback 2D, teclado e movimento reduzido.

**v1.1 (Fase 4):** as cinco grandes extinções com páginas completas, curva de diversidade (PBDB), comparação entre dois tempos (mapas + indicadores + espécies) e filtros avançados.
**v1.2+ (Fase 5):** ambientes paleoambientais (Carbonífero, Permiano árido, Jurássico, costa cretácea, Pleistoceno), séries climáticas completas, vetores de movimento de placas, mais táxons e instantâneos, versão em inglês, modo "tour guiado" (opcional e editorial, não gamificado).

## 10. Riscos técnicos e científicos
| Risco | Impacto | Mitigação |
|---|---|---|
| Licença das reconstruções não permite redistribuição | alto | verificar na Etapa 1; ter um modelo alternativo CC BY (EarthByte); pedir permissão a Scotese se necessário |
| Divergência entre modelos paleogeográficos | médio | um modelo por faixa, troca sinalizada, página de metodologia |
| Falsa precisão (polígonos nítidos para 900 Ma) | alto | selo de confiança, borda "difusa" ou hachura em idades antigas, sem mapa antes de ~1 Ga |
| Revisões da ICS (ex.: base do Cretáceo ~143,1 Ma e do Ordoviciano 486,85 Ma mudaram em 2023; o Antropoceno foi rejeitado como época em 2024) | médio | dados centralizados com `version`; script que compara com a nova carta; nada de datas no código |
| "Formação da Terra": 4,54 Ga (datação radiométrica clássica) × base do Hadeano 4567 Ma na carta (formação do Sistema Solar/CAIs) | baixo | mostrar as duas com explicação; o marco "Formação da Terra" usa a sua própria referência |
| Imagens com licença ambígua ou ilustrações sem base | alto | `media.json` obrigatório, revisão manual, bloquear no CI mídia sem licença |
| Hipóteses apresentadas como fatos | alto | campo `confidence` obrigatório em hipóteses; guia editorial; revisão por pares interna |
| Desempenho do 3D em hardware intermediário ou celular | médio | texturas 2K/1K adaptativas, carregamento sob demanda por idade, fallback 2D, orçamento de bundle |
| Escala linear torna o Cenozoico minúsculo diante de 4,5 Ga | médio (UX) | zoom semântico por nível + minimapa de contexto; modo log **opcional e rotulado** como não proporcional |
| Escopo de conteúdo explode | alto | critério de "qualidade acima de quantidade", cota de táxons por fase |
| Dados do PBDB mudam ao longo do tempo | baixo | snapshot versionado com data de download |

## 11. Cronograma sugerido (1–2 devs + revisor científico em meio período)
| Semanas | Etapa | Saídas |
|---|---|---|
| 1–3 | **E1 Pesquisa** | inventário de fontes e licenças, carta ICS transcrita para `intervals.json`, escolha dos modelos, lista de táxons e marcos validada |
| 3–4 | **E2 Modelagem** | esquemas Zod, CSL-JSON inicial, validador de CI, guia editorial de evidência e confiança |
| 4–6 | **E3 Arquitetura e protótipos** | wireframes e protótipo navegável; spikes (globo R3F × MapLibre; pipeline pyGPlates para 3 idades; licenças) |
| 6–9 | **Fase 1** | timeline + carrossel + painel + marcos (cronologia completa) |
| 9–13 | **Fase 2** | pipeline completo, globo, mapa 2D, fallback, metadados das reconstruções |
| 13–17 | **Fase 3** | catálogo de ~40 táxons, fichas, PBDB, busca → **MVP público** |
| 17–21 | **Fase 4** | extinções, comparação, filtros |
| contínuo | **E5 Validação** em cada fase + **Fase 5** expansão | revisão científica, testes de acessibilidade e desempenho, auditoria de licenças |

A redação científica (o gargalo real) corre em paralelo a partir da semana 3.

## 12. Manutenção e atualização das informações científicas
- **Conteúdo como código:** tudo em repositório Git; cada mudança científica é um PR com o template "afirmação · fonte primária · revisor".
- **CI de integridade:** esquemas, referências existentes, licenças, cobertura temporal sem lacunas, links (DOI) válidos.
- **Metadados de proveniência:** `reviewedBy`/`reviewedAt` por entidade; `version`/`consultedAt` por base (ICS, PBDB, modelos).
- **Rotina:** checar anualmente a carta ICS (script de diff); a cada ~6 meses, novos snapshots do PBDB e novas versões dos modelos EarthByte.
- **Página pública de changelog** ("o que mudou nos dados") e um canal "reportar erro" (formulário para issue; sem backend próprio).
- **Política de divergência:** quando houver interpretações concorrentes relevantes, mostrar as principais com grau de consenso, sem escolher silenciosamente uma delas.

## 13. Licenciamento e atribuição de imagens, mapas e modelos
- **Registro obrigatório** em `media.json`/`licenses.json` (autor, fonte, licença SPDX/CC, URL, modificações feitas). O build falha sem esses dados.
- **Preferência de licenças:** CC0/domínio público > CC BY > CC BY-SA (avaliar o efeito de "compartilha igual" em derivados) > material com permissão escrita. **Evitar CC BY-NC** se houver chance de uso comercial e decidir isso cedo.
- **Atribuição visível:** crédito curto em cada figura e no globo ("Paleogeografia: modelo X, versão, licença"), mais a página `/fontes` completa.
- **Dados:** PBDB (citar conforme as regras do PBDB e a data de download), modelos GPlates/EarthByte (citar os artigos), PALEOMAP (citar Scotese e a obra específica, e confirmar os termos de redistribuição).
- **Ilustrações próprias encomendadas:** contrato com cessão de licença, registro das referências científicas usadas pelo artista e selo "Reconstrução artística".
- **IA generativa:** se usada, só para elementos decorativos ou neutros, marcada `aiGenerated`, nunca como reconstrução de organismo ou ambiente apresentada como científica.
- **Licença do próprio projeto:** sugerir código MIT e conteúdo original CC BY 4.0, respeitando as licenças de terceiros por item.

---

## Verificação deste planejamento
- Conferir que os 13 entregáveis da seção 13 do briefing estão cobertos (seções 1–13 acima).
- Na Etapa 1, validar cada item marcado "a verificar": versão da carta ICS, licenças do PALEOMAP, PaleoDEM, EarthByte e PBDB, e cobertura temporal dos modelos.
- Depois da aprovação: salvar como `planejamento-atlas-geologico.md` na pasta da sessão. Nenhum código é criado nesta fase.
