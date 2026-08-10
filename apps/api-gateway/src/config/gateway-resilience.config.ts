export const GATEWAY_RESILIENCE_CONFIG = 'GATEWAY_RESILIENCE_CONFIG';

export interface GatewayResilienceConfig {
  microserviceTimeoutMs: number;
  throttleTtlMs: number;
  throttleLimit: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createGatewayResilienceConfig(
  environment: NodeJS.ProcessEnv = process.env,
): GatewayResilienceConfig {
  return {
    microserviceTimeoutMs: positiveInteger(
      environment.MICROSERVICE_TIMEOUT_MS,
      5000,
    ),
    throttleTtlMs: positiveInteger(environment.THROTTLE_TTL_MS, 60_000),
    throttleLimit: positiveInteger(environment.THROTTLE_LIMIT, 100),
  };
}
