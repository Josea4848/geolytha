# Third-party data and media

The MIT License in [`LICENSE`](LICENSE) covers this project's own code and original content: source code, scripts, curated texts and the structure of the data files.

The datasets and images below are **not** covered by the MIT License. They keep their original licences and attribution requirements, which apply to anyone who reuses them.

| Material | Where | Source | Licence |
|---|---|---|---|
| Chronostratigraphic boundaries and colours | `src/data/chronology/` | International Commission on Stratigraphy, International Chronostratigraphic Chart (stratigraphy.org/chart); Cohen et al. 2013, *Episodes* 36:199–204 | CC BY 4.0 |
| Palaeogeographic snapshots (simplified) | `public/paleogeo/`, `src/data/paleogeo/` | Merdith et al. 2021, *Earth-Science Reviews* 214:103477; plate model v1.2.4, doi:10.5281/zenodo.13635864; generated with the GPlates Web Service (EarthByte) | CC BY 4.0 (modified: simplified) |
| Fossil occurrences, taxon ranges, diversity counts | `src/data/taxa/taxa.json`, `src/data/diversity/` | Paleobiology Database (paleobiodb.org) | CC0 1.0 |
| Global mean surface temperature (derived) | `src/data/climate/` | Scotese 2021 dataset, doi:10.5281/zenodo.8238875; Scotese et al. 2021, *Earth-Science Reviews* 215:103503 | CC BY 4.0 (modified: area-weighted means) |
| Images | `public/media/` (listed in `src/data/media/media.json`) | Wikimedia Commons contributors; USGS *Trek Through Time* | Per file (public domain, CC0, CC BY or CC BY-SA); author and licence are recorded for each image and shown in the app |

Images are stored in `public/media/` as **resized WebP copies** of the Wikimedia Commons originals (made by `scripts/localize-media.mjs`; the only modification is scaling and format conversion). Each copy keeps the licence of its original. The author, licence and a link to the original file are recorded in `media.json` and shown next to each image in the app. Images under CC BY-SA remain under CC BY-SA.

Bibliographic references in `src/data/references/` are factual citations; the cited works belong to their authors and publishers.
