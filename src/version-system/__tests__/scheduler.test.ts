/**
 * Tests for VersionScheduler
 */

import { VersionScheduler } from '../scheduler';
import { VersionChecker } from '../checker';
import { VersionUpdater } from '../updater';
import { VersionCache } from '../cache';
import { UpdateEvent } from '../types';

describe('VersionScheduler', () => {
  let scheduler: VersionScheduler;
  let checker: VersionChecker;
  let updater: VersionUpdater;
  let cache: VersionCache;

  beforeEach(() => {
    cache = new VersionCache();
    checker = new VersionChecker(cache);
    updater = new VersionUpdater();
    scheduler = new VersionScheduler(checker, updater);
  });

  afterEach(() => {
    scheduler.stop();
    scheduler.clearAllSchedules();
  });

  describe('Schedule Management', () => {
    it('should schedule version check', () => {
      scheduler.scheduleCheck('test-tool', 1000);

      const schedule = scheduler.getSchedule('test-tool');
      expect(schedule).toBeDefined();
      expect(schedule?.tool).toBe('test-tool');
      expect(schedule?.interval).toBe(1000);
      expect(schedule?.enabled).toBe(true);
    });

    it('should cancel schedule', () => {
      scheduler.scheduleCheck('test-tool', 1000);
      scheduler.cancelSchedule('test-tool');

      const schedule = scheduler.getSchedule('test-tool');
      expect(schedule?.enabled).toBe(false);
    });

    it('should get all schedules', () => {
      scheduler.scheduleCheck('tool1', 1000);
      scheduler.scheduleCheck('tool2', 2000);
      scheduler.scheduleCheck('tool3', 3000);

      const schedules = scheduler.getAllSchedules();
      expect(schedules).toHaveLength(3);
    });

    it('should get enabled schedules only', () => {
      scheduler.scheduleCheck('tool1', 1000);
      scheduler.scheduleCheck('tool2', 2000);
      scheduler.cancelSchedule('tool2');

      const enabled = scheduler.getEnabledSchedules();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].tool).toBe('tool1');
    });

    it('should update schedule configuration', () => {
      scheduler.scheduleCheck('test-tool', 1000);
      scheduler.updateSchedule('test-tool', { interval: 2000 });

      const schedule = scheduler.getSchedule('test-tool');
      expect(schedule?.interval).toBe(2000);
    });

    it('should enable disabled schedule', () => {
      scheduler.scheduleCheck('test-tool', 1000);
      scheduler.disableSchedule('test-tool');

      let schedule = scheduler.getSchedule('test-tool');
      expect(schedule?.enabled).toBe(false);

      scheduler.enableSchedule('test-tool');

      schedule = scheduler.getSchedule('test-tool');
      expect(schedule?.enabled).toBe(true);
    });

    it('should remove schedule', () => {
      scheduler.scheduleCheck('test-tool', 1000);
      scheduler.removeSchedule('test-tool');

      const schedule = scheduler.getSchedule('test-tool');
      expect(schedule).toBeUndefined();
    });

    it('should clear all schedules', () => {
      scheduler.scheduleCheck('tool1', 1000);
      scheduler.scheduleCheck('tool2', 2000);

      scheduler.clearAllSchedules();

      const schedules = scheduler.getAllSchedules();
      expect(schedules).toHaveLength(0);
    });
  });

  describe('Scheduler Lifecycle', () => {
    it('should start scheduler', () => {
      expect(scheduler.isRunning()).toBe(false);

      scheduler.start();

      expect(scheduler.isRunning()).toBe(true);
    });

    it('should stop scheduler', () => {
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);

      scheduler.stop();

      expect(scheduler.isRunning()).toBe(false);
    });

    it('should emit scheduler-started event', (done) => {
      scheduler.on('scheduler-started', () => {
        expect(scheduler.isRunning()).toBe(true);
        done();
      });

      scheduler.start();
    });

    it('should emit scheduler-stopped event', (done) => {
      scheduler.start();

      scheduler.on('scheduler-stopped', () => {
        expect(scheduler.isRunning()).toBe(false);
        done();
      });

      scheduler.stop();
    });

    it('should not start if already running', () => {
      scheduler.start();
      const firstStart = scheduler.isRunning();

      scheduler.start(); // Try to start again

      expect(scheduler.isRunning()).toBe(firstStart);
    });

    it('should not stop if not running', () => {
      expect(scheduler.isRunning()).toBe(false);

      scheduler.stop();

      expect(scheduler.isRunning()).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should emit check-started event', (done) => {
      jest.spyOn(checker, 'checkVersion').mockResolvedValue({
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        updateAvailable: false,
        lastChecked: new Date(),
        installed: true,
      });

      scheduler.on('check-started', (event: UpdateEvent) => {
        expect(event.type).toBe('check-started');
        expect(event.tool).toBe('test-tool');
        done();
      });

      scheduler.scheduleCheck('test-tool', 1000);
      scheduler.start();
    });

    it('should emit check-completed event', (done) => {
      jest.spyOn(checker, 'checkVersion').mockResolvedValue({
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        updateAvailable: false,
        lastChecked: new Date(),
        installed: true,
      });

      scheduler.on('check-completed', (event: UpdateEvent) => {
        expect(event.type).toBe('check-completed');
        expect(event.tool).toBe('test-tool');
        done();
      });

      scheduler.scheduleCheck('test-tool', 1000);
      scheduler.start();
    });

    it('should emit update-available event', (done) => {
      jest.spyOn(checker, 'checkVersion').mockResolvedValue({
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      });

      scheduler.on('update-available', (event: UpdateEvent) => {
        expect(event.type).toBe('update-available');
        expect(event.tool).toBe('test-tool');
        done();
      });

      scheduler.scheduleCheck('test-tool', 1000);
      scheduler.start();
    });

    it('should emit check-failed event on error', (done) => {
      jest.spyOn(checker, 'checkVersion').mockRejectedValue(new Error('Check failed'));

      scheduler.on('check-failed', (event: UpdateEvent) => {
        expect(event.type).toBe('check-failed');
        expect(event.tool).toBe('test-tool');
        expect(event.data.error).toBeDefined();
        done();
      });

      scheduler.scheduleCheck('test-tool', 1000);
      scheduler.start();
    });
  });

  describe('Auto-Update', () => {
    it('should auto-update when enabled and update available', (done) => {
      jest.spyOn(checker, 'checkVersion').mockResolvedValue({
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      });

      jest.spyOn(updater, 'update').mockResolvedValue();

      scheduler.on('update-started', (event: UpdateEvent) => {
        expect(event.type).toBe('update-started');
        expect(event.tool).toBe('test-tool');
        done();
      });

      scheduler.scheduleCheck('test-tool', 1000, true); // Auto-update enabled
      scheduler.start();
    });

    it('should not auto-update when disabled', (done) => {
      jest.spyOn(checker, 'checkVersion').mockResolvedValue({
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      });

      const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue();

      scheduler.on('update-available', () => {
        setTimeout(() => {
          expect(updateSpy).not.toHaveBeenCalled();
          done();
        }, 100);
      });

      scheduler.scheduleCheck('test-tool', 1000, false); // Auto-update disabled
      scheduler.start();
    });

    it('should emit update-completed on successful auto-update', (done) => {
      jest.spyOn(checker, 'checkVersion').mockResolvedValue({
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      });

      jest.spyOn(updater, 'update').mockResolvedValue();

      scheduler.on('update-completed', (event: UpdateEvent) => {
        expect(event.type).toBe('update-completed');
        expect(event.tool).toBe('test-tool');
        done();
      });

      scheduler.scheduleCheck('test-tool', 1000, true);
      scheduler.start();
    });

    it('should emit update-failed on failed auto-update', (done) => {
      jest.spyOn(checker, 'checkVersion').mockResolvedValue({
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      });

      jest.spyOn(updater, 'update').mockRejectedValue(new Error('Update failed'));

      scheduler.on('update-failed', (event: UpdateEvent) => {
        expect(event.type).toBe('update-failed');
        expect(event.tool).toBe('test-tool');
        done();
      });

      scheduler.scheduleCheck('test-tool', 1000, true);
      scheduler.start();
    });
  });

  describe('Manual Triggers', () => {
    it('should trigger immediate check', async () => {
      jest.spyOn(checker, 'checkVersion').mockResolvedValue({
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        updateAvailable: false,
        lastChecked: new Date(),
        installed: true,
      });

      scheduler.scheduleCheck('test-tool', 10000);

      await scheduler.triggerCheck('test-tool');

      const schedule = scheduler.getSchedule('test-tool');
      expect(schedule?.lastCheck).toBeDefined();
    });

    it('should trigger all checks', async () => {
      jest.spyOn(checker, 'checkVersion').mockResolvedValue({
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        updateAvailable: false,
        lastChecked: new Date(),
        installed: true,
      });

      scheduler.scheduleCheck('tool1', 10000);
      scheduler.scheduleCheck('tool2', 10000);

      await scheduler.triggerAllChecks();

      const schedule1 = scheduler.getSchedule('tool1');
      const schedule2 = scheduler.getSchedule('tool2');

      expect(schedule1?.lastCheck).toBeDefined();
      expect(schedule2?.lastCheck).toBeDefined();
    });

    it('should throw error if schedule not found', async () => {
      await expect(scheduler.triggerCheck('non-existent')).rejects.toThrow(
        'No schedule found'
      );
    });
  });

  describe('Time Tracking', () => {
    it('should track next check time', () => {
      scheduler.scheduleCheck('test-tool', 5000);

      const schedule = scheduler.getSchedule('test-tool');
      expect(schedule?.nextCheck).toBeDefined();
    });

    it('should calculate time until next check', () => {
      scheduler.scheduleCheck('test-tool', 5000);

      const timeUntil = scheduler.getTimeUntilNextCheck('test-tool');
      expect(timeUntil).toBeGreaterThan(0);
      expect(timeUntil).toBeLessThanOrEqual(5000);
    });

    it('should return null for non-existent schedule', () => {
      const timeUntil = scheduler.getTimeUntilNextCheck('non-existent');
      expect(timeUntil).toBeNull();
    });

    it('should update last check time after check', async () => {
      jest.spyOn(checker, 'checkVersion').mockResolvedValue({
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        updateAvailable: false,
        lastChecked: new Date(),
        installed: true,
      });

      scheduler.scheduleCheck('test-tool', 10000);
      await scheduler.triggerCheck('test-tool');

      const schedule = scheduler.getSchedule('test-tool');
      expect(schedule?.lastCheck).toBeDefined();
    });
  });

  describe('Import/Export', () => {
    it('should export schedules to JSON', () => {
      scheduler.scheduleCheck('tool1', 1000);
      scheduler.scheduleCheck('tool2', 2000);

      const json = scheduler.exportSchedules();
      const data = JSON.parse(json);

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    it('should import schedules from JSON', () => {
      scheduler.scheduleCheck('tool1', 1000);
      const json = scheduler.exportSchedules();

      const newScheduler = new VersionScheduler(checker, updater);
      newScheduler.importSchedules(json);

      const schedules = newScheduler.getAllSchedules();
      expect(schedules).toHaveLength(1);
      expect(schedules[0].tool).toBe('tool1');
    });
  });

  describe('Statistics', () => {
    it('should get scheduler statistics', () => {
      scheduler.scheduleCheck('tool1', 1000, true);
      scheduler.scheduleCheck('tool2', 2000, false);
      scheduler.scheduleCheck('tool3', 3000, true);
      scheduler.disableSchedule('tool3');

      const stats = scheduler.getStats();

      expect(stats.totalSchedules).toBe(3);
      expect(stats.enabledSchedules).toBe(2);
      expect(stats.disabledSchedules).toBe(1);
      expect(stats.autoUpdateEnabled).toBe(2);
      expect(stats.running).toBe(false);
    });
  });
});
