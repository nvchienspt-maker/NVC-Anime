// ======================================
// NVC ANIME - ANIMEVIETSUB CLEAN ENGINE
// ======================================

const BASE_URL = "https://animevietsub.be";

// ================= MANIFEST =================

function getManifest() {
    return JSON.stringify({
        id: "animevietsub_clean",
        name: "AnimeVietsub",
        version: "4.0.0",
        baseUrl: BASE_URL,
        iconUrl: BASE_URL + "/favicon.ico",
        isAdult: false,
        type: "MOVIE"
    });
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

// ================= UTIL =================

function clean(text) {
    return text
        ? text.replace(/<[^>]*>/g, "")
              .replace(/\s+/g, " ")
              .trim()
        : "";
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

// ================= PARSE LIST =================

function parseListResponse(html) {

    let items = [];
    let found = {};

    // Bắt block card phim thay vì quét toàn bộ <a>
    let blockRegex = /<div[^>]*class="[^"]*(?:TPostMv|item|MovieList)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>?/gi;
    let block;

    while ((block = blockRegex.exec(html)) !== null) {

        let content = block[1];

        let linkMatch = content.match(/<a[^>]+href="([^"]+)"[^>]*>/i);
        if (!linkMatch) continue;

        let link = linkMatch[1];
        if (!link.includes("/phim/")) continue;

        let id = link.replace(/^(https?:\/\/[^\/]+)?\//i, "");
        if (found[id]) continue;

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

        found[id] = true;
    }

    return JSON.stringify({
        items: items,
        pagination: {
            currentPage: 1,
            totalPages: 50
        }
    });
}

// ================= PARSE DETAIL =================

function parseMovieDetail(html) {

    let titleMatch =
        html.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
        html.match(/<title>(.*?)<\/title>/i);

    let title = titleMatch ? clean(titleMatch[1]) : "Anime";

    let posterMatch =
        html.match(/property="og:image" content="([^"]+)"/i);

    let poster = posterMatch ? posterMatch[1] : "";

    let servers = [];
    let serverIndex = 1;

    // Bắt nhiều dạng server
    let serverRegex =
        /<div[^>]*class="[^"]*(?:server|Server|episode-list|list-server)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>?/gi;

    let serverMatch;

    while ((serverMatch = serverRegex.exec(html)) !== null) {

        let block = serverMatch[1];
        let episodes = [];

        let epRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
        let epMatch;

        while ((epMatch = epRegex.exec(block)) !== null) {

            let epUrl = epMatch[1];
            let epName = clean(epMatch[2]);

            if (!epUrl.includes("/phim/")) continue;

            episodes.push({
                id: epUrl.replace(/^(https?:\/\/[^\/]+)?\//i, ""),
                name: "Tập " + epName.replace(/tập\s*/i, ""),
                slug: epUrl
            });
        }

        if (episodes.length > 0) {
            servers.push({
                name: "Server " + serverIndex,
                episodes: episodes
            });
            serverIndex++;
        }
    }

    // Fallback nếu site đổi cấu trúc
    if (servers.length === 0) {

        let fallbackRegex =
            /<a[^>]+href=["']([^"']*tap-[^"']+)["'][^>]*>(.*?)<\/a>/gi;

        let eps = [];
        let m;

        while ((m = fallbackRegex.exec(html)) !== null) {
            eps.push({
                id: m[1].replace(/^(https?:\/\/[^\/]+)?\//i, ""),
                name: "Tập " + clean(m[2]),
                slug: m[1]
            });
        }

        if (eps.length > 0) {
            servers.push({
                name: "Server 1",
                episodes: eps
            });
        }
    }

    return JSON.stringify({
        title: title,
        posterUrl: poster,
        backdropUrl: poster,
        description: "",
        servers: servers
    });
}

// ================= STREAM ENGINE =================

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

    // 6️⃣ Nếu chưa có video → bắt iframe để Flutter follow
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
