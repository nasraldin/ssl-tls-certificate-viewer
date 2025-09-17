// Function to fetch certificate from URL with full response data
export async function fetchCertificateFromUrlWithData(url: string): Promise<{
  certificate: string;
  apiData: Record<string, unknown>;
  source: 'url';
}> {
  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;

    // Create a new URL object to validate
    const urlObj = new URL(fullUrl);

    // Use ssl-checker.io API for certificate metadata
    const apiUrl = `https://ssl-checker.io/api/v1/check/${urlObj.hostname}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;

    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch certificate data: ${response.statusText}`
      );
    }

    const proxyData = await response.json();

    // The CORS proxy wraps the response in a 'contents' field
    if (!proxyData.contents) {
      throw new Error('No data received from CORS proxy');
    }

    // Parse the actual API response from the proxy
    const data = JSON.parse(proxyData.contents);

    // Check if the API response has certificate data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response format');
    }

    // Create a mock PEM string for the raw API response
    const mockPem = `-----BEGIN CERTIFICATE-----\nSSL-CHECKER-IO-API-RESPONSE\n-----END CERTIFICATE-----`;

    const result = {
      certificate: mockPem,
      apiData: data,
      source: 'url' as const,
    };

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch certificate from URL: ${error.message}`);
    }
    throw new Error('Failed to fetch certificate from URL: Unknown error');
  }
}

// Function to fetch certificate from URL (backward compatibility)
export async function fetchCertificateFromUrl(url: string): Promise<string> {
  try {
    const result = await fetchCertificateFromUrlWithData(url);
    return result.certificate;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch certificate from URL: ${error.message}`);
    }
    throw new Error('Failed to fetch certificate from URL: Unknown error');
  }
}
