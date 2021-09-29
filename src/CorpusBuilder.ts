import * as fs from "fs";
import * as Path from "path";
import {
  chromium,
  ChromiumBrowser,
  ChromiumBrowserContext,
  Page,
} from "playwright-chromium";
import { exit } from "process";
import { normalizeString, replaceNonAlphaNumSymbolsWith, sleep } from "./Util";

export default class CorpusBuilder {
  readonly sessionPath = "corpus_builder_session.json";

  readonly visitedSites = new Set<string>();
  readonly alreadyVisitedSitesFilePath = "alreadyVisitedSites.txt";

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

  async crawlThroughTopicsSitesAndDownloadData() {
    const visitedSitesInPreviousRuns = fs
      .readFileSync(this.alreadyVisitedSitesFilePath)
      .toString()
      .split("\n");
    for (const site of visitedSitesInPreviousRuns) {
      this.visitedSites.add(site);
    }
    const allTopics = fs
      .readFileSync("topics.txt")
      .toString()
      .split("\n")
      .filter((topic) => topic !== "");

    const topicsToVisit = allTopics.filter(
      (topic) =>
        !this.visitedSites.has(Path.join(this.baseUrl, "browse", topic))
    );

    console.log("topics already processed:", allTopics.length - topicsToVisit.length);
    console.log("topics to process:", topicsToVisit.length);

    console.log("corpus recopilation started");

    let browser = await chromium.launch({ headless: true, timeout: 0 });
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
      let topicsCnt = 0;
      let subTopicsCnt = 0;
      for (const topic of topicsToVisit) {
        const topicURL = Path.join(this.baseUrl, "browse", topic);
        let subTopicsURLs: string[] = [];
        await page.goto(topicURL);
        const paginationLinks = await this.getPaginationLinksFromCurrentPage(
          page
        );
        if (paginationLinks.length > 0) {
          for (const pagLink of paginationLinks) {
            await page.goto(pagLink);
            subTopicsURLs.push(...(await this.getSubTopicsLinks(page)));
          }
        } else {
          subTopicsURLs.push(...(await this.getSubTopicsLinks(page)));
        }
        subTopicsURLs = subTopicsURLs.filter(
          (subTopicURL) => !this.visitedSites.has(subTopicURL)
        );
        for (const subTopicURL of subTopicsURLs) {
          await page.goto(subTopicURL);
          const parentCategory = await this.getParentCategory(page);
          await this.downloadPlainHTML(
            page,
            Path.join("corpus_raw", parentCategory, topic),
            ".topic-paragraph"
          );
          this.visitedSites.add(subTopicURL);
          fs.appendFileSync(
            this.alreadyVisitedSitesFilePath,
            `${subTopicURL}\n`
          );
          subTopicsCnt++;
          console.log(
            topic,
            "->",
            Path.basename(subTopicURL),
            "|",
            "number of pages for this topic",
            paginationLinks.length
          );
          console.log(
            "number of processed topics:",
            topicsCnt,
            "/",
            topicsToVisit.length
          );
          console.log(
            "number of processed subTopics:",
            subTopicsCnt,
            "/",
            subTopicsURLs.length
          );
          await sleep(1000);
        }
        this.visitedSites.add(topicURL);
        fs.appendFileSync(this.alreadyVisitedSitesFilePath, `${topicURL}\n`);
        topicsCnt++;
      }
      console.log("Recopilation Finished");
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
    if (!fs.existsSync(downloadDir))
      fs.mkdirSync(downloadDir, { recursive: true });

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
        )}.txt`,
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
    return Array.from(
      new Set(
        (await page.content())
          .match(regex)
          .map((relativeUrl) => Path.join(this.baseUrl, relativeUrl))
      )
    );
  }

  async getSubTopicsLinks(page: Page): Promise<string[]> {
    const subTopicsLinks: string[] = [];
    const linkElements = await page.$$("div.card-body > a:first-child");
    for (const a_tag of linkElements) {
      subTopicsLinks.push(await a_tag.getAttribute("href"));
    }
    return subTopicsLinks.map((relativeURL) =>
      Path.join(this.baseUrl, relativeURL)
    );
  }

  async getParentCategory(page: Page): Promise<string> {
    const spanElement = await page.$$(
      "nav.breadcrumb > span.breadcrumb-item:nth-last-of-type(2) > a"
    );
    return normalizeString(await spanElement[0].textContent());
  }

  async quickTest() {
    let browser = await chromium.launch({ headless: false });
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
    await page.goto("https://www.britannica.com/browse/Basketball");
    console.log(await this.getParentCategory(page));
    // console.log(await this.getSubTopicsLinks(page));
    // console.log(await this.getPaginationLinksFromCurrentPage(page));
    // await this.saveSession(context);
    // await browser.close();
  }
}
