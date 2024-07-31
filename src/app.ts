const express = require('express');
import { Request, Response } from 'express';
const cors = require('cors');

interface GameData {
    name: string,
    main: number,
    plus: number,
    hundred: number,
};

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// This is the original URL, but sometimes it can change.
// If the search is not working or returning hours different from HowLongToBeat
// check the url that website is using when performing a search.
const url = 'https://howlongtobeat.com/api/search'; 

const headers = {
    'Referer': 'https://howlongtobeat.com/',
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Host': 'howlongtobeat.com',
    'Cache-Control': 'no-cache',
    'User-Agent': 'PostmanRuntime/7.40.0',
};

app.post('/', async (req: Request, res: Response) => {
    console.log("Calling How Long To Beat");
    const games = req.body.games;

    const results: GameData[] = [];
    const notFound: string[] = [];

    for (const game of games) {
        const result = await getData(game);
        if (result === undefined) {
            notFound.push(game);
        } else {
            results.push(result);
        }
        await sleep(250);
    }

    const data = await Promise.all(results);
    const filteredData = data.filter((e) => e !== undefined)

    console.log("Finished fetching the data");

    res.send({
        data: filteredData,
        notFound: notFound,
    });
});

app.listen(port, () => {
    console.log(`How Long To Beat API caller listening on port ${port}`);
});

async function getData(gameName: string): Promise<GameData | undefined> {
    var searchTerm = gameName.replace(":", "").replace(", ", " ").replace(" - ", " ");
    var year: string = null;
    const yearMatch = gameName.match(/\(\d{4}\)/g);
    if (yearMatch !== null) {
        year = yearMatch[0].replace("(", "").replace(")", "");
        searchTerm = searchTerm.replace(/\(\d{4}\)/g, "");
    }    

    const body = {
        "searchType": "games",
        "searchTerms": searchTerm.trim().split(" "),
        "searchPage": 1,
        "size": 10,
        "searchOptions": {
            "games": {
                "userId": 0,
                "platform": "",
                "sortCategory": "popular",
                "rangeCategory": "main",
                "rangeTime": {
                    "min": null,
                    "max": null
                },
                "gameplay": {
                    "perspective": "",
                    "flow": "",
                    "genre": ""
                },
                "rangeYear": {
                    "min": "",
                    "max": ""
                },
                "modifier": ""
            },
            "users": {
                "sortCategory": "postcount"
            },
            "lists": {
                "sortCategory": "follows"
            },
            "filter": "",
            "sort": 0,
            "randomizer": 0
        },
        "useCache": true
    };

    const request = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
    };

    const response = await fetch(url, request);
    const result = await response.json();
    const data = result.data;

    if (data.length == 1) {
        return createRecord(data[0]);
    }

    if (data.length > 1) {
        const filtered = data.filter((game) => simplifyName(game.game_name) === simplifyName(gameName));
        if (filtered.length === 1) {
            return createRecord(filtered[0]);
        } else if (year !== null) {
            const nameWithoutYear = gameName.replace(/\(\d{4}\)/g, "").trim();
            const filteredWithYear = data.filter(
                (game) => simplifyName(game.game_name) === simplifyName(nameWithoutYear) && game.release_world === parseInt(year)
            );
            if (filteredWithYear.length === 1) {
                return createRecord(filteredWithYear[0], year);
            }
        }
    }

    return undefined;
}

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function simplifyName(name: string) {
    return name
        .replace(":", "")
        .replace(", ", " ")
        .replace(" - ", " ")
        .trim()
        .toLocaleLowerCase();
}

function createRecord(data: any, year?: string): GameData {
    return {
        name: year ? `${data.game_name} (${year})` : data.game_name,
        main: getClosestValue(data.comp_main),
        plus: getClosestValue(data.comp_plus),
        hundred: getClosestValue(data.comp_100),
    };
}

function getClosestValue(value: number): number {
    // The value returned by HowLongToBeat is in seconds so we divide by 3600 to convert it to hours.
    const hours = value / 3600;
    const flooredHours = Math.floor(hours);
    const decimal = hours - flooredHours;
    if (decimal < 0.25) {
        return flooredHours;
    } else if (decimal >= 0.25 && decimal < 0.75) {
        return flooredHours + 0.5;
    } else {
        return Math.ceil(hours);
    }
}