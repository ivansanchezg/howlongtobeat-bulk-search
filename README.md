# How Long To Beat Bulk Search
A lightweight local API server (NodeJS + Express) that performs bulk game time lookups using the modern HowLongToBeat search system.

This project handles all the complexity of HLTB’s new /api/bleed authentication flow — including dynamic tokens, CSRF keys, and browser‑like headers — so you can simply send a list of game names and get structured results back.

## How To Use
1. Clone this repo
```shell
git clone https://github.com/ivansanchezg/howlongtobeat-bulk-search.git
```
2. Install Node.js (v18 or newer)
3. Install dependencies
```shell
npm i
```
4. Compile typescript:
```shell
npx tsc
```
5. Start the server
```
node ./dist/app.js
```
You should see:
```shell
HLTB API server running on port 3000
```

6. Send a POST request
Use Postman, culr or any HTTP client.

**URL**
```shell
http://localhost:3000
```

**Body**
```json
{
    "games": [
        "Return of the Obra Dinn",
        "Resident Evil 4 (2005)",
        "NotAValidGame"
    ]
}
```

**Example Response**
```json
{
    "data": [
        {
            "name": "Return of the Obra Dinn",
            "main": 8,
            "plus": 9.5,
            "hundred": 10.5
        },
        {
            "name": "Resident Evil 4",
            "main": 15.5,
            "plus": 19.5,
            "hundred": 32
        }
    ],
    "notFound": [
        "NotAValidGame"
    ]
}
```

## How It Works (Important Notes)
### 1. Uses the modern /api/bleed endpoint
HowLongToBeat no longer exposes a public search API.
All search requests now go through:
- /api/bleed/init → retrieves dynamic auth tokens
- /api/bleed → performs the actual search

This project automatically handles:
- CSRF key/value injection
- X‑Auth‑Token generation
- Browser‑like User‑Agent rotation
- Required headers
- Payload formatting

No action is required from you — the server does all of this internally.

### 2. Fuzzy matching + year detection
HLTB often returns multiple entries for the same title (e.g., remakes, VR versions, DLCs).

This project uses:
- Levenshtein similarity
- Alias matching
- Year extraction
- Release year filtering

So:
- "Resident Evil 4 (2005)" → returns the 2005 original
- "Resident Evil 4 (2023)" → returns the remake
- "Resident Evil 4" → returns the closest match

If two games share the same name, include the year in parentheses to guarantee the correct result.

### 3. Rate limiting
The server waits 250ms between requests to avoid hammering HowLongToBeat’s servers.

If you plan to process large lists, consider batching your requests.

## Getting your list of games in Steam
You can find your list of games by goint to https://store.steampowered.com/account/licenses/

## Disclaimer
This project is not affiliated with HowLongToBeat.
Use responsibly and avoid excessive automated requests.