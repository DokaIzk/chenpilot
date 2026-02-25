import * as StellarSdk from "@stellar/stellar-sdk";

export type SorobanNetwork = "testnet" | "mainnet";

export interface InvokeContractParams {
  network: SorobanNetwork;
  rpcUrl?: string;
  contractId: string;
  method: string;
  args?: unknown[];
  source?: {
    publicKey?: string;
    secretKey?: string;
  };
  fee?: number;
  timeoutMs?: number;
}

export interface InvokeContractResult {
  network: SorobanNetwork;
  contractId: string;
  method: string;
  result: unknown;
  raw?: unknown;
}

/**
 * Metadata for Gas and Resource Estimates
 * Requirement: Issue #52
 */
export interface SimulationEstimates {
  minResourceFee: string;
  cpuInstructions: string;
  memoryBytes: string;
  footprint: string; // XDR encoded ledger footprint
}

const DEFAULT_RPC_URLS: Record<SorobanNetwork, string> = {
  testnet: "https://soroban-testnet.stellar.org",
  mainnet: "https://soroban-mainnet.stellar.org",
};

const NETWORK_PASSPHRASES: Record<SorobanNetwork, string> = {
  testnet: StellarSdk.Networks?.TESTNET || "Test SDF Network ; September 2015",
  mainnet: StellarSdk.Networks?.PUBLIC || "Public Global Stellar Network ; September 2015",
};

// --- Helper Functions ---

function resolveRpcUrl(network: SorobanNetwork, rpcUrl?: string): string {
  if (rpcUrl) return rpcUrl;
  if (network === "testnet") {
    return process.env.SOROBAN_RPC_URL_TESTNET || DEFAULT_RPC_URLS.testnet;
  }
  return process.env.SOROBAN_RPC_URL_MAINNET || DEFAULT_RPC_URLS.mainnet;
}

function validateParams(params: InvokeContractParams): void {
  if (params.network !== "testnet" && params.network !== "mainnet") {
    throw new Error("Invalid Soroban network. Use 'testnet' or 'mainnet'.");
  }
  if (!params.contractId?.startsWith("C")) {
    throw new Error("Invalid or missing contractId format");
  }
  if (!params.method) {
    throw new Error("Missing method name");
  }
}

function isScValLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return "switch" in (value as Record<string, unknown>);
}

function normalizeArgs(args?: unknown[]): any[] {
  if (!args || !Array.isArray(args)) return [];
  return args.map((arg) => {
    if (isScValLike(arg)) return arg;
    if (typeof StellarSdk.nativeToScVal === "function") {
      return StellarSdk.nativeToScVal(arg as any);
    }
    return arg;
  });
}

// --- SorobanService Class ---

export class SorobanService {
  /**
   * Issue #52: Implement simulateContractCall
   * Provides gas and resource estimates before submission.
   */
  async simulateContractCall(params: InvokeContractParams): Promise<SimulationEstimates> {
    validateParams(params);

    const rpcUrl = resolveRpcUrl(params.network, params.rpcUrl);
    const passphrase = NETWORK_PASSPHRASES[params.network];
    const server = new StellarSdk.SorobanRpc.Server(rpcUrl);

    // Use G...A dummy if no public key provided to allow simulation
    const sourcePublicKey = params.source?.publicKey || "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const account = new StellarSdk.Account(sourcePublicKey, "0");

    const contract = new StellarSdk.Contract(params.contractId);
    const op = contract.call(params.method, ...normalizeArgs(params.args));

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: passphrase,
    })
      .addOperation(op)
      .setTimeout(params.timeoutMs ? Math.ceil(params.timeoutMs / 1000) : 30)
      .build();

    const simulation = await server.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulation)) {
      const resources = simulation.transactionData.build().resources();
      
      return {
        minResourceFee: simulation.minResourceFee,
        cpuInstructions: resources.instructions().toString(),
        memoryBytes: resources.readBytes().toString(),
        footprint: simulation.transactionData.toXDR(),
      };
    }

    throw new Error("Unknown simulation result");
  }

  /**
   * Existing logic wrapped for service usage
   */
  async invokeContract(params: InvokeContractParams): Promise<InvokeContractResult> {
    validateParams(params);
    const rpcUrl = resolveRpcUrl(params.network, params.rpcUrl);
    const server = new StellarSdk.SorobanRpc.Server(rpcUrl);

    const sourcePublicKey = params.source?.publicKey || StellarSdk.Keypair.random().publicKey();
    const account = new StellarSdk.Account(sourcePublicKey, "0");
    const contract = new StellarSdk.Contract(params.contractId);
    const op = contract.call(params.method, ...normalizeArgs(params.args));

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: params.fee ? params.fee.toString() : StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASES[params.network],
    })
      .addOperation(op)
      .setTimeout(params.timeoutMs ? Math.ceil(params.timeoutMs / 1000) : 30)
      .build();

    const simulation = await server.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulation)) {
      throw new Error(`Soroban simulation failed: ${simulation.error}`);
    }

    const retval = (simulation as any).result?.retval;
    const decoded = retval ? StellarSdk.scValToNative(retval) : null;

    return {
      network: params.network,
      contractId: params.contractId,
      method: params.method,
      result: decoded,
      raw: simulation,
    };
  }
}

// Export a singleton instance for ease of use
export const sorobanService = new SorobanService();