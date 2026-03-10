# Release Regex Ranker

A lightweight **client-side web tool** for analysing and scoring release filenames using the rules from the excellent **Releases-Regex project**.

Paste a list of filenames, click **Analyse**, and the tool will:

* Fetch the live `expressions.json` and `regexes.json`
* Apply the regex rules to each filename
* Compute a **release score**
* Extract useful metadata
* Provide **sortable filters** for exploring the results

The entire application runs **100% in the browser** — no backend, no build step, and no dependencies.

---

## Demo

If hosted with GitHub Pages, you can open the tool directly in your browser.

Example usage:

```
Moonlight.2016.REMUX.1080p.BluRay.AVC.DTS-HD.MA.5.1-iFT.mkv
Alien.Romulus.2024.2160p.UHD.BluRay.REMUX.TrueHD.Atmos.7.1-FraMeSToR.mkv
The.Bear.S03E01.2160p.WEB-DL.DDP5.1.H.265-NTb.mkv
```

The app will detect attributes such as:

* Resolution
* Source
* Audio format
* HDR / Dolby Vision
* Codec
* Streaming service
* Release group
* Flags (Hybrid, Proper, Repack, etc.)

…and compute a score based on the upstream ranking rules.

---

# Features

### Live rule fetching

Rules are fetched directly from GitHub:

```
https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/expressions.json
https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json
```

This means the tool automatically benefits from **upstream improvements**.

---

### Flexible filtering

After analysis, you can filter results by:

* Detected type (movie / series / anime)
* Resolution
* Source
* Audio format
* HDR / Dolby Vision
* Codec
* Streaming service
* Flags

You can also:

* Search filenames
* Filter by minimum score
* Sort by score, resolution, rules matched, or filename

---

### Detailed rule breakdown

Each analysed release shows:

* Total score
* Detected attributes
* Matched regex names
* Individual scoring rules that contributed to the score

This makes it easy to understand **why a release ranked higher or lower**.

---

### Works entirely client-side

All processing happens in the browser.

There is:

* no server
* no tracking
* no data upload

Your filenames never leave your machine.

---

# Installation / Usage

## Option 1 — Use GitHub Pages

1. Upload `index.html` to a repository
2. Enable **GitHub Pages**
3. Open the published site

That's it.

---

## Option 2 — Run locally

Simply open the file:

```
index.html
```

in your browser.

However some browsers restrict `fetch()` when opening files directly from disk.
If that happens, run a simple local server:

### Python

```
python3 -m http.server
```

then open:

```
http://localhost:8000
```

---

# Custom Rule Sources

The tool allows custom JSON URLs for both rule files.

You can override the default sources with any compatible endpoints.

Fields:

```
Expressions JSON URL
Regexes JSON URL
```

The JSON must match the structure used by the Releases-Regex repository.

---

# How scoring works

Each filename is processed in three stages:

### 1. Regex detection

Named regex groups from `regexes.json` are applied.

### 2. Attribute detection

The tool extracts:

* resolution
* source
* codec
* audio formats
* HDR / DV tags
* streaming service
* flags
* release group

### 3. Expression scoring

Each rule from `expressions.json` is compiled into a JavaScript expression.

If the rule evaluates to true:

```
score += rule.score
```

The final score represents the **quality ranking of the release**.

---

# Limitations

This client implements most of the ranking environment but **not everything**.

Currently unsupported:

* SeaDex helper logic used for anime ranking

Rules requiring SeaDex are skipped but clearly shown in the UI.

---

# Example Score Output

Example release:

```
Alien.Romulus.2024.2160p.UHD.BluRay.REMUX.TrueHD.Atmos.7.1-FraMeSToR.mkv
```

Possible attributes:

```
Resolution: 2160p
Source: REMUX
Visual: DV HDR
Audio: TrueHD Atmos
Codec: HEVC
Release group: FraMeSToR
```

Score contributions might include:

```
+5000  TrueHD Atmos
+1700  WEB Tier 1
+1000  Dolby Vision
+500   HDR
+100   4K
```

---

# Credits

Ranking rules are sourced from:

**Releases-Regex**

[https://github.com/Vidhin05/Releases-Regex](https://github.com/Vidhin05/Releases-Regex)

This tool simply provides a **visual interface and client-side evaluation engine** for those rules.

---

# License

Use freely.
No warranty is provided.

---