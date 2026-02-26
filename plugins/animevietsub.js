// ==========================================
// NVC ANIME PRO PLUS - ANIMEVIETSUB ENGINE
// ==========================================

const BASE_URL = "https://animevietsub.be";

// ================= MANIFEST =================

function getManifest() {
    return JSON.stringify({
        id: "animevietsub_pro",
        name: "AnimeVietsub PRO+",
        version: "3.0.0",
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
        ? text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
        : "";
}

function decodeBase64Safe(str) {
    try {
        return atob(str);
    } catch (e) {
        return "";
    }
}

function isValidVideo(url) {
    if (!url) return false;

    let l = url.toLowerCase();

    if (
        l.includes(".m3u8") ||
        l.includes(".mp4")
    ) return true;

    return false;
}

// ================= PARSE LIST =================

function parseListResponse(html) {

    var items = [];
    var found = {};

    // Bắt đúng block card phim
    var blockRegex = /<div[^>]*class="[^"]*(?:TPostMv|item)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    var block;

    while ((block = blockRegex.exec(html)) !== null) {

        var content = block[1];

        var linkMatch = content.match(/<a[^>]+href="([^"]+)"[^>]*>/i);
        if (!linkMatch) continue;

        var link = linkMatch[1];
        if (link.indexOf("/phim/") === -1) continue;

        var id = link.replace(/^(https?:\/\/[^\/]+)?\//i, "");
        if (found[id]) continue;

        var titleMatch =
            content.match(/title="([^"]+)"/i) ||
            content.match(/alt="([^"]+)"/i);

        if (!titleMatch) continue;

        var imgMatch =
            content.match(/src="([^"]+)"/i) ||
            content.match(/data-src="([^"]+)"/i);

        items.push({
            id: id,
            title: titleMatch[1].trim(),
            posterUrl: imgMatch ? imgMatch[1] : "",
            backdropUrl: imgMatch ? imgMatch[1] : "",
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

    var titleMatch =
        html.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
        html.match(/<title>(.*?)<\/title>/i);

    var title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g,"").trim() : "Anime";

    var posterMatch =
        html.match(/property="og:image" content="([^"]+)"/i);

    var poster = posterMatch ? posterMatch[1] : "";

    var servers = [];
    var serverIndex = 1;

    var listRegex = /<ul[^>]*class="[^"]*list-episode[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
    var listMatch;

    while ((listMatch = listRegex.exec(html)) !== null) {

        var eps = [];
        var epRegex = /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
        var epMatch;

        while ((epMatch = epRegex.exec(listMatch[1])) !== null) {

            var epUrl = epMatch[1];
            var epName = epMatch[2].replace(/<[^>]*>/g,"").trim();

            if (epUrl.indexOf("/phim/") === -1) continue;

            eps.push({
                id: epUrl.replace(/^(https?:\/\/[^\/]+)?\//i,""),
                name: "Tập " + epName,
                slug: epUrl
            });
        }

        if (eps.length > 0) {
            servers.push({
                name: "Server " + serverIndex,
                episodes: eps
            });
            serverIndex++;
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
// ================= STREAM PRO PLUS =================

function parseDetailResponse(html) {

    let headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": BASE_URL,
        "Origin": BASE_URL
    };

    let candidates = [];

    // 1️⃣ m3u8 trực tiếp
    let m3u8Regex = /(https?:\/\/[^"']+\.m3u8[^"']*)/gi;
    let m;
    while ((m = m3u8Regex.exec(html)) !== null) {
        candidates.push(m[1]);
    }

    // 2️⃣ mp4
    let mp4Regex = /(https?:\/\/[^"']+\.mp4[^"']*)/gi;
    while ((m = mp4Regex.exec(html)) !== null) {
        candidates.push(m[1]);
    }

    // 3️⃣ iframe
    let iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
    while ((m = iframeRegex.exec(html)) !== null) {
        candidates.push(m[1]);
    }

    // 4️⃣ base64
    let base64Regex = /aHR0c[0-9A-Za-z+/=]+/g;
    while ((m = base64Regex.exec(html)) !== null) {
        let decoded = decodeBase64Safe(m[0]);
        if (decoded.startsWith("http"))
            candidates.push(decoded);
    }

    // 5️⃣ script file:
    let fileRegex = /file\s*:\s*"([^"]+)"/gi;
    while ((m = fileRegex.exec(html)) !== null) {
        candidates.push(m[1]);
    }

    // Lọc link hợp lệ
    for (let i = 0; i < candidates.length; i++) {

        let url = candidates[i];

        if (!url) continue;

        if (url.startsWith("//"))
            url = "https:" + url;

        if (isValidVideo(url)) {

            return JSON.stringify({
                url: url,
                headers: headers,
                subtitles: []
            });
        }

        // Nếu là iframe -> cho app load tiếp
        if (url.includes("embed") || url.includes("player")) {
            return JSON.stringify({
                url: url,
                headers: headers,
                subtitles: []
            });
        }
    }

    return "{}";
}
