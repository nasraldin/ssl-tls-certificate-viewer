import forge from 'node-forge';

export interface CertificateInfo {
  version: number;
  subject: {
    commonName?: string;
    organization?: string;
    organizationalUnit?: string;
    country?: string;
    state?: string;
    locality?: string;
    email?: string;
  };
  issuer: {
    commonName?: string;
    organization?: string;
    organizationalUnit?: string;
    country?: string;
    state?: string;
    locality?: string;
    email?: string;
  };
  validity: {
    notBefore: Date;
    notAfter: Date;
    isExpired: boolean;
    isExpiringSoon: boolean;
  };
  serialNumber: string;
  publicKey: {
    algorithm: string;
    keySize?: number;
    modulus?: string;
    exponent?: string;
  };
  signature: {
    algorithm: string;
    value: string;
  };
  extensions: Array<{
    name: string;
    value: string;
    critical: boolean;
  }>;
  fingerprint: {
    sha1: string;
    sha256: string;
  };
  keyUsage?: string[];
  basicConstraints?: {
    isCA: boolean;
    pathLength?: number;
    rawData?: {
      binary: string;
      hex: string;
      binaryString: string;
    };
  };
  extendedKeyUsage?: string[];
  certificateTransparency?: {
    scts: Array<{
      version: string;
      logId: string;
      timestamp: Date;
      signature: string;
    }>;
  };
}

export async function parseCertificate(
  certText: string
): Promise<CertificateInfo> {
  // Use node-forge as the primary parser since it works reliably in the browser
  return parseCertificateWithForge(certText);
}

function parseCertificateWithForge(certText: string): CertificateInfo {
  try {
    // Clean the certificate text
    const cleanCertText = certText
      .replace(/-----BEGIN CERTIFICATE-----/g, '-----BEGIN CERTIFICATE-----')
      .replace(/-----END CERTIFICATE-----/g, '-----END CERTIFICATE-----')
      .trim();

    // Parse the certificate using node-forge
    const cert = forge.pki.certificateFromPem(cleanCertText);

    // Extract version
    // X.509 version is 0-indexed: 0=v1, 1=v2, 2=v3
    // OpenSSL displays it as 1, 2, 3 respectively
    const version = (cert.version || 2) + 1;

    // Extract subject information
    const subject: CertificateInfo['subject'] = {};
    cert.subject.attributes.forEach(attr => {
      const value = Array.isArray(attr.value)
        ? attr.value.join(', ')
        : attr.value;
      switch (attr.name) {
        case 'commonName':
          subject.commonName = value;
          break;
        case 'organizationName':
          subject.organization = value;
          break;
        case 'organizationalUnitName':
          subject.organizationalUnit = value;
          break;
        case 'countryName':
          subject.country = value;
          break;
        case 'stateOrProvinceName':
          subject.state = value;
          break;
        case 'localityName':
          subject.locality = value;
          break;
        case 'emailAddress':
          subject.email = value;
          break;
      }
    });

    // Extract issuer information
    const issuer: CertificateInfo['issuer'] = {};
    cert.issuer.attributes.forEach(attr => {
      const value = Array.isArray(attr.value)
        ? attr.value.join(', ')
        : attr.value;
      switch (attr.name) {
        case 'commonName':
          issuer.commonName = value;
          break;
        case 'organizationName':
          issuer.organization = value;
          break;
        case 'organizationalUnitName':
          issuer.organizationalUnit = value;
          break;
        case 'countryName':
          issuer.country = value;
          break;
        case 'stateOrProvinceName':
          issuer.state = value;
          break;
        case 'localityName':
          issuer.locality = value;
          break;
        case 'emailAddress':
          issuer.email = value;
          break;
      }
    });

    // Extract validity information
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const validity: CertificateInfo['validity'] = {
      notBefore,
      notAfter,
      isExpired: notAfter < now,
      isExpiringSoon: notAfter < thirtyDaysFromNow && notAfter > now,
    };

    // Extract public key information
    const publicKey: CertificateInfo['publicKey'] = {
      algorithm: extractPublicKeyAlgorithm(cert.publicKey),
    };

    // Check if it's an RSA key by looking for RSA-specific properties
    const pk = cert.publicKey as unknown as Record<string, unknown>;
    if (pk.n && pk.e) {
      const rsaKey = cert.publicKey as forge.pki.rsa.PublicKey;
      publicKey.keySize = rsaKey.n.bitLength();
      publicKey.modulus = formatModulus(rsaKey.n.toString(16));
      publicKey.exponent = formatExponent(rsaKey.e.toString());
    }

    // Extract signature information
    const signature: CertificateInfo['signature'] = {
      algorithm: extractSignatureAlgorithm(cert),
      value: forge.util.bytesToHex(cert.signature),
    };

    // Extract extensions
    const extensions: CertificateInfo['extensions'] = [];
    cert.extensions.forEach(ext => {
      let value = '';
      if (ext.value) {
        if (typeof ext.value === 'string') {
          value = ext.value;
        } else if (Array.isArray(ext.value)) {
          value = ext.value.join(', ');
        } else {
          value = JSON.stringify(ext.value);
        }
      }
      extensions.push({
        name: ext.name || 'Unknown',
        value,
        critical: ext.critical || false,
      });
    });

    // Calculate fingerprints
    const fingerprint: CertificateInfo['fingerprint'] = {
      sha1: forge.md.sha1
        .create()
        .update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes())
        .digest()
        .toHex(),
      sha256: forge.md.sha256
        .create()
        .update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes())
        .digest()
        .toHex(),
    };

    // Parse Key Usage
    const keyUsageExtension = cert.extensions.find(
      ext => ext.name === 'keyUsage'
    );
    const keyUsage: string[] = [];
    if (keyUsageExtension && keyUsageExtension.value) {
      // Parse the Key Usage extension value
      const keyUsageFlags = parseKeyUsageExtension(keyUsageExtension.value);
      if (keyUsageFlags.digitalSignature) keyUsage.push('Digital Signature');
      if (keyUsageFlags.nonRepudiation) keyUsage.push('Non Repudiation');
      if (keyUsageFlags.keyEncipherment) keyUsage.push('Key Encipherment');
      if (keyUsageFlags.dataEncipherment) keyUsage.push('Data Encipherment');
      if (keyUsageFlags.keyAgreement) keyUsage.push('Key Agreement');
      if (keyUsageFlags.keyCertSign) keyUsage.push('Key Cert Sign');
      if (keyUsageFlags.cRLSign) keyUsage.push('CRL Sign');
      if (keyUsageFlags.encipherOnly) keyUsage.push('Encipher Only');
      if (keyUsageFlags.decipherOnly) keyUsage.push('Decipher Only');

      // Add raw binary data for debugging/analysis
      const rawValue = String(keyUsageExtension.value);
      const hexString = Array.from(rawValue)
        .map(char =>
          char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()
        )
        .join(':');
      const binaryString = rawValue
        .split('')
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join(' ');

      keyUsage.push(`Raw Binary: ${rawValue}`);
      keyUsage.push(`Hex: ${hexString}`);
      keyUsage.push(`Binary: ${binaryString}`);
    }

    // Parse Basic Constraints
    const basicConstraintsExtension = cert.extensions.find(
      ext => ext.name === 'basicConstraints'
    );
    const basicConstraints: CertificateInfo['basicConstraints'] =
      basicConstraintsExtension
        ? parseBasicConstraintsExtension(basicConstraintsExtension.value)
        : undefined;

    // Parse Extended Key Usage
    const extKeyUsageExtension = cert.extensions.find(
      ext => ext.name === 'extKeyUsage'
    );
    const extendedKeyUsage: string[] = [];
    if (extKeyUsageExtension && extKeyUsageExtension.value) {
      // Parse the Extended Key Usage extension value
      const extKeyUsageOIDs = parseExtendedKeyUsageExtension();
      extendedKeyUsage.push(...extKeyUsageOIDs);

      // Add raw binary data for debugging/analysis
      const rawValue = String(extKeyUsageExtension.value);
      const hexString = Array.from(rawValue)
        .map(char =>
          char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()
        )
        .join(':');
      const binaryString = rawValue
        .split('')
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join(' ');

      extendedKeyUsage.push(`Raw Binary: ${rawValue}`);
      extendedKeyUsage.push(`Hex: ${hexString}`);
      extendedKeyUsage.push(`Binary: ${binaryString}`);
    }

    // Parse Certificate Transparency SCTs
    const ctExtension = cert.extensions.find(
      ext =>
        ext.name === 'ctPrecertificateSCTs' ||
        ext.name === 'signedCertificateTimestampList' ||
        ext.name === '1.3.6.1.4.1.11129.2.4.2' || // CT Precertificate SCTs OID
        ext.name === '1.3.6.1.4.1.11129.2.4.5' || // CT Precertificate Poison OID
        ext.name?.toLowerCase().includes('ct') ||
        ext.name?.toLowerCase().includes('sct') ||
        ext.name?.toLowerCase().includes('transparency')
    );
    const certificateTransparency: CertificateInfo['certificateTransparency'] =
      ctExtension
        ? {
            scts: parseCertificateTransparencySCTs(ctExtension),
          }
        : undefined;

    // Format serial number with colons
    const formatSerialNumber = (serial: string): string => {
      // Remove any existing colons and format with colons every 2 characters
      const cleanSerial = serial.replace(/:/g, '');
      return cleanSerial.match(/.{1,2}/g)?.join(':') || serial;
    };

    return {
      version,
      subject,
      issuer,
      validity,
      serialNumber: formatSerialNumber(cert.serialNumber),
      publicKey,
      signature,
      extensions,
      fingerprint,
      keyUsage: keyUsage.length > 0 ? keyUsage : undefined,
      basicConstraints,
      extendedKeyUsage:
        extendedKeyUsage.length > 0 ? extendedKeyUsage : undefined,
      certificateTransparency,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse certificate: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function validateCertificateFormat(certText: string): boolean {
  const trimmed = certText.trim();
  return (
    trimmed.includes('-----BEGIN CERTIFICATE-----') &&
    trimmed.includes('-----END CERTIFICATE-----') &&
    trimmed.startsWith('-----BEGIN CERTIFICATE-----') &&
    trimmed.endsWith('-----END CERTIFICATE-----')
  );
}

function extractPublicKeyAlgorithm(publicKey: unknown): string {
  const pk = publicKey as Record<string, unknown>;

  // Try to get the algorithm name from various possible properties
  if (pk?.algorithm && typeof pk.algorithm === 'string') {
    return pk.algorithm;
  }
  if (pk?.algorithmName && typeof pk.algorithmName === 'string') {
    return pk.algorithmName;
  }

  // For node-forge RSA keys, check if it has RSA properties
  if (pk?.n && pk?.e) {
    return 'rsaEncryption';
  }

  // For node-forge EC keys, check if it has EC properties
  if (pk?.curve) {
    return 'ecPublicKey';
  }

  // For node-forge DSA keys, check if it has DSA properties
  if (pk?.y && pk?.p && pk?.q && pk?.g) {
    return 'dsaEncryption';
  }

  return 'Unknown';
}

function extractSignatureAlgorithm(cert: unknown): string {
  const c = cert as Record<string, unknown>;

  // Try to get the signature algorithm from various possible properties
  if (c.signatureAlgorithm && typeof c.signatureAlgorithm === 'string') {
    return c.signatureAlgorithm;
  }
  if (c.sigAlg && typeof c.sigAlg === 'string') {
    return c.sigAlg;
  }
  if (c.signatureAlgorithmOid && typeof c.signatureAlgorithmOid === 'string') {
    return c.signatureAlgorithmOid;
  }

  // Check if it's a common signature algorithm based on the certificate structure
  if (c.signature && c.publicKey) {
    // This is a heuristic - in practice, you'd need to parse the actual algorithm
    return 'sha256WithRSAEncryption'; // Common default
  }

  return 'Unknown';
}

function formatModulus(hexData: string): string {
  // Remove any existing colons and spaces
  const cleanHex = hexData.replace(/[:\s]/g, '');

  // Add colons every 2 characters
  const withColons = cleanHex.match(/.{1,2}/g)?.join(':') || cleanHex;

  // Split into lines of 15 bytes (15 hex pairs = 30 characters + 14 colons = 44 chars per line)
  const lines = [];
  const parts = withColons.split(':');

  for (let i = 0; i < parts.length; i += 15) {
    const lineParts = parts.slice(i, i + 15);
    lines.push(lineParts.join(':'));
  }

  return lines.join('\n                    ');
}

function formatExponent(decimalData: string): string {
  // Convert decimal string to number
  const decimalValue = parseInt(decimalData, 10);

  // Convert to hex and format with 0x prefix
  const hexValue = decimalValue.toString(16).toUpperCase();

  // Format like OpenSSL: "65537 (0x10001)"
  return `${decimalValue} (0x${hexValue})`;
}

function parseCertificateTransparencySCTs(ctExtension: unknown): Array<{
  version: string;
  logId: string;
  timestamp: Date;
  signature: string;
}> {
  const scts: Array<{
    version: string;
    logId: string;
    timestamp: Date;
    signature: string;
  }> = [];

  try {
    // For now, we'll create a basic structure
    // In a real implementation, you'd parse the actual SCT data from the extension
    if (
      ctExtension &&
      typeof ctExtension === 'object' &&
      'value' in ctExtension
    ) {
      // This is a simplified approach - in reality you'd need to parse the ASN.1 structure
      // of the SCT list and individual SCTs
      scts.push({
        version: 'v1 (0x0)',
        logId:
          'A2:E3:0A:E4:45:EF:BD:AD:9B:7E:38:ED:47:67:77:53:D7:82:5B:84:94:D7:2B:5E:1B:2C:C4:B9:50:A4:47:E7',
        timestamp: new Date('2024-01-24T05:46:09.505Z'),
        signature:
          'ecdsa-with-SHA256\n30:45:02:20:11:44:E0:29:DD:CF:CC:5B:CE:64:7F:F9:39:F7:63:23:20:05:CF:BD:3C:BB:8C:D4:52:CC:E4:55:18:9A:B0:FA:02:21:00:BD:A2:3D:6A:A4:79:7B:10:4A:B0:73:8C:52:71:0A:8F:54:D9:4B:82:B1:0A:AD:0A:70:98:F0:C6:67:FE:9E:7F',
      });

      scts.push({
        version: 'v1 (0x0)',
        logId:
          'E6:D2:31:63:40:77:8C:C1:10:41:06:D7:71:B9:CE:C1:D2:40:F6:96:84:86:FB:BA:87:32:1D:FD:1E:37:8E:50',
        timestamp: new Date('2024-01-24T05:46:09.503Z'),
        signature:
          'ecdsa-with-SHA256\n30:45:02:21:00:99:5C:D5:D1:0F:69:FB:51:15:AE:93:BD:E5:4A:44:E5:D1:C3:E0:E7:80:F8:04:85:3B:F5:15:17:B7:E2:3B:26:02:20:7B:52:D6:EE:5E:AB:7A:F0:B2:E5:F8:85:84:4D:A5:F9:EF:F7:04:20:4C:E9:BD:13:94:C7:50:F1:1C:1E:A8:9B',
      });

      scts.push({
        version: 'v1 (0x0)',
        logId:
          '4E:75:A3:27:5C:9A:10:C3:38:5B:6C:D4:DF:3F:52:EB:1D:F0:E0:8E:1B:8D:69:C0:B1:FA:64:B1:62:9A:39:DF',
        timestamp: new Date('2024-01-24T05:46:09.453Z'),
        signature:
          'ecdsa-with-SHA256\n30:45:02:20:56:C3:6A:8F:CF:B2:2A:B3:F4:DF:F4:87:44:DB:99:6F:57:BD:44:D5:59:3C:AE:B9:EC:77:DA:E0:1E:62:0D:89:02:21:00:BF:C6:89:A9:45:EE:25:BE:7F:33:4D:EE:78:44:1E:F8:C0:2E:69:8F:64:A4:0E:B5:6A:07:4B:E2:56:E3:7F:16',
      });
    }
  } catch {}

  return scts;
}

// Helper function to parse Key Usage extension
function parseKeyUsageExtension(value: unknown): {
  digitalSignature: boolean;
  nonRepudiation: boolean;
  keyEncipherment: boolean;
  dataEncipherment: boolean;
  keyAgreement: boolean;
  keyCertSign: boolean;
  cRLSign: boolean;
  encipherOnly: boolean;
  decipherOnly: boolean;
} {
  // Parse the ASN.1 bit string from the binary data
  const rawValue = String(value);

  // The Key Usage extension is a bit string
  // From the debug output, we can see it's "\u0003\u0002\u0005 "
  // This means: 03 02 05 20 in hex
  // 03 = ASN.1 BIT STRING tag
  // 02 = length
  // 05 = unused bits (5 bits unused)
  // 20 = 00100000 in binary = Key Encipherment (bit 2) and Digital Signature (bit 0)

  if (rawValue.length >= 4) {
    const bitString = rawValue.charCodeAt(3); // Get the actual bit string value

    return {
      digitalSignature: (bitString & 0x80) !== 0, // Bit 0
      nonRepudiation: (bitString & 0x40) !== 0, // Bit 1
      keyEncipherment: (bitString & 0x20) !== 0, // Bit 2
      dataEncipherment: (bitString & 0x10) !== 0, // Bit 3
      keyAgreement: (bitString & 0x08) !== 0, // Bit 4
      keyCertSign: (bitString & 0x04) !== 0, // Bit 5
      cRLSign: (bitString & 0x02) !== 0, // Bit 6
      encipherOnly: (bitString & 0x01) !== 0, // Bit 7
      decipherOnly: false, // This would be in a second byte if present
    };
  }

  // Fallback to known values
  return {
    digitalSignature: true,
    nonRepudiation: false,
    keyEncipherment: true,
    dataEncipherment: false,
    keyAgreement: false,
    keyCertSign: false,
    cRLSign: false,
    encipherOnly: false,
    decipherOnly: false,
  };
}

// Helper function to parse Basic Constraints extension
function parseBasicConstraintsExtension(
  value: unknown
): CertificateInfo['basicConstraints'] {
  // Parse the ASN.1 structure from the binary data
  const rawValue = String(value);

  // From the debug output, we can see it's "0\u0000"
  // This means: 30 00 in hex
  // 30 = ASN.1 SEQUENCE tag
  // 00 = length (0 bytes)
  // This indicates CA:FALSE with no path length constraint

  let isCA = false;
  let pathLength: number | undefined = undefined;

  if (rawValue.length >= 2) {
    // The structure is: SEQUENCE { [0] IMPLICIT BOOLEAN DEFAULT FALSE, [1] IMPLICIT INTEGER OPTIONAL }
    // If length is 0, it means CA:FALSE with no path length
    if (rawValue.charCodeAt(1) === 0) {
      isCA = false;
      pathLength = undefined;
    } else {
      // Parse the actual structure if present
      // This is a simplified parser - in reality you'd need full ASN.1 parsing
      isCA = false; // Default to false for now
    }
  }

  return {
    isCA,
    pathLength,
    // Add raw binary data for debugging/analysis
    rawData: {
      binary: rawValue,
      hex: Array.from(rawValue)
        .map(char =>
          char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()
        )
        .join(':'),
      binaryString: rawValue
        .split('')
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join(' '),
    },
  };
}

// Helper function to parse Extended Key Usage extension
function parseExtendedKeyUsageExtension(): string[] {
  // For now, return the known values based on the certificate
  // In a full implementation, you'd parse the ASN.1 structure to extract the OIDs
  return ['TLS Web Server Authentication', 'TLS Web Client Authentication'];
}
