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

        // Đã sửa: Bắt trực tiếp title/alt từ thẻ img để tránh bị nhầm với thẻ đánh giá
        let titleMatch =
            content.match(/<img[^>]+(?:alt|title)="([^"]+)"/i) ||
            content.match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/span>/i);

        if (!titleMatch) continue;

        let imgMatch =
            content.match(/<img[^>]+src="([^"]+)"/i) ||
            content.match(/<img[^>]+data-src="([^"]+)"/i) ||
            content.match(/src="([^"]+)"/i) ||
            content.match(/data-src="([^"]+)"/i);

        // Đã sửa: Tìm thẻ chứa thông tin tập phim mới nhất
        let epMatch = 
            content.match(/<span[^>]*class="[^"]*(?:episode|ep-status|status|tray-item)[^"]*"[^>]*>(.*?)<\/span>/i) ||
            content.match(/<div[^>]*class="[^"]*(?:episode|ep-status|status)[^"]*"[^>]*>(.*?)<\/div>/i);
        
        let latestEp = epMatch ? clean(epMatch[1]) : "HD";

        items.push({
            id: id,
            title: clean(titleMatch[1]),
            posterUrl: imgMatch ? normalizeUrl(imgMatch[1]) : "",
            backdropUrl: imgMatch ? normalizeUrl(imgMatch[1]) : "",
            quality: latestEp // Đã sửa: Gắn số tập vào đây thay cho giá trị cố định
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

    // Đã sửa: Quét toàn bộ thẻ <a> trên trang có chứa chuỗi "/tap-" và đuôi ".html"
    // Bắt chính xác định dạng: /phim/yuusha-.../tap-01-110919.html
    var epRegex = /<a[^>]+href=["']([^"']+\/tap-[^"']+\.html)["'][^>]*>(.*?)<\/a>/gi;
    var m;

    while ((m = epRegex.exec(html)) !== null) {
        var fullUrl = m[1];
        var epName = clean(m[2]);

        // Bỏ qua các link chứa thẻ tag, category (link rác không phải tập phim)
        if (fullUrl.includes("tag=") || fullUrl.includes("category=")) continue;

        // Tự động trích xuất số tập nếu web hiển thị thiếu tên (chỉ có icon hoặc chuỗi rỗng)
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

        // Chống lặp tập (nếu trang chèn 2 link giống nhau cho cùng 1 tập)
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
            name: "Server Anime", // Gộp chung vào 1 server nếu web không phân cụm
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

    // Hàm phụ trợ chuẩn hóa URL nội bộ
    function normUrl(u) {
        if (!u) return "";
        u = u.replace(/\\\//g, "/").replace(/&amp;/g, "&");
        if (u.startsWith("//")) u = "https:" + u;
        return u;
    }

    // 1️⃣ Bắt link m3u8 / mp4 lộ diện trực tiếp
    let directRegex = /(https?:\/\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*)/gi;
    while ((m = directRegex.exec(html)) !== null) {
        candidates.push(normUrl(m[1]));
    }

    // 2️⃣ Bắt iframe truyền thống, data-src (lazy-load) hoặc data-url
    let iframeRegex = /<iframe[^>]+(?:src|data-src|data-url)=["']([^"']+)["']/gi;
    while ((m = iframeRegex.exec(html)) !== null) {
        candidates.push(normUrl(m[1]));
    }

    // 3️⃣ Bắt link cấu hình từ Javascript hoặc data-href của div ẩn
    let jsRegex = /(?:link_play|iframe_url|iframe|url_play|file|src|data-href|data-embed)\s*(?:=|:)\s*["'](https?:\/\/[^"']+)["']/gi;
    while ((m = jsRegex.exec(html)) !== null) {
        candidates.push(normUrl(m[1]));
    }

    // 🔥 Ưu tiên 1: Trả về link .m3u8 / .mp4 ngay nếu bắt được
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

    // 🔥 Ưu tiên 2: Nếu không có m3u8/mp4, đẩy link Iframe vào Webview ẩn cho Flutter cào tiếp
    for (let i = 0; i < candidates.length; i++) {
        let u = candidates[i];
        
        // Cực kỳ quan trọng: Lọc sạch Iframe rác
        if (!u.match(/facebook\.com|youtube\.com|google\.com|recaptcha|twitter|ads|doubleclick|googletagmanager/i)) {
            return JSON.stringify({
                url: u,
                headers: headers,
                subtitles: []
            });
        }
    }

    return "{}";
}
