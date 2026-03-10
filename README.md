# Release Regex Ranker

A small static website that:

- fetches `expressions.json` and `regexes.json` live from the GitHub URLs you specified
- scores each pasted filename using the upstream ranking expressions
- shows matched rules and matched named regexes
- adds practical filters for resolution, source, audio, visual tags, codec, service, and flags

## Files

- `index.html` — the whole app, no build step required

## Run it

### Easiest option
Open `index.html` in a browser.

### If your browser blocks `fetch()` from a local file
Serve the folder over a tiny local HTTP server instead:

```bash
cd release-regex-ranker
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Notes

- The app **always** fetches the live JSON from:
  - `https://raw.githubusercontent.com/Vidhin05/Releases-Regex/refs/heads/main/English/expressions.json`
  - `https://raw.githubusercontent.com/Vidhin05/Releases-Regex/refs/heads/main/English/regexes.json`
- SeaDex-specific anime logic is not implemented in this client, so those rules are skipped and shown as skipped.
- Filtering attributes are inferred from filenames plus matched regex names, so they are practical UI tags rather than a 100% clone of the original ranking engine.
