import { WarpPayClient } from "./index.js";

/**
 * Generates LangChain-compatible tool definitions initialized with WarpPay402
 */
export function createWarpPayLangChainTools(client: WarpPayClient) {
  return [
    {
      name: "public_data_feed",
      description: "Retrieves signed attestation JSON payloads from the public data feed. Costs $0.0001 USDC.",
      func: async ({ filename }: { filename: string }) => {
        const result = await client.getPublicDataFeed(filename);
        return JSON.stringify(result);
      },
    },
    {
      name: "data_feeds",
      description: "Fetches pre-scraped market data feeds and yield reports. Costs $0.001 USDC.",
      func: async ({ feedId }: { feedId: string }) => {
        const result = await client.getDataFeed(feedId);
        return JSON.stringify(result);
      },
    },
    {
      name: "web_scraper",
      description: "Scrapes a web page URL and returns clean markdown content. Costs $0.001 USDC.",
      func: async ({ url }: { url: string }) => {
        const result = await client.scrapeWeb(url);
        return result.markdown || JSON.stringify(result);
      },
    },
    {
      name: "browser_scraper",
      description: "Executes unblockable JavaScript Chromium rendering via proxy workers. Costs $0.005 USDC.",
      func: async ({ url }: { url: string }) => {
        const result = await client.browserScrape(url);
        return JSON.stringify(result);
      },
    },
    {
      name: "base_analytics",
      description: "Fetches ETH balance and nonce for a Base 0x wallet address. Costs $0.002 USDC.",
      func: async ({ address }: { address: string }) => {
        const result = await client.getBaseAnalytics(address);
        return JSON.stringify(result);
      },
    },
    {
      name: "arc_analytics",
      description: "Fetches live block height, gas price, and RPC latency from Arc Mainnet. Costs $0.001 USDC.",
      func: async ({ includeLatency = true }: { includeLatency?: boolean }) => {
        const result = await client.getArcAnalytics(includeLatency);
        return JSON.stringify(result);
      },
    },
    {
      name: "arc_network_oracle_query",
      description: "Pre-flight Arc Mainnet telemetry: RPC latency (ms), gas prices (Gwei), native USDC balance, and account nonce. Costs $0.10 USDC.",
      func: async (params?: { includeGasTrends?: boolean; checkMerchantAccount?: boolean }) => {
        const result = await client.getArcNetworkQuery(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "arc_dex_oracle",
      description: "Real-time ETH/USDC spot price resolver and DEX liquidity oracle for Arc Mainnet. Costs $0.001 USDC.",
      func: async ({ pair = "ETH/USDC" }: { pair?: string }) => {
        const result = await client.getArcDexOracle(pair);
        return JSON.stringify(result);
      },
    },
    {
      name: "pdf_extractor",
      description: "Extracts text preview from a public PDF URL. Costs $0.005 USDC.",
      func: async ({ pdfUrl }: { pdfUrl: string }) => {
        const result = await client.extractPdf(pdfUrl);
        return result.textPreview || JSON.stringify(result);
      },
    },
    {
      name: "render_screenshot",
      description: "Captures full-page rendered screenshot image data from target URL. Costs $0.01 USDC.",
      func: async ({ url }: { url: string }) => {
        const result = await client.renderScreenshot(url);
        return JSON.stringify(result);
      },
    },
    {
      name: "extract_json",
      description: "Extracts structured JSON schema data from web page HTML content. Costs $0.01 USDC.",
      func: async ({ url, schema }: { url: string; schema?: object }) => {
        const result = await client.extractJson(url, schema);
        return JSON.stringify(result);
      },
    },
    {
      name: "smart_contract_verifier",
      description: "Source code analysis, bytecode validation, ABI fetching, and proxy detection on Basescan. Costs $0.02 USDC.",
      func: async ({ address }: { address: string }) => {
        const result = await client.verifySmartContract(address);
        return JSON.stringify(result);
      },
    },
    {
      name: "get_aerodrome_yields",
      description: "Fetches top live Aerodrome DEX yield pools, APYs, and TVL on Base Mainnet. Costs $0.003 USDC.",
      func: async () => {
        const result = await client.getAerodromeYields();
        return JSON.stringify(result);
      },
    },
    {
      name: "aerodrome_swap",
      description: "Executes low-slippage token swaps directly via Aerodrome Finance Router on Base. Costs $0.01 USDC.",
      func: async (params: { tokenIn: string; tokenOut: string; amountIn: string; decimalsIn: number; isStable: boolean }) => {
        const result = await client.executeAerodromeSwap(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "aerodrome_clamm",
      description: "Open, adjust, and rebalance concentrated liquidity ranges on Aerodrome Slipstream. Costs $0.01 USDC.",
      func: async (params: { action: "mint" | "increaseLiquidity" | "decreaseLiquidity" | "collect"; token0?: string; token1?: string; tickLower?: number; tickUpper?: number; amount0Desired?: string; amount1Desired?: string; tokenId?: string }) => {
        const result = await client.manageAerodromeClamm(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "aerodrome_veaero",
      description: "Automates $AERO locking, epoch gauge voting, and bribe reward harvesting on Aerodrome. Costs $0.01 USDC.",
      func: async (params: { action: "createLock" | "increaseAmount" | "increaseUnlockTime" | "vote" | "claimBribes"; amount?: string; lockDurationWeeks?: number; tokenId?: string; poolVoteAddresses?: string[] }) => {
        const result = await client.manageAerodromeVeaero(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "deploy_contract",
      description: "Programmatically deploys custom Escrow, Bounty, or Subscription contracts to Base Mainnet. Costs $5.00 USDC.",
      func: async ({ contractType = "escrow" }: { contractType?: "escrow" | "bounty" | "subscription" | "pendle" }) => {
        const result = await client.deployBaseContract(contractType);
        return JSON.stringify(result);
      },
    },
    {
      name: "deploy_solana_contract",
      description: "Initializes SPL Escrows, cNFT Badge Issuers, or Raydium Vaults on Solana Mainnet. Costs $5.00 USDC.",
      func: async ({ contractType, params }: { contractType: "spl_escrow" | "cnft_badge" | "raydium_vault"; params: Record<string, any> }) => {
        const result = await client.deploySolanaContract(contractType, params);
        return JSON.stringify(result);
      },
    },
    {
      name: "deploy_arc_contract",
      description: "Programmatically deploys custom Escrow, Bounty, or Agent contracts directly to Arc Mainnet. Costs $5.00 USDC.",
      func: async ({ contractType = "escrow" }: { contractType?: "escrow" | "bounty" | "subscription" }) => {
        const result = await client.deployArcContract(contractType);
        return JSON.stringify(result);
      },
    },
    {
      name: "arc_cctp_bridge",
      description: "Bridges USDC cross-chain from Arc Mainnet via Circle CCTP V2. Costs $0.25 USDC.",
      func: async (params: { amountUsdc: string; destinationChain: "ethereum" | "avalanche" | "optimism" | "arbitrum" | "solana" | "base"; recipientAddress: string }) => {
        const result = await client.bridgeArcCctp(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "real_estate_calculator",
      description: "Calculates NOI, Cap Rate, Monthly Cash Flow, and DSCR for real estate deals. Costs $0.0005 USDC.",
      func: async (params: { purchasePrice: number; monthlyRent: number; annualTaxes?: number; annualInsurance?: number; interestRate?: number; downPaymentPct?: number }) => {
        const result = await client.calculateRealEstate(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "address_normalizer",
      description: "Standardizes informal address queries and resolves lat/lon coordinates. Costs $0.001 USDC.",
      func: async ({ address }: { address: string }) => {
        const result = await client.normalizeAddress(address);
        return JSON.stringify(result);
      },
    },
    {
      name: "weather_oracle",
      description: "Fetches live atmospheric conditions, wind speed, visibility, and flight safety clearances. Costs $0.001 USDC.",
      func: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
        const result = await client.getWeatherOracle(latitude, longitude);
        return JSON.stringify(result);
      },
    },
    {
      name: "forex_oracle",
      description: "Resolves real-time global foreign exchange fiat rates. Costs $0.0005 USDC.",
      func: async ({ baseCurrency = "USD" }: { baseCurrency?: string }) => {
        const result = await client.getForexOracle(baseCurrency);
        return JSON.stringify(result);
      },
    },
    {
      name: "shipping_rate_estimator",
      description: "Calculates ground, priority, and express shipping rates for e-commerce. Costs $0.001 USDC.",
      func: async (params: { weightLbs: number; originZip: string; destinationZip: string }) => {
        const result = await client.estimateShippingRates(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "github_health_analyzer",
      description: "Queries public GitHub repo stars, open issues, licenses, and push activity. Costs $0.002 USDC.",
      func: async ({ repository }: { repository: string }) => {
        const result = await client.analyzeGithubHealth(repository);
        return JSON.stringify(result);
      },
    },
    {
      name: "property_comps_estimator",
      description: "Generates market valuations, price-per-sqft comps, and annual tax estimates. Costs $0.005 USDC.",
      func: async (params: { squareFeet: number; bedrooms: number; zipCode: string }) => {
        const result = await client.estimatePropertyComps(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "outage_oracle",
      description: "Resolves real-time power grid, ISP broadband, and cellular network outages by ZIP code. Costs $0.002 USDC.",
      func: async (params: { zipCode: string; state?: string; serviceType?: "all" | "power" | "internet" | "cellular" }) => {
        const result = await client.getOutageOracle(params);
        return JSON.stringify(result);
      },
    },
    {
      name: "ucp_deals_oracle",
      description: "Queries UCP merchant product catalogs, prices, and stock availability. Costs $0.001 USDC.",
      func: async (params: { query: string; maxPriceUSD?: number; inStockOnly?: boolean }) => {
        const result = await client.queryUcpDeals(params);
        return JSON.stringify(result);
      },
    },
  ];
}