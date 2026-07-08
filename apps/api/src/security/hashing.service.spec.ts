import { HashingService } from './hashing.service';

describe('HashingService', () => {
  const service = new HashingService();

  it('hashes a password and verifies it', async () => {
    const hash = await service.hash('Secret123!');
    expect(hash).not.toEqual('Secret123!');
    expect(hash.startsWith('$argon2')).toBe(true);
    await expect(service.verify(hash, 'Secret123!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('Secret123!');
    await expect(service.verify(hash, 'WrongPass1')).resolves.toBe(false);
  });

  it('returns false (does not throw) for a malformed hash', async () => {
    await expect(service.verify('not-a-real-hash', 'whatever')).resolves.toBe(false);
  });

  it('produces a deterministic sha256 digest', () => {
    expect(service.sha256('token')).toEqual(service.sha256('token'));
    expect(service.sha256('token-a')).not.toEqual(service.sha256('token-b'));
  });
});
