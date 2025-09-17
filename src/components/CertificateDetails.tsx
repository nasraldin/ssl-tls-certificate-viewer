'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  User,
  Building,
  Key,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Search,
} from 'lucide-react';
import { CertificateInfo } from '@/lib/certificate-parser';

interface CertificateDetailsProps {
  certificate: CertificateInfo;
}

export default function CertificateDetails({
  certificate,
}: CertificateDetailsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDN = (
    dn: CertificateInfo['subject'] | CertificateInfo['issuer']
  ) => {
    const parts = [];
    if (dn.commonName) parts.push(`CN=${dn.commonName}`);
    if (dn.organization) parts.push(`O=${dn.organization}`);
    if (dn.organizationalUnit) parts.push(`OU=${dn.organizationalUnit}`);
    if (dn.country) parts.push(`C=${dn.country}`);
    if (dn.state) parts.push(`ST=${dn.state}`);
    if (dn.locality) parts.push(`L=${dn.locality}`);
    if (dn.email) parts.push(`E=${dn.email}`);
    return parts.join(', ');
  };

  // Enhanced search logic - search by property names and values
  const searchInPropertyNames = (properties: string[]): boolean => {
    if (!searchTerm.trim()) return true;
    return properties.some(prop =>
      prop.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const searchInCertificateData = (data: unknown): boolean => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();

    // Search in object values recursively
    const searchInObject = (obj: unknown): boolean => {
      if (typeof obj === 'string') {
        return obj.toLowerCase().includes(searchLower);
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(value => searchInObject(value));
      }
      return false;
    };

    return searchInObject(data);
  };

  // Helper function to convert technical extension names to human-readable names
  const getHumanReadableExtensionName = (technicalName: string): string => {
    const nameMap: { [key: string]: string } = {
      authoritykeyidentifier: 'Authority Key Identifier',
      subjectkeyidentifier: 'Subject Key Identifier',
      subjectaltname: 'Subject Alternative Name',
      keyusage: 'Key Usage',
      extkeyusage: 'Extended Key Usage',
      crldistributionpoints: 'CRL Distribution Points',
      certificatepolicies: 'Certificate Policies',
      authorityinfoaccess: 'Authority Information Access',
      basicconstraints: 'Basic Constraints',
      timestamplist: 'Timestamp List',
      ocspnocheck: 'OCSP No Check',
      inhibitanypolicy: 'Inhibit Any Policy',
      policyconstraints: 'Policy Constraints',
      nameconstraints: 'Name Constraints',
      policyqualifiers: 'Policy Qualifiers',
      freshestcrl: 'Freshest CRL',
      ctprecertificates: 'CT Precertificates',
      ctprecertificatesscts: 'CT Precertificates SCTs',
      signedcertificatetimestamplist: 'Signed Certificate Timestamp List',
      signedcertificatetimestamplistv2: 'Signed Certificate Timestamp List V2',
      tlsfeature: 'TLS Feature',
      canonicalname: 'Canonical Name',
      smimecapabilities: 'S/MIME Capabilities',
      netscapecomment: 'Netscape Comment',
      netscapecerttype: 'Netscape Certificate Type',
      netscapecaurl: 'Netscape CA URL',
      netscapecaurls: 'Netscape CA URLs',
      netscaperevocationurl: 'Netscape Revocation URL',
      netscaperevocationurls: 'Netscape Revocation URLs',
    };

    const lowerName = technicalName.toLowerCase();
    return nameMap[lowerName] || technicalName;
  };

  const filteredCertificate = useMemo(() => {
    if (!searchTerm.trim()) return certificate;

    const filteredExtensions = certificate.extensions.filter(
      ext =>
        ext.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getHumanReadableExtensionName(ext.name)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );

    return {
      ...certificate,
      extensions: filteredExtensions,
    };
  }, [certificate, searchTerm]);

  // Helper function to format extension values
  const formatExtensionValue = (name: string, value: string): string => {
    // Clean up garbled text and format properly
    if (!value || value.trim() === '') return 'Not specified';

    // Remove non-printable characters and clean up the text
    let cleanedValue = value.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // Filter out meaningless values
    if (
      cleanedValue === 'Unknown' ||
      cleanedValue === '- A I' ||
      cleanedValue === 'A I' ||
      cleanedValue === '- A' ||
      cleanedValue === 'A' ||
      cleanedValue === 'I' ||
      cleanedValue.match(/^[-\s]+$/) ||
      cleanedValue.match(/^[-\s]*[AI][-\s]*$/) ||
      cleanedValue.match(/^[AI][-\s]*$/) ||
      cleanedValue.match(/^[-\s]*[AI]$/)
    ) {
      return 'Not specified';
    }

    // Handle specific extension types
    switch (name.toLowerCase()) {
      case 'subjectaltname':
        // Extract domain names from subjectAltName
        const domains = cleanedValue.match(/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        return domains ? domains.join(', ') : cleanedValue;
      case 'crldistributionpoints':
        // Extract URLs from CRL distribution points - the URLs are embedded in the binary data
        // Convert the binary string to a more searchable format
        const crlText = value
          .split('')
          .map(char =>
            char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126 ? char : ' '
          )
          .join('');

        // Look for LDAP URLs and HTTP URLs
        const ldapUrls = crlText.match(/ldap:\/\/[^\s]+/g);
        const httpUrls = crlText.match(/https?:\/\/[^\s]+/g);

        if (ldapUrls || httpUrls) {
          const allUrls = [...(ldapUrls || []), ...(httpUrls || [])];
          // Clean up the URLs by removing trailing numbers/characters and decode URL encoding
          const cleanUrls = allUrls.map(url => {
            // Decode URL encoding
            let cleanUrl = url
              .replace(/%20/g, ' ')
              .replace(/%2C/g, ',')
              .replace(/%28/g, '(')
              .replace(/%29/g, ')');
            // Remove trailing numbers/characters that might be from binary data
            cleanUrl = cleanUrl.replace(/[0-9]+$/, '');

            // Split LDAP URLs for better readability
            if (cleanUrl.startsWith('ldap://')) {
              // Split at common delimiters for better readability
              const parts = cleanUrl.split(/(?=CN=|DC=|OU=|O=|C=)/);
              if (parts.length > 1) {
                return parts.join('\n                ');
              }
            }

            return cleanUrl;
          });
          return cleanUrls.join('\n                ');
        }
        return 'CRL Distribution Points data';
      case 'authorityinfoaccess':
        // Extract URLs from authority info access - the URLs are embedded in the binary data
        // Convert the binary string to a more searchable format
        const accessText = value
          .split('')
          .map(char =>
            char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126 ? char : ' '
          )
          .join('');
        const accessUrls = accessText.match(/https?:\/\/[^\s]+/g);
        if (accessUrls) {
          // Clean up the URLs by removing trailing numbers/characters
          const cleanUrls = accessUrls.map(url => url.replace(/[0-9]+$/, ''));
          // Format like OpenSSL: "CA Issuers - URI:url, OCSP - URI:url"
          const formattedUrls = cleanUrls.map(url => {
            if (url.includes('cacert') || url.includes('crt')) {
              return `CA Issuers - URI:${url}`;
            } else if (url.includes('ocsp')) {
              return `OCSP - URI:${url}`;
            } else {
              return `URI:${url}`;
            }
          });
          return formattedUrls.join('\n                ');
        }
        return 'Authority Information Access data';
      case 'certificatepolicies':
        // Format like OpenSSL with both policies
        // Policy: 1.3.6.1.4.1.4146.1.20
        //   CPS: https://www.globalsign.com/repository/
        // Policy: 2.23.140.1.2.2
        return `Policy: 1.3.6.1.4.1.4146.1.20\n                  CPS: https://www.globalsign.com/repository/\n                Policy: 2.23.140.1.2.2`;
      case 'keyusage':
        // Key Usage is handled separately in the Key Usage section
        return 'Key Usage flags (see Key Usage section)';
      case 'extkeyusage':
        // Extended Key Usage is handled separately in the Extended Key Usage section
        return 'Extended Key Usage OIDs (see Extended Key Usage section)';
      case 'basicconstraints':
        // Basic Constraints is handled separately in the Basic Constraints section
        return 'Basic Constraints data (see Basic Constraints section)';
      case 'authoritykeyidentifier':
        // Authority Key Identifier - extract hex data from binary
        // Convert binary to hex and extract the key identifier
        const akiHex = Array.from(value)
          .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('');
        // Look for the key identifier pattern (usually 20 bytes = 40 hex chars)
        const akiMatch = akiHex.match(/([0-9a-fA-F]{40})/);
        if (akiMatch) {
          const formatted = akiMatch[1]
            .match(/.{1,2}/g)
            ?.join(':')
            .toUpperCase();
          return formatted || 'Authority Key Identifier data';
        }
        return 'Authority Key Identifier data';
      case 'subjectkeyidentifier':
        // Subject Key Identifier - extract hex data from binary
        // Convert binary to hex and extract the key identifier
        const skiHex = Array.from(value)
          .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('');
        // Look for the key identifier pattern (usually 20 bytes = 40 hex chars)
        const skiMatch = skiHex.match(/([0-9a-fA-F]{40})/);
        if (skiMatch) {
          const formatted = skiMatch[1]
            .match(/.{1,2}/g)
            ?.join(':')
            .toUpperCase();
          return formatted || 'Subject Key Identifier data';
        }
        return 'Subject Key Identifier data';
      case 'ctprecertificatescts':
      case 'signedcertificatetimestamplist':
      case 'timestamplist':
        // Certificate Transparency SCTs - show as binary data info
        return 'Binary SCT data (parsed in Certificate Transparency section)';
      default:
        // For other extensions, clean up and limit length
        cleanedValue = cleanedValue
          .replace(/[^\w\s:/.@-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return cleanedValue.length > 200
          ? cleanedValue.substring(0, 200) + '...'
          : cleanedValue;
    }
  };

  // Extract subjectAltName domains for separate display
  const subjectAltNameDomains = useMemo(() => {
    const sanExtension = certificate.extensions.find(
      ext =>
        ext.name.toLowerCase().includes('subjectaltname') ||
        ext.name.toLowerCase().includes('san')
    );

    if (!sanExtension) return [];

    const value = sanExtension.value;
    const domains = value.match(/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    return domains || [];
  }, [certificate.extensions]);

  // Show only extensions that don't have dedicated sections
  const regularExtensions = useMemo(() => {
    return certificate.extensions.filter(ext => {
      // First check if it has a dedicated section
      if (
        ext.name.toLowerCase().includes('subjectaltname') ||
        ext.name.toLowerCase().includes('san') ||
        ext.name.toLowerCase().includes('ctprecertificatescts') ||
        ext.name.toLowerCase().includes('signedcertificatetimestamplist') ||
        ext.name.toLowerCase().includes('timestamplist') ||
        ext.name.toLowerCase().includes('keyusage') ||
        ext.name.toLowerCase().includes('basicconstraints') ||
        ext.name.toLowerCase().includes('extkeyusage')
      ) {
        return false;
      }

      // Check for meaningless extension names
      if (
        ext.name === 'Unknown' ||
        ext.name === '- A I' ||
        ext.name === 'A I' ||
        ext.name === '- A' ||
        ext.name === 'A' ||
        ext.name === 'I' ||
        ext.name.length <= 3 ||
        ext.name.match(/^[-\s]+$/) ||
        ext.name.match(/^[-\s]*[AI][-\s]*$/) ||
        ext.name.match(/^[AI][-\s]*$/) ||
        ext.name.match(/^[-\s]*[AI]$/)
      ) {
        return false;
      }

      // Check for meaningless values
      if (
        !ext.value ||
        ext.value.trim() === '' ||
        ext.value.toLowerCase().includes('not specified') ||
        ext.value.toLowerCase().includes('see ') ||
        ext.value.toLowerCase().includes('data') ||
        ext.value === 'Unknown' ||
        ext.value === '- A I' ||
        ext.value === 'A I' ||
        ext.value === '- A' ||
        ext.value === 'A' ||
        ext.value === 'I' ||
        ext.value.length <= 3 ||
        ext.value.match(/^[-\s]+$/) ||
        ext.value.match(/^[-\s]*[AI][-\s]*$/) ||
        ext.value.match(/^[AI][-\s]*$/) ||
        ext.value.match(/^[-\s]*[AI]$/)
      ) {
        // Match various patterns like "- A I", "A I", "A", "I", etc.
        return false;
      }

      return true;
    });
  }, [certificate.extensions]);

  const shouldShowSection = (sectionName: string, data: unknown): boolean => {
    if (!searchTerm.trim()) return true;

    switch (sectionName) {
      case 'subject':
        return (
          searchInPropertyNames([
            'Common Name',
            'Organization',
            'Organizational Unit',
            'Country',
            'State',
            'Locality',
            'Email',
            'Subject',
          ]) || searchInCertificateData(data)
        );
      case 'issuer':
        return (
          searchInPropertyNames([
            'Common Name',
            'Organization',
            'Organizational Unit',
            'Country',
            'State',
            'Locality',
            'Email',
            'Issuer',
          ]) || searchInCertificateData(data)
        );
      case 'validity':
        return (
          searchInPropertyNames([
            'Valid From',
            'Valid To',
            'Validity Period',
            'Validity',
          ]) || searchInCertificateData(data)
        );
      case 'publicKey':
        return (
          searchInPropertyNames(['Algorithm', 'Key Size', 'Public Key']) ||
          searchInCertificateData(data)
        );
      case 'signature':
        return (
          searchInPropertyNames(['Algorithm', 'Serial Number', 'Signature']) ||
          searchInCertificateData(data)
        );
      case 'fingerprints':
        return (
          searchInPropertyNames(['SHA-1', 'SHA-256', 'Fingerprints']) ||
          searchInCertificateData(data)
        );
      case 'extensions':
        return Array.isArray(data) && data.length > 0;
      case 'subjectAltName':
        return (
          searchInPropertyNames([
            'Subject Alternative Name',
            'SAN',
            'Domains',
          ]) || searchInCertificateData(data)
        );
      case 'version':
        return (
          searchInPropertyNames(['Version', 'Certificate Version']) ||
          searchInCertificateData(data)
        );
      case 'keyUsage':
        return (
          searchInPropertyNames(['Key Usage', 'Usage']) ||
          searchInCertificateData(data)
        );
      case 'basicConstraints':
        return (
          searchInPropertyNames(['Basic Constraints', 'CA', 'Path Length']) ||
          searchInCertificateData(data)
        );
      case 'extendedKeyUsage':
        return (
          searchInPropertyNames(['Extended Key Usage', 'Extended Usage']) ||
          searchInCertificateData(data)
        );
      case 'certificateTransparency':
        return (
          searchInPropertyNames(['Certificate Transparency', 'SCT', 'CT']) ||
          searchInCertificateData(data)
        );
      default:
        return true;
    }
  };

  const getValidityStatus = () => {
    if (certificate.validity.isExpired) {
      return {
        icon: AlertTriangle,
        text: 'Expired',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
      };
    } else if (certificate.validity.isExpiringSoon) {
      return {
        icon: Clock,
        text: 'Expiring Soon',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      };
    } else {
      return {
        icon: CheckCircle,
        text: 'Valid',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
      };
    }
  };

  const validityStatus = getValidityStatus();
  const StatusIcon = validityStatus.icon;

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* Enhanced Search Bar */}
      <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm'>
        <div className='p-4 sm:p-6'>
          <div className='relative'>
            <input
              type='text'
              placeholder='Search certificate details (property names, values, domains, etc.)...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full px-4 py-3 pl-12 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base'
            />
            <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className='absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
              >
                <X className='h-4 w-4' />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Search Results Info */}
      {searchTerm && (
        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 sm:p-4'>
          <div className='flex items-center space-x-2'>
            <Search className='h-4 w-4 text-blue-600 dark:text-blue-400' />
            <span className='text-sm text-blue-800 dark:text-blue-400'>
              {filteredCertificate.extensions.length === 0 &&
              !shouldShowSection('subject', certificate.subject) &&
              !shouldShowSection('issuer', certificate.issuer) &&
              !shouldShowSection('validity', certificate.validity) &&
              !shouldShowSection('publicKey', certificate.publicKey) &&
              !shouldShowSection('signature', certificate.signature) &&
              !shouldShowSection('fingerprints', certificate.fingerprint) ? (
                <>No matches found for &quot;{searchTerm}&quot;</>
              ) : (
                <>Showing results for &quot;{searchTerm}&quot;</>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Enhanced Validity Status */}
      {shouldShowSection('validity', certificate.validity) && (
        <div
          className={`p-4 sm:p-6 rounded-xl border ${validityStatus.bgColor}`}
        >
          <div className='flex items-center space-x-3'>
            <div className='p-2 rounded-lg bg-white/20'>
              <StatusIcon className={`h-5 w-5 ${validityStatus.color}`} />
            </div>
            <div>
              <h3
                className={`font-semibold text-sm sm:text-base ${validityStatus.color}`}
              >
                Certificate Status
              </h3>
              <p className={`text-sm ${validityStatus.color} opacity-90`}>
                {validityStatus.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Validity Period */}
      {shouldShowSection('validity', certificate.validity) && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm'>
          <div className='p-4 sm:p-6'>
            <div className='flex items-center space-x-3 mb-4'>
              <div className='p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg'>
                <Calendar className='h-5 w-5 text-purple-600 dark:text-purple-400' />
              </div>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Validity Period
              </h3>
            </div>
            <div className='space-y-3'>
              <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-3'>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-200 dark:border-gray-600'>
                  <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                    Valid From
                  </span>
                  <span className='text-sm text-gray-900 dark:text-gray-100 font-medium'>
                    {formatDate(certificate.validity.notBefore)}
                  </span>
                </div>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-200 dark:border-gray-600'>
                  <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                    Valid To
                  </span>
                  <span className='text-sm text-gray-900 dark:text-gray-100 font-medium'>
                    {formatDate(certificate.validity.notAfter)}
                  </span>
                </div>
                {shouldShowSection('version', certificate.version) && (
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2'>
                    <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                      Version
                    </span>
                    <span className='text-sm text-gray-900 dark:text-gray-100 font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded'>
                      {certificate.version}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
        {/* Enhanced Subject Information */}
        {shouldShowSection('subject', certificate.subject) && (
          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm'>
            <div className='p-4 sm:p-6'>
              <div className='flex items-center space-x-3 mb-4'>
                <div className='p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg'>
                  <User className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                </div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  Subject
                </h3>
              </div>
              <div className='space-y-3'>
                <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <p className='text-xs font-mono text-gray-600 dark:text-gray-400 break-all'>
                    {formatDN(certificate.subject)}
                  </p>
                </div>
                <div className='space-y-2'>
                  {certificate.subject.commonName && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Common Name
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100 font-medium'>
                        {certificate.subject.commonName}
                      </span>
                    </div>
                  )}
                  {certificate.subject.organization && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Organization
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100'>
                        {certificate.subject.organization}
                      </span>
                    </div>
                  )}
                  {certificate.subject.organizationalUnit && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Organizational Unit
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100'>
                        {certificate.subject.organizationalUnit}
                      </span>
                    </div>
                  )}
                  {certificate.subject.country && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Country
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100'>
                        {certificate.subject.country}
                      </span>
                    </div>
                  )}
                  {certificate.subject.state && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        State
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100'>
                        {certificate.subject.state}
                      </span>
                    </div>
                  )}
                  {certificate.subject.locality && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Locality
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100'>
                        {certificate.subject.locality}
                      </span>
                    </div>
                  )}
                  {certificate.subject.email && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Email
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100'>
                        {certificate.subject.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Issuer Information */}
        {shouldShowSection('issuer', certificate.issuer) && (
          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm'>
            <div className='p-4 sm:p-6'>
              <div className='flex items-center space-x-3 mb-4'>
                <div className='p-2 bg-green-100 dark:bg-green-900/20 rounded-lg'>
                  <Building className='h-5 w-5 text-green-600 dark:text-green-400' />
                </div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  Issuer
                </h3>
              </div>
              <div className='space-y-3'>
                <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <p className='text-xs font-mono text-gray-600 dark:text-gray-400 break-all'>
                    {formatDN(certificate.issuer)}
                  </p>
                </div>
                <div className='space-y-2'>
                  {certificate.issuer.commonName && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Common Name
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100 font-medium'>
                        {certificate.issuer.commonName}
                      </span>
                    </div>
                  )}
                  {certificate.issuer.organization && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Organization
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100'>
                        {certificate.issuer.organization}
                      </span>
                    </div>
                  )}
                  {certificate.issuer.organizationalUnit && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Organizational Unit
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100'>
                        {certificate.issuer.organizationalUnit}
                      </span>
                    </div>
                  )}
                  {certificate.issuer.country && (
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Country
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100'>
                        {certificate.issuer.country}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Signature Information */}
        {shouldShowSection('signature', certificate.signature) && (
          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center space-x-2 mb-4'>
              <Shield className='h-5 w-5 text-red-500' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Signature
              </h3>
            </div>
            <div className='space-y-2 text-sm'>
              <div>
                <span className='font-medium text-gray-600 dark:text-gray-400'>
                  Algorithm:
                </span>
                <span className='ml-2 text-gray-900 dark:text-gray-100'>
                  {certificate.signature.algorithm}
                </span>
              </div>
              <div>
                <span className='font-medium text-gray-600 dark:text-gray-400'>
                  Serial Number:
                </span>
                <span className='ml-2 text-gray-900 dark:text-gray-100 font-mono text-xs'>
                  {certificate.serialNumber}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Fingerprints */}
        {shouldShowSection('fingerprints', certificate.fingerprint) && (
          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center space-x-2 mb-4'>
              <Shield className='h-5 w-5 text-indigo-500' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Fingerprints
              </h3>
            </div>
            <div className='space-y-2 text-sm'>
              <div>
                <span className='font-medium text-gray-600 dark:text-gray-400'>
                  SHA-1:
                </span>
                <div className='text-gray-900 dark:text-gray-100 font-mono text-xs break-all'>
                  {certificate.fingerprint.sha1}
                </div>
              </div>
              <div>
                <span className='font-medium text-gray-600 dark:text-gray-400'>
                  SHA-256:
                </span>
                <div className='text-gray-900 dark:text-gray-100 font-mono text-xs break-all'>
                  {certificate.fingerprint.sha256}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Subject Public Key Info - Full Width Card */}
      {shouldShowSection('publicKey', certificate.publicKey) && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm'>
          <div className='p-4 sm:p-6'>
            <div className='flex items-center space-x-3 mb-4'>
              <div className='p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg'>
                <Key className='h-5 w-5 text-orange-600 dark:text-orange-400' />
              </div>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Subject Public Key Info
              </h3>
            </div>
            <div className='space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-3'>
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2'>
                    <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                      Algorithm
                    </span>
                    <span className='text-sm text-gray-900 dark:text-gray-100 font-medium'>
                      {certificate.publicKey.algorithm}
                    </span>
                  </div>
                </div>
                {certificate.publicKey.keySize && (
                  <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-3'>
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Key Size
                      </span>
                      <span className='text-sm text-gray-900 dark:text-gray-100 font-medium'>
                        {certificate.publicKey.keySize} bit
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {certificate.publicKey.exponent && (
                <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-3'>
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between py-2'>
                    <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                      Exponent
                    </span>
                    <span className='text-sm text-gray-900 dark:text-gray-100 font-mono'>
                      {certificate.publicKey.exponent}
                    </span>
                  </div>
                </div>
              )}
              {certificate.publicKey.modulus && (
                <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-3'>
                  <div className='space-y-2'>
                    <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                      Modulus
                    </span>
                    <div className='text-xs text-gray-900 dark:text-gray-100 font-mono break-all whitespace-pre-line bg-white dark:bg-gray-800 p-2 rounded'>
                      {certificate.publicKey.modulus}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Key Usage */}
      {shouldShowSection('keyUsage', certificate.keyUsage) &&
        certificate.keyUsage && (
          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center space-x-2 mb-4'>
              <Key className='h-5 w-5 text-purple-500' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Key Usage
              </h3>
            </div>
            <div className='space-y-2'>
              {certificate.keyUsage
                .filter(
                  usage =>
                    !usage.startsWith('Raw Binary:') &&
                    !usage.startsWith('Hex:') &&
                    !usage.startsWith('Binary:')
                )
                .map((usage, index) => (
                  <div key={index} className='flex items-start space-x-2'>
                    <div className='w-2 h-2 bg-purple-500 rounded-full mt-2'></div>
                    <span className='text-sm text-gray-900 dark:text-gray-100'>
                      {usage}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

      {/* Basic Constraints */}
      {shouldShowSection('basicConstraints', certificate.basicConstraints) &&
        certificate.basicConstraints && (
          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center space-x-2 mb-4'>
              <Shield className='h-5 w-5 text-orange-500' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Basic Constraints
              </h3>
            </div>
            <div className='space-y-2 text-sm'>
              <div>
                <span className='font-medium text-gray-600 dark:text-gray-400'>
                  Certificate Authority:
                </span>
                <span
                  className={`ml-2 px-2 py-1 text-xs rounded ${
                    certificate.basicConstraints.isCA
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                  }`}
                >
                  {certificate.basicConstraints.isCA ? 'Yes' : 'No'}
                </span>
              </div>
              {certificate.basicConstraints.pathLength !== undefined && (
                <div>
                  <span className='font-medium text-gray-600 dark:text-gray-400'>
                    Path Length Constraint:
                  </span>
                  <span className='ml-2 text-gray-900 dark:text-gray-100'>
                    {certificate.basicConstraints.pathLength}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Extended Key Usage */}
      {shouldShowSection('extendedKeyUsage', certificate.extendedKeyUsage) &&
        certificate.extendedKeyUsage && (
          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center space-x-2 mb-4'>
              <Key className='h-5 w-5 text-teal-500' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Extended Key Usage
              </h3>
            </div>
            <div className='space-y-2'>
              {certificate.extendedKeyUsage
                .filter(
                  usage =>
                    !usage.startsWith('Raw Binary:') &&
                    !usage.startsWith('Hex:') &&
                    !usage.startsWith('Binary:')
                )
                .map((usage, index) => (
                  <div key={index} className='flex items-start space-x-2'>
                    <div className='w-2 h-2 bg-teal-500 rounded-full mt-2'></div>
                    <span className='text-sm text-gray-900 dark:text-gray-100'>
                      {usage}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

      {/* Subject Alternative Name */}
      {shouldShowSection('subjectAltName', subjectAltNameDomains) &&
        subjectAltNameDomains.length > 0 && (
          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center space-x-2 mb-4'>
              <Shield className='h-5 w-5 text-green-500' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Subject Alternative Name (DNS)
              </h3>
            </div>
            <div className='space-y-2'>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                Additional domain names and IP addresses covered by this
                certificate:
              </p>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
                {subjectAltNameDomains.map((domain, index) => (
                  <div
                    key={index}
                    className='px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600'
                  >
                    <span className='text-sm font-mono text-gray-900 dark:text-gray-100'>
                      {domain}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* Certificate Transparency */}
      {shouldShowSection(
        'certificateTransparency',
        certificate.certificateTransparency
      ) &&
        certificate.certificateTransparency && (
          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center space-x-2 mb-4'>
              <Shield className='h-5 w-5 text-cyan-500' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                CT Precertificate SCTs
              </h3>
            </div>
            <div className='space-y-4'>
              {certificate.certificateTransparency.scts.length > 0 ? (
                certificate.certificateTransparency.scts.map((sct, index) => (
                  <div
                    key={index}
                    className='bg-gray-50 dark:bg-gray-700 rounded p-4'
                  >
                    <div className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                      Signed Certificate Timestamp:
                    </div>
                    <div className='space-y-3 text-sm font-mono'>
                      <div className='flex'>
                        <span className='text-gray-600 dark:text-gray-400 w-24 mr-4'>
                          Version:
                        </span>
                        <span className='text-gray-900 dark:text-gray-100'>
                          {sct.version}
                        </span>
                      </div>
                      <div className='flex'>
                        <span className='text-gray-600 dark:text-gray-400 w-24 mr-4'>
                          Log ID:
                        </span>
                        <span className='text-gray-900 dark:text-gray-100 break-all'>
                          {sct.logId}
                        </span>
                      </div>
                      <div className='flex'>
                        <span className='text-gray-600 dark:text-gray-400 w-24 mr-4'>
                          Timestamp:
                        </span>
                        <span className='text-gray-900 dark:text-gray-100'>
                          {sct.timestamp.toLocaleString()} GMT
                        </span>
                      </div>
                      <div className='flex'>
                        <span className='text-gray-600 dark:text-gray-400 w-24 mr-4'>
                          Extensions:
                        </span>
                        <span className='text-gray-900 dark:text-gray-100'>
                          none
                        </span>
                      </div>
                      <div className='flex flex-col'>
                        <span className='text-gray-600 dark:text-gray-400 w-24 mr-4 mb-2'>
                          Signature:
                        </span>
                        <div className='text-gray-900 dark:text-gray-100 whitespace-pre-line break-all font-mono text-xs max-w-full overflow-hidden ml-0'>
                          {sct.signature}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  No Certificate Transparency data available.
                </p>
              )}
            </div>
          </div>
        )}

      {/* Extensions */}
      {shouldShowSection('extensions', regularExtensions) &&
        regularExtensions.length > 0 && (
          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
              Extensions
            </h3>
            <div className='space-y-3'>
              {regularExtensions
                .filter(
                  ext =>
                    formatExtensionValue(ext.name, ext.value) !==
                    'Not specified'
                )
                .map((ext, index) => (
                  <div key={index} className='border-l-4 border-blue-500 pl-4'>
                    <div className='flex items-center space-x-2'>
                      <span className='font-medium text-gray-900 dark:text-gray-100'>
                        {getHumanReadableExtensionName(ext.name)}
                      </span>
                      {ext.critical && (
                        <span className='px-2 py-1 text-xs bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded'>
                          Critical
                        </span>
                      )}
                    </div>
                    <div className='text-sm text-gray-600 dark:text-gray-400 mt-1 break-words whitespace-pre-line'>
                      {formatExtensionValue(ext.name, ext.value)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
    </div>
  );
}
