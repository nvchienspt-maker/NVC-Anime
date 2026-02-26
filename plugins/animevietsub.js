// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "animevietsub",
        "name": "AnimeVietsub",
        "version": "1.1.2",
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

       // ==========================================
        // SỬA LỖI BẮT NHẦM TÊN PHIM (RATING)
        // ==========================================
        // Ưu tiên 1: Lấy tên ở thẻ div hoặc h (class name/Title)
        var titleMatch = innerHtml.match(/<div[^>]*class="[^"]*(?:name|Title|title)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (!titleMatch) {
            titleMatch = innerHtml.match(/<h[1-6][^>]*class="[^"]*(?:name|Title|title)[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/i);
        }
        // Ưu tiên 2: Lấy tên ở thuộc tính alt của ảnh (rất chính xác, không dính rating)
        if (!titleMatch) {
            titleMatch = innerHtml.match(/alt="([^"]+)"/i);
        }
        
        var title = titleMatch ? PluginUtils.cleanText(titleMatch[1]) : "Anime";

        // Chốt chặn an toàn: Nếu lỡ bắt nhầm đoạn "7.8 trong số 10", ép lấy thuộc tính alt của ảnh
        if (title.indexOf("trong số") !== -1 || title.indexOf("dựa trên") !== -1) {
            var altMatch = innerHtml.match(/alt="([^"]+)"/i);
            if (altMatch) title = PluginUtils.cleanText(altMatch[1]);
        }

        // ==========================================
        // SỬA LỖI BẮT SỐ TẬP (MỞ RỘNG CLASS)
        // ==========================================
        var epMatch = innerHtml.match(/<span[^>]*class="[^"]*(?:ep-status|tray-item|status|episode|label)[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        if (!epMatch) {
            epMatch = innerHtml.match(/<div[^>]*class="[^"]*(?:ep-status|tray-item|status|episode|label)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        }
        
        var episodeCurrent = epMatch ? PluginUtils.cleanText(epMatch[1]) : "Cập nhật";

        // ... (phần đẩy vào mảng matches giữ nguyên) ...

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
        
        // CỨU CÁNH: Nếu phim lẻ không có danh sách tập, phải tìm chính xác nút "Xem Phim"
        if (servers.length === 0) {
            var watchMatch = html.match(/<a[^>]*href=["']([^"']+xem-phim\.html)["']/i) ||
                             html.match(/<a[^>]*id=["']btn-film-watch["'][^>]*href=["']([^"']+)["']/i) ||
                             html.match(/<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*(btn-see|play|watch|btn-danger)[^"']*["']/i);
            
            var watchUrl = watchMatch ? (watchMatch[1] || watchMatch[2]) : "";

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

        // Hàm kiểm duyệt Thép: Lọc bỏ hoàn toàn rác và quảng cáo
        var processUrl = function(u) {
            if (!u) return "";
            u = u.replace(/&amp;/g, "&").replace(/\\\/|\\\\/g, "/").replace(/\\\//g, "/");
            var l = u.toLowerCase();

            if (l.indexOf("http") !== 0 && l.indexOf("//") !== 0) return "";
            if (l.length < 15) return ""; // Chặn các chuỗi ngắn củn như 'api'

            // DANH SÁCH ĐEN: Chặn tuyệt đối
            var blocked = ["sunwin", "bet", "casino", "youtube", "youtu.be", "facebook", "googletag", ".js", ".css", ".png", ".jpg", ".gif", "jwplayer", "/phim/", "-5467", "api"];
            for (var i = 0; i < blocked.length; i++) {
                if (l.indexOf(blocked[i]) !== -1) {
                    // Ngoại lệ: Nếu link có đuôi m3u8 thật thì cho qua, nhưng youtube/facebook/sunwin thì giết sạch
                    if ((l.indexOf(".m3u8") !== -1 || l.indexOf(".mp4") !== -1) && blocked[i] !== "sunwin" && blocked[i] !== "youtube" && blocked[i] !== "facebook") {
                        continue; 
                    }
                    return "";
                }
            }

            // CHỈ CHO PHÉP luồng video thực sự đi qua
            if (l.indexOf(".m3u8") !== -1 || l.indexOf(".mp4") !== -1 || l.indexOf("/player/") !== -1 || l.indexOf("/embed/") !== -1 || l.indexOf("v2") !== -1) {
                return u;
            }
            return "";
        };

        var candidates = [];

        // 1. Quét thẻ iframe 
        var iframeRegex = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
        var iMatch; while ((iMatch = iframeRegex.exec(html)) !== null) { candidates.push(iMatch[1]); }

        // 2. Quét thẻ data- của các nút Server (Thường dùng cho Server DU, HDX)
        var dataRegex = /data-(?:href|play|url|server)=["']([^"']+)["']/gi;
        var dMatch; while ((dMatch = dataRegex.exec(html)) !== null) { candidates.push(dMatch[1]); }

        // 3. Quét biến Javascript cấu hình
        var scriptRegex = /(?:file|url|link_play|play_url|src)\s*[:=]\s*["']([^"']+)["']/gi;
        var sMatch; while ((sMatch = scriptRegex.exec(html)) !== null) { candidates.push(sMatch[1]); }

        // 4. Giải mã Base64 (Thủ thuật Animevietsub hay giấu link sau chuỗi aHR0cHM6Ly...)
        var base64Regex = /aHR0c[a-zA-Z0-9\+\/\=]+/g;
        var bMatch; while ((bMatch = base64Regex.exec(html)) !== null) { 
            try { candidates.push(atob(bMatch[0])); } catch(e){} 
        }

        // 5. Quét m3u8 trần trong HTML
        var m3u8Regex = /(https?:\/\/[^"'\s<>\[\]]+\.(?:m3u8|mp4)[^"'\s<>\[\]]*)/gi;
        var mMatch; while ((mMatch = m3u8Regex.exec(html)) !== null) { candidates.push(mMatch[1]); }

        // Lọc vàng từ cát: Đưa tất cả vào bộ kiểm duyệt
        for (var idx = 0; idx < candidates.length; idx++) {
            var safeUrl = processUrl(candidates[idx]);
            if (safeUrl) {
                streamUrl = safeUrl;
                // Nếu tìm thấy m3u8, ưu tiên chốt luôn
                if (streamUrl.indexOf(".m3u8") !== -1 || streamUrl.indexOf(".mp4") !== -1) {
                    break;
                }
            }
        }

        // Trả kết quả chuẩn
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
