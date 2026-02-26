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
            content.match(/<img[^>]+(?:alt|title)="([^"]+)"/i) ||
            content.match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/span>/i);

        if (!titleMatch) continue;

        let imgMatch =
            content.match(/<img[^>]+src="([^"]+)"/i) ||
            content.match(/<img[^>]+data-src="([^"]+)"/i) ||
            content.match(/src="([^"]+)"/i) ||
            content.match(/data-src="([^"]+)"/i);

        let epMatch = 
            content.match(/<span[^>]*class="[^"]*(?:episode|ep-status|status|tray-item)[^"]*"[^>]*>(.*?)<\/span>/i) ||
            content.match(/<div[^>]*class="[^"]*(?:episode|ep-status|status)[^"]*"[^>]*>(.*?)<\/div>/i);
        
        let latestEp = epMatch ? clean(epMatch[1]) : "HD";

        items.push({
            id: id,
            title: clean(titleMatch[1]),
            posterUrl: imgMatch ? normalizeUrl(imgMatch[1]) : "",
            backdropUrl: imgMatch ? normalizeUrl(imgMatch[1]) : "",
            quality: latestEp 
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
    var allEpisodes = [];
    var foundEps = {};

    var epRegex = /<a[^>]+href=["']([^"']+\/tap-[^"']+\.html)["'][^>]*>(.*?)<\/a>/gi;
    var m;

    while ((m = epRegex.exec(html)) !== null) {
        var fullUrl = m[1];
        var epName = clean(m[2]);

        if (fullUrl.includes("tag=") || fullUrl.includes("category=")) continue;

        if (!epName || (!isNaN(epName) && epName.trim() !== "")) {
            let numMatch = fullUrl.match(/tap-(\d+)/i);
            if (numMatch) {
                epName = "Tập " + numMatch[1];
            } else if (!isNaN(epName) && epName.trim() !== "") {
                epName = "Tập " + epName;
            } else {
                epName = "Tập";
            }
        } else if (!epName.toLowerCase().includes("tập") && !isNaN(epName.trim())) {
            epName = "Tập " + epName.trim();
        }

        var id = normalizeUrl(fullUrl);

        if (!foundEps[id]) {
            allEpisodes.push({
                id: id,
                name: epName,
                slug: fullUrl
            });
            foundEps[id] = true;
        }
    }

    if (allEpisodes.length > 0) {
        servers.push({
            name: "Server Anime", 
            episodes: allEpisodes
        });
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

    function normUrl(u) {
        if (!u) return "";
        u = u.replace(/\\\//g, "/").replace(/&amp;/g, "&");
        if (u.startsWith("//")) u = "https:" + u;
        return u;
    }

    let directRegex = /(https?:\/\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*)/gi;
    while ((m = directRegex.exec(html)) !== null) {
        candidates.push(normUrl(m[1]));
    }

    let iframeRegex = /<iframe[^>]+(?:src|data-src|data-url)=["']([^"']+)["']/gi;
    while ((m = iframeRegex.exec(html)) !== null) {
        candidates.push(normUrl(m[1]));
    }

    let jsRegex = /(?:link_play|iframe_url|iframe|url_play|file|data-href|data-embed)\s*(?:=|:)\s*["'](https?:\/\/[^"']+)["']/gi;
    while ((m = jsRegex.exec(html)) !== null) {
        candidates.push(normUrl(m[1]));
    }

    for (let i = 0; i < candidates.length; i++) {
        let u = candidates[i];
        if (u.toLowerCase().includes(".m3u8") || u.toLowerCase().includes(".mp4")) {
            return JSON.stringify({
                url: u,
                headers: headers,
                subtitles: []
            });
        }
    }

    for (let i = 0; i < candidates.length; i++) {
        let u = candidates[i];
        
        let isJunkDomain = u.match(/facebook\.com|youtube\.com|google\.com|googleapis\.com|recaptcha|twitter|ads|doubleclick|googletagmanager|analytics/i);
        let isJunkExtension = u.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico)(\?.*)?$/i);

        if (!isJunkDomain && !isJunkExtension) {
            return JSON.stringify({
                url: u,
                headers: headers,
                subtitles: []
            });
        }
    }

    return "{}";
}
