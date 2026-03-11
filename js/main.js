
const DEFAULT_EXPRESSIONS_URL = "https://raw.githubusercontent.com/Vidhin05/Releases-Regex/refs/heads/main/English/expressions.json";
const DEFAULT_REGEXES_URL = "https://raw.githubusercontent.com/Vidhin05/Releases-Regex/refs/heads/main/English/regexes.json";
const STORAGE_KEYS = {
    expressionsUrl: "releaseRegexRanker.expressionsUrl",
    regexesUrl: "releaseRegexRanker.regexesUrl",
};
const SAMPLE_FILENAMES = [
    "Moonlight.2016.REMUX.1080p.BluRay.AVC.DTS-HD.MA.5.1-iFT.mkv",
    "Alien.Romulus.2024.2160p.UHD.BluRay.REMUX.TrueHD.Atmos.7.1-FraMeSToR.mkv",
    "The.Bear.S03E01.2160p.WEB-DL.DDP5.1.H.265-NTb.mkv",
    "Andor.S02E01.2160p.DSNP.WEB-DL.DDP5.1.Atmos.H.265-FLUX.mkv",
    "Blade.Runner.1982.Final.Cut.2160p.UHD.BluRay.HDR10.HEVC.DTS-HD.MA.5.1-CtrlHD.mkv",
    "Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.DV.HDR.TrueHD.Atmos.7.1-BLURANiUM.mkv",
    "Spirited.Away.2001.1080p.BluRay.x264.DTS-WiKi.mkv",
    "The.Last.of.Us.S01E01.1080p.BluRay.x264.DTS-HD.MA.5.1-CtrlHD.mkv",
    "The.Substance.2024.1080p.WEB-DL.DDP5.1.H264-SiC.mkv",
    "Poor.Things.2023.1080p.BluRay.x264.DTS-HD.MA.7.1-HiFi.mkv"
];

const state = {
    rulesLoaded: false,
    expressions: [],
    regexGroups: new Map(),
    analysed: [],
    filtered: [],
    facets: {},
    filterSelections: {},
    unsupportedHelpers: new Set(),
};

const els = {
    filenameInput: document.getElementById("filenameInput"),
    modeSelect: document.getElementById("modeSelect"),
    languageSelect: document.getElementById("languageSelect"),
    expressionsUrlInput: document.getElementById("expressionsUrlInput"),
    regexesUrlInput: document.getElementById("regexesUrlInput"),
    resetUrlsBtn: document.getElementById("resetUrlsBtn"),
    analyseBtn: document.getElementById("analyseBtn"),
    sampleBtn: document.getElementById("sampleBtn"),
    clearBtn: document.getElementById("clearBtn"),
    loadStatus: document.getElementById("loadStatus"),
    dynamicFilters: document.getElementById("dynamicFilters"),
    results: document.getElementById("results"),
    resultsMeta: document.getElementById("resultsMeta"),
    stats: document.getElementById("stats"),
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect"),
    minScoreInput: document.getElementById("minScoreInput"),
    selectAllFiltersBtn: document.getElementById("selectAllFiltersBtn"),
    clearFiltersBtn: document.getElementById("clearFiltersBtn"),
    activeFilterCount: document.getElementById("activeFilterCount"),
};

const FACET_ORDER = [
    ["queryType", "Detected type"],
    ["resolution", "Resolution"],
    ["source", "Source"],
    ["audio", "Audio"],
    ["visual", "Visual"],
    ["codec", "Codec"],
    ["service", "Service"],
    ["flags", "Flags"],
];

const SOURCE_WEIGHT = {
    "REMUX": 8,
    "BluRay": 7,
    "WEB-DL": 6,
    "WEBRip": 5,
    "HDTV": 4,
    "DVD": 3,
    "CAM/TS": 1,
    "Other": 0,
};

const RESOLUTION_WEIGHT = {
    "4320p": 5,
    "2160p": 4,
    "1440p": 3,
    "1080p": 2,
    "720p": 1,
    "576p": 0,
    "480p": -1,
    "Unknown": -2,
};

function normaliseUrl(value, fallback) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return fallback;
    return trimmed;
}

function getConfiguredRuleUrls() {
    return {
    expressionsUrl: normaliseUrl(els.expressionsUrlInput?.value, DEFAULT_EXPRESSIONS_URL),
    regexesUrl: normaliseUrl(els.regexesUrlInput?.value, DEFAULT_REGEXES_URL),
    };
}

function persistRuleUrls() {
    const { expressionsUrl, regexesUrl } = getConfiguredRuleUrls();
    localStorage.setItem(STORAGE_KEYS.expressionsUrl, expressionsUrl);
    localStorage.setItem(STORAGE_KEYS.regexesUrl, regexesUrl);
}

function loadSavedRuleUrls() {
    const savedExpressionsUrl = localStorage.getItem(STORAGE_KEYS.expressionsUrl);
    const savedRegexesUrl = localStorage.getItem(STORAGE_KEYS.regexesUrl);
    els.expressionsUrlInput.value = savedExpressionsUrl || DEFAULT_EXPRESSIONS_URL;
    els.regexesUrlInput.value = savedRegexesUrl || DEFAULT_REGEXES_URL;
}

function resetRuleUrlsToDefaults() {
    els.expressionsUrlInput.value = DEFAULT_EXPRESSIONS_URL;
    els.regexesUrlInput.value = DEFAULT_REGEXES_URL;
    persistRuleUrls();
}

function escapeHtml(value) {
    return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function uniq(values) {
    return [...new Set(values.filter(Boolean))];
}

function canonicaliseAudio(tag) {
    const t = String(tag).toUpperCase().replaceAll(" ", "");
    if (t.includes("TRUEHD") && t.includes("ATMOS")) return "TrueHD Atmos";
    if ((t.includes("DD+") || t.includes("DDP")) && t.includes("ATMOS")) return "DD+ Atmos";
    if (t === "ATMOS") return "Atmos";
    if (t.includes("DTS:X") || t.includes("DTSX")) return "DTS:X";
    if (t.includes("DTS-HDMA") || t.includes("DTSHDMA")) return "DTS-HD MA";
    if (t.includes("DTS-HD") || t.includes("DTSHD")) return "DTS-HD";
    if (t.includes("DTS-ES") || t.includes("DTSES")) return "DTS-ES";
    if (t.includes("TRUEHD")) return "TrueHD";
    if (t === "DD+" || t === "DDP" || t.includes("DDP")) return "DD+";
    if (t === "DD") return "DD";
    if (t.includes("FLAC")) return "FLAC";
    if (t.includes("AAC")) return "AAC";
    if (t.includes("OPUS")) return "OPUS";
    if (t.includes("DTS")) return "DTS";
    return tag;
}

function canonicaliseVisual(tag) {
    const t = String(tag).toUpperCase().replaceAll(" ", "");
    if (t === "DV" || t.includes("DOVI")) return "DV";
    if (t.includes("HDR10+")) return "HDR10+";
    if (t.includes("HDR10")) return "HDR10";
    if (t.includes("HDR")) return "HDR";
    if (t.includes("SDR")) return "SDR";
    return tag;
}

function parseRegexLiteral(input) {
    if (typeof input !== "string" || !input.startsWith("/")) {
    return null;
    }
    const lastSlash = input.lastIndexOf("/");
    if (lastSlash <= 0) return null;
    const body = input.slice(1, lastSlash);
    const flags = input.slice(lastSlash + 1);
    try {
    return new RegExp(body, flags);
    } catch (error) {
    console.warn("Failed to parse regex", input, error);
    return null;
    }
}

function extractCommentLabels(expression) {
    return [...String(expression).matchAll(/\/\*([^*]+)\*\//g)]
    .map(match => match[1].trim())
    .filter(Boolean);
}

function humanRuleLabel(expression) {
    const labels = extractCommentLabels(expression)
    .map(label => label.replace(/^#/, "").trim())
    .filter(Boolean);
    if (!labels.length) return "Unnamed rule";
    return labels[labels.length - 1];
}

function translateExpression(expression) {
    let text = String(expression);
    text = text.replace(/\/\*.*?\*\//gs, "");
    text = text.replaceAll(" and ", " && ");
    text = text.replaceAll(" or ", " || ");
    text = text.replace(/\bstreams\b/g, "true");
    text = text.replace(/\bisAnime\b/g, "ctx.isAnime");
    text = text.replace(/\boriginalLanguage\b/g, "ctx.originalLanguage");
    text = text.replace(/\bqueryType\b/g, "ctx.queryType");
    text = text.replaceAll("[]", "false");
    return text.trim();
}

function compileExpression(item) {
    const translated = translateExpression(item.expression);
    const label = humanRuleLabel(item.expression);
    const comments = extractCommentLabels(item.expression);
    const unsupported = [];
    if (translated.includes("seadex(")) unsupported.push("seadex");
    try {
    const fn = new Function(
        "ctx",
        "helpers",
        `const { regexMatched, negate, merge, resolution, audioTag, visualTag, releaseGroup, quality, seasonPack, language, encode } = helpers;
        return Boolean(${translated});`
    );
    return {
        raw: item.expression,
        enabled: Boolean(item.enabled),
        score: Number(item.score) || 0,
        label,
        comments,
        unsupported,
        fn,
    };
    } catch (error) {
    console.warn("Failed to compile expression:", item.expression, error);
    return {
        raw: item.expression,
        enabled: false,
        score: Number(item.score) || 0,
        label,
        comments,
        unsupported: [...unsupported, "compileError"],
        fn: () => false,
    };
    }
}

function isSeriesFilename(filename) {
    return /(?:^|[.\s_-])S\d{1,2}(?:E\d{1,3}|[.\s_-]?COMPLETE\b)|(?:^|[.\s_-])\d{1,2}x\d{1,3}(?:[.\s_-]|$)|Season[.\s_-]?\d{1,2}|Episode[.\s_-]?\d{1,3}/i.test(filename);
}

function detectResolution(filename) {
    const upper = filename.toUpperCase();
    if (/\b4320P\b/.test(upper)) return "4320p";
    if (/\b2160P\b|\b4K\b|\bUHD\b/.test(upper)) return "2160p";
    if (/\b1440P\b|\b2K\b/.test(upper)) return "1440p";
    if (/\b1080P\b/.test(upper)) return "1080p";
    if (/\b720P\b/.test(upper)) return "720p";
    if (/\b576P\b/.test(upper)) return "576p";
    if (/\b480P\b/.test(upper)) return "480p";
    return "Unknown";
}

function detectSource(filename) {
    const upper = filename.toUpperCase();
    if (/REMUX/.test(upper)) return "REMUX";
    if (/BLURAY|BLU-RAY|UHD|BDMUX|HD-?DVD/.test(upper)) return "BluRay";
    if (/WEB[-_. ]?DL|WEBDL|AMZN|NF|DSNP|HMAX|ATVP|MAX\b|WEB[. ](?:AVC|HEVC|X26[45])/.test(upper)) return "WEB-DL";
    if (/WEBRIP|WEB-RIP|WEBMUX/.test(upper)) return "WEBRip";
    if (/HDTV/.test(upper)) return "HDTV";
    if (/DVD|DVDRIP|NTSC|PAL|XVIDVD/.test(upper)) return "DVD";
    if (/CAM|TELESYNC|TS\b/.test(upper)) return "CAM/TS";
    return "Other";
}

function detectCodec(filename) {
    const upper = filename.toUpperCase();
    if (/\bAV1\b/.test(upper)) return "AV1";
    if (/HEVC|H[._ -]?265|X265/.test(upper)) return "HEVC";
    if (/AVC|H[._ -]?264|X264/.test(upper)) return "AVC";
    if (/XVID/.test(upper)) return "XviD";
    return "Unknown";
}

function detectService(filename) {
    const upper = filename.toUpperCase();
    const hits = [];
    const map = [
    ["AMZN", /\bAMZN\b|AMAZON/],
    ["NF", /\bNF\b|NETFLIX/],
    ["DSNP", /\bDSNP\b|DISNEY[+ ]/],
    ["ATVP", /\bATVP\b|APPLE[ .]?TV[+ ]?/],
    ["HMAX", /\bHMAX\b|HBO[ .]?MAX/],
    ["MAX", /\bMAX\b/],
    ["HULU", /\bHULU\b/],
    ["PCOK", /\bPCOK\b|PEACOCK/],
    ["PMTP", /\bPMTP\b|PARAMOUNT/],
    ["STAN", /\bSTAN\b/],
    ["CR", /\bCR\b|CRUNCHYROLL/],
    ["FUNI", /\bFUNI\b|FUNIMATION/],
    ["ITUNES", /ITUNES/],
    ["GOOGLEPLAY", /GOOGLE[ .]?PLAY/],
    ];
    for (const [label, regex] of map) {
    if (regex.test(upper)) hits.push(label);
    }
    return hits.length ? hits : ["Unknown"];
}

function detectAudioTags(filename) {
    const upper = filename.toUpperCase();
    const tags = new Set();

    const hasTrueHD = /TRUEHD/.test(upper);
    const hasAtmos = /ATMOS/.test(upper);
    const hasDDPlus = /DDP|\bDD\+\b/.test(upper);

    if (hasTrueHD && hasAtmos) tags.add("TrueHD Atmos");
    if (hasDDPlus && hasAtmos) tags.add("DD+ Atmos");
    if (hasAtmos) tags.add("Atmos");
    if (hasTrueHD) tags.add("TrueHD");
    if (/DTS[ ._-]?X/.test(upper)) tags.add("DTS:X");
    if (/DTS[- ._]?HD[- ._]?MA/.test(upper)) tags.add("DTS-HD MA");
    if (/DTS[- ._]?HD(?![- ._]?MA)/.test(upper)) tags.add("DTS-HD");
    if (/DTS[- ._]?ES/.test(upper)) tags.add("DTS-ES");
    if (/\bDTS\b/.test(upper)) tags.add("DTS");
    if (/FLAC/.test(upper)) tags.add("FLAC");
    if (/AAC/.test(upper)) tags.add("AAC");
    if (hasDDPlus) tags.add("DD+");
    if (/\bDD\b(?!P|\+)/.test(upper) || /AC-?3/.test(upper)) tags.add("DD");
    if (/OPUS/.test(upper)) tags.add("OPUS");

    return tags.size ? [...tags] : ["Unknown"];
}

function detectVisualTags(filename) {
    const upper = filename.toUpperCase();
    const tags = new Set();
    if (/DOVI|\bDV\b/.test(upper)) tags.add("DV");
    if (/HDR10\+/.test(upper)) {
    tags.add("HDR10+");
    tags.add("HDR10");
    tags.add("HDR");
    } else if (/HDR10/.test(upper)) {
    tags.add("HDR10");
    tags.add("HDR");
    } else if (/\bHDR\b/.test(upper)) {
    tags.add("HDR");
    }
    if (/SDR/.test(upper)) tags.add("SDR");
    return tags.size ? [...tags] : ["Unknown"];
}

function detectFlags(filename) {
    const upper = filename.toUpperCase();
    const flags = [];
    if (/REMUX/.test(upper)) flags.push("Remux");
    if (/HYBRID/.test(upper)) flags.push("Hybrid");
    if (/INTERNAL/.test(upper)) flags.push("Internal");
    if (/REPACK/.test(upper)) flags.push("Repack");
    if (/PROPER/.test(upper)) flags.push("Proper");
    if (/SEASON[ ._-]?PACK|COMPLETE|MULTI[ ._-]?SEASON/.test(upper)) flags.push("Season Pack");
    if (/DUAL[ ._-]?AUDIO/.test(upper)) flags.push("Dual Audio");
    if (/IMAX/.test(upper)) flags.push("IMAX");
    if (/OPEN[ ._-]?MATTE/.test(upper)) flags.push("Open Matte");
    if (/EXTENDED/.test(upper)) flags.push("Extended");
    if (/DIRECTOR'?S[ ._-]?CUT/.test(upper)) flags.push("Director's Cut");
    return flags.length ? flags : ["None"];
}

function detectReleaseGroupInfo(filename) {
    const clean = String(filename || "").replace(/\.[A-Za-z0-9]{2,4}$/i, "");
    const lastDashIndex = clean.lastIndexOf("-");
    if (lastDashIndex === -1) {
    return { name: "Unknown", hasGroup: false };
    }

    const candidate = clean.slice(lastDashIndex + 1).trim();
    const plausibleGroup = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(candidate);
    const blockedTechnicalTokens = new Set([
    "WEB", "DL", "WEBDL", "WEBRIP", "BLURAY", "BLU", "RAY", "UHD", "REMUX", "HDR", "HDR10", "HDR10+",
    "DV", "DOVI", "HEVC", "AVC", "X265", "X264", "H265", "H264", "AAC", "DD", "DDP", "ATMOS", "TRUEHD",
    "DTS", "MA", "MKV", "MP4"
    ]);
    const upperCandidate = candidate.toUpperCase();
    if (!plausibleGroup || blockedTechnicalTokens.has(upperCandidate)) {
    return { name: "Unknown", hasGroup: false };
    }

    return {
    name: candidate,
    hasGroup: true,
    };
}

function detectQualityTokens(filename) {
    const source = detectSource(filename);
    const tags = new Set();
    if (source === "WEB-DL") tags.add("WEBDL");
    if (source === "WEBRip") tags.add("WEBRIP");
    if (source === "BluRay" || source === "REMUX") tags.add("BluRay");
    if (source === "DVD") tags.add("DVDRip");
    return tags;
}

function containsTerm(filename, term) {
    const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[._\\-\\s\\[\\]()])${escaped}([._\\-\\s\\[\\]()]|$)`, "i");
    return regex.test(filename);
}

function getFilenameContext(filename, selectedMode, languageValue) {
    const detectedSeries = isSeriesFilename(filename);
    const baseType =
    selectedMode === "auto"
        ? (detectedSeries ? "series" : "movie")
        : selectedMode.replace("anime.", "");

    const isAnime = selectedMode.startsWith("anime.");
    const queryType = isAnime ? `anime.${baseType}` : baseType;
    const resolution = detectResolution(filename);
    const source = detectSource(filename);
    const codec = detectCodec(filename);
    const service = detectService(filename);
    const audio = detectAudioTags(filename);
    const visual = detectVisualTags(filename);
    const flags = detectFlags(filename);
    const qualityTags = detectQualityTokens(filename);
    const releaseGroupInfo = detectReleaseGroupInfo(filename);
    const originalLanguage = languageValue === "Japanese" || languageValue === "Other" ? "Other" : languageValue;

    return {
    filename,
    queryType,
    isAnime,
    originalLanguage,
    detected: {
        resolution,
        source,
        codec,
        service,
        audio,
        visual,
        flags,
        qualityTags,
        releaseGroup: releaseGroupInfo.name,
        hasReleaseGroup: releaseGroupInfo.hasGroup,
        seasonPack: flags.includes("Season Pack"),
        searchBlob: [
        filename,
        queryType,
        resolution,
        source,
        codec,
        ...service,
        ...audio,
        ...visual,
        ...flags,
        releaseGroupInfo.name,
        ].join(" ").toLowerCase(),
    },
    };
}

function createHelpers(ctx) {
    const any = value => Boolean(value);

    return {
    regexMatched(base, ...names) {
        return any(base) && names.some(name => ctx.regexMatchNames.has(name));
    },
    negate(a, b) {
        return any(b) && !any(a);
    },
    merge(...values) {
        return values.some(any);
    },
    resolution(base, ...values) {
        return any(base) && values.some(value => ctx.detected.resolution === value);
    },
    audioTag(base, ...values) {
        return any(base) && values.some(value => ctx.detected.audio.includes(canonicaliseAudio(value)));
    },
    visualTag(base, ...values) {
        return any(base) && values.some(value => ctx.detected.visual.includes(canonicaliseVisual(value)));
    },
    releaseGroup(base, ...values) {
        if (!any(base)) return false;
        if (!values.length) return ctx.detected.hasReleaseGroup;
        return values.some(value => {
        if (String(value).toUpperCase() === "HYBRID") return ctx.detected.flags.includes("Hybrid");
        return ctx.detected.releaseGroup.toUpperCase() === String(value).toUpperCase();
        });
    },
    quality(base, ...values) {
        return any(base) && values.some(value => ctx.detected.qualityTags.has(String(value).toUpperCase()));
    },
    seasonPack(base) {
        return any(base) && ctx.detected.seasonPack;
    },
    language(base, ...values) {
        return any(base) && values.some(value => {
        if (String(value).toLowerCase() === "dual audio") return ctx.detected.flags.includes("Dual Audio");
        return containsTerm(ctx.filename, value);
        });
    },
    encode(base, ...values) {
        return any(base) && values.some(value => {
        const v = String(value).toUpperCase();
        if (v === "HEVC") return ctx.detected.codec === "HEVC";
        return ctx.detected.codec.toUpperCase() === v;
        });
    },
    };
}

function scoreFilename(filename, mode, languageValue) {
    const ctx = getFilenameContext(filename, mode, languageValue);

    const regexMatchNames = new Set();
    const matchedRegexNames = [];
    for (const [name, regexList] of state.regexGroups.entries()) {
    if (regexList.some(regex => regex.test(filename))) {
        regexMatchNames.add(name);
        matchedRegexNames.push(name);
    }
    }
    ctx.regexMatchNames = regexMatchNames;

    let total = 0;
    const matchedRules = [];
    const unsupportedRules = [];
    const helpers = createHelpers(ctx);

    for (const expression of state.expressions) {
    if (!expression.enabled) continue;
    if (expression.unsupported.includes("seadex")) {
        if (ctx.isAnime) unsupportedRules.push(expression.label);
        continue;
    }
    let matched = false;
    try {
        matched = Boolean(expression.fn(ctx, helpers));
    } catch (error) {
        console.warn("Expression evaluation failed", expression, error);
    }
    if (matched) {
        total += expression.score;
        matchedRules.push({
        label: expression.label,
        score: expression.score,
        comments: expression.comments,
        });
    }
    }

    const attributeTags = uniq([
    ctx.queryType,
    ctx.detected.resolution,
    ctx.detected.source,
    ctx.detected.codec,
    ...ctx.detected.audio,
    ...ctx.detected.visual,
    ...ctx.detected.flags,
    ...ctx.detected.service,
    ]);

    return {
    filename,
    score: total,
    queryType: ctx.queryType,
    detected: ctx.detected,
    matchedRules,
    matchedRegexNames: matchedRegexNames.sort((a, b) => a.localeCompare(b)),
    attributeTags,
    unsupportedRules: uniq(unsupportedRules),
    };
}

function buildFacets(results) {
    const facets = {
    queryType: new Map(),
    resolution: new Map(),
    source: new Map(),
    audio: new Map(),
    visual: new Map(),
    codec: new Map(),
    service: new Map(),
    flags: new Map(),
    };

    for (const item of results) {
    const values = {
        queryType: [item.queryType],
        resolution: [item.detected.resolution],
        source: [item.detected.source],
        audio: item.detected.audio,
        visual: item.detected.visual,
        codec: [item.detected.codec],
        service: item.detected.service,
        flags: item.detected.flags,
    };

    for (const [facet, facetValues] of Object.entries(values)) {
        for (const value of uniq(facetValues)) {
        facets[facet].set(value, (facets[facet].get(value) || 0) + 1);
        }
    }
    }

    return facets;
}

function ensureFilterSelections(facets) {
    for (const facet of Object.keys(facets)) {
    if (!(facet in state.filterSelections)) {
        state.filterSelections[facet] = new Set();
    }
    }
}

function renderFacets() {
    ensureFilterSelections(state.facets);
    const html = FACET_ORDER.map(([facetKey, title]) => {
    const options = [...(state.facets[facetKey] || new Map()).entries()]
        .sort((a, b) => {
        if (facetKey === "resolution") return (RESOLUTION_WEIGHT[b[0]] ?? -99) - (RESOLUTION_WEIGHT[a[0]] ?? -99);
        return b[1] - a[1] || a[0].localeCompare(b[0]);
        });

    if (!options.length) return "";

    return `
        <section class="filter-section">
        <div class="filter-title">
            <h4>${escapeHtml(title)}</h4>
            <span class="mini">${options.length} option${options.length === 1 ? "" : "s"}</span>
        </div>
        <div class="checkbox-list">
            ${options.map(([value, count]) => {
            const checked = state.filterSelections[facetKey].has(value) ? "checked" : "";
            const id = `facet-${facetKey}-${value.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
            return `
                <div class="option">
                <label for="${escapeHtml(id)}">
                    <input type="checkbox" id="${escapeHtml(id)}" data-facet="${escapeHtml(facetKey)}" data-value="${escapeHtml(value)}" ${checked}>
                    <span>${escapeHtml(value)}</span>
                </label>
                <span class="count">${count}</span>
                </div>
            `;
            }).join("")}
        </div>
        </section>
    `;
    }).join("");

    els.dynamicFilters.innerHTML = html || "";

    els.dynamicFilters.querySelectorAll('input[type="checkbox"][data-facet]').forEach(input => {
    input.addEventListener("change", () => {
        const facet = input.dataset.facet;
        const value = input.dataset.value;
        if (!facet || !value) return;
        if (input.checked) {
        state.filterSelections[facet].add(value);
        } else {
        state.filterSelections[facet].delete(value);
        }
        applyFiltersAndRender();
    });
    });

    updateActiveFilterCount();
}

function updateActiveFilterCount() {
    let count = 0;
    for (const set of Object.values(state.filterSelections)) {
    count += set.size;
    }
    els.activeFilterCount.textContent = `${count} filter${count === 1 ? "" : "s"} active`;
}

function filterMatch(item, facetKey) {
    const selected = state.filterSelections[facetKey];
    if (!selected || selected.size === 0) return true;

    const values = {
    queryType: [item.queryType],
    resolution: [item.detected.resolution],
    source: [item.detected.source],
    audio: item.detected.audio,
    visual: item.detected.visual,
    codec: [item.detected.codec],
    service: item.detected.service,
    flags: item.detected.flags,
    }[facetKey] || [];

    return values.some(value => selected.has(value));
}

function sortResults(items) {
    const sortBy = els.sortSelect.value;

    return [...items].sort((a, b) => {
    switch (sortBy) {
        case "score-asc":
        return a.score - b.score || a.filename.localeCompare(b.filename);
        case "filename-asc":
        return a.filename.localeCompare(b.filename);
        case "filename-desc":
        return b.filename.localeCompare(a.filename);
        case "rules-desc":
        return b.matchedRules.length - a.matchedRules.length || b.score - a.score;
        case "resolution-desc":
        return (RESOLUTION_WEIGHT[b.detected.resolution] ?? -99) - (RESOLUTION_WEIGHT[a.detected.resolution] ?? -99)
            || b.score - a.score;
        case "score-desc":
        default:
        return b.score - a.score || b.matchedRules.length - a.matchedRules.length || a.filename.localeCompare(b.filename);
    }
    });
}

function renderStats(results) {
    if (!results.length) {
    els.stats.innerHTML = "";
    return;
    }

    const scores = results.map(item => item.score);
    const maxScore = Math.max(...scores);
    const avgScore = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
    const totalRules = results.reduce((sum, item) => sum + item.matchedRules.length, 0);
    const topSources = Object.entries(results.reduce((acc, item) => {
    acc[item.detected.source] = (acc[item.detected.source] || 0) + 1;
    return acc;
    }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    const cards = [
    ["Visible releases", results.length],
    ["Top score", maxScore],
    ["Average score", avgScore],
    ["Top source", topSources],
    ];

    els.stats.innerHTML = cards.map(([label, value]) => `
    <div class="stat">
        <div class="k">${escapeHtml(label)}</div>
        <div class="v">${escapeHtml(value)}</div>
    </div>
    `).join("");
}

function renderResults(results) {
    if (!results.length) {
    els.results.innerHTML = `<div class="empty">No filenames match the current search and filters.</div>`;
    return;
    }

    els.results.innerHTML = results.map(item => {
    const mainChips = uniq([
        item.queryType,
        item.detected.resolution,
        item.detected.source,
        item.detected.codec,
        ...item.detected.visual.filter(v => v !== "Unknown"),
        ...item.detected.audio.filter(v => v !== "Unknown").slice(0, 2),
        item.detected.releaseGroup !== "Unknown" ? `Group: ${item.detected.releaseGroup}` : "",
    ]).slice(0, 9);

    const scorePrefix = item.score > 0 ? "+" : "";
    return `
        <article class="result-card">
        <div class="result-main">
            <div class="result-top">
            <div>
                <div class="filename">${escapeHtml(item.filename)}</div>
                <div class="meta-grid" style="margin-top: 12px;">
                ${mainChips.map(chip => `<span class="tag">${escapeHtml(chip)}</span>`).join("")}
                </div>
            </div>
            <div class="score-badge">
                <div class="score-label">Score</div>
                <div class="score-value">${escapeHtml(scorePrefix + item.score)}</div>
            </div>
            </div>

            <div class="meta-grid">
            ${item.matchedRules.slice(0, 8).map(rule => `<span class="tag">${escapeHtml(rule.label)}${rule.score ? ` (${rule.score > 0 ? "+" : ""}${rule.score})` : ""}</span>`).join("")}
            ${item.matchedRules.length > 8 ? `<span class="tag muted">+${item.matchedRules.length - 8} more rules</span>` : ""}
            </div>
        </div>

        <details class="details">
            <summary>Details</summary>
            <div class="details-body">
            <div class="detail-block">
                <h5>Detected attributes</h5>
                <div class="chip-wrap">
                ${[
                    `Type: ${item.queryType}`,
                    `Resolution: ${item.detected.resolution}`,
                    `Source: ${item.detected.source}`,
                    `Codec: ${item.detected.codec}`,
                    `Release group: ${item.detected.releaseGroup}`,
                    ...item.detected.visual.map(v => `Visual: ${v}`),
                    ...item.detected.audio.map(v => `Audio: ${v}`),
                    ...item.detected.service.map(v => `Service: ${v}`),
                    ...item.detected.flags.map(v => `Flag: ${v}`),
                ].map(value => `<span class="chip">${escapeHtml(value)}</span>`).join("")}
                </div>
            </div>

            <div class="detail-block">
                <h5>Matched scoring rules (${item.matchedRules.length})</h5>
                <div class="chip-wrap">
                ${item.matchedRules.length
                    ? item.matchedRules
                        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
                        .map(rule => `<span class="chip rule">${escapeHtml(rule.label)} <span class="muted">${rule.score > 0 ? "+" : ""}${rule.score}</span></span>`)
                        .join("")
                    : `<span class="muted">No scoring rules matched.</span>`}
                </div>
            </div>

            <div class="detail-block">
                <h5>Matched regex names (${item.matchedRegexNames.length})</h5>
                <div class="chip-wrap">
                ${item.matchedRegexNames.length
                    ? item.matchedRegexNames.map(name => `<span class="chip">${escapeHtml(name)}</span>`).join("")
                    : `<span class="muted">No named regexes matched directly.</span>`}
                </div>
            </div>

            ${item.unsupportedRules.length ? `
                <div class="detail-block">
                <h5>Skipped because this client does not implement SeaDex</h5>
                <div class="chip-wrap">
                    ${item.unsupportedRules.map(name => `<span class="chip">${escapeHtml(name)}</span>`).join("")}
                </div>
                </div>
            ` : ""}
            </div>
        </details>
        </article>
    `;
    }).join("");
}

function applyFiltersAndRender() {
    const needle = els.searchInput.value.trim().toLowerCase();
    const minScore = Number(els.minScoreInput.value || "-Infinity");

    const filtered = state.analysed.filter(item => {
    if (!Number.isNaN(minScore) && item.score < minScore) return false;
    if (needle && !item.detected.searchBlob.includes(needle)) return false;
    return FACET_ORDER.every(([facetKey]) => filterMatch(item, facetKey));
    });

    state.filtered = sortResults(filtered);
    renderStats(state.filtered);
    renderResults(state.filtered);
    updateActiveFilterCount();

    if (!state.analysed.length) {
    els.resultsMeta.textContent = "Paste some filenames and click Analyse.";
    els.resultsMeta.className = "status";
    return;
    }

    const visible = state.filtered.length;
    const total = state.analysed.length;
    const unsupportedCount = state.analysed.filter(item => item.unsupportedRules.length).length;
    els.resultsMeta.textContent =
    `${visible} of ${total} release${total === 1 ? "" : "s"} visible.` +
    (unsupportedCount ? ` ${unsupportedCount} item${unsupportedCount === 1 ? "" : "s"} had SeaDex-dependent rules skipped.` : "");
    els.resultsMeta.className = unsupportedCount ? "status warn" : "status good";
}

async function loadRules() {
    const { expressionsUrl, regexesUrl } = getConfiguredRuleUrls();
    persistRuleUrls();

    els.loadStatus.textContent = "Loading expressions and regexes…";
    els.loadStatus.className = "status";

    const [expressionsResponse, regexesResponse] = await Promise.all([
    fetch(expressionsUrl, { cache: "no-store" }),
    fetch(regexesUrl, { cache: "no-store" }),
    ]);

    if (!expressionsResponse.ok || !regexesResponse.ok) {
    throw new Error(`Failed to fetch rules: ${expressionsResponse.status} / ${regexesResponse.status}`);
    }

    const [expressionsJson, regexesJson] = await Promise.all([
    expressionsResponse.json(),
    regexesResponse.json(),
    ]);

    if (!Array.isArray(expressionsJson) || !Array.isArray(regexesJson)) {
    throw new Error("The configured URLs did not return the expected JSON arrays.");
    }

    state.expressions = expressionsJson.map(compileExpression);
    state.regexGroups = new Map();

    for (const item of regexesJson) {
    const regex = parseRegexLiteral(item.pattern);
    if (!regex) continue;
    if (!state.regexGroups.has(item.name)) {
        state.regexGroups.set(item.name, []);
    }
    state.regexGroups.get(item.name).push(regex);
    }

    state.rulesLoaded = true;
    const usingDefaultUrls = expressionsUrl === DEFAULT_EXPRESSIONS_URL && regexesUrl === DEFAULT_REGEXES_URL;
    els.loadStatus.textContent =
    `Loaded ${state.expressions.length} expressions and ${state.regexGroups.size} named regex groups from ${usingDefaultUrls ? "the default GitHub URLs" : "your configured URLs"}.`;
    els.loadStatus.className = "status good";
}

async function analyse() {
    const lines = els.filenameInput.value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

    if (!lines.length) {
    els.resultsMeta.textContent = "Please paste at least one filename first.";
    els.resultsMeta.className = "status bad";
    els.results.innerHTML = `<div class="empty">There’s nothing to analyse yet.</div>`;
    els.stats.innerHTML = "";
    return;
    }

    els.analyseBtn.disabled = true;
    els.analyseBtn.textContent = "Analysing…";

    try {
    await loadRules();

    const mode = els.modeSelect.value;
    const languageValue = els.languageSelect.value;

    state.analysed = lines.map(line => scoreFilename(line, mode, languageValue));
    state.facets = buildFacets(state.analysed);
    renderFacets();
    applyFiltersAndRender();
    } catch (error) {
    console.error(error);
    els.loadStatus.textContent = `Couldn’t load the configured JSON: ${error.message}`;
    els.loadStatus.className = "status bad";
    els.resultsMeta.textContent = "Analysis failed.";
    els.resultsMeta.className = "status bad";
    els.results.innerHTML = `<div class="empty">The live rules could not be fetched. Try again, or serve the page over a simple local HTTP server instead of opening it directly from disk.</div>`;
    els.stats.innerHTML = "";
    } finally {
    els.analyseBtn.disabled = false;
    els.analyseBtn.textContent = "Analyse";
    }
}

function clearAll() {
    els.filenameInput.value = "";
    els.searchInput.value = "";
    els.minScoreInput.value = "";
    state.analysed = [];
    state.filtered = [];
    state.facets = {};
    state.filterSelections = {};
    renderFacets();
    renderStats([]);
    els.resultsMeta.textContent = "Paste some filenames and click Analyse.";
    els.resultsMeta.className = "status";
    els.results.innerHTML = "";
    updateActiveFilterCount();
}

els.analyseBtn.addEventListener("click", analyse);
els.sampleBtn.addEventListener("click", () => {
    els.filenameInput.value = SAMPLE_FILENAMES.join("\n");
});
els.clearBtn.addEventListener("click", clearAll);
els.searchInput.addEventListener("input", applyFiltersAndRender);
els.sortSelect.addEventListener("change", applyFiltersAndRender);
els.minScoreInput.addEventListener("input", applyFiltersAndRender);

els.clearFiltersBtn.addEventListener("click", () => {
    for (const key of Object.keys(state.filterSelections)) {
    state.filterSelections[key] = new Set();
    }
    renderFacets();
    applyFiltersAndRender();
});

els.selectAllFiltersBtn.addEventListener("click", () => {
    for (const [facetKey, map] of Object.entries(state.facets)) {
    state.filterSelections[facetKey] = new Set([...map.keys()]);
    }
    renderFacets();
    applyFiltersAndRender();
});

window.addEventListener("DOMContentLoaded", () => {
    loadSavedRuleUrls();
    els.results.innerHTML = `<div class="empty">No results yet. Paste some filenames, then click Analyse.</div>`;
});