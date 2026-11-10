# TARS workspace — single centralized location (policy 2026-11-10)

**Rule:** all GT_conflits work lives in this repository. On the Windows machine (TARS),
the ONLY folder used for GT_conflits is the repo checkout itself: **`D:\GT_conflits`**.
No ad-hoc folders anywhere else, and specifically **nothing on C:** (the former
`C:\gt_check` scratch dir is deleted; the harnesses no longer reach into other
projects' `node_modules`).

## Layout (inside the repo folder on TARS)

```
D:\GT_conflits\            <- git checkout of Peixoto-GT/GT_conflits (main)
  .runtime\node\           <- portable Node 22 (gitignored)
  .runtime\ms-playwright\  <- playwright browser cache, self-contained (gitignored)
  node_modules\            <- playwright 1.64.1 pinned by package.json (gitignored)
  artifacts\               <- harness screenshots / test output (gitignored)
```

`.runtime/`, `node_modules/`, `artifacts/` are gitignored — git state stays clean,
the folder stays self-contained. Edge (`channel: "msedge"`) is used as the browser;
`ms-playwright` cache holds the matching Chromium build.

## One-time setup (TARS)

```powershell
cd D:\GT_conflits
powershell -ExecutionPolicy Bypass -File scripts\tars_setup_runtime.ps1
```

Idempotent. Downloads Node if missing, copies the browser cache into `.runtime\`,
installs the pinned playwright into `node_modules\`. (python is broken on TARS —
never use `python -m http.server`; `scripts/tars_serve.mjs` replaces it.)

## Verification loop (from any machine, here: Otis on Linux)

```bash
ssh khadi@192.168.129.177 "cd D:\GT_conflits; git pull --ff-only"
# start the static server (once per session):
ssh khadi@192.168.129.177 "cd D:\GT_conflits; Start-Process -WindowStyle Hidden -FilePath .runtime\node\node.exe -ArgumentList 'scripts\tars_serve.mjs'"
# run a harness (screenshots land in D:\GT_conflits\artifacts\):
ssh khadi@192.168.129.177 "cd D:\GT_conflits; `$env:PLAYWRIGHT_BROWSERS_PATH='D:\GT_conflits\.runtime\ms-playwright'; .runtime\node\node.exe scripts\verif_poc_A.mjs"
ssh khadi@192.168.129.177 "cd D:\GT_conflits; `$env:PLAYWRIGHT_BROWSERS_PATH='D:\GT_conflits\.runtime\ms-playwright'; .runtime\node\node.exe scripts\verif_navigateur.mjs"
```

Pull screenshots back for vision QC with scp from `D:\GT_conflits\artifacts\`.

## Harness inventory

| script | covers | checks |
|---|---|---|
| `scripts/verif_poc_A.mjs` | `interne/poc-timeline/poc-A-niveaux.html` (PoC frise) | 13 |
| `scripts/verif_navigateur.mjs` | `chapitres/chapitre-2-espace.html` (kit ch2) | 12 |

Both are self-contained: playwright resolves only from this repo's `node_modules`,
output only to `artifacts/`. URLs overridable via `POC_URL` / `KIT_URL`.
