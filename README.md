# @warppay402/sdk

Official TypeScript SDK for **WarpPay402**—pay-per-use AI tools monetized via x402 USDC micropayments on Base Mainnet, Solana SPL (USDC), Arbitrum One, and Arc Mainnet.

## 📦 Installation

```bash
npm install @warppay402/sdk
```

## 🚀 Quickstart

```typescript
import { WarpPayClient } from "@warppay402/sdk";

const client = new WarpPayClient({
  privateKey: process.env.CUSTOMER_BASE_KEY as `0x${string}`,
  solanaPrivateKey: process.env.CUSTOMER_SOLANA_KEY,
});

async function main() {
  // 1. Scrape any URL into clean Markdown ($0.001 USDC)
  const page = await client.scrapeWeb("https://news.ycombinator.com");
  console.log("Title:", page.title);

  // 2. Fetch Aerodrome DEX Pool Yields ($0.003 USDC)
  const yields = await client.getAerodromeYields();
  console.log("Top Yield Pools:", yields.topYieldPools);

  // 3. Drone Flight Safety Weather Oracle ($0.001 USDC)
  const weather = await client.getWeatherOracle(34.7465, -92.2896);
  console.log("Flight Clearance:", weather.flightSafetyClearance);

  // 4. Calculate Real Estate Cap Rate ($0.0005 USDC)
  const re = await client.calculateRealEstate({ purchasePrice: 350000, monthlyRent: 2800 });
  console.log("Cap Rate:", re.analysis.capRatePercent);
}

main();
```

## 🛠️ Available Methods & Pricing

- `getPublicDataFeed(filename)` — $0.0001 USDC — Signed attestation JSON records.
- `getDataFeed(feedId)` — $0.001 USDC — Cached intelligence reports (Base yields, trending pairs).
- `scrapeWeb(url)` — $0.001 USDC — Clean Markdown web scraper.
- `getArcAnalytics(includeLatency?)` — $0.001 USDC — Arc Mainnet block height and gas prices.
- `getArcDexOracle(pair?)` — $0.001 USDC — Arc Mainnet ETH/USDC spot price oracle.
- `normalizeAddress(address)` — $0.001 USDC — USPS address normalizer and OpenStreetMap geocoder.
- `getWeatherOracle(latitude, longitude)` — $0.001 USDC — Drone weather oracle and flight safety clearances.
- `estimateShippingRates({ weightLbs, originZip, destinationZip })` — $0.001 USDC — USPS parcel shipping rate estimator.
- `getBaseAnalytics(address)` — $0.002 USDC — Base wallet ETH balance and account nonce.
- `analyzeGithubHealth(repository)` — $0.002 USDC — GitHub repository health, stars, and license inspector.
- `getAerodromeYields()` — $0.003 USDC — Top live Aerodrome DEX yield pools and APYs.
- `browserScrape(url)` — $0.005 USDC — JavaScript browser scraping via proxy workers.
- `extractPdf(pdfUrl)` — $0.005 USDC — Plain-text extractor from public PDF URLs.
- `estimatePropertyComps({ squareFeet, bedrooms, zipCode })` — $0.005 USDC — Property tax assessor and market comps estimator.
- `renderScreenshot(url)` — $0.01 USDC — Full-page web screenshot renderer.
- `extractJson(url, schema?)` — $0.01 USDC — Structured JSON schema extractor.
- `executeAerodromeSwap({ tokenIn, tokenOut, amountIn, decimalsIn, isStable })` — $0.01 USDC — Low-slippage token swaps via Aerodrome Router on Base.
- `manageAerodromeClamm(params)` — $0.01 USDC — Concentrated liquidity range management on Slipstream.
- `manageAerodromeVeaero(params)` — $0.01 USDC — `$AERO` locking, epoch gauge voting, and bribe harvesting.
- `getWalletReputation(address)` — $0.01 USDC — Audits target wallet address against sanctions and poisoning blacklists.
- `getSolanaTokenRisk(mintAddress)` — $0.005 USDC — Solana SPL token security and freeze authority inspector.
- `getMultiChainGas()` — $0.001 USDC — Multi-chain EIP-1559 real-time gas telemetry (Base, Arc, Arbitrum).
- `verifySmartContract(address)` — $0.02 USDC — Base contract source code analysis and ABI verifier.
- `getArcNetworkQuery(params?)` — $0.10 USDC — Pre-flight Arc network telemetry oracle query.
- `bridgeArcCctp({ amountUsdc, destinationChain, recipientAddress })` — $0.25 USDC — Cross-chain USDC bridge engine via Circle CCTP V2.
- `calculateRealEstate({ purchasePrice, monthlyRent, ... })` — $0.0005 USDC — Real estate NOI, cap rate, and DSCR deal calculator.
- `getForexOracle(baseCurrency?)` — $0.0005 USDC — Foreign exchange fiat spot rates (EUR, GBP, JPY, CAD, AUD).
- `queryUcpDeals({ query, maxPriceUSD?, inStockOnly? })` — $0.001 USDC — Universal Commerce Protocol merchant deals & catalog oracle.
- `getOutageOracle({ zipCode, state?, serviceType? })` — $0.002 USDC — Real-time power grid, ISP, and cellular network outage oracle.
- `getAerodromeQuote(params)` — $0.001 USDC — Read-only Aerodrome spot quote and price impact simulator.
- `queryFastIntelligence(prompt, systemPrompt?)` — $0.001 USDC — Sub-second deterministic text classification and routing.

## 🛠️ LangChain Integration

The package exports a LangChain helper at the `@warppay402/sdk/langchain`
subpath. It returns a collection of plain tool definitions for frameworks such as
`web_scraper`, `base_analytics`, `pdf_extractor`, and the rest of the monetized
tool catalog in `src/langchain.ts`.

```ts
import { WarpPayClient } from "@warppay402/sdk";
import { createWarpPayLangChainTools } from "@warppay402/sdk/langchain";

const client = new WarpPayClient({
  privateKey: process.env.CUSTOMER_BASE_KEY as `0x${string}`,
  solanaPrivateKey: process.env.CUSTOMER_SOLANA_KEY,
});

const tools = createWarpPayLangChainTools(client);
```

If you are building from a local checkout, you can still import the helper from
`src/langchain.ts` and adapt the returned plain tool definitions to the framework
you are using.

## 🌐 API Gateway & Specs

- **MCP Gateway Endpoint:** <https://api.warppay402.com/mcp>
- **MCP Manifest:** <https://api.warppay402.com/.well-known/mcp.json>
- **Canonical A2A Agent Card:** <https://api.warppay402.com/.well-known/agent-card.json>
- **LLM Context Manifest:** <https://api.warppay402.com/llms.txt>
- **OpenAPI Spec:** <https://api.warppay402.com/openapi.json>
- **REST Gateway Base:** <https://api.warppay402.com>