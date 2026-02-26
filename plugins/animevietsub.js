// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "animevietsub",
        "name": "AnimeVietsub",
        "version": "1.0.8",
        "baseUrl": "https://animevietsub.be",
        "iconUrl": "https://animevietsub.be/favicon.ico",
        "isEnabled": true,
        "isAdult": false,
        "type": "MOVIE",
        "layoutType": "HORIZONTAL"
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: 'phim-moi', title: '🌟 Anime Mới Cập Nhật', type: 'Grid', path: '' },
        { slug: 'anime-bo', title: '📚 Anime Bộ', type: 'Horizontal', path: '' },
        { slug: 'anime-le', title: '🎬 Anime Lẻ', type: 'Horizontal', path: '' },
        { slug: 'sap-chieu', title: '⏳ Anime Sắp Chiếu', type: 'Horizontal', path: '' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Phim Mới', slug: 'phim-moi' },
        { name: 'Anime Bộ', slug: 'anime-bo' },
        { name: 'Anime Lẻ', slug: 'anime-le' },
        { name: 'Thể Loại', slug: 'the-loai' }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({
        sort: [
            { name: 'Mới cập nhật', value: 'update' }
        ],
        category: [
            { name: 'Tất cả', value: '' }
        ]
    });
}

// =============================================================================
// URL GENERATION
// =============================================================================

function getUrlList(slug, filtersJson) {
    var baseUrl = "https://animevietsub.be";
    if (!slug) slug = "phim-moi";
    
    var filters = {};
    try { filters = JSON.parse(filtersJson || "{}"); } catch (e) {}
    var page = filters.page ? "/trang-" + filters.page + ".html" : "";

    if (slug === 'phim-moi') return baseUrl + "/" + slug + page;
    if (slug === 'anime-bo' || slug === 'anime-le' || slug === 'sap-chieu') {
        return baseUrl + "/danh-sach/" + slug + page;
    }
    
    return baseUrl + "/" + slug + page;
}

function getUrlSearch(keyword, filtersJson) {
    return "https://animevietsub.be/tim-kiem/" + encodeURIComponent(keyword) + "/";
}

function getUrlDetail(slug) {
    if (!slug) return "";
    if (slug.indexOf("http") === 0) return slug;
    var cleanSlug = slug.replace(/^\//, "");
    return "https://animevietsub.be/" + cleanSlug;
}

function getUrlCategories() { return "https://animevietsub.be/"; }
function getUrlCountries() { return ""; }
function getUrlYears() { return ""; }

// =============================================================================
// UTILS
// =============================================================================

var PluginUtils = {
    cleanText: function (text) {
        if (!text) return "";
        return text.replace(/<[^>]*>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\s+/g, " ")
            .trim();
    }
};

// =============================================================================
// PARSERS
// =============================================================================

function parseListResponse(html) {
    var matches = [];
    var foundIds = {};

    var itemRegex = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    var match;

    while ((match = itemRegex.exec(html)) !== null) {
        var fullUrl = match[1];
        var innerHtml = match[2];

        if (fullUrl.indexOf("/phim/") === -1) continue;

        var id = fullUrl.replace(/^(https?:\/\/[^\/]+)?\//i, "");

        var thumbMatch = innerHtml.match(/<img[^>]*src="([^"]+)"/i) || innerHtml.match(/data-src="([^"]+)"/i);
        var thumb = thumbMatch ? thumbMatch[1] : "";

        var titleMatch = innerHtml.match(/title="([^"]+)"/i) || innerHtml.match(/<div[^>]*class="[^"]*Title[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        var title = titleMatch ? PluginUtils.cleanText(titleMatch[1] || titleMatch[2]) : "Anime";

        var epMatch = innerHtml.match(/<span[^>]*class="[^"]*ep-status[^"]*"[^>]*>([\s\S]*?)<\/span>/i) || 
                      innerHtml.match(/<span[^>]*class="[^"]*tray-item[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        var episodeCurrent = epMatch ? PluginUtils.cleanText(epMatch[1]) : "Cập nhật";

        if (id && !foundIds[id] && title && title !== "Anime") {
            matches.push({
                id: id,
                title: title,
                posterUrl: thumb,
                backdropUrl: thumb,
                description: "",
                quality: "HD",
                episode_current: episodeCurrent,
                lang: "Vietsub"
            });
            foundIds[id] = true;
        }
    }

    return JSON.stringify({
        items: matches,
        pagination: { currentPage: 1, totalPages: 10, totalItems: matches.length, itemsPerPage: matches.length }
    });
}

function parseSearchResponse(html) {
    return parseListResponse(html);
}

function parseMovieDetail(html) {
    try {
        var titleMatch = html.match(/<h1[^>]*class="[^"]*Title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || 
                         html.match(/<title>([\s\S]*?)<\/title>/i);
        var title = titleMatch ? PluginUtils.cleanText(titleMatch[1]) : "Chi tiết Anime";

        var posterMatch = html.match(/<div[^>]*class="[^"]*Image[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/i) ||
                          html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
        var posterUrl = posterMatch ? posterMatch[1] : "";

        var descMatch = html.match(/<div[^>]*class="[^"]*Description[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                        html.match(/<div[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/div>/i);
        var description = descMatch ? PluginUtils.cleanText(descMatch[1]) : "";

        var servers = [];
        
        // Cải tiến bóc tách danh sách Server và Tập phim
        var blockRegex = /<ul[^>]*class="[^"]*list-episode[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
        var blockMatch;
        var serverIndex = 1;

        while ((blockMatch = blockRegex.exec(html)) !== null) {
            var epsHtml = blockMatch[1];
            var eps = [];
            var epRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            var epMatch;

            while ((epMatch = epRegex.exec(epsHtml)) !== null) {
                var eLink = epMatch[1];
                var eName = PluginUtils.cleanText(epMatch[2]);
                
                // Loại bỏ link rác
                if (eLink !== "#" && eLink.indexOf("javascript") === -1 && eLink.indexOf("/phim/") !== -1) {
                    var eSlug = eLink.replace(/^(https?:\/\/[^\/]+)?\//i, "");
                    eps.push({
                        id: eSlug,
                        name: "Tập " + eName,
                        slug: eSlug
                    });
                }
            }

            if (eps.length > 0) {
                servers.push({
                    name: "Server " + serverIndex,
                    episodes: eps
                });
                serverIndex++;
            }
        }

        // Dự phòng: Nếu là trang thông tin chưa có danh sách tập, tìm nút Xem Phim
        if (servers.length === 0) {
            var watchUrlMatch = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*(btn-see|play|watch)[^"']*["']/i);
            var watchUrl = watchUrlMatch ? watchUrlMatch[1] : "";

            if (watchUrl && watchUrl !== "#" && watchUrl.indexOf("javascript") === -1) {
                var watchId = watchUrl.replace(/^(https?:\/\/[^\/]+)?\//i, "");
                servers.push({
                    name: "Phát Phim",
                    episodes: [{
                        id: watchId,
                        name: "Xem Ngay",
                        slug: "play"
                    }]
                });
            }
        }

        return JSON.stringify({
            id: "",
            title: title,
            posterUrl: posterUrl,
            backdropUrl: posterUrl,
            description: description,
            servers: servers,
            quality: "FHD",
            lang: "Vietsub",
            status: "Hoàn tất"
        });
    } catch (e) {
        return "null";
    }
}

function parseDetailResponse(html) {
    try {
        if (!html) return "{}";
        var streamUrl = "";
        var headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://animevietsub.be/",
            "Origin": "https://animevietsub.be"
        };

        // Màng lọc tuyệt đối: Quét toàn bộ mã HTML để tóm gọn mọi link m3u8 và mp4
        var mediaRegex = /(https?:\/\/[a-zA-Z0-9\-\.\_\~\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\%]+\.(?:m3u8|mp4)[^"'\s<>\[\]]*)/gi;
        var matches = [];
        var m;

        while ((m = mediaRegex.exec(html)) !== null) {
            var url = m[1].replace(/\\/g, ""); // Dọn dẹp ký tự escape JSON
            matches.push(url);
        }

        // Kiểm tra và giải mã Base64 (Nếu website giấu link m3u8 trong chuỗi mã hóa)
        var base64Regex = /(aHR0c[a-zA-Z0-9\+\/]+={0,2})/gi;
        var bMatch;
        while ((bMatch = base64Regex.exec(html)) !== null) {
            try {
                var decoded = atob(bMatch[1]);
                if (decoded.indexOf(".m3u8") !== -1 || decoded.indexOf(".mp4") !== -1) {
                    matches.push(decoded);
                }
            } catch(e) {}
        }

        // Lọc lại danh sách link lấy được, chặn đứng các link quảng cáo/rác
        for (var i = 0; i < matches.length; i++) {
            var candidate = matches[i];
            if (candidate.indexOf("facebook.com") === -1 && candidate.indexOf("youtube.com") === -1) {
                streamUrl = candidate;
                break;
            }
        }

        // Nếu không có m3u8, kiểm tra xem có phải Trailer YouTube không
        if (!streamUrl) {
            var ytMatch = html.match(/youtube\.com\/embed\/([^"'\?&]+)/i) || html.match(/youtube\.com\/watch\?v=([^"'&]+)/i);
            if (ytMatch) streamUrl = "https://www.youtube.com/watch?v=" + ytMatch[1];
        }

        // Chỉ trả về kết quả nếu tìm thấy đúng định dạng video
        if (streamUrl) {
            return JSON.stringify({
                url: streamUrl,
                headers: headers,
                subtitles: []
            });
        }

        // Trả về rỗng để ngăn App văng lỗi khi link bị ẩn quá sâu
        return "{}";
    } catch (e) {
        return "{}";
    }
}

function parseCategoriesResponse(html) { return getPrimaryCategories(); }
function parseCountriesResponse(html) { return "[]"; }
function parseYearsResponse(html) { return "[]"; }
