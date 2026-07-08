import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { createHash } from 'node:crypto';

/**
 * Password hashing (Argon2id) plus a fast SHA-256 digest for high-entropy
 * opaque tokens (refresh tokens) where a slow KDF is unnecessary.
 */
@Injectable()
export class HashingService {
  hash(plain: string): Promise<string> {
    return hash(plain);
  }

  async verify(hashString: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashString, plain);
    } catch {
      // Malformed hash / mismatch — treat as a failed verification.
      return false;
    }
  }

  /** Deterministic digest for storing refresh tokens at rest. */
  sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
