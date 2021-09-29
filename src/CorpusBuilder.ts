import * as fs from "fs";
import * as Path from "path";
import {
  chromium,
  ChromiumBrowser,
  ChromiumBrowserContext,
  Page,
} from "playwright-chromium";
import { exit } from "process";
import { replaceNonAlphaNumSymbolsWith } from "./Util";

export default class CorpusBuilder {
  readonly sessionPath = "corpus_builder_session.json";

  readonly visitedSites = new Set<string>();

  readonly baseUrl = "https://www.britannica.com/";
  readonly blockedResourcesOnSubmit: Set<string> = new Set([
    "image",
    "font",
    "stylesheet",
    "script",
  ]);

  getSession(): Array<{
    name: string;
    value: string;
    url?: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  }> {
    const sessionString = fs.readFileSync(this.sessionPath).toString();
    const parsedSession = JSON.parse(sessionString);
    return parsedSession;
  }

  async restoreSession(
    browser: ChromiumBrowser
  ): Promise<ChromiumBrowserContext> {
    const previousSession = fs.existsSync(this.sessionPath);
    const context = await browser.newContext({
      userAgent: "chrome",
      viewport: null,
    });
    if (previousSession) {
      context.addCookies(this.getSession());
    }
    return context;
  }

  async saveSession(context: ChromiumBrowserContext): Promise<void> {
    const cookies = await context.cookies();
    fs.writeFile(
      this.sessionPath,
      JSON.stringify(cookies, null, 2),
      async (err) => {
        if (err) {
          console.log(
            "Session information could not be written in",
            this.sessionPath
          );
        }
      }
    );
  }

  async crawlThroughCategoriesSitesAndDownloadData() {
    const visitedSitesInPreviousRuns = fs
      .readFileSync("alreadyVisitedSites.txt")
      .toString()
      .split("\n");
    for (const site of visitedSitesInPreviousRuns) {
      this.visitedSites.add(site);
    }
    const topicsToVisit = fs
      .readFileSync("topics.txt")
      .toString()
      .split("\n");
    console.log("corpus recopilation started");
    let browser = await chromium.launch({ headless: true });
    const context = await this.restoreSession(browser);
    const pages = context.pages();
    let page = pages.length > 0 ? pages[0] : await context.newPage();

    await page.route("**/*", (route) => {
      if (this.blockedResourcesOnSubmit.has(route.request().resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });

    try {
      for (const topic of topicsToVisit) {
        if (topic === "") {
          continue;
        }
        const subTopicsLinks: string[] = [];
        const topicURL = Path.join(this.baseUrl, "browse", topic);
        await page.goto(topicURL);
        const paginationLinks = await this.getPaginationLinksFromCurrentPage(page);
        console.log("paginationLinks", paginationLinks);
        if (paginationLinks.length > 0) {
          for (const pagLink of paginationLinks) {
            await page.goto(pagLink);
            subTopicsLinks.push(...(await this.getSubTopicsLinks(page)));
          }
        } else {
            subTopicsLinks.push(...(await this.getSubTopicsLinks(page)));
        }
        console.log(subTopicsLinks.length);
      }
      // await this.downloadPlainHTML(
        // "https://www.britannica.com/biography/Kobe-Bryant",
        // "https://www.britannica.com/topic/Golden-State-Warriors",
        // context,
        // "",
        // ".topic-paragraph"
      // );
      await this.saveSession(context);
      await browser.close();
    } catch (e) {
      console.log(e);
      exit(0);
    }
  }

  async downloadPlainHTML(
    page: Page,
    downloadDir: string,
    cssSelector: string
  ) {

    try {
      const htmlElements = await page.$$(cssSelector);
      let plainHTML = "";
      for (const e of htmlElements) {
        plainHTML += (await e.textContent()) + "\n";
      }
      fs.writeFileSync(
        `${Path.join(
          downloadDir,
          replaceNonAlphaNumSymbolsWith(Path.basename(page.url()), "_")
        )}.html`,
        plainHTML
      );
      this.visitedSites.add(page.url());
    } catch (e) {
      console.log(e);
      console.log(`Could not process ${page.url()}`);
    }
  }

  async getPaginationLinksFromCurrentPage(page: Page): Promise<string[]> {
    const categoryName = Path.basename(page.url());
    const regex = new RegExp(`\\/browse\\/${categoryName}\\/[1-9]+`, "gui");
    return Array.from(new Set((await page.content())
      .match(regex)
      .map((relativeUrl) => Path.join(this.baseUrl, relativeUrl))));
  }

  async getSubTopicsLinks(page: Page): Promise<string[]> {
    const subTopicsLinks: string[] = [];
    const linkElements = await page.$$("div .card-body > a:first-child");
    for (const a_tag of linkElements) {
      subTopicsLinks.push((await a_tag.getAttribute("href")));
    }
    return subTopicsLinks.map(relativeURL => Path.join(this.baseUrl, relativeURL));
  }
}
