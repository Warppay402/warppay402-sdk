# @warppay402/sdk

Official TypeScript SDK for **WarpPay402**—pay-per-use AI tools monetized via x402 USDC micropayments on Base Mainnet.

## 📦 Installation

```bash
npm install @warppay402/sdk
```
## 🚀 Quickstart
```typescript
import { WarpPayClient } from "@warppay402/sdk";

import { WarpPayClient } from "@warppay402/sdk";

// Initialize with Base EVM, Solana L1, or both
const client = new WarpPayClient({
  privateKey: process.env.CUSTOMER_BASE_KEY as `0x${string}`,
  solanaPrivateKey: process.env.CUSTOMER_SOLANA_KEY,
});

async function main() {
  // 1. Scrape any URL into clean Markdown ($0.01 USDC)
  const page = await client.scrapeWeb("https://news.ycombinator.com");
  console.log("Title:", page.title);
  console.log("Markdown:", page.markdown);

  // 2. JS Browser Scraper ($0.05 USDC)
  const rendered = await client.browserScrape("https://example.com");
  console.log("Rendered Content:", rendered);

  // 3. Capture Full-Page Screenshot ($0.10 USDC)
  const screenshot = await client.renderScreenshot("https://example.com");
  console.log("Screenshot Data:", screenshot);

  // 4. Extract Structured JSON Data ($0.15 USDC)
  const extracted = await client.extractJson("https://news.ycombinator.com", {
    title: "string",
    topStories: "array",
  });
  console.log("Extracted Data:", extracted);

  // 5. Fetch Base Wallet Analytics ($0.02 USDC)
  const analytics = await client.getBaseAnalytics("0x556c77792642E8ff95eC930FFb8D46a76579126E");
  console.log("ETH Balance:", analytics.ethBalance);

  // 6. Extract PDF Text Preview ($0.05 USDC)
  const pdf = await client.extractPdf("https://example.com/document.pdf");  
  console.log("Preview:", pdf.textPreview);
}

main();
```
## 🛠️ Available Methods & Pricing

* **`getPublicDataFeed(filename)`** -- `$0.0001 USDC` -- Retrieves signed attestation JSON payloads.
* **`getDataFeed(feedId)`** -- `$0.001 USDC` -- Fetches pre-scraped market and protocol intelligence feeds.
* **`scrapeWeb(url)`** -- `$0.001 USDC` -- Extracts clean Markdown from web pages.
* **`getBaseAnalytics(address)`** -- `$0.002 USDC` -- Fetches ETH balance and nonce stats.
* **`browserScrape(url)`** -- `$0.005 USDC` -- Unblockable JS browser scraping via proxy workers.
* **`extractPdf(pdfUrl)`** -- `$0.005 USDC` -- Parses text preview from public PDF URLs.
* **`renderScreenshot(url)`** -- `$0.01 USDC` -- Renders target URL and returns full-page screenshot data.
* **`extractJson(url, schema?)`** -- `$0.01 USDC` -- Parses web pages into structured JSON data.
* **`verifySmartContract(address)`** -- `$0.02 USDC` -- Source code analysis, ABI fetching, and proxy validation.
## 🛠️ LangChain Integration
```typescript
import { WarpPayClient, createWarpPayLangChainTools } from "@warppay402/sdk";

const client = new WarpPayClient({
  privateKey: process.env.CUSTOMER_PRIVATE_KEY as `0x${string}`,
});

// Pass directly into your LangChain or AutoGen agent setup
const tools = createWarpPayLangChainTools(client);
```
## 🌐 API Gateway & Specs

MCP Gateway Endpoint: https://api.warppay402.com/mcp

MCP Manifest: https://api.warppay402.com/.well-known/mcp.json

REST Gateway Base: https://api.warppay402.com

OpenAPI Spec: https://api.warppay402.com/openapi.json
