import { getLogger } from './logger.js';

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  correlationId: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Make HTTP request to another microservice with correlation ID propagation
 */
export const makeServiceRequest = async (options: RequestOptions): Promise<any> => {
  const { method, url, correlationId, body, headers = {} } = options;
  const logger = getLogger();

  try {
    // Log outgoing request
    await logger.info(
      url,
      correlationId,
      `Outgoing ${method} request to ${url}`
    );

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        ...headers
      },
      ...(body && { body: JSON.stringify(body) })
    });

    const data = await response.json();

    // Log response
    await logger.info(
      url,
      correlationId,
      `Received response ${response.status} from ${url}`
    );

    if (!response.ok) {
      throw new Error(`Service request failed: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: any) {
    // Log error
    await logger.error(
      url,
      correlationId,
      `Service request failed: ${error.message}`,
      { error: error.message }
    );
    throw error;
  }
};
