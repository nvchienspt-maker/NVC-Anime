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

    var servers = [];
    var serverIndex = 1;

    // 🔥 Bắt mọi block server có chứa link tập
    var serverRegex =
        /<div[^>]*class="[^"]*(?:server|Server|list-server|episode-list)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>?/gi;

    var serverMatch;

    while ((serverMatch = serverRegex.exec(html)) !== null) {

        var block = serverMatch[1];
        var episodes = [];

        var epRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
        var epMatch;

        while ((epMatch = epRegex.exec(block)) !== null) {

            var epUrl = epMatch[1];
            var epName = clean(epMatch[2]);

            if (!epUrl.includes("/phim/")) continue;

            episodes.push({
                id: epUrl.replace(/^(https?:\/\/[^\/]+)?\//i, ""),
                name: "Tập " + epName.replace(/tập\s*/i, ""),
                slug: epUrl
            });
        }

        if (episodes.length > 0) {
            servers.push({
                name: "Server " + serverIndex,
                episodes: episodes
            });
            serverIndex++;
        }
    }

    // 🔥 Fallback nếu không bắt được theo block
    if (servers.length === 0) {

        var episodes = [];
        var fallbackRegex = /<a[^>]+href=["']([^"']*tap-[^"']+)["'][^>]*>(.*?)<\/a>/gi;

        var m;
        while ((m = fallbackRegex.exec(html)) !== null) {

            var epUrl = m[1];
            var epName = clean(m[2]);

            episodes.push({
                id: epUrl.replace(/^(https?:\/\/[^\/]+)?\//i, ""),
                name: "Tập " + epName,
                slug: epUrl
            });
        }

        if (episodes.length > 0) {
            servers.push({
                name: "Server 1",
                episodes: episodes
            });
        }
    }

    return JSON.stringify({
        title: title,
        posterUrl: poster,
        backdropUrl: poster,
        description: "",
        servers: servers
    });
}
