import { createGatewayResilienceConfig } from './gateway-resilience.config';

describe('createGatewayResilienceConfig', () => {
  it('returns safe local defaults', () => {
    expect(createGatewayResilienceConfig({})).toEqual({
      microserviceTimeoutMs: 5000,
      throttleTtlMs: 60_000,
      throttleLimit: 100,
    });
  });

  it('reads positive integer environment values', () => {
    expect(
      createGatewayResilienceConfig({
        MICROSERVICE_TIMEOUT_MS: '2500',
        THROTTLE_TTL_MS: '30000',
        THROTTLE_LIMIT: '25',
      }),
    ).toEqual({
      microserviceTimeoutMs: 2500,
      throttleTtlMs: 30_000,
      throttleLimit: 25,
    });
  });

  it('falls back when values are invalid', () => {
    expect(
      createGatewayResilienceConfig({
        MICROSERVICE_TIMEOUT_MS: 'not-a-number',
        THROTTLE_TTL_MS: '0',
        THROTTLE_LIMIT: '-1',
      }),
    ).toEqual({
      microserviceTimeoutMs: 5000,
      throttleTtlMs: 60_000,
      throttleLimit: 100,
    });
  });
});
