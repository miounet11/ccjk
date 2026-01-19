/**
 * Async Utilities Tests
 */

import {
  sleep,
  retry,
  timeout,
  sequence,
  waitFor,
  Mutex,
  Semaphore,
} from '../helpers';

describe('Async Utilities', () => {
  describe('sleep', () => {
    it('should sleep for specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('retry', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Failed');
        }
        return 'success';
      };

      const result = await retry(fn, { maxAttempts: 3, delay: 10 });
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max attempts', async () => {
      const fn = async () => {
        throw new Error('Always fails');
      };

      await expect(
        retry(fn, { maxAttempts: 2, delay: 10 })
      ).rejects.toThrow('Always fails');
    });

    it('should call onRetry callback', async () => {
      const retries: number[] = [];
      const fn = async () => {
        throw new Error('Failed');
      };

      await expect(
        retry(fn, {
          maxAttempts: 3,
          delay: 10,
          onRetry: (_, attempt) => retries.push(attempt),
        })
      ).rejects.toThrow();

      expect(retries).toEqual([1, 2]);
    });
  });

  describe('timeout', () => {
    it('should resolve if promise completes in time', async () => {
      const promise = sleep(50).then(() => 'success');
      const result = await timeout(promise, 100);
      expect(result).toBe('success');
    });

    it('should reject if promise times out', async () => {
      const promise = sleep(200).then(() => 'success');
      await expect(timeout(promise, 50)).rejects.toThrow('Operation timed out');
    });

    it('should use custom error message', async () => {
      const promise = sleep(200);
      await expect(timeout(promise, 50, 'Custom timeout')).rejects.toThrow(
        'Custom timeout'
      );
    });
  });

  describe('sequence', () => {
    it('should execute tasks in sequence', async () => {
      const results: number[] = [];
      const tasks = [
        async () => {
          await sleep(50);
          results.push(1);
          return 1;
        },
        async () => {
          await sleep(30);
          results.push(2);
          return 2;
        },
        async () => {
          await sleep(10);
          results.push(3);
          return 3;
        },
      ];

      const values = await sequence(tasks);
      expect(values).toEqual([1, 2, 3]);
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('waitFor', () => {
    it('should wait for condition to be true', async () => {
      let value = false;
      setTimeout(() => {
        value = true;
      }, 100);

      await waitFor(() => value, { timeout: 500, interval: 10 });
      expect(value).toBe(true);
    });

    it('should timeout if condition not met', async () => {
      await expect(
        waitFor(() => false, { timeout: 100, interval: 10 })
      ).rejects.toThrow('Condition not met within timeout');
    });
  });

  describe('Mutex', () => {
    it('should ensure exclusive access', async () => {
      const mutex = new Mutex();
      const results: number[] = [];

      const task = async (id: number) => {
        await mutex.acquire();
        try {
          results.push(id);
          await sleep(50);
        } finally {
          mutex.release();
        }
      };

      await Promise.all([task(1), task(2), task(3)]);
      expect(results).toHaveLength(3);
    });

    it('should work with runExclusive', async () => {
      const mutex = new Mutex();
      const results: number[] = [];

      const task = async (id: number) => {
        return mutex.runExclusive(async () => {
          results.push(id);
          await sleep(50);
          return id;
        });
      };

      const values = await Promise.all([task(1), task(2), task(3)]);
      expect(values).toEqual([1, 2, 3]);
      expect(results).toHaveLength(3);
    });
  });

  describe('Semaphore', () => {
    it('should limit concurrent operations', async () => {
      const semaphore = new Semaphore(2);
      let concurrent = 0;
      let maxConcurrent = 0;

      const task = async () => {
        await semaphore.acquire();
        try {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await sleep(50);
          concurrent--;
        } finally {
          semaphore.release();
        }
      };

      await Promise.all([task(), task(), task(), task(), task()]);
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should work with runExclusive', async () => {
      const semaphore = new Semaphore(2);
      let concurrent = 0;
      let maxConcurrent = 0;

      const task = async (id: number) => {
        return semaphore.runExclusive(async () => {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await sleep(50);
          concurrent--;
          return id;
        });
      };

      const values = await Promise.all([
        task(1),
        task(2),
        task(3),
        task(4),
        task(5),
      ]);
      expect(values).toEqual([1, 2, 3, 4, 5]);
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });
});
