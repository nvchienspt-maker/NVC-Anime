// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "animevietsub",
        "name": "AnimeVietsub",
        "version": "1.0.0",
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
            { name: 'Mới cập nhật', value: 'update' },
            { name: 'Xem nhiều nhất', value: 'view' }
        ],
        category: [
            { name: 'Tất cả', value: '' },
            { name: 'Hành Động', value: 'hanh-dong' },
            { name: 'Chuyển Sinh (Isekai)', value: 'chuyen-sinh' },
            { name: 'Tình Cảm', value: 'tinh-cam' },
            { name: 'Học Đường', value: 'hoc-duong' }
        ]
    });
}

// =============================================================================
// URL GENERATION
// =============================================================================

function getUrlList(slug, filtersJson) {
    var baseUrl = "https://animevietsub.be";
    if (!slug) slug = "phim-moi";
    
    // Xử lý phân trang (nếu bộ lọc có trang)
    var filters = {};
    try { filters = JSON.parse(filtersJson || "{}"); } catch (e) {}
    var page = filters.page ? "/trang-" + filters.page + ".html" : "";

    // Xử lý slug chuẩn của AnimeVietsub (thường là /danh-sach/slug/ hoặc /the-loai/slug/)
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

    // Pattern tìm các khối phim trên AnimeVietsub (thường nằm trong li hoặc div mang class TPostMv / TPost)
    var itemRegex = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    var match;

    while ((match = itemRegex.exec(html)) !== null) {
        var fullUrl = match[1];
        var innerHtml = match[2];

        // Lọc link rác, chỉ giữ link có chứa /phim/ (định dạng URL chi tiết phim của AnimeVietsub)
        if (fullUrl.indexOf("/phim/") === -1) continue;

        var id = fullUrl.replace("https://animevietsub.be/", "").replace(/^\//, "");

        // Bắt Thumbnail
        var thumbMatch = innerHtml.match(/<img[^>]*src="([^"]+)"/i) || innerHtml.match(/data-src="([^"]+)"/i);
        var thumb = thumbMatch ? thumbMatch[1] : "https://animevietsub.be/favicon.ico";

        // Bắt Tiêu đề
        var titleMatch = innerHtml.match(/title="([^"]+)"/i) || innerHtml.match(/<div[^>]*class="[^"]*Title[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        var title = titleMatch ? PluginUtils.cleanText(titleMatch[1] || titleMatch[2]) : "Anime";

        // Bắt Tập phim hiện tại (Ví dụ: Tập 12/12, HD Vietsub)
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
        pagination: {
            currentPage: 1,
            totalPages: 10, // Có thể cải tiến bằng cách bóc tách thẻ phân trang
            totalItems: matches.length,
            itemsPerPage: matches.length
        }
    });
}

function parseSearchResponse(html) {
    return parseListResponse(html);
}

function parseMovieDetail(html) {
    try {
        // Bắt Tiêu đề chính
        var titleMatch = html.match(/<h1[^>]*class="[^"]*Title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || 
                         html.match(/<title>([\s\S]*?)<\/title>/i);
        var title = titleMatch ? PluginUtils.cleanText(titleMatch[1]) : "Chi tiết Anime";

        // Bắt Ảnh Poster
        var posterMatch = html.match(/<div[^>]*class="[^"]*Image[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/i);
        var posterUrl = posterMatch ? posterMatch[1] : "";

        // Bắt Nội dung phim
        var descMatch = html.match(/<div[^>]*class="[^"]*Description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        var description = descMatch ? PluginUtils.cleanText(descMatch[1]) : "";

        // Lấy link trang xem phim (nút Xem Phim) để cào danh sách tập
        var watchUrlMatch = html.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*btn-see[^"]*"[^>]*>/i) ||
                            html.match(/<a[^>]*href="([^"]+)"[^>]*>Xem Phim<\/a>/i);
        var watchUrl = watchUrlMatch ? watchUrlMatch[1] : "";

        var servers = [];
        var episodes = [];

        // --- NẾU ĐÂY LÀ TRANG XEM PHIM (Có danh sách tập) ---
        var epBlockRegex = /<ul[^>]*class="[^"]*list-episode[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
        var epBlockMatch = epBlockRegex.exec(html);

        if (epBlockMatch) {
            var epListHtml = epBlockMatch[1];
            var epItemRegex = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
            var epItem;

            while ((epItem = epItemRegex.exec(epListHtml)) !== null) {
                var epLink = epItem[1];
                var epName = PluginUtils.cleanText(epItem[2]);
                
                // Trích xuất ID tập phim để lấy luồng
                var epId = epLink.replace("https://animevietsub.be/", "").replace(/^\//, "");

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
        // --- NẾU LÀ TRANG THÔNG TIN (Chưa có danh sách tập, cần trigger logic load tập) ---
        else if (watchUrl) {
            // Đối với kiến trúc app, ta truyền ID của trang xem phim vào thay vì trang chi tiết
            // để lần gọi parseDetailResponse tiếp theo lấy được luồng hoặc danh sách tập.
            servers.push({
                name: "Server 1",
                episodes: [{
                    id: watchUrl.replace("https://animevietsub.be/", "").replace(/^\//, ""),
                    name: "Phát Phim",
                    slug: "play"
                }]
            });
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

        // AnimeVietsub thường chứa link phim trong các thẻ iframe hoặc script biến cấu hình
        
        // Cấp độ 1: Bóc link m3u8 lộ trực tiếp trong mã nguồn / script
        var m3u8Match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
        if (m3u8Match) {
            streamUrl = m3u8Match[1];
        }

        // Cấp độ 2: Bóc link từ player iframe (thường là các server dự phòng)
        if (!streamUrl) {
            var iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
            if (iframeMatch) {
                var src = iframeMatch[1];
                if (src.indexOf("youtube") === -1 && src.indexOf("facebook") === -1) {
                    streamUrl = src;
                }
            }
        }

        // Cấp độ 3: Bóc từ biến JSON hoặc API nội bộ của trang xem phim
        if (!streamUrl) {
            var sourceMatch = html.match(/sources:\s*\[\s*{\s*file:\s*["']([^"']+)["']/i) ||
                              html.match(/link_play\s*=\s*["']([^"']+)["']/i);
            if (sourceMatch) {
                streamUrl = sourceMatch[1];
            }
        }

        if (streamUrl) {
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

function parseCategoriesResponse(html) {
    return getPrimaryCategories();
}

function parseCountriesResponse(html) { return "[]"; }
function parseYearsResponse(html) { return "[]"; }
