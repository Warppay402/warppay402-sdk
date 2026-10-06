import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { privateKeyToAccount } from "viem/accounts";
import { Keypair, Connection, Transaction, PublicKey } from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction, 
  createAssociatedTokenAccountIdempotentInstruction 
} from "@solana/spl-token";
import bs58Module from "bs58";

const bs58 = (bs58Module as any).default || bs58Module;

export interface WarpPayConfig {
  /** Base Mainnet or Arc Mainnet private key funding micropayments */
  privateKey?: `0x${string}`;
  /** Solana Mainnet base58 private key funding micropayments */
  solanaPrivateKey?: string;
  /** Custom gateway URL (Defaults to https://api.warppay402.com) */
  baseUrl?: string;
  /** Custom Solana RPC URL */
  solanaRpcUrl?: string;
}

export class WarpPayClient {
  private baseUrl: string;
  private account?: ReturnType<typeof privateKeyToAccount>;
  private solanaKeypair?: Keypair;
  private solanaConnection: Connection;

  constructor(config: WarpPayConfig) {
    this.baseUrl = (config.baseUrl || "https://api.warppay402.com").replace(/\/$/, "");
    this.solanaConnection = new Connection(
      config.solanaRpcUrl || "https://api.mainnet-beta.solana.com", 
      "confirmed"
    );

    if (config.privateKey) {
      const rawKey = config.privateKey.trim();
      const formattedKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
      this.account = privateKeyToAccount(formattedKey);
    }

    if (config.solanaPrivateKey) {
      const decodedSecret = bs58.decode(config.solanaPrivateKey.trim());
      this.solanaKeypair = Keypair.fromSecretKey(decodedSecret);
    }

    if (!this.account && !this.solanaKeypair) {
      throw new Error("WarpPayClient requires either an EVM privateKey or a solanaPrivateKey.");
    }
  }

  public async executePaidRequest<T>(
    endpoint: string, 
    payload?: Record<string, any>, 
    method: "GET" | "POST" = "POST"
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const fetchOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (method === "POST" && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    let response = await fetch(url, fetchOptions);

    if (response.status === 402) {
      const challenge = await response.json();
      const accepts: Array<any> = challenge.x402?.accepts || challenge.accepts || [];

      const solanaReq = accepts.find((a) => a.network?.includes("solana"));
      const evmReq = accepts.find((a) => a.network?.includes("eip155"));

      let paymentPayload: any;

      if (solanaReq && this.solanaKeypair) {
        const payToPubkey = new PublicKey(solanaReq.payTo);
        const usdcMint = new PublicKey(solanaReq.asset || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
        const amountUnits = BigInt(solanaReq.amount || solanaReq.maxAmountRequired || "10000");

        const senderPubkey = this.solanaKeypair.publicKey;
        const senderAta = await getAssociatedTokenAddress(usdcMint, senderPubkey);
        const recipientAta = await getAssociatedTokenAddress(usdcMint, payToPubkey);

        const tx = new Transaction();
        tx.feePayer = senderPubkey;
        tx.recentBlockhash = (await this.solanaConnection.getLatestBlockhash()).blockhash;

        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            senderPubkey,
            recipientAta,
            payToPubkey,
            usdcMint
          )
        );

        tx.add(
          createTransferInstruction(senderAta, recipientAta, senderPubkey, amountUnits)
        );

        tx.sign(this.solanaKeypair);
        const serializedTx = Buffer.from(tx.serialize()).toString("base64");

        paymentPayload = {
          x402Version: 2,
          scheme: solanaReq.scheme || "exact",
          network: solanaReq.network || "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          signature: serializedTx,
          paymentPayload: {
            signature: serializedTx,
            network: solanaReq.network
          }
        };
      } else if (evmReq && this.account) {
        const payTo = (evmReq.payToAddress || evmReq.payTo) as `0x${string}`;
        const assetContract = (evmReq.asset || evmReq.usdcAddress) as `0x${string}`;
        
        // Ensure precise atomic unit parsing
        const rawAmount = evmReq.amount || evmReq.maxAmountRequired || "1000";
        const value = BigInt(rawAmount);

        const isArc = evmReq.network === "eip155:5042" || evmReq.chainId === 5042;
        const targetChainId = isArc ? 5042 : Number(evmReq.chainId || (evmReq.network ? evmReq.network.split(":")[1] : 8453));

        // Domain MUST strictly match the server's accepts[].extra fields
        const domain = {
          name: evmReq.extra?.name || "USD Coin",
          version: evmReq.extra?.version || "2",
          chainId: targetChainId,
          verifyingContract: assetContract,
        };

        const types = {
          TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
          ],
        };

        const now = Math.floor(Date.now() / 1000);
        // Ensure a fresh, non-reusable 32-byte nonce for every transaction execution
        const nonce = `0x${crypto.randomBytes(32).toString("hex")}` as `0x${string}`;

        const message = {
          from: this.account.address,
          to: payTo,
          value,
          validAfter: BigInt(0),
          validBefore: BigInt(now + 3600),
          nonce,
        };

        const signature = await this.account.signTypedData({
          domain,
          types,
          primaryType: "TransferWithAuthorization",
          message,
        });

        paymentPayload = {
          x402Version: 2,
          scheme: evmReq.scheme || "exact",
          network: evmReq.network || (isArc ? "eip155:5042" : "eip155:8453"),
          authorization: {
            from: this.account.address,
            to: payTo,
            value: value.toString(),
            validAfter: "0",
            validBefore: (now + 3600).toString(),
            nonce,
          },
          signature,
        };
      } else {
        throw new Error("No matching private key configured for returned 402 networks.");
      }

      const encodedPayload = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");

      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": encodedPayload,
        "X-PAYMENT-RESPONSE": encodedPayload,
        "X-PAYMENT": encodedPayload,
        "authorization": `Bearer ${encodedPayload}`,
      };

      const retryOptions: RequestInit = { method, headers: retryHeaders };
      if (method === "POST" && payload) {
        retryOptions.body = JSON.stringify(payload);
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      response = await fetch(url, retryOptions);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`WarpPay API Error (${response.status}): ${errText}`);
    }

    return (await response.json()) as T;
  }

  // --- 28 ALL-INCLUSIVE MONETIZED TOOL METHODS ---

  /** 1. Public Attestation Data Feed ($0.0001 USDC) */
  public async getPublicDataFeed(filename: string): Promise<any> {
    return this.executePaidRequest(`/public_data_feed/${filename}`, undefined, "GET");
  }

  /** 2. Pre-Scraped Intelligence Feeds ($0.001 USDC) */
  public async getDataFeed(feedId: string): Promise<any> {
    return this.executePaidRequest(`/api/v1/feeds/${feedId}`, undefined, "GET");
  }

  /** 3. Markdown Web Scraper ($0.001 USDC) */
  public async scrapeWeb(url: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/web-scraper", { url });
  }

  /** 4. Headless Browser Scraper ($0.005 USDC) */
  public async browserScrape(url: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/browser-scraper", { url });
  }

  /** 5. Base Wallet & Token Analytics ($0.002 USDC) */
  public async getBaseAnalytics(address: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/base-analytics", { address });
  }

  /** 6. Arc Network Analytics ($0.001 USDC) */
  public async getArcAnalytics(includeLatency = true): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/arc-analytics", { includeLatency });
  }

  /** 7. Arc Pre-Flight Telemetry Oracle ($0.10 USDC) */
  public async getArcNetworkQuery(params?: { includeGasTrends?: boolean; checkMerchantAccount?: boolean }): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/arc-network-query", params || { includeGasTrends: true, checkMerchantAccount: true });
  }

  /** 8. Arc Live DEX Price Oracle ($0.001 USDC) */
  public async getArcDexOracle(pair = "ETH/USDC"): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/arc-dex-oracle", { pair });
  }

  /** 9. PDF Document Extractor ($0.005 USDC) */
  public async extractPdf(pdfUrl: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/pdf-extractor", { pdfUrl });
  }

  /** 10. Render Full-Page Screenshot ($0.01 USDC) */
  public async renderScreenshot(url: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/render-screenshot", { url });
  }

  /** 11. Structured JSON Extractor ($0.01 USDC) */
  public async extractJson(url: string, schema?: object): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/extract-json", { url, schema });
  }

  /** 12. Base Smart Contract Verifier ($0.02 USDC) */
  public async verifySmartContract(address: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/smart-contract-verifier", { address });
  }

  /** 13. Aerodrome DEX Yield Optimizer ($0.003 USDC) */
  public async getAerodromeYields(): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/aerodrome-yields", undefined, "GET");
  }

  /** 14. Aerodrome Swap Engine ($0.01 USDC) */
  public async executeAerodromeSwap(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    decimalsIn: number;
    isStable: boolean;
  }): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/aerodrome-swap", params);
  }

  /** 15. Aerodrome Slipstream CLAMM LP Route ($0.01 USDC) */
  public async manageAerodromeClamm(params: {
    action: "mint" | "increaseLiquidity" | "decreaseLiquidity" | "collect";
    token0?: string;
    token1?: string;
    tickLower?: number;
    tickUpper?: number;
    amount0Desired?: string;
    amount1Desired?: string;
    tokenId?: string;
  }): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/aerodrome-clamm", params);
  }

  /** 16. Aerodrome veAERO Lock & Vote Route ($0.01 USDC) */
  public async manageAerodromeVeaero(params: {
    action: "createLock" | "increaseAmount" | "increaseUnlockTime" | "vote" | "claimBribes";
    amount?: string;
    lockDurationWeeks?: number;
    tokenId?: string;
    poolVoteAddresses?: string[];
  }): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/aerodrome-veaero", params);
  }

  /** 17. Base Smart Contract Deployment Factory ($5.00 USDC) */
  public async deployBaseContract(contractType: "escrow" | "bounty" | "subscription" | "pendle"): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/deploy-contract", { contractType });
  }

  /** 18. Solana Smart Contract Factory ($5.00 USDC) */
  public async deploySolanaContract(
    contractType: "spl_escrow" | "cnft_badge" | "raydium_vault",
    params: Record<string, any>
  ): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/deploy-solana-contract", { contractType, params });
  }

  /** 19. Arc Smart Contract Factory ($5.00 USDC) */
  public async deployArcContract(contractType: "escrow" | "bounty" | "subscription"): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/deploy-arc-contract", { contractType });
  }

  /** 20. Circle CCTP Cross-Chain Bridge Engine ($0.25 USDC) */
  public async bridgeArcCctp(params: {
    amountUsdc: string;
    destinationChain: "ethereum" | "avalanche" | "optimism" | "arbitrum" | "solana" | "base";
    recipientAddress: string;
  }): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/arc-cctp-bridge", params);
  }

  /** 21. Real Estate Financial & Cap Rate Calculator ($0.0005 USDC) */
  public async calculateRealEstate(params: {
    purchasePrice: number;
    monthlyRent: number;
    annualTaxes?: number;
    annualInsurance?: number;
    interestRate?: number;
    downPaymentPct?: number;
  }): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/real-estate-calculator", params);
  }

  /** 22. USPS Address Normalizer & Geocoder ($0.001 USDC) */
  public async normalizeAddress(address: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/address-normalizer", { address });
  }

  /** 23. Drone & Delivery Weather Oracle ($0.001 USDC) */
  public async getWeatherOracle(latitude: number, longitude: number): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/weather-oracle", { latitude, longitude });
  }

  /** 24. Currency & Forex Spot Rate Oracle ($0.0005 USDC) */
  public async getForexOracle(baseCurrency = "USD"): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/forex-oracle", { baseCurrency });
  }

  /** 25. USPS Shipping Rate Estimator ($0.001 USDC) */
  public async estimateShippingRates(params: {
    weightLbs: number;
    originZip: string;
    destinationZip: string;
  }): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/shipping-rate-estimator", params);
  }

  /** 26. GitHub Repository Health Inspector ($0.002 USDC) */
  public async analyzeGithubHealth(repository: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/github-health-analyzer", { repository });
  }

  /** 27. Public Property Tax Assessor & Comps Estimator ($0.005 USDC) */
  public async estimatePropertyComps(params: {
    squareFeet: number;
    bedrooms: number;
    zipCode: string;
  }): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/property-comps-estimator", params);
  }
}