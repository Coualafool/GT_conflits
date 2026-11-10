# TARS workspace — single centralized location (policy 2026-11-10)

**Rule:** all GT_conflits work lives in this repository. On the Windows machine (TARS),
the ONLY folder used for GT_conflits is the repo checkout itself: **`D:\GT_conflits`**.
(Repo: https://github.com/Coualafool/GT_conflits, branch `main`.)
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
ssh khadi@192.168.129.177 "cd D:\GT_conflits; & 'C:\Users\khadi\AppData\Local\hermes\tools\git-2.53.0+3-win32-x64\bin\git.exe' pull --ff-only"
ssh khadi@192.168.129.177 "powershell -ExecutionPolicy Bypass -File D:\GT_conflits\scripts\tars_run_verifs.ps1"
```

**Git transport both ways.** Pushing from TARS to GitHub over HTTPS fails inside a
non-interactive ssh session (Git Credential Manager cannot prompt:
`could not read Username for 'https://github.com'`). When TARS has local commits to
hand off (artifacts, logs), pull them from the Linux side over git-over-ssh instead —
this is still pure git transport:

```bash
git fetch win:D:/GT_conflits main && git merge --ff-only FETCH_HEAD && git push
```

(use the `win` host alias; scp of any kind remains forbidden).

`tars_run_verifs.ps1` starts `scripts/tars_serve.mjs` **in the same session** (Windows
sshd kills detached children when the session closes, so a pre-started server dies),
runs every harness, stops the server. Screenshots land in `D:\GT_conflits\artifacts\`;
pull them back with scp for vision QC.

## Harness inventory

| script | covers | checks |
|---|---|---|
| `scripts/verif_poc_A.mjs` | `interne/poc-timeline/poc-A-niveaux.html` (PoC frise) | 13 |
| `scripts/verif_navigateur.mjs` | `chapitres/chapitre-2-espace.html` (kit ch2) | 12 |
| `scripts/verif_variantes.mjs` | les 3 variantes de frise (`variante-A/B/C…html`) | 19 |
| `scripts/verif_perspectives.mjs` | les 3 vues « trois récits » (`perspective-D/E/F…html` + `poc-perspectives.js`) | 14 |
| `scripts/tars_run_verifs.ps1` | runs server + all harnesses, one shot | — |

Both are self-contained: playwright resolves only from this repo's `node_modules`,
output only to `artifacts/`. URLs overridable via `POC_URL` / `KIT_URL`.
