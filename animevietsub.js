// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "animevietsub",
        "name": "AnimeVietsub",
        "version": "1.0.4",
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

        var id = fullUrl.replace("https://animevietsub.be/", "").replace(/^\//, "");

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
                          html.match(/<img[^>]*itemprop="image"[^>]*src="([^"]+)"/i);
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
                
                if (epLink === "#" || epLink.indexOf("javascript") !== -1) continue;

                var epId = epLink.replace(/^(https?:\/\/[^\/]+)?\//i, "");

                episodes.push({
                    id: epId,
                    name: epName,
                    slug: epName
                });
            }

            if (episodes.length > 0) {
                servers.push({
                    name: "Vietsub",
                    episodes: episodes
                });
            }
        } 
        
        if (servers.length === 0) {
            var watchUrlMatch = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>(?:<[^>]+>)*\s*Xem Phim\s*(?:<\/[^>]+>)*<\/a>/i) ||
                                html.match(/<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*(btn-see|play|watch)[^"']*["']/i);
            
            var watchUrl = watchUrlMatch ? watchUrlMatch[1] : "";

            if (watchUrl && watchUrl !== "#" && watchUrl.indexOf("javascript") === -1) {
                var watchId = watchUrl.replace(/^(https?:\/\/[^\/]+)?\//i, "");
                servers.push({
                    name: "Server 1",
                    episodes: [{
                        id: watchId,
                        name: "Phát Phim",
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
        var streamUrl = "";

        // Hàm kiểm tra an toàn: Tuyệt đối không cho phép file mã nguồn/hình ảnh chui lọt
        function isValidLink(url) {
            if (!url) return false;
            var l = url.toLowerCase();
            if (l.indexOf(".js") !== -1 && l.indexOf(".m3u8") === -1) return false;
            if (l.indexOf(".css") !== -1) return false;
            if (l.indexOf(".png") !== -1 || l.indexOf(".jpg") !== -1) return false;
            return true;
        }

        // 1. ƯU TIÊN SỐ 1: Quét quét trần mọi link video chuẩn (.m3u8, .mp4) trong toàn bộ mã HTML
        var m3u8Match = html.match(/(https?:\/\/[^"'\s<>\[\]]+\.(?:m3u8|mp4)[^"'\s<>\[\]]*)/i);
        if (m3u8Match) {
            streamUrl = m3u8Match[1].replace(/\\/g, "");
        }

        // 2. Nếu không tìm thấy m3u8 trực tiếp, quét thẻ iframe của player
        if (!streamUrl) {
            var iframeRegex = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
            var match;
            while ((match = iframeRegex.exec(html)) !== null) {
                var src = match[1];
                if (isValidLink(src) && src.indexOf("facebook") === -1 && src.indexOf("googletag") === -1) {
                    streamUrl = src;
                    break;
                }
            }
        }

        // 3. Tìm link embed nằm trong nút bấm Server (thường nằm ở data-play hoặc data-href)
        if (!streamUrl) {
            var serverMatch = html.match(/data-(?:href|play|url)=["']([^"']+(?:player|embed|youtube)[^"']*)["']/i);
            if (serverMatch && isValidLink(serverMatch[1])) {
                streamUrl = serverMatch[1];
            }
        }

        // 4. Cứu cánh cuối cùng: Tìm trong các biến Javascript giấu link
        if (!streamUrl) {
            var scriptRegex = /(?:link_play|play_url|file|src)\s*[:=]\s*["']([^"']+)["']/gi;
            var sMatch;
            while ((sMatch = scriptRegex.exec(html)) !== null) {
                var link = sMatch[1].replace(/\\/g, "");
                if (isValidLink(link) && (link.indexOf("player") !== -1 || link.indexOf("embed") !== -1)) {
                    streamUrl = link;
                    break;
                }
            }
        }

        // Trả về kết quả sau khi chuẩn hóa
        if (streamUrl) {
            // Fix lỗi link thiếu https://
            if (streamUrl.indexOf("//") === 0) {
                streamUrl = "https:" + streamUrl;
            } else if (streamUrl.indexOf("/") === 0) {
                streamUrl = "https://animevietsub.be" + streamUrl;
            }

            return JSON.stringify({
                url: streamUrl,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://animevietsub.be/",
                    "Origin": "https://animevietsub.be"
                },
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
