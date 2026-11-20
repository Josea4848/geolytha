# Geolytha — an interactive atlas of Earth's geological history

An educational web app for exploring 4.5 billion years of Earth's history — from the planet's formation to the present — combining three dimensions:

- **Chronology** — the official International Chronostratigraphic Chart (ICS), from eons down to epochs.
- **Palaeogeography** — published plate-tectonic reconstructions shown on a 3D globe and an equal-area map.
- **Palaeobiology** — representative organisms, fossil localities, mass extinctions, biodiversity and climate.

It is not a game. It aims to feel like a modern scientific atlas: visual and explorable, but **every fact on screen comes from a cited, verifiable source**. Where data does not exist, the app says so instead of filling the gap.

**Live site:** https://geolytha.netlify.app · **Repository:** https://github.com/Josea4848/geolytha

> **Status:** working prototype. The interface is in Brazilian Portuguese (pt-BR). The content has **not yet been reviewed by a domain specialist**; see [Scientific rigour](#scientific-rigour).

## Features

- **Time funnel**: navigate eon → era → period → epoch. Each row zooms into the interval chosen above, and empty levels explain why they are empty (e.g. Archean eras have no formal periods).
- **Period cover**: a full-width illustration (USGS *Trek Through Time* and curated Wikimedia Commons palaeoart) with dates and uncertainties from the ICS chart.
- **3D globe and flat map** (Three.js and d3-geo): 80 snapshots of the Merdith et al. (2021) plate model, from 0 to 1000 Ma. Nothing is shown before 1 Ga, where no defensible global reconstruction exists.
- **Organisms**: 87 genera with Paleobiology Database ranges and classification, fossil localities reconstructed onto the same plate model, two images each (fossil and reconstruction), and 73 curated descriptions. Each statement is tagged by evidence type (direct fossil evidence, comparative anatomy, geochemistry, hypothesis) and by degree of consensus, with a citation.
- **Mass extinctions**: the "Big Five", numbered 1st to 5th, with estimated losses, proposed causes and degree of consensus, and a marine genus diversity curve.
- **Climate**: global mean surface temperature for the last 540 Myr (Scotese), on a cold-to-hot colour scale.
- **Global search** (Ctrl+K or `/`), full keyboard navigation (← → ↑ ↓, Esc), shareable URLs, responsive layout and `prefers-reduced-motion` support.

## Running locally

Requirements: Node.js 20 or later.

```bash
npm install
npm run dev        # http://localhost:5173
npm run validate   # check all data files (schemas, references, licences, coverage)
npm run build      # validate, type-check and build to dist/
```

The app is a static site, with no backend or database. Data lives in versioned JSON files. Images and map tiles are loaded from Wikimedia Commons at runtime; reconstruction snapshots are served from `public/`.

## Project structure

```
src/
  data/            all scientific content (JSON), validated at build time
    chronology/    ICS intervals + chart metadata
    events/        milestones and mass extinctions
    taxa/          curated genus list, PBDB-derived data, curated texts
    paleogeo/      reconstruction snapshot index
    climate/       global temperature series
    diversity/     marine genus diversity curve
    media/         every image, with credit, licence and type
    references/    CSL-JSON bibliography
  domain/          schemas (Zod), validation and data helpers
  components/      React UI
  state/           global time state, mirrored to the URL
scripts/           reproducible data pipelines (see below)
public/paleogeo/   reconstruction snapshots (GeoJSON)
docs/              original project plan (Portuguese)
```

### Data pipelines

Each external dataset is fetched by a script that records its source, licence and access date. Re-run a script to refresh its data.

| Script | What it does |
|---|---|
| `scripts/fetch-paleogeo.mjs` | Coastline snapshots from the GPlates Web Service (Merdith et al. 2021 model), simplified with mapshaper |
| `scripts/fetch-taxa.mjs` | Genus data and fossil localities from the Paleobiology Database; localities reconstructed with the same plate model; homonyms checked by phylum |
| `scripts/fetch-diversity.mjs` | Marine genus diversity per stage (PBDB) |
| `scripts/build-temperature.mjs` | Area-weighted global means from the Scotese temperature grids (Zenodo) |
| `scripts/fetch-media.mjs`, `fetch-event-media.mjs`, `fetch-epoch-covers.mjs`, `fetch-taxon-alt-media.mjs` | Image metadata from Wikimedia Commons (free licences only) |
| `scripts/read-abstracts.mjs` | Curation helper: prints a paper's metadata and abstract from its DOI (Crossref → Semantic Scholar → PubMed) |

Wikimedia rate-limits clients aggressively, so the media scripts are slow by design. They back off and retry automatically.

## Scientific rigour

These rules are enforced by convention and, where possible, by `npm run validate`:

1. **No invented facts.** Every interval, event, text section, dataset and image points to a reference or source in `src/data/references/references.json`.
2. **Show uncertainty.** Dates carry ± or ~ as given by the source. Statements carry a consensus level: *established*, *well supported*, *debated* or *speculative*.
3. **Separate evidence from interpretation.** Texts are tagged by evidence type, and images by kind (fossil/specimen, geological evidence, artistic reconstruction, unclassified).
4. **Do not fake precision.** No maps before 1 Ga. Fossil points are collection sites, not species ranges. Present-day coastlines are labelled as rotated modern outlines, not palaeo-shorelines.
5. **Free licences only.** CC0, public domain, CC BY or CC BY-SA, with author, licence and source shown next to each image. The validator rejects anything else. No AI-generated images.

Known limitations:

- Curated texts are based on **published abstracts**, not full papers.
- Image classification is partly heuristic. Some older illustrations may be scientifically outdated.
- PBDB ranges can include doubtful records.
- 14 genera still have no curated description.

## Use of AI

This project was built with substantial help from AI: Anthropic’s Claude, used through Claude Code, under human direction and review. The AI wrote most of the code and data pipelines, and drafted the curated texts.

To keep that work verifiable:

- Every scientific statement is tied to a cited source. Each DOI was checked on Crossref, and the curated texts summarise only what each paper’s **published abstract** says.
- Data comes from the original datasets (ICS, PBDB, GPlates/EarthByte, Zenodo) through the scripts in `scripts/`, not from the model’s memory.
- **No image in the app is AI-generated.** All images are real photographs or human-made illustrations from Wikimedia Commons and USGS, each with its own credit and licence.
- AI can still make mistakes. That is why specialist review is the most valuable contribution (see below).

## How to help

Contributions are very welcome. The most valuable ones are scientific.

- **Specialist review**: read genus cards, extinction pages or period summaries and open an issue for anything wrong, outdated or overstated. Please cite a source.
- **Curate a genus**: 14 genera still have no description (*Olenellus, Archaeopteris, Hylonomus, Eoraptor, Spriggina, Cameroceras, Arandaspis, Rhynia, Cladoselache, Calamites, Cynognathus, Shonisaurus, Plesiosaurus, Hesperornis*). Add an entry to `src/data/taxa/texts.json`, following the existing format, with a DOI-backed reference in `references.json`.
- **Improve images**: suggest better freely licensed reconstructions or fossil photos, or flag misclassified or outdated ones.
- **Add data**: CO₂, O₂ and sea-level series; palaeo-environment pages; more genera; Precambrian content.
- **Translations**: the UI is pt-BR only. The data model already stores English names for intervals and events.
- **Code**: accessibility, performance (the 3D chunk is large), tests, and offline caching of images.

### Contribution workflow

1. Fork the repository and create a branch.
2. Make your change. For data changes, keep the JSON schema intact and add references.
3. Run `npm run validate` and `npm run build`. Both must pass.
4. Open a pull request explaining **what** changed and **which sources** support it.

For scientific changes, please quote or link the relevant part of the source in the pull request description.

## Credits and licences

- Chronostratigraphic chart and colours: © International Commission on Stratigraphy, CC BY 4.0 (Cohen et al. 2013; updated chart).
- Plate model: Merdith et al. (2021), *Earth-Science Reviews* 214:103477; model files v1.2.4, CC BY 4.0. Snapshots generated via the GPlates Web Service (EarthByte).
- Fossil data: Paleobiology Database (CC0).
- Temperatures: Scotese (2021) dataset on Zenodo (CC BY 4.0); Scotese et al. (2021), *Earth-Science Reviews* 215:103503.
- Images: Wikimedia Commons contributors and USGS. Author and licence are shown with each image.

This project’s own code and original content (scripts, curated texts, data structure) are released under the [MIT License](LICENSE). Third-party datasets and images keep their own licences (CC BY 4.0, CC0, CC BY-SA, public domain), listed in [NOTICE.md](NOTICE.md); please keep their attributions when reusing them.
