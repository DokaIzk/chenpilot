export enum ChainId {
  BITCOIN = "bitcoin",
  STELLAR = "stellar",
  STARKNET = "starknet",
}

export interface WalletBalance {
  address: string;
  symbol: string;
  amount: string;
  chainId: ChainId;
}

export interface CrossChainSwapRequest {
  fromChain: ChainId;
  toChain: ChainId;
  fromToken: string;
  toToken: string;
  amount: string;
  destinationAddress: string;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

// Recovery / Cleanup types for cross-chain flows
export enum RecoveryAction {
  RETRY_MINT = "retry_mint",
  REFUND_LOCK = "refund_lock",
  MANUAL_INTERVENTION = "manual_intervention",
}

export interface RecoveryContext {
  // Unique id for the BTC lock transaction
  lockTxId: string;
  // Lock details (addresses, script, amount, timestamps)
  lockDetails?: Record<string, unknown>;
  // Target mint tx id (if any)
  mintTxId?: string;
  // Amount and asset info
  amount: string;
  fromChain: ChainId;
  toChain: ChainId;
  destinationAddress: string;
  metadata?: Record<string, unknown>;
}

export interface RecoveryResult {
  actionTaken: RecoveryAction;
  success: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export interface RetryHandler {
  retryMint: (context: RecoveryContext) => Promise<RecoveryResult>;
}

export interface RefundHandler {
  refundLock: (context: RecoveryContext) => Promise<RecoveryResult>;
}

export interface RecoveryEngineOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  retryHandler?: RetryHandler;
  refundHandler?: RefundHandler;
}

// ─── Rate limiter types ──────────────────────────────────────────────────────

/** Configuration for the token bucket rate limiter. */
export interface RateLimiterConfig {
  /** Requests allowed per second (default: 1). */
  requestsPerSecond?: number;
  /** Maximum burst size, in requests (default: 1). */
  burstSize?: number;
  /** Enable per-endpoint rate limiting (default: false). Useful for tracking separate limits per API endpoint. */
  perEndpoint?: boolean;
}

/** Rate limit check result. */
export interface RateLimitCheckResult {
  /** Whether the request is allowed under current rate limit. */
  allowed: boolean;
  /** Milliseconds to wait before retrying if not allowed (0 if allowed). */
  retryAfterMs: number;
  /** Current available tokens in the bucket. */
  tokensAvailable: number;
}

/** Rate limiter status snapshot. */
export interface RateLimiterStatus {
  /** Total requests checked by this limiter. */
  totalChecks: number;
  /** Requests that were rate-limited. */
  limitedRequests: number;
  /** Current tokens available globally. */
  tokensAvailable: number;
  /** Per-endpoint token availability (if perEndpoint is enabled). */
  perEndpointTokens?: Record<string, number>;
}
