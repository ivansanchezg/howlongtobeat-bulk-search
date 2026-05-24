// src/hltbService.ts
import UserAgent from "user-agents";

const BASE_URL = "https://howlongtobeat.com/";
const INIT_URL = BASE_URL + "api/bleed/init";
const SEARCH_URL = BASE_URL + "api/bleed";

export interface GameData {
    name: string;
    main: number;
    plus: number;
    hundred: number;
}

interface AuthInfo {
    token: string;
    hpKey: string;
    hpVal: string;
    userAgent: string;
}

export class HLTBService {
    private readonly minSimilarity = 0.5;

    async search(gameName: string): Promise<GameData | undefined> {
        if (!gameName || !gameName.trim()) {
            return undefined;
        }

        const auth = await this.getAuthInfo();
        if (!auth) {
            console.error("Failed to get HLTB auth info");
            return undefined;
        }

        const payload = this.buildPayload(gameName, auth);
        const headers = this.buildHeaders(auth);

        const response = await fetch(SEARCH_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("HLTB search error:", response.status, await response.text());
            return undefined;
        }

        const json = await response.json();
        const data = json.data as any[];

        if (!Array.isArray(data) || data.length === 0) {
            return undefined;
        }

        const best = this.pickBestMatch(gameName, data);
        if (!best) {
            return undefined;
        }

        return this.mapToGameData(best.entry, best.requestedYear);
    }

    // ---------- Auth bootstrap ----------

    private async getAuthInfo(): Promise<AuthInfo | null> {
        const userAgent = new UserAgent().toString();

        const response = await fetch(`${INIT_URL}?t=${Date.now()}`, {
            headers: {
                "User-Agent": userAgent,
                "Referer": BASE_URL
            }
        });

        if (!response.ok) {
            console.error("HLTB init error:", response.status, await response.text());
            return null;
        }

        const json = await response.json();
        if (!json || !json.token || !json.hpKey || !json.hpVal) {
            console.error("HLTB init missing fields:", json);
            return null;
        }

        return {
            token: json.token,
            hpKey: json.hpKey,
            hpVal: json.hpVal,
            userAgent
        };
    }

    private buildHeaders(auth: AuthInfo) {
        return {
            "Content-Type": "application/json",
            "User-Agent": auth.userAgent,
            "Referer": BASE_URL,
            "X-Auth-Token": auth.token,
            "X-Hp-Key": auth.hpKey,
            "X-Hp-Val": auth.hpVal
        };
    }

    private buildPayload(gameName: string, auth: AuthInfo) {
        const searchTerms = gameName
            .replace(/\(\d{4}\)/, "")
            .trim()
            .split(/\s+/);

        return {
            [auth.hpKey]: auth.hpVal,
            searchType: "games",
            searchTerms,
            searchPage: 1,
            size: 20,
            searchOptions: {
                games: {
                    userId: 0,
                    platform: "",
                    sortCategory: "popular",
                    rangeCategory: "main",
                    rangeTime: { min: 0, max: 0 },
                    gameplay: {
                        perspective: "",
                        flow: "",
                        genre: "",
                        difficulty: ""
                    },
                    rangeYear: { min: "", max: "" },
                    modifier: ""
                },
                users: { sortCategory: "postcount" },
                lists: { sortCategory: "follows" },
                filter: "",
                sort: 0,
                randomizer: 0
            },
            useCache: true
        };
    }

    // ---------- Matching logic ----------

    private pickBestMatch(originalName: string, data: any[]): any | null {
        const yearMatch = originalName.match(/\((\d{4})\)/);
        const requestedYear = yearMatch ? parseInt(yearMatch[1]) : null;

        const cleanedSearch = originalName
            .replace(/\(\d{4}\)/, "")
            .trim()
            .toLowerCase();

        let bestMatch: any = null;
        let bestScore = 0;

        for (const entry of data) {
            const name = (entry.game_name || "").toLowerCase();
            const alias = (entry.game_alias || "").toLowerCase();

            const scoreName = this.similarity(name, cleanedSearch);
            const scoreAlias = this.similarity(alias, cleanedSearch);
            const score = Math.max(scoreName, scoreAlias);

            if (score > bestScore) {
                bestScore = score;
                bestMatch = entry;
            }
        }

        if (!bestMatch || bestScore < this.minSimilarity) {
            return null;
        }

        if (requestedYear) {
            const yearCandidate = data.find(e => {
                const name = (e.game_name || "").toLowerCase();
                const alias = (e.game_alias || "").toLowerCase();
                const score = Math.max(
                    this.similarity(name, cleanedSearch),
                    this.similarity(alias, cleanedSearch)
                );
                return score >= this.minSimilarity && e.release_world === requestedYear;
            });

            if (yearCandidate) {
                bestMatch = yearCandidate;
            }
        }

        return {
            entry: bestMatch,
            requestedYear,
        };
    }

    private similarity(a: string, b: string): number {
        if (!a || !b) return 0;
        a = a.toLowerCase();
        b = b.toLowerCase();

        const dp: number[][] = Array.from({ length: b.length + 1 }, () => []);
        for (let i = 0; i <= b.length; i++) dp[i][0] = i;
        for (let j = 0; j <= a.length; j++) dp[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i - 1] === a[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j - 1] + 1,
                        dp[i][j - 1] + 1,
                        dp[i - 1][j] + 1
                    );
                }
            }
        }

        const dist = dp[b.length][a.length];
        const maxLen = Math.max(a.length, b.length);
        return maxLen === 0 ? 1 : (maxLen - dist) / maxLen;
    }

    // ---------- Mapping ----------

    private mapToGameData(entry: any, requestedYear: number | null): GameData {
        let name = entry.game_name;

        // Only include the year if the user explicitly searched with a year
        if (requestedYear) {
            name = `${name} (${requestedYear})`;
        }

        return {
            name,
            main: this.toHours(entry.comp_main),
            plus: this.toHours(entry.comp_plus),
            hundred: this.toHours(entry.comp_100)
        };
    }

    private toHours(seconds: number): number {
        if (!seconds || seconds <= 0) return 0;
        const hours = seconds / 3600;
        const floored = Math.floor(hours);
        const decimal = hours - floored;

        if (decimal < 0.25) return floored;
        if (decimal < 0.75) return floored + 0.5;
        return Math.ceil(hours);
    }
}
