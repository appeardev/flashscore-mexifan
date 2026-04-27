import { chromium } from "playwright";
import pLimit from "p-limit";
import chalk from "chalk";
import fs from "fs";
import path from "path";

import { dismissConsent } from "./scraper/index.js";
import { getMatchData } from "./scraper/services/matches/index.js";
import { getLineupsAndBench } from "./scraper/services/lineups/index.js";

const SEASON_SLUG = process.env.SEASON_SLUG || "liga-mx";
const SEASON_LABEL = process.env.SEASON_LABEL || "current";
const LIGA_MX_RESULTS_URL = `https://www.flashscore.com/football/mexico/${SEASON_SLUG}/results/`;
const LIGA_MX_FIXTURES_URL = `https://www.flashscore.com/football/mexico/${SEASON_SLUG}/fixtures/`;
const OUTPUT_DIR = path.resolve(`./data/liga-mx/${SEASON_LABEL}`);
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const withRetry = async (fn, retries = 3) => {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    const delay = (4 - retries) * 750;
    console.warn(`⚠️  Retry in ${delay}ms... (${err.message})`);
    await sleep(delay);
    return withRetry(fn, retries - 1);
  }
};

const collectMatchLinks = async (context, baseUrl) => {
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await dismissConsent(page);

  // Click "Show more matches" until exhausted
  const LOAD_MORE = '[data-testid="wcl-buttonLink"]';
  for (let i = 0; i < 12; i++) {
    const btn = await page.$(LOAD_MORE);
    if (!btn) break;
    try {
      await btn.click();
      await page.waitForTimeout(800);
    } catch {
      break;
    }
  }

  await page.waitForTimeout(1500);
  const matches = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".event__match")).map((el) => {
      const id = el.id?.replace("g_1_", "") || null;
      const link = el.querySelector("a.eventRowLink, a")?.href || null;
      const home = el
        .querySelector(".event__participant--home, .event__homeParticipant")
        ?.innerText?.trim();
      const away = el
        .querySelector(".event__participant--away, .event__awayParticipant")
        ?.innerText?.trim();
      const time = el.querySelector(".event__time")?.innerText?.trim() || null;
      return { id, link, home, away, time };
    }).filter((m) => m.id && m.link);
  });

  await page.close();
  return matches;
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const includeFixtures = !args.has("--results-only");
  const lineupsOnly = args.has("--lineups-only");
  const concurrency = parseInt(process.env.CONCURRENCY || "3", 10);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: USER_AGENT });

  try {
    console.log(chalk.cyan("→ Collecting Liga MX match links..."));
    const results = await collectMatchLinks(context, LIGA_MX_RESULTS_URL);
    const fixtures = includeFixtures
      ? await collectMatchLinks(context, LIGA_MX_FIXTURES_URL)
      : [];
    const matches = [...fixtures, ...results];
    console.log(chalk.green(`  ${results.length} results + ${fixtures.length} fixtures = ${matches.length} matches`));

    const limit = pLimit(concurrency);
    const data = {};
    let done = 0;

    const tasks = matches.map((m) =>
      limit(async () => {
        try {
          const matchData = lineupsOnly
            ? null
            : await withRetry(() => getMatchData(context, { id: m.id, url: m.link }));
          const lineups = await withRetry(() => getLineupsAndBench(context, m.link));
          data[m.id] = {
            id: m.id,
            url: m.link,
            home: m.home,
            away: m.away,
            time: m.time,
            ...(matchData || {}),
            lineups,
          };
        } catch (err) {
          console.warn(chalk.yellow(`  ⚠️  ${m.home} vs ${m.away}: ${err.message}`));
          data[m.id] = { id: m.id, url: m.link, home: m.home, away: m.away, error: err.message };
        }
        done += 1;
        if (done % 5 === 0) {
          process.stdout.write(chalk.gray(` [${done}/${matches.length}]`));
        }
      })
    );

    await Promise.all(tasks);
    console.log("");

    const stamp = new Date().toISOString().slice(0, 10);
    const outFile = path.join(OUTPUT_DIR, `${SEASON_LABEL}-${stamp}.json`);
    const latestFile = path.join(OUTPUT_DIR, "latest.json");
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
    fs.writeFileSync(latestFile, JSON.stringify(data, null, 2));

    console.log(chalk.green(`\n✅ Saved ${Object.keys(data).length} matches`));
    console.log(chalk.cyan(`   ${outFile}`));
    console.log(chalk.cyan(`   ${latestFile}\n`));
  } finally {
    await context.close();
    await browser.close();
  }
};

main().catch((err) => {
  console.error(chalk.red(`\n❌ ${err.message}\n`));
  process.exit(1);
});
