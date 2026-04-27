import { TIMEOUT } from "../../../constants/index.js";
import { openPageAndNavigate, dismissConsent } from "../../index.js";

const buildLineupsUrl = (matchUrl) => {
  if (!matchUrl) return null;
  const url = new URL(matchUrl);
  const base = url.origin + url.pathname.replace(/\/$/, "");
  const mid = url.searchParams.get("mid");
  return `${base}/summary/lineups/?mid=${mid}`;
};

export const getLineupsAndBench = async (context, matchUrl) => {
  const lineupsUrl = buildLineupsUrl(matchUrl);
  if (!lineupsUrl) return null;

  const page = await openPageAndNavigate(context, lineupsUrl);
  await dismissConsent(page);

  try {
    await page.waitForSelector("[data-testid='wcl-lineupsParticipantGeneral-left']", { timeout: 15000 });
  } catch {
    await page.close();
    return { available: false };
  }

  await page.waitForTimeout(1500);

  const lineupData = await page.evaluate(() => {
    const tabContent = document.querySelector(".tabContent__lineups") || document.body;

    const allElements = tabContent.querySelectorAll(
      "[class*='headerSection'], [data-testid='wcl-lineupsParticipantGeneral-left'], [data-testid='wcl-lineupsParticipantGeneral-right']"
    );

    const sections = {
      "STARTING LINEUPS": { home: [], away: [] },
      SUBSTITUTES: { home: [], away: [] },
      "MISSING PLAYERS": { home: [], away: [] },
      COACHES: { home: [], away: [] },
    };

    let currentSection = null;

    const extractPlayer = (el) => {
      const num = el.querySelector("[class*='number_lTBFk']")?.innerText?.trim() || null;
      const nameEl = el.querySelector("[class*='name_ZggyJ']");
      const name = nameEl?.innerText?.trim() || el.innerText?.trim().split("\n").pop();
      const roleEl = el.querySelector("[title='Goalkeeper'], [title='Captain']");
      const role = roleEl?.innerText?.trim().replace(/[()]/g, "") || null;
      const link = el.querySelector("a")?.href || null;
      return { num, name, role, link };
    };

    for (const el of allElements) {
      if (el.className && el.className.toString().includes("headerSection")) {
        const txt = el.innerText?.trim().split("\n")[0].toUpperCase();
        if (sections[txt]) currentSection = txt;
        continue;
      }
      if (!currentSection) continue;
      const isHome = el.getAttribute("data-testid") === "wcl-lineupsParticipantGeneral-left";
      const player = extractPlayer(el);
      if (player.name) sections[currentSection][isHome ? "home" : "away"].push(player);
    }

    const formationSpans = tabContent.querySelectorAll("[class*='headerSection'] span");
    const formations = Array.from(formationSpans)
      .map((s) => s.innerText?.trim())
      .filter((t) => /^\d+\s*-/.test(t));

    return {
      formation: { home: formations[0] || null, away: formations[1] || null },
      starting: sections["STARTING LINEUPS"],
      substitutes: sections["SUBSTITUTES"],
      missing: sections["MISSING PLAYERS"],
      coaches: sections["COACHES"],
    };
  });

  await page.close();
  return { available: true, ...lineupData };
};
