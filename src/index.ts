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

// Interop helper: handles both ESM default and CJS default property exports
const bs58 = (bs58Module as any).default || bs58Module;

export interface WarpPayConfig {
  /** Base Mainnet or Arc Mainnet private key of the agent's wallet funding micro-payments */
  privateKey?: `0x${string}`;
  /** Solana Mainnet base58 private key funding micro-payments */
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

    // EVM Account Setup
    if (config.privateKey) {
      const rawKey = config.privateKey.trim();
      const formattedKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
      this.account = privateKeyToAccount(formattedKey);
    }

    // Solana Account Setup
    if (config.solanaPrivateKey) {
      const decodedSecret = bs58.decode(config.solanaPrivateKey.trim());
      this.solanaKeypair = Keypair.fromSecretKey(decodedSecret);
    }

    if (!this.account && !this.solanaKeypair) {
      throw new Error("WarpPayClient requires either an EVM privateKey or a solanaPrivateKey.");
    }
  }

  /**
   * Handles multi-chain HTTP 402 Payment Required challenges dynamically.
   */
  public async executePaidRequest<T>(
    endpoint: string, 
    payload?: Record<string, any>, 
    method: "GET" | "POST" = "POST"
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`\n🔍 [SDK DEBUG] Initiating ${method} request to: ${url}`);

    const fetchOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (method === "POST" && payload) {
      fetchOptions.body = JSON.stringify(payload);
      console.log(`🔍 [SDK DEBUG] Request Payload:`, JSON.stringify(payload));
    }

    // 1. Initial Request Probe
    let response = await fetch(url, fetchOptions);
    console.log(`🔍 [SDK DEBUG] Probe Response Status: ${response.status} ${response.statusText}`);

    // 2. Multi-Chain Settlement Challenge Response
    if (response.status === 402) {
      const challenge = await response.json();
      console.log(`🔍 [SDK DEBUG] Received 402 Challenge Payload:`, JSON.stringify(challenge, null, 2));

      const accepts: Array<any> = challenge.x402?.accepts || challenge.accepts || [];
      console.log(`🔍 [SDK DEBUG] Accepted Payment Rails (${accepts.length}):`, accepts.map((a) => a.network));

      const solanaReq = accepts.find((a) => a.network?.includes("solana"));
      const evmReq = accepts.find((a) => a.network?.includes("eip155"));

      let paymentPayload: any;

      if (solanaReq && this.solanaKeypair) {
        console.log(`🔍 [SDK DEBUG] Processing Solana L1 SPL Payment challenge...`);
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
          network: solanaReq.network || "solana:5eykt4wA89m8E5b9B5658p445VTc28",
          signature: serializedTx,
          paymentPayload: {
            signature: serializedTx,
            network: solanaReq.network
          }
        };
      } else if (evmReq && this.account) {
        console.log(`🔍 [SDK DEBUG] Processing EVM EIP-712 Payment challenge...`);
        const payTo = (evmReq.payToAddress || evmReq.payTo) as `0x${string}`;
        const assetContract = (evmReq.asset || evmReq.usdcAddress) as `0x${string}`;
        const value = BigInt(evmReq.maxAmountRequired || evmReq.amount || "10000");

        console.log(`🔍 [SDK DEBUG] Signer Wallet: ${this.account.address} -> PayTo: ${payTo} | Amount: ${value.toString()}`);

        // Detect chain ID from challenge network (defaults to Base 8453 or Arc 5042)
        const isArc = evmReq.network === "eip155:5042" || evmReq.chainId === 5042;
        const targetChainId = isArc ? 5042 : Number(evmReq.chainId || 8453);

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
        console.error(`❌ [SDK DEBUG] Matching key missing! EVM Account Present: ${Boolean(this.account)} | Solana Keypair Present: ${Boolean(this.solanaKeypair)}`);
        throw new Error("No matching private key configured for returned 402 networks.");
      }

      const encodedPayload = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
      console.log(`🔍 [SDK DEBUG] Generated Signed x402 Base64 Header (Length: ${encodedPayload.length})`);

      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": encodedPayload,
        "X-PAYMENT-RESPONSE": encodedPayload,
        "X-PAYMENT": encodedPayload,
        "authorization": `Bearer ${encodedPayload}`,
      };

      const retryOptions: RequestInit = {
        method,
        headers: retryHeaders,
      };

      if (method === "POST" && payload) {
        retryOptions.body = JSON.stringify(payload);
      }

      console.log(`🔍 [SDK DEBUG] Resubmitting paid ${method} request to: ${url}`);
      response = await fetch(url, retryOptions);
      console.log(`🔍 [SDK DEBUG] Paid Retry Response Status: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ [SDK DEBUG] Request Rejection Body:`, errText);
      throw new Error(`WarpPay API Error (${response.status}): ${errText}`);
    }

    return (await response.json()) as T;
  }

  public async scrapeWeb(url: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/web-scraper", { url });
  }

  public async getBaseAnalytics(address: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/base-analytics", { address });
  }

  public async extractPdf(pdfUrl: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/pdf-extractor", { pdfUrl });
  }

  public async browserScrape(url: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/browser-scraper", { url });
  }

  public async renderScreenshot(url: string): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/render-screenshot", { url });
  }

  public async extractJson(url: string, schema?: object): Promise<any> {
    return this.executePaidRequest("/api/v1/tools/extract-json", { url, schema });
  }
}