import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/profiles.js', () => ({
  listProfiles: vi.fn(),
}));

vi.mock('../../src/commands/init.js', () => ({
  initCommand: vi.fn(async () => {}),
}));

vi.mock('../../src/commands/doctor.js', () => ({
  doctorCommand: vi.fn(async () => {}),
}));

import { listProfiles } from '../../src/core/profiles.js';
import { initCommand } from '../../src/commands/init.js';
import { doctorCommand } from '../../src/commands/doctor.js';
import { onboardCommand } from '../../src/commands/onboard.js';

const mockedListProfiles = vi.mocked(listProfiles);
const mockedInitCommand = vi.mocked(initCommand);
const mockedDoctorCommand = vi.mocked(doctorCommand);

describe('onboardCommand', () => {
  beforeEach(() => {
    mockedListProfiles.mockReset();
    mockedInitCommand.mockReset();
    mockedDoctorCommand.mockReset();
  });

  it('profiles 为空时，跑 init + doctor', async () => {
    mockedListProfiles.mockResolvedValue([]);
    // 静默欢迎横幅
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await onboardCommand({ force: true });

    expect(mockedInitCommand).toHaveBeenCalledTimes(1);
    expect(mockedDoctorCommand).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
  });

  it('profiles 非空且 force=false 时，立即 return，不调用 init/doctor', async () => {
    mockedListProfiles.mockResolvedValue([
      // 只要 length>0 即可，字段不在断言里
      { name: 'glm', baseUrl: 'https://x.com', apiKey: 'k' } as never,
    ]);

    await onboardCommand({});

    expect(mockedInitCommand).not.toHaveBeenCalled();
    expect(mockedDoctorCommand).not.toHaveBeenCalled();
  });

  it('profiles 非空但 force=true 时，照常跑向导', async () => {
    mockedListProfiles.mockResolvedValue([
      { name: 'glm', baseUrl: 'https://x.com', apiKey: 'k' } as never,
    ]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await onboardCommand({ force: true });

    expect(mockedInitCommand).toHaveBeenCalledTimes(1);
    expect(mockedDoctorCommand).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
  });
});
