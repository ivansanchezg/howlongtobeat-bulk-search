import express, { Request, Response } from "express";
import cors from "cors";
import { HLTBService } from "./hltbService";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const hltb = new HLTBService();

app.post("/", async (req: Request, res: Response) => {
    const games = req.body.games;
    const results = [];
    const notFound = [];

    for (const game of games) {
        const data = await hltb.search(game);
        if (data) results.push(data);
        else notFound.push(game);

        await new Promise(r => setTimeout(r, 250));
    }

    res.send({ data: results, notFound });
});

app.listen(port, () => {
    console.log(`HLTB API server running on port ${port}`);
});
