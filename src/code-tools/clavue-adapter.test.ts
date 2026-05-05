import { describe, expect, it } from 'vitest';

describe('clavue adapter registration', () => {
  it('creates a Clavue tool with Clavue runtime capabilities', async () => {
    const { createTool, getRegistry, getRuntimeCapabilityDescriptor } = await import('./index');

    const registry = getRegistry();
    expect(registry.hasTool('clavue')).toBe(true);

    const tool = createTool('clavue');
    expect(tool.getMetadata()).toMatchObject({
      name: 'clavue',
      displayName: 'Clavue',
      runtime: {
        runtime: 'clavue',
        ownership: 'hybrid',
        managedByCcjk: {
          providerProfiles: true,
          modelRouting: true,
        },
      },
    });

    expect(getRuntimeCapabilityDescriptor('clavue')).toMatchObject({
      runtime: 'clavue',
      managedByCcjk: {
        providerProfiles: true,
      },
    });
  });
});
