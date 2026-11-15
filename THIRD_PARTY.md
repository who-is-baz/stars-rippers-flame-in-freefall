# Third-party licenses

Generated on 2026-11-15 with `npx license-checker@25.0.1` (frontend) and `importlib.metadata` / `pip-licenses 5.0.0` (Python),
run outside the repo (none of these tools is a project dependency). Project code: **Apache-2.0** (`LICENSE`).
NASA PSI data: **CC0-1.0** (FLEX DOI 10.60555/mbq8-0451, BASS-II DOI 10.60555/4qc4-de67).

## Compatibility with Apache-2.0

All dependencies use permissive licenses (MIT, ISC, BSD-2/3-Clause, Apache-2.0, MIT-0, BlueOak-1.0.0, PSF-2.0, CC0-1.0). Notes:
- **MPL-2.0** (file-level copyleft): `certifi` (Python, installed at runtime by `requests`; not redistributed in this repo) and `lightningcss` (+ platform binaries, build tool only, not shipped in `dist/`). Compatible as long as MPL files are not modified; we do not modify them.
- **OFL-1.1** (fonts): `@fontsource-variable/inter`, `@fontsource/sora` and `@fontsource/ibm-plex-mono` are **bundled** in the built site (`dist/assets/*.woff2`, `*.woff`). The SIL Open Font License 1.1 allows bundling with software and requires keeping the copyright and license with the fonts; each npm package ships its `LICENSE` (Inter; Sora: "Copyright 2019 The Sora Project Authors"; IBM Plex Mono: "Copyright 2017 IBM Corp."), verified in the package files on 15 Nov 2026. The site no longer loads anything from Google Fonts.
- Python `pandas`, `numpy`, `openpyxl` are used only by the offline data scripts; versions below are the ones on the build machine.
- No GPL/AGPL/LGPL dependency was found. Open question for a human: none blocking.

## Frontend (npm) — shipped in the built site

| Package | License | Repository |
|---|---|---|
| `@fontsource-variable/inter@5.3.0` | OFL-1.1 | https://github.com/fontsource/font-files |
| `@fontsource/ibm-plex-mono@5.3.0` | OFL-1.1 | https://github.com/fontsource/font-files |
| `@fontsource/sora@5.3.0` | OFL-1.1 | https://github.com/fontsource/font-files |
| `@types/prop-types@15.7.15` | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `@types/react@18.3.31` | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `csstype@3.2.3` | MIT | https://github.com/frenic/csstype |
| `js-tokens@4.0.0` | MIT | https://github.com/lydell/js-tokens |
| `loose-envify@1.4.0` | MIT | https://github.com/zertosh/loose-envify |
| `lucide-react@1.73.0` | ISC | https://github.com/lucide-icons/lucide |
| `react-dom@18.3.1` | MIT | https://github.com/facebook/react |
| `react@18.3.1` | MIT | https://github.com/facebook/react |
| `scheduler@0.23.2` | MIT | https://github.com/facebook/react |

## Frontend (npm) — development and build only

| Package | License |
|---|---|
| `@adobe/css-tools@4.5.0` | MIT |
| `@asamuzakjp/css-color@5.1.11` | MIT |
| `@asamuzakjp/dom-selector@7.1.1` | MIT |
| `@asamuzakjp/generational-cache@1.0.1` | MIT |
| `@asamuzakjp/nwsapi@2.3.9` | MIT |
| `@babel/code-frame@7.29.7` | MIT |
| `@babel/helper-validator-identifier@7.29.7` | MIT |
| `@babel/runtime@7.29.14` | MIT |
| `@bramus/specificity@2.4.3` | MIT |
| `@csstools/color-helpers@6.1.2` | MIT-0 |
| `@csstools/css-calc@3.4.3` | MIT |
| `@csstools/css-color-parser@4.2.7` | MIT |
| `@csstools/css-parser-algorithms@4.0.2` | MIT |
| `@csstools/css-syntax-patches-for-csstree@1.1.16` | MIT-0 |
| `@csstools/css-tokenizer@4.0.2` | MIT |
| `@exodus/bytes@1.16.0` | MIT |
| `@jridgewell/resolve-uri@3.1.3` | MIT |
| `@jridgewell/sourcemap-codec@1.6.0` | MIT |
| `@jridgewell/trace-mapping@0.3.31` | MIT |
| `@oxc-project/types@0.156.0` | MIT |
| `@rolldown/binding-linux-x64-gnu@1.2.19` | MIT |
| `@rolldown/binding-linux-x64-musl@1.2.19` | MIT |
| `@rolldown/pluginutils@1.1.1` | MIT |
| `@testing-library/dom@10.4.2` | MIT |
| `@testing-library/jest-dom@7.0.1` | MIT |
| `@testing-library/react@16.3.3` | MIT |
| `@types/aria-query@5.0.4` | MIT |
| `@types/chai@5.2.3` | MIT |
| `@types/deep-eql@4.0.2` | MIT |
| `@types/estree@1.0.10` | MIT |
| `@types/react-dom@18.3.7` | MIT |
| `@typescript/typescript-linux-x64@7.0.2` | Apache-2.0 |
| `@vitejs/plugin-react@6.3.0` | MIT |
| `@vitest/mocker@5.1.0` | MIT |
| `@vitest/spy@5.1.0` | MIT |
| `ansi-regex@5.0.1` | MIT |
| `ansi-styles@5.2.0` | MIT |
| `aria-query@5.3.0` | Apache-2.0 |
| `assertion-error@2.0.1` | MIT |
| `bidi-js@1.1.0` | MIT |
| `chai@6.3.0` | MIT |
| `css-tree@3.2.1` | MIT |
| `css.escape@1.5.1` | MIT |
| `data-urls@7.0.0` | MIT |
| `decimal.js@10.6.0` | MIT |
| `dequal@2.0.3` | MIT |
| `detect-libc@2.1.2` | Apache-2.0 |
| `dom-accessibility-api@0.5.16` | MIT |
| `dom-accessibility-api@0.6.3` | MIT |
| `entities@9.0.0` | BSD-2-Clause |
| `es-module-lexer@2.3.2` | MIT |
| `estree-walker@3.0.3` | MIT |
| `expect-type@1.4.0` | Apache-2.0 |
| `fdir@6.5.0` | MIT |
| `html-encoding-sniffer@6.0.0` | MIT |
| `indent-string@4.0.0` | MIT |
| `is-potential-custom-element-name@1.0.1` | MIT |
| `jsdom@29.1.1` | MIT |
| `lightningcss-linux-x64-gnu@1.33.0` | MPL-2.0 |
| `lightningcss-linux-x64-musl@1.33.0` | MPL-2.0 |
| `lightningcss@1.33.0` | MPL-2.0 |
| `lru-cache@11.5.3` | BlueOak-1.0.0 |
| `lz-string@1.5.0` | MIT |
| `magic-string@1.4.5` | MIT |
| `mdn-data@2.27.1` | CC0-1.0 |
| `min-indent@1.0.1` | MIT |
| `nanoid@3.3.20` | MIT |
| `obug@3.0.0` | MIT |
| `parse5@8.1.1` | MIT |
| `picocolors@1.1.1` | ISC |
| `picomatch@4.0.7` | MIT |
| `postcss@8.5.33` | MIT |
| `pretty-format@27.5.1` | MIT |
| `punycode@2.3.1` | MIT |
| `react-is@17.0.2` | MIT |
| `redent@3.0.0` | MIT |
| `require-from-string@2.0.2` | MIT |
| `rolldown@1.2.19` | MIT |
| `saxes@6.0.0` | ISC |
| `source-map-js@1.2.2` | BSD-3-Clause |
| `std-env@4.3.0` | MIT |
| `strip-indent@3.0.0` | MIT |
| `symbol-tree@3.2.4` | MIT |
| `tinybench@6.2.3` | MIT |
| `tinyexec@1.3.1` | MIT |
| `tinyglobby@0.2.17` | MIT |
| `tldts-core@7.5.3` | MIT |
| `tldts@7.5.3` | MIT |
| `tough-cookie@6.1.0` | BSD-3-Clause |
| `tr46@6.0.0` | MIT |
| `typescript@7.0.2` | Apache-2.0 |
| `undici@7.30.2` | MIT |
| `vite@8.3.8` | MIT |
| `vitest@5.1.0` | MIT |
| `w3c-xmlserializer@5.0.0` | MIT |
| `webidl-conversions@8.0.1` | BSD-2-Clause |
| `whatwg-mimetype@5.0.0` | MIT |
| `whatwg-url@16.0.1` | MIT |
| `why-is-node-running@3.2.1` | MIT |
| `xml-name-validator@5.0.0` | Apache-2.0 |
| `xmlchars@2.2.0` | MIT |

## Python — API and tests (`.venv`, `requirements*.txt`)

| Package | Version | License |
|---|---|---|
| annotated-doc | 0.0.6 | MIT |
| annotated-types | 0.8.0 | MIT |
| anyio | 4.16.0 | MIT |
| certifi | 2026.10.23 | Mozilla Public License 2.0 (MPL 2.0) |
| charset-normalizer | 3.5.2 | MIT |
| click | 8.5.1 | BSD-3-Clause |
| fastapi | 0.163.0 | MIT |
| h11 | 0.16.0 | MIT License |
| httpcore | 1.0.9 | BSD-3-Clause |
| httpx | 0.28.1 | BSD License |
| idna | 3.20 | BSD-3-Clause |
| iniconfig | 2.3.1 | MIT |
| opentelemetry-api | 1.45.2 | Apache-2.0 |
| packaging | 26.3 | Apache-2.0 OR BSD-2-Clause |
| pluggy | 1.7.0 | MIT License |
| pydantic | 2.14.3 | MIT |
| pydantic_core | 2.50.4 | MIT |
| Pygments | 2.21.0 | BSD-2-Clause |
| pytest | 9.2.0 | MIT |
| requests | 2.34.2 | Apache Software License |
| starlette | 1.10.0 | BSD-3-Clause |
| typing-inspection | 0.4.5 | MIT |
| typing_extensions | 4.16.0 | PSF-2.0 |
| urllib3 | 2.8.0 | MIT |
| uvicorn | 0.54.0 | BSD-3-Clause |

## Python — offline data scripts (`scripts/build_*.py`)

| Package | Version | License |
|---|---|---|
| et-xmlfile | 1.0.1 | MIT License |
| numpy | 1.26.4 | BSD License |
| openpyxl | 3.1.2 | MIT License |
| pandas | 2.1.4+dfsg | BSD License |
| python-dateutil | 2.8.2 | BSD License; Apache Software License |
| pytz | 2024.1 | MIT License |
| six | 1.16.0 | MIT License |
| tzdata | 2026.3 | Apache-2.0 |

## Not dependencies (listed for completeness)

- Test tools used outside the repository (installed in a temporary folder, never bundled): **axe-core** 4.10.2
  (MPL-2.0, https://github.com/dequelabs/axe-core) for the accessibility audit, **playwright-core** 1.48.2
  (Apache-2.0) to drive Chrome, **Lighthouse** 12.2.1 (Apache-2.0) for the performance and accessibility scores.

- Optional local models (Ollama, only on the demo machine; not distributed): Llama 3.2 3B — *Llama 3.2 Community License* (custom license, per the Hugging Face model card); Qwen3-8B and Qwen3-14B — *apache-2.0* (per their Hugging Face model cards). See `docs/AI_USAGE.md`.
- Ollama is an external program installed separately on the demo machine, not bundled (its license was not re-verified in this session).
