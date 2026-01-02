import * as tmdb from "./tmdb.js";
import * as server from "./server.js";
import * as parse from "./parse.js";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from 'node:url';
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lastPath = path.join(__dirname, "./last.json");

// Ensure last.json exists
let last;
try {
    last = JSON.parse(readFileSync(lastPath, "utf-8"));
} catch (e) {
    last = { stage: 0, time: 0 };
}

function updateLast() {
    writeFileSync(lastPath, JSON.stringify(last, null, 2));
}

async function run() {
    console.log("🚀 Starting Automation Script...");

    // 1. Update Provider Mappings (FlixHQ & Fmovies)
    console.log("📦 Updating FlixHQ mappings...");
    await server.ini("flixhq");

    console.log("📦 Updating Fmovies mappings...");
    await server.ini("fmovies");

    // 2. Check for TMDB Updates (Weekly)
    const currentTime = Date.now();
    const ONE_WEEK = 60 * 60 * 24 * 7 * 1000;

    if ((currentTime - last.time) > ONE_WEEK) {
        console.log("⏰ Weekly TMDB update due. Current stage:", last.stage);

        try {
            switch (last.stage) {
                case 0:
                    console.log("🎬 Stage 0: TMDB Init...");
                    await tmdb.ini();
                    last.stage = 1;
                    updateLast();
                case 1:
                    console.log("🎬 Stage 1: Parsing data...");
                    // Assuming parse.ini() is sync based on main.js usage
                    await parse.ini();
                    last.stage = 2;
                    updateLast();
                case 2:
                    console.log("🎬 Stage 2: Ready for repo update.");
                    last.stage = 0;
                    last.time = currentTime;
                    updateLast();
            }
        } catch (err) {
            console.error("❌ Error during TMDB update:", err);
        }
    } else {
        console.log("⏭️ TMDB update not due yet. Last update:", new Date(last.time).toLocaleString());
    }

    console.log("✅ Automation script finished!");
}

run().catch(err => {
    console.error("💥 Fatal Error:", err);
    process.exit(1);
});
