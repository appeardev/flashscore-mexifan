import { TIMEOUT } from "../constants/index.js";

export const openPageAndNavigate = async (context, url) => {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
};

export const dismissConsent = async (page) => {
  try {
    await page.click("#onetrust-accept-btn-handler", { timeout: 3000 });
  } catch {
    // consent already dismissed or not present
  }
  await page.waitForTimeout(1000);
};

export const waitAndClick = async (page, selector, timeout = TIMEOUT) => {
  await page.waitForSelector(selector, { timeout });
  await page.evaluate(async (selector) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView();
      element.click();
    }
  }, selector);
};

export const waitForSelectorSafe = async (
  page,
  selectors = [],
  timeout = TIMEOUT
) => {
  return Promise.all(
    selectors.map(async (selector) => {
      try {
        await page.waitForSelector(selector, { timeout });
      } catch {}
    })
  );
};
