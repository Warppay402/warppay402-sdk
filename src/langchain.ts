import { WarpPayClient } from "./index.js";

/**
 * Generates LangChain-compatible tool definitions initialized with WarpPay402
 */
export function createWarpPayLangChainTools(client: WarpPayClient) {
  return [
    {
      name: "web_scraper",
      description: "Scrapes a web page URL and returns clean markdown content. Costs $0.01 USDC on Base.",
      func: async ({ url }: { url: string }) => {
        const result = await client.scrapeWeb(url);
        return result.markdown;
      },
    },
    {
      name: "base_analytics",
      description: "Fetches ETH balance and nonce for a Base 0x wallet address. Costs $0.02 USDC on Base.",
      func: async ({ address }: { address: string }) => {
        const result = await client.getBaseAnalytics(address);
        return JSON.stringify(result);
      },
    },
    {
      name: "pdf_extractor",
      description: "Extracts text preview from a public PDF URL. Costs $0.05 USDC on Base.",
      func: async ({ pdfUrl }: { pdfUrl: string }) => {
        const result = await client.extractPdf(pdfUrl);
        return result.textPreview;
      },
    },
  ];
}
