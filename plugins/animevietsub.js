// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "animevietsub",
        "name": "AnimeVietsub",
        "version": "1.1.3",
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

        // CHỐT CHẶN 1: Bắt tên phim bằng thuộc tính title hoặc alt để không dính chữ Đánh giá
        var titleMatch = innerHtml.match(/title="([^"]+)"/i) || innerHtml.match(/alt="([^"]+)"/i);
        var title = titleMatch ? PluginUtils.cleanText(titleMatch[1]) : "";

        // Dự phòng nếu không có thuộc tính
        if (!title || title.indexOf("trong số") !== -1) {
            var fallbackTitle = innerHtml.match(/<div[^>]*class="[^"]*(?:name|Title|title)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            if (fallbackTitle) title = PluginUtils.cleanText(fallbackTitle[1]);
        }

        // CHỐT CHẶN 2: Bắt trạng thái tập phim
        var epMatch = innerHtml.match(/<span[^>]*class="[^"]*(?:ep-status|tray-item|status|episode|label)[^"]*"[^>]*>([\s\S]*?)<\/span>/i) || 
                      innerHtml.match(/<div[^>]*class="[^"]*(?:ep-status|tray-item|status|episode|label)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        var episodeCurrent = epMatch ? PluginUtils.cleanText(epMatch[1] || epMatch[2]) : "Cập nhật";

        if (id && !foundIds[id] && title && title !== "Anime" && title.indexOf("trong số") === -1) {
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
        
        // CẬP NHẬT: Quét các chuẩn class chứa danh sách tập (halim-list-eps, list-episode, list-item)
        var blockRegex = /<[^>]*class="[^"]*(?:halim-list-eps|list-episode)[^"]*"[^>]*>([\s\S]*?)<\/(?:ul|div)>/gi;
        var blockMatch;
        var serverIndex = 1;

        while ((blockMatch = blockRegex.exec(html)) !== null) {
            var epsHtml = blockMatch[1];
            var eps = [];
            var epRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            var epItem;

            while ((epItem = epRegex.exec(epsHtml)) !== null) {
                var eLink = epItem[1];
                var eName = PluginUtils.cleanText(epItem[2]);
                
                if (eLink !== "#" && eLink.indexOf("javascript") === -1 && eLink.indexOf("/phim/") !== -1) {
                    var eSlug = eLink.replace(/^(https?:\/\/[^\/]+)?\//i, "");
                    eps.push({
                        id: eSlug,
                        name: "Tập " + eName.replace(/tập\s*/i, ""),
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
        
        // Dự phòng cho phim lẻ:
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

        var processUrl = function(u) {
            if (!u) return "";
            u = u.replace(/&amp;/g, "&").replace(/\\\/|\\\\/g, "/").replace(/\\\//g, "/");
            var l = u.toLowerCase();

            if (l.indexOf("http") !== 0 && l.indexOf("//") !== 0) return "";
            if (l.length < 15) return ""; 

            // DANH SÁCH ĐEN BỔ SUNG (CHẶN MỌI ẢNH VÀ GG USER CONTENT GÂY LỖI CODEC GIF)
            var blocked = [
                "sunwin", "bet", "casino", "youtube", "youtu.be", "facebook", "googletag", 
                ".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".ico", "jwplayer", 
                "/phim/", "-5467", "api", "googleusercontent", "lh3.google"
            ];
            for (var i = 0; i < blocked.length; i++) {
                if (l.indexOf(blocked[i]) !== -1) {
                    if ((l.indexOf(".m3u8") !== -1 || l.indexOf(".mp4") !== -1) && blocked[i] !== "sunwin" && blocked[i] !== "youtube" && blocked[i] !== "facebook") {
                        continue; 
                    }
                    return "";
                }
            }

            // CHỈ CHO PHÉP VIDEO
            if (l.indexOf(".m3u8") !== -1 || l.indexOf(".mp4") !== -1 || l.indexOf("/player/") !== -1 || l.indexOf("/embed/") !== -1 || l.indexOf("v2") !== -1) {
                return u;
            }
            return "";
        };

        var candidates = [];

        var iframeRegex = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
        var iMatch; while ((iMatch = iframeRegex.exec(html)) !== null) { candidates.push(iMatch[1]); }

        var dataRegex = /data-(?:href|play|url|server)=["']([^"']+)["']/gi;
        var dMatch; while ((dMatch = dataRegex.exec(html)) !== null) { candidates.push(dMatch[1]); }

        var scriptRegex = /(?:file|url|link_play|play_url|src)\s*[:=]\s*["']([^"']+)["']/gi;
        var sMatch; while ((sMatch = scriptRegex.exec(html)) !== null) { candidates.push(sMatch[1]); }

        var base64Regex = /aHR0c[a-zA-Z0-9\+\/\=]+/g;
        var bMatch; while ((bMatch = base64Regex.exec(html)) !== null) { 
            try { candidates.push(atob(bMatch[0])); } catch(e){} 
        }

        var m3u8Regex = /(https?:\/\/[^"'\s<>\[\]]+\.(?:m3u8|mp4)[^"'\s<>\[\]]*)/gi;
        var mMatch; while ((mMatch = m3u8Regex.exec(html)) !== null) { candidates.push(mMatch[1]); }

        for (var idx = 0; idx < candidates.length; idx++) {
            var safeUrl = processUrl(candidates[idx]);
            if (safeUrl) {
                streamUrl = safeUrl;
                if (streamUrl.indexOf(".m3u8") !== -1 || streamUrl.indexOf(".mp4") !== -1) {
                    break;
                }
            }
        }

        if (streamUrl) {
            if (streamUrl.indexOf("//") === 0) streamUrl = "https:" + streamUrl;
            return JSON.stringify({ url: streamUrl, headers: headers, subtitles: [] });
        }

        return "{}";
    } catch (e) {
        return "{}";
    }
}

function parseCategoriesResponse(html) { return getPrimaryCategories(); }
function parseCountriesResponse(html) { return "[]"; }
function parseYearsResponse(html) { return "[]"; }
