# How Long To Beat Bulk Search
This application will create a local server with NodeJS + Express to call the Search API from [howlongtobeat.com](https://howlongtobeat.com).

## How To Use
1. Clone this repo
2. Install the latest version of [Node](https://nodejs.org/en)
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
6. Perform an HTTP request, you can use Postman or curl. Send a POST request to the url `localhost:3000` with a body like the following:
```
{
    "games": [
        "Return of the Obra Dinn",
        "Resident Evil 4 (2005)",
        "NotAValidGame"
    ]
}
```

This example will return the following response:
```
{
    "data": [
        {
            "name": "Return of the Obra Dinn",
            "main": 8,
            "plus": 10,
            "hundred": 10
        },
        {
            "name": "Resident Evil 4 (2005)",
            "main": 16,
            "plus": 19,
            "hundred": 31
        }
    ],
    "notFound": [
        "NotAValidGame"
    ]
}
```

## Notes
This services calls the HowLongToBeat Search API every 250ms. If you are making use of it please be mindful of the number of calls you are performing to their API.


Note that if two games have the same name and use the year to tell apart, like `Resident Evil 4 (2005)` and `Resident Evil 4 (2023)`, then you must include the year in parenthesis at the end. If you just use `Resident Evil 4` the search will not know which result to return.

While developing this I noticed that the search API URL might change, so look into the code where you need to update it in case the search is not working because of this.