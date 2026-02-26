// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "animevietsub",
        "name": "AnimeVietsub",
        "version": "1.0.6",
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
        if (!html) return "{}";
        var streamUrl = "";
        var headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://animevietsub.be/",
            "Origin": "https://animevietsub.be"
        };

        var decodeUrl = function (u) {
            if (!u) return "";
            if (u.indexOf("aHR0c") === 0) {
                try { u = atob(u); } catch(e) {}
            }
            return u.replace(/&amp;/g, "&").replace(/\\\/|\\\\/g, "/").replace(/\\\//g, "/");
        };

        // BỘ LỌC NGHIÊM NGẶT - Không cho phép URL trang web chui vào player
        var isValid = function(l) {
            if (!l) return false;
            l = l.toLowerCase();
            
            // Chặn tuyệt đối link của chính trang web hoặc file html
            if (l.indexOf("/phim/") !== -1 && l.indexOf(".m3u8") === -1 && l.indexOf(".mp4") === -1) return false;
            if (l.indexOf(".html") !== -1) return false;
            
            // Chặn các định dạng rác
            if (l.indexOf(".js") !== -1 && l.indexOf(".m3u8") === -1 && l.indexOf("youtube") === -1) return false;
            if (l.indexOf(".css") !== -1 || l.indexOf(".png") !== -1 || l.indexOf(".jpg") !== -1 || l.indexOf(".gif") !== -1) return false;
            
            // Chặn script player và quảng cáo
            if (l.indexOf("jwplayer") !== -1 || l.indexOf("googletag") !== -1 || l.indexOf("facebook") !== -1 || l.indexOf("twitter") !== -1) return false;
            
            // Chặn link nội bộ không phải iframe player (Ngăn lỗi bắt nhầm data-url chia sẻ)
            if (l.indexOf("animevietsub.be") !== -1 && l.indexOf("/player/") === -1 && l.indexOf("/embed/") === -1 && l.indexOf(".m3u8") === -1 && l.indexOf(".mp4") === -1) return false;

            return true;
        };

        // 1. Quét iframe player đích thực
        var iframeRegex = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
        var match;
        while ((match = iframeRegex.exec(html)) !== null) {
            var src = decodeUrl(match[1]);
            if (isValid(src)) { 
                streamUrl = src; 
                break; 
            }
        }

        // 2. Quét m3u8 / mp4 trần
        if (!streamUrl) {
            var mediaMatch = html.match(/(https?:\/\/[^"'\s<>\[\]]+\.(?:m3u8|mp4)[^"'\s<>\[\]]*)/gi);
            if (mediaMatch) {
                for (var i = 0; i < mediaMatch.length; i++) {
                    if (isValid(mediaMatch[i])) { streamUrl = decodeUrl(mediaMatch[i]); break; }
                }
            }
        }

        // 3. Quét Base64 hoặc link trong thẻ data-
        if (!streamUrl) {
            var dataRegex = /data-(?:href|play|url|server)=["']([^"']+)["']/gi;
            var dMatch;
            while ((dMatch = dataRegex.exec(html)) !== null) {
                var dSrc = decodeUrl(dMatch[1]);
                if (isValid(dSrc) && (dSrc.indexOf("/player/") !== -1 || dSrc.indexOf("/embed/") !== -1 || dSrc.indexOf(".m3u8") !== -1 || dSrc.indexOf("http") !== 0)) {
                    streamUrl = dSrc;
                    break;
                }
            }
        }

        // 4. Quét biến script
        if (!streamUrl) {
            var scriptRegex = /(?:file|url|link_play|play_url|src)\s*[:=]\s*["']([^"']+)["']/gi;
            var sMatch;
            while ((sMatch = scriptRegex.exec(html)) !== null) {
                var sSrc = decodeUrl(sMatch[1]);
                if (isValid(sSrc) && (sSrc.indexOf("player") !== -1 || sSrc.indexOf("embed") !== -1 || sSrc.indexOf(".m3u8") !== -1 || sSrc.indexOf(".mp4") !== -1 || sSrc.indexOf("youtube") !== -1)) {
                    streamUrl = sSrc;
                    break;
                }
            }
        }
        
        // 5. Vét cạn YouTube Embed (Cho Trailer phim sắp chiếu)
        if (!streamUrl) {
            var ytMatch = html.match(/youtube\.com\/embed\/([^"'\?&]+)/i) || html.match(/youtube\.com\/watch\?v=([^"'&]+)/i);
            if (ytMatch) streamUrl = "https://www.youtube.com/watch?v=" + ytMatch[1];
        }

        if (streamUrl) {
            // Chuẩn hóa link
            if (streamUrl.indexOf("//") === 0) streamUrl = "https:" + streamUrl;
            else if (streamUrl.indexOf("/") === 0) streamUrl = "https://animevietsub.be" + streamUrl;

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
