// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "animevietsub",
        "name": "AnimeVietsub",
        "version": "1.1.1",
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
        var episodes = [];

        var epBlockRegex = /<ul[^>]*class="[^"]*list-episode[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
        var epBlockMatch = epBlockRegex.exec(html);

        if (epBlockMatch) {
            var epListHtml = epBlockMatch[1];
            var epItemRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            var epItem;

            while ((epItem = epItemRegex.exec(epListHtml)) !== null) {
                var epLink = epItem[1];
                var epName = PluginUtils.cleanText(epItem[2]);
                
                if (epLink !== "#" && epLink.indexOf("javascript") === -1 && epLink.indexOf("/phim/") !== -1) {
                    var epId = epLink.replace(/^(https?:\/\/[^\/]+)?\//i, "");
                    episodes.push({
                        id: epId,
                        name: "Tập " + epName.replace(/tập\s*/i, ""),
                        slug: epId
                    });
                }
            }

            if (episodes.length > 0) {
                servers.push({
                    name: "Vietsub",
                    episodes: episodes
                });
            }
        } 
        
        if (servers.length === 0) {
            var watchUrlMatch = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*(btn-see|play|watch|btn-danger)[^"']*["']/i) ||
                                html.match(/<a[^>]*href=["'](https?:\/\/[^"']+|(?:\/phim\/)[^"']+)["'][^>]*>(?:<[^>]+>)*\s*Xem Phim\s*(?:<\/[^>]+>)*<\/a>/i);
            
            var watchUrl = watchUrlMatch ? (watchUrlMatch[1] || watchUrlMatch[2]) : "";

            if (watchUrl && watchUrl !== "#" && watchUrl.indexOf("javascript") === -1) {
                var watchId = watchUrl.replace(/^(https?:\/\/[^\/]+)?\//i, "");
                servers.push({
                    name: "Phát Phim",
                    episodes: [{
                        id: watchId,
                        name: "Full",
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

        var bestM3u8 = "";
        var bestIframe = "";

        // Hàm dọn dẹp các ký tự thừa
        var decodeUrl = function (u) {
            if (!u) return "";
            return u.replace(/&amp;/g, "&").replace(/\\\/|\\\\/g, "/").replace(/\\\//g, "/");
        };

        // Hàm xử lý link: Đưa mọi link được tìm thấy qua màng lọc tuyệt đối
        var processUrl = function(u) {
            u = decodeUrl(u);
            if (!u || u.length < 15) return;
            var l = u.toLowerCase();
            
            // 1. Phải là một URL định dạng chuẩn
            if (l.indexOf("http") !== 0 && l.indexOf("//") !== 0) return;
            
            // 2. Chặn tuyệt đối rác (JS, CSS, Ảnh)
            if (l.indexOf(".js") !== -1 && l.indexOf(".m3u8") === -1) return;
            if (l.indexOf(".css") !== -1 || l.indexOf(".png") !== -1 || l.indexOf(".jpg") !== -1 || l.indexOf(".gif") !== -1 || l.indexOf(".ico") !== -1) return;
            
            // 3. Chặn mạng xã hội và Trailer Youtube
            if (l.indexOf("youtube") !== -1 || l.indexOf("youtu.be") !== -1 || l.indexOf("facebook") !== -1 || l.indexOf("googletag") !== -1) return;
            
            // 4. CHẶN VÒNG LẶP HTML: Bỏ qua các link trang web (ví dụ tap-01.html) nếu không chứa từ khóa của player
            if (l.indexOf("animevietsub") !== -1) {
                if (l.indexOf("/phim/") !== -1 || l.indexOf("/danh-sach/") !== -1 || l.indexOf("/tap-") !== -1) {
                    return;
                }
                if (l.indexOf(".html") !== -1 && l.indexOf("player") === -1 && l.indexOf("v2") === -1) {
                    return;
                }
            }

            // Phân loại: Ưu tiên bắt m3u8 tuyệt đối, nếu không thì lấy iframe dự phòng
            if (l.indexOf(".m3u8") !== -1) {
                bestM3u8 = u;
            } else if (!bestIframe && (l.indexOf("player") !== -1 || l.indexOf("embed") !== -1 || l.indexOf(".mp4") !== -1)) {
                bestIframe = u;
            }
        };

        // KỊCH BẢN 1: Tóm chuỗi Base64 giấu trong thẻ data-hash hoặc script
        var base64Regex = /aHR0c[a-zA-Z0-9\+\/\=]+/g;
        var bMatch;
        while ((bMatch = base64Regex.exec(html)) !== null) {
            try { processUrl(atob(bMatch[0])); } catch(e) {}
        }

        // KỊCH BẢN 2: Quét thẻ iframe tường minh (hỗ trợ cả đường dẫn URL tương đối)
        var iframeRegex = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
        var iMatch;
        while ((iMatch = iframeRegex.exec(html)) !== null) {
            var src = iMatch[1];
            if (src.indexOf("/") === 0 && src.indexOf("//") !== 0) {
                src = "https://animevietsub.be" + src;
            }
            processUrl(src);
        }

        // KỊCH BẢN 3: Quét vét cạn mọi URL nằm trần trong toàn bộ mã HTML (Phòng khi link bị tách đôi)
        var urlRegex = /(?:https?:)?\/\/[a-zA-Z0-9\-\.\_\~\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\%]+/gi;
        var uMatch;
        while ((uMatch = urlRegex.exec(html)) !== null) {
            processUrl(uMatch[0]);
        }

        // Ưu tiên m3u8. Nếu phim AnimeVietsub chỉ có iframe nhúng thì lấy iframe.
        streamUrl = bestM3u8 || bestIframe;

        if (streamUrl) {
            // Chuẩn hóa định dạng HTTPS
            if (streamUrl.indexOf("//") === 0) streamUrl = "https:" + streamUrl;

            return JSON.stringify({
                url: streamUrl,
                headers: headers,
                subtitles: []
            });
        }

        return "{}";
    } catch (e) {
        return "{}";
    }
}

function parseCategoriesResponse(html) { return getPrimaryCategories(); }
function parseCountriesResponse(html) { return "[]"; }
function parseYearsResponse(html) { return "[]"; }
