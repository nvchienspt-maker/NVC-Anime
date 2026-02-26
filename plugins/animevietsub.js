// =====================================
// NVC ANIME - ANIMEVIETSUB STABLE CORE
// =====================================

const BASE_URL = "https://animevietsub.be";

// ================= MANIFEST =================

function getManifest() {
    return JSON.stringify({
        id: "animevietsub_stable",
        name: "AnimeVietsub",
        version: "5.0.0",
        baseUrl: BASE_URL,
        iconUrl: BASE_URL + "/favicon.ico",
        type: "MOVIE"
    });
}

// ================= UTIL =================

function clean(t) {
    return t ? t.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
}

function normalizeUrl(u) {
    if (!u) return "";
    u = u.replace(/\\\//g, "/").replace(/&amp;/g, "&");
    if (u.startsWith("//")) u = "https:" + u;
    return u;
}

function isVideo(u) {
    if (!u) return false;
    let l = u.toLowerCase();
    return l.includes(".m3u8") || l.includes(".mp4");
}

// ================= URL =================

function getUrlList(slug, page) {
    if (!slug) slug = "phim-moi";
    if (!page) page = 1;

    if (slug === "phim-moi")
        return `${BASE_URL}/${slug}/trang-${page}.html`;

    return `${BASE_URL}/danh-sach/${slug}/trang-${page}.html`;
}

function getUrlSearch(keyword) {
    return `${BASE_URL}/tim-kiem/${encodeURIComponent(keyword)}/`;
}

function getUrlDetail(slug) {
    if (slug.startsWith("http")) return slug;
    return BASE_URL + "/" + slug.replace(/^\//, "");
}

// ================= PARSE LIST =================

function parseListResponse(html) {

    let items = [];
    let map = {};

    let blockRegex = /<a[^>]+href="([^"]*\/phim\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;

    while ((m = blockRegex.exec(html)) !== null) {

        let link = m[1];
        let content = m[2];

        let id = link.replace(/^(https?:\/\/[^\/]+)?\//i, "");
        if (map[id]) continue;

        let titleMatch =
            content.match(/title="([^"]+)"/i) ||
            content.match(/alt="([^"]+)"/i);

        if (!titleMatch) continue;

        let imgMatch =
            content.match(/src="([^"]+)"/i) ||
            content.match(/data-src="([^"]+)"/i);

        items.push({
            id: id,
            title: clean(titleMatch[1]),
            posterUrl: imgMatch ? normalizeUrl(imgMatch[1]) : "",
            backdropUrl: imgMatch ? normalizeUrl(imgMatch[1]) : "",
            quality: "HD"
        });

        map[id] = true;
    }

    return JSON.stringify({
        items: items,
        pagination: { currentPage: 1, totalPages: 50 }
    });
}

// ================= PARSE DETAIL (FULL EPISODES) =================

function parseMovieDetail(html) {

    let titleMatch =
        html.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
        html.match(/<title>(.*?)<\/title>/i);

    let title = titleMatch ? clean(titleMatch[1]) : "Anime";

    let posterMatch =
        html.match(/property="og:image" content="([^"]+)"/i);

    let poster = posterMatch ? posterMatch[1] : "";

    // 🔥 QUÉT TOÀN BỘ LINK TAP-XX
    let episodeMap = {};
    let epRegex = /href=["']([^"']*\/phim\/[^"']*\/tap-(\d+)[^"']*\.html)["']/gi;
    let m;

    while ((m = epRegex.exec(html)) !== null) {

        let fullUrl = m[1];
        let epNumber = parseInt(m[2]);
        if (!epNumber) continue;

        episodeMap[epNumber] = {
            id: fullUrl.replace(/^(https?:\/\/[^\/]+)?\//i, ""),
            name: "Tập " + epNumber,
            slug: fullUrl
        };
    }

    let numbers = Object.keys(episodeMap)
        .map(n => parseInt(n))
        .sort((a, b) => a - b);

    let episodes = numbers.map(n => episodeMap[n]);

    return JSON.stringify({
        title: title,
        posterUrl: poster,
        backdropUrl: poster,
        description: "",
        servers: [
            {
                name: "Full Server",
                episodes: episodes
            }
        ]
    });
}

// ================= STREAM RESOLVER =================

function parseDetailResponse(html) {

    const headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": BASE_URL,
        "Origin": BASE_URL
    };

    let candidates = [];
    let m;

    // 1️⃣ m3u8 / mp4 trực tiếp
    let directRegex = /(https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/gi;
    while ((m = directRegex.exec(html)) !== null) {
        candidates.push(normalizeUrl(m[1]));
    }

    // 2️⃣ file: "..."
    let fileRegex = /file\s*:\s*["']([^"']+)["']/gi;
    while ((m = fileRegex.exec(html)) !== null) {
        candidates.push(normalizeUrl(m[1]));
    }

    // 3️⃣ source src
    let sourceRegex = /source\s+src=["']([^"']+)["']/gi;
    while ((m = sourceRegex.exec(html)) !== null) {
        candidates.push(normalizeUrl(m[1]));
    }

    // 4️⃣ base64
    let base64Regex = /aHR0c[0-9A-Za-z+/=]+/g;
    while ((m = base64Regex.exec(html)) !== null) {
        try {
            let decoded = atob(m[0]);
            if (decoded.startsWith("http"))
                candidates.push(normalizeUrl(decoded));
        } catch (e) {}
    }

    // 5️⃣ Trả video nếu có
    for (let i = 0; i < candidates.length; i++) {
        if (isVideo(candidates[i])) {
            return JSON.stringify({
                url: candidates[i],
                headers: headers,
                subtitles: []
            });
        }
    }

    // 6️⃣ Nếu chưa có video → follow iframe
    let iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
    while ((m = iframeRegex.exec(html)) !== null) {

        let iframeUrl = normalizeUrl(m[1]);

        return JSON.stringify({
            url: iframeUrl,
            headers: headers,
            subtitles: []
        });
    }

    return "{}";
}
