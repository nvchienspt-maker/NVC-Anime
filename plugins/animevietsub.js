// =============================================================================
// NVC ANIME - ANIMEVIETSUB CLEAN ENGINE (ADVANCED UI)
// =============================================================================

const BASE_URL = "https://animevietsub.be";

// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "animevietsub_clean",
        "name": "AnimeVietsub",
        "version": "5.0.0",
        "baseUrl": BASE_URL,
        "iconUrl": BASE_URL + "/favicon.ico",
        "isEnabled": true,
        "isAdult": false,
        "type": "MOVIE",
        "layoutType": "VERTICAL"
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: 'phim-moi', title: 'Mới Cập Nhật', type: 'Grid', path: '' },
        { slug: 'anime-bo', title: 'Anime Series (Bộ)', type: 'Horizontal', path: '' },
        { slug: 'anime-le', title: 'Anime Lẻ (Movie)', type: 'Horizontal', path: '' },
        { slug: 'sap-chieu', title: 'Sắp Chiếu', type: 'Horizontal', path: '' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Phim Mới', slug: 'phim-moi' },
        { name: 'Anime Bộ', slug: 'anime-bo' },
        { name: 'Anime Lẻ', slug: 'anime-le' },
        { name: 'Sắp Chiếu', slug: 'sap-chieu' },
        { name: 'Hành Động', slug: 'the-loai/hanh-dong' },
        { name: 'Phiêu Lưu', slug: 'the-loai/phieu-luu' },
        { name: 'Tình Cảm', slug: 'the-loai/tinh-cam' },
        { name: 'Hài Hước', slug: 'the-loai/hai-huoc' },
        { name: 'Học Đường', slug: 'the-loai/hoc-duong' },
        { name: 'Kinh Dị', slug: 'the-loai/kinh-di' }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({
        sort: [
            { name: 'Mới cập nhật', value: 'latest' }
        ],
        category: [
            { name: "Hành Động", value: "the-loai/hanh-dong" },
            { name: "Phiêu Lưu", value: "the-loai/phieu-luu" },
            { name: "Tình Cảm", value: "the-loai/tinh-cam" },
            { name: "Hài Hước", value: "the-loai/hai-huoc" },
            { name: "Học Đường", value: "the-loai/hoc-duong" },
            { name: "Kinh Dị", value: "the-loai/kinh-di" },
            { name: "Viễn Tưởng", value: "the-loai/vien-tuong" },
            { name: "Thể Thao", value: "the-loai/the-thao" }
        ]
    });
}

// =============================================================================
// URL GENERATION
// =============================================================================

function getUrlList(slug, filtersJson) {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;

    // Ưu tiên filter thể loại
    if (filters.category) {
        return `${BASE_URL}/${filters.category}/trang-${page}.html`;
    }

    if (!slug || slug === '') {
        return `${BASE_URL}/phim-moi/trang-${page}.html`;
    }

    if (slug.indexOf("http") === 0) return slug;

    // Xử lý các slug đặc biệt không nằm trong /danh-sach/
    if (slug === "phim-moi" || slug.startsWith("the-loai/")) {
        return `${BASE_URL}/${slug}/trang-${page}.html`;
    }

    return `${BASE_URL}/danh-sach/${slug}/trang-${page}.html`;
}

function getUrlSearch(keyword, filtersJson) {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;
    return `${BASE_URL}/tim-kiem/${encodeURIComponent(keyword)}/trang-${page}.html`;
}

function getUrlDetail(slug) {
    if (!slug) return "";
    if (slug.indexOf("http") === 0) {
        return slug.replace(/https?:\/\/(?:www\.)?animevietsub\.[a-z]+/gi, BASE_URL);
    }
    return BASE_URL + "/" + slug.replace(/^\//, "");
}

function getUrlCategories() { return BASE_URL; }
function getUrlCountries() { return ""; } 
function getUrlYears() { return ""; } 

// =============================================================================
// PARSERS LÕI (GIỮ NGUYÊN ĐỘ CHÍNH XÁC CỦA ANIMEVIETSUB)
// =============================================================================

var PluginUtils = {
    cleanText: function (text) {
        return text ? text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
    },
    normalizeUrl: function(u) {
        if (!u) return "";
        u = u.replace(/\\\//g, "/").replace(/&amp;/g, "&");
        if (u.startsWith("//")) u = "https:" + u;
        u = u.replace(/https?:\/\/(?:www\.)?animevietsub\.[a-z]+/gi, BASE_URL);
        return u;
    }
};

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
        
        let latestEp = epMatch ? PluginUtils.cleanText(epMatch[1]) : "HD";
        let title = PluginUtils.cleanText(titleMatch[1]);
        let thumb = imgMatch ? PluginUtils.normalizeUrl(imgMatch[1]) : "";

        items.push({
            id: id,
            title: title || "Không có tiêu đề",
            posterUrl: thumb,
            backdropUrl: thumb,
            quality: latestEp,
            episode_current: latestEp,
            lang: "Vietsub"
        });

        found[id] = true;
    }

    // Xử lý phân trang (Pagination)
    var totalPages = 1;
    var currentPage = 1;

    var currentMatch = html.match(/class=["']page-numbers current["']>(\d+)<\/span>/i) || html.match(/<span class="current">(\d+)<\/span>/i);
    if (currentMatch) {
        currentPage = parseInt(currentMatch[1]);
    }

    var pageRegex = /trang-(\d+)\.html/g;
    var pageMatch;
    while ((pageMatch = pageRegex.exec(html)) !== null) {
        var p = parseInt(pageMatch[1]);
        if (p > totalPages) totalPages = p;
    }

    return JSON.stringify({
        items: items,
        pagination: {
            currentPage: currentPage,
            totalPages: totalPages || 1
        }
    });
}

function parseSearchResponse(html) {
    return parseListResponse(html);
}

function parseMovieDetail(html) {
    var titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<title>(.*?)<\/title>/i);
    var title = titleMatch ? PluginUtils.cleanText(titleMatch[1]) : "Anime";

    var posterMatch = html.match(/property="og:image" content="([^"]+)"/i);
    var poster = posterMatch ? posterMatch[1] : "";

    var descMatch = html.match(/<div[^>]*class="[^"]*(?:Description|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    var description = descMatch ? PluginUtils.cleanText(descMatch[1]) : "";

    var idMatch =
        html.match(/data-id=["']?(\d+)["']?/i) ||
        html.match(/movie_id\s*=\s*["']?(\d+)/i) ||
        html.match(/"film_id"\s*:\s*"(\d+)"/i);

    if (!idMatch) {
        return JSON.stringify({
            title: title,
            posterUrl: poster,
            backdropUrl: poster,
            description: description,
            servers: []
        });
    }

    var movieId = idMatch[1];

    return JSON.stringify({
        title: title,
        posterUrl: poster,
        backdropUrl: poster,
        description: description,
        ajaxEpisodeUrl: BASE_URL + "/ajax/episode/list/" + movieId,
        servers: []
    });
}

// Bắt buộc giữ lại hàm này cho file Dart của bạn
function parseAjaxEpisode(html) {
    function normPath(u) {
        u = u.replace(/\\\//g, "/").replace(/&amp;/g, "&");
        if (u.startsWith("//")) u = "https:" + u;
        u = u.replace(/https?:\/\/(?:www\.)?animevietsub\.[a-z]+/gi, BASE_URL);
        return u.replace(/^(https?:\/\/[^\/]+)?\//i, "");
    }

    function getFullUrl(u) {
        u = u.replace(/\\\//g, "/").replace(/&amp;/g, "&");
        if (u.startsWith("//")) u = "https:" + u;
        u = u.replace(/https?:\/\/(?:www\.)?animevietsub\.[a-z]+/gi, BASE_URL);
        if (!u.startsWith("http")) {
            u = BASE_URL + (u.startsWith("/") ? "" : "/") + u;
        }
        return u;
    }

    var servers = [];
    var allEpisodes = [];
    var foundEps = {};

    var epRegex = /<a[^>]+href=["']([^"']+\/tap-[^"']+\.html)["'][^>]*>(.*?)<\/a>/gi;
    var m;

    while ((m = epRegex.exec(html)) !== null) {
        var rawUrl = m[1];
        var epName = PluginUtils.cleanText(m[2]);

        if (rawUrl.includes("tag=") || rawUrl.includes("category=")) continue;

        if (!epName || (!isNaN(epName) && epName.trim() !== "")) {
            let numMatch = rawUrl.match(/tap-(\d+)/i);
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

        var id = normPath(rawUrl);
        var slug = getFullUrl(rawUrl);

        if (!foundEps[id]) {
            allEpisodes.push({
                id: id,
                name: epName,
                slug: slug
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

    return JSON.stringify({ servers: servers });
}

function parseDetailResponse(html) {
    const headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": BASE_URL,
        "Origin": BASE_URL
    };

    let candidates = [];
    let m;

    let directRegex = /(https?:\/\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*)/gi;
    while ((m = directRegex.exec(html)) !== null) {
        candidates.push(PluginUtils.normalizeUrl(m[1]));
    }

    let iframeRegex = /<iframe[^>]+(?:src|data-src|data-url)=["']([^"']+)["']/gi;
    while ((m = iframeRegex.exec(html)) !== null) {
        candidates.push(PluginUtils.normalizeUrl(m[1]));
    }

    let jsRegex = /(?:link_play|iframe_url|iframe|url_play|file|data-href|data-embed)\s*(?:=|:)\s*["'](https?:\/\/[^"']+)["']/gi;
    while ((m = jsRegex.exec(html)) !== null) {
        candidates.push(PluginUtils.normalizeUrl(m[1]));
    }

    for (let i = 0; i < candidates.length; i++) {
        let u = candidates[i];
        if (u.toLowerCase().includes(".m3u8") || u.toLowerCase().includes(".mp4")) {
            return JSON.stringify({ url: u, headers: headers, subtitles: [] });
        }
    }

    for (let i = 0; i < candidates.length; i++) {
        let u = candidates[i];
        let isJunkDomain = u.match(/facebook\.com|youtube\.com|google\.com|googleapis\.com|recaptcha|twitter|ads|doubleclick|googletagmanager|analytics/i);
        let isJunkExtension = u.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico)(\?.*)?$/i);

        if (!isJunkDomain && !isJunkExtension) {
            return JSON.stringify({ url: u, headers: headers, subtitles: [] });
        }
    }

    return "{}";
}

function parseCategoriesResponse(html) {
    return getPrimaryCategories(); 
}

function parseCountriesResponse(html) { return "[]"; }
function parseYearsResponse(html) { return "[]"; }
