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

    function clean(t) {
        return t ? t.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
    }

    var titleMatch =
        html.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
        html.match(/<title>(.*?)<\/title>/i);

    var title = titleMatch ? clean(titleMatch[1]) : "Anime";

    var posterMatch =
        html.match(/property="og:image" content="([^"]+)"/i);

    var poster = posterMatch ? posterMatch[1] : "";

    // 🔥 BẮT MOVIE ID
    var idMatch =
        html.match(/data-id=["']?(\d+)["']?/i) ||
        html.match(/movie_id\s*=\s*["']?(\d+)/i) ||
        html.match(/"film_id"\s*:\s*"(\d+)"/i);

    if (!idMatch) {
        return JSON.stringify({
            title: title,
            posterUrl: poster,
            backdropUrl: poster,
            description: "",
            servers: []
        });
    }

    var movieId = idMatch[1];

    return JSON.stringify({
        title: title,
        posterUrl: poster,
        backdropUrl: poster,
        description: "",
        ajaxEpisodeUrl: BASE_URL + "/ajax/episode/list/" + movieId,
        servers: []
    });
}

//=================parseAjaxEpisode (FULL DANH SÁCH TẬP)==========

function parseAjaxEpisode(html) {

    function clean(t) {
        return t ? t.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
    }

    function normalizeUrl(u) {
        return u.replace(/^(https?:\/\/[^\/]+)?\//i, "");
    }

    var servers = [];
    var serverIndex = 1;

    // AJAX trả HTML có dạng:
    // <div class="server"> ... <a href="...">1</a>

    var serverRegex =
        /<div[^>]*class="[^"]*server[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>?/gi;

    var serverMatch;

    while ((serverMatch = serverRegex.exec(html)) !== null) {

        var block = serverMatch[1];
        var episodes = [];

        var epRegex =
            /href=["']([^"']*tap-(\d+)[^"']*\.html)["'][^>]*>(.*?)<\/a>/gi;

        var epMatch;

        while ((epMatch = epRegex.exec(block)) !== null) {

            var fullUrl = epMatch[1];
            var epNumber = epMatch[2];

            episodes.push({
                id: normalizeUrl(fullUrl),
                name: "Tập " + epNumber,
                slug: fullUrl
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

    // 🔥 Nếu site không chia server, gom tất cả
    if (servers.length === 0) {

        var allEpisodes = [];
        var fallbackRegex =
            /href=["']([^"']*tap-(\d+)[^"']*\.html)["']/gi;

        var m;

        while ((m = fallbackRegex.exec(html)) !== null) {
            allEpisodes.push({
                id: normalizeUrl(m[1]),
                name: "Tập " + m[2],
                slug: m[1]
            });
        }

        if (allEpisodes.length > 0) {
            servers.push({
                name: "Full Server",
                episodes: allEpisodes
            });
        }
    }

    return JSON.stringify({
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
