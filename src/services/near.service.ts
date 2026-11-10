/**
 * Tanat — NEAR blockchain service.
 *
 * Real transfers and balances remain unavailable until an audited chain
 * integration exists. Deterministic simulated results are test-only.
 */

import { formatYoctoToNear } from '../utils/money';
import { AppError } from '../utils/errors';

export interface TransferResult {
  tx_hash: string;
  block_height: number;
  status: 'success' | 'failure';
  amount_yocto: string;
  amount_near: string;
  from_account: string;
  to_account: string;
  timestamp: string;
  idempotency_key?: string;
}

export interface BalanceInfo {
  account_id: string;
  available: string;
  staked: string;
  total: string;
  storage_used: string;
}

export interface TransferOptions {
  /**
   * Stable key for the transfer. The real Phase 2 implementation must pass
   * this to the chain/intent layer so a retry cannot send twice.
   */
  idempotencyKey?: string;
}

/**
 * A NEAR error that is safe to treat as "no money moved".
 *
 * Validation and pre-flight errors are definitive. Network/timeout errors are
 * not: the transfer may have reached the chain, so the caller must reconcile
 * instead of releasing the reservation.
 */
export class NearTransferError extends AppError {
  public readonly definitive: boolean;

  constructor(
    message: string,
    definitive: boolean,
    statusCode = definitive ? 400 : 503,
  ) {
    super(
      message,
      statusCode,
      definitive ? 'NEAR_TRANSFER_REJECTED' : 'NEAR_TRANSFER_UNKNOWN',
    );
    this.name = 'NearTransferError';
    this.definitive = definitive;
  }
}

/** Validate a NEAR account ID without throwing. */
export function isValidNearAccount(accountId: string): boolean {
  if (!accountId || accountId.length < 2 || accountId.length > 64) {
    return false;
  }

  if (/^[0-9a-f]{64}$/.test(accountId)) {
    return true;
  }

  if (!/^[a-z0-9._-]+$/.test(accountId)) {
    return false;
  }

  if (/^[._-]|[._-]$/.test(accountId)) {
    return false;
  }

  return true;
}

export class NearService {
  constructor(private readonly allowTestMocks = false) {}

  /**
   * Transfer NEAR tokens from one account to another.
   *
   * Transfer execution is disabled until a real, audited signing integration
   * is available. Tests may opt into the deterministic mock explicitly.
   */
  async transfer(
    from: string,
    to: string,
    amountYocto: bigint,
    options: TransferOptions = {},
  ): Promise<TransferResult> {
    this.validateAccount(from);
    this.validateAccount(to);

    if (amountYocto <= 0n) {
      throw new NearTransferError('Transfer amount must be positive', true);
    }

    if (!this.allowTestMocks) {
      throw new NearTransferError(
        'NEAR transfers are disabled until the audited payment integration is configured',
        true,
        503,
      );
    }

    const txHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      tx_hash: txHash,
      block_height: Math.floor(Math.random() * 100_000_000) + 100_000_000,
      status: 'success',
      amount_yocto: amountYocto.toString(),
      amount_near: formatYoctoToNear(amountYocto),
      from_account: from,
      to_account: to,
      timestamp: new Date().toISOString(),
      idempotency_key: options.idempotencyKey,
    };
  }

  /**
   * Check a NEAR account balance. Live RPC lookups remain unavailable until
   * the production RPC integration is implemented.
   */
  async checkBalance(accountId: string): Promise<BalanceInfo> {
    this.validateAccount(accountId);

    if (!this.allowTestMocks) {
      throw new AppError(
        'NEAR balance lookup is unavailable until a real RPC integration is configured',
        503,
        'NEAR_RPC_UNAVAILABLE',
      );
    }

    return {
      account_id: accountId,
      available: '50.5',
      staked: '0',
      total: '50.5',
      storage_used: '0.01',
    };
  }

  /**
   * Validate a NEAR account ID format.
   */
  validateAccount(accountId: string): boolean {
    if (!isValidNearAccount(accountId)) {
      throw new NearTransferError(
        'Invalid NEAR account ID (2-64 chars; lowercase letters, digits, hyphens, underscores, dots)',
        true,
      );
    }

    return true;
  }
}
