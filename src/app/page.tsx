'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Moon, Sun, AlertCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import CertificateUpload from '@/components/CertificateUpload';
import CertificateDetails from '@/components/CertificateDetails';
import CertificateRawView from '@/components/CertificateRawView';
import {
  CertificateInfo,
  parseCertificate,
  validateCertificateFormat,
} from '@/lib/certificate-parser';

type ViewMode = 'details' | 'raw';

export default function Home() {
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCertificateLoad = async (
    certText: string,
    name: string,
    source?: 'file' | 'text' | 'url',
    apiData?: Record<string, unknown>
  ) => {
    try {
      // If this is a URL fetch, display the raw API response instead of parsing
      if (source === 'url' && apiData) {
        // Extract the actual API response from the contents field
        const actualApiResponse = apiData.contents
          ? JSON.parse(apiData.contents as string)
          : apiData;

        setCertificate(null); // Don't show certificate details for URL fetches
        setRawText(JSON.stringify(actualApiResponse, null, 2));
        setFileName(`${name} - API Response`);
        setViewMode('raw'); // Set to raw view for API responses
        setError('');
        return;
      }

      // For file and text uploads, validate and parse normally
      if (!validateCertificateFormat(certText)) {
        setError(
          'Invalid certificate format. Please ensure the file contains a valid PEM-formatted certificate.'
        );
        return;
      }

      const parsed = await parseCertificate(certText);
      setCertificate(parsed);
      setRawText(certText);
      setFileName(name);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to parse certificate'
      );
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setCertificate(null);
    setRawText('');
    setFileName('');
  };

  const clearCertificate = () => {
    setCertificate(null);
    setRawText('');
    setFileName('');
    setError('');
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <header className='bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center space-x-3'>
              <Shield className='h-8 w-8 text-blue-600 dark:text-blue-400' />
              <h1 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                SSL/TLS Certificate Viewer
              </h1>
            </div>

            <div className='flex items-center space-x-4'>
              {mounted && (
                <button
                  onClick={() =>
                    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                  }
                  className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
                  aria-label='Toggle theme'
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className='h-5 w-5' />
                  ) : (
                    <Moon className='h-5 w-5' />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {!certificate && !rawText ? (
          <div className='space-y-8'>
            {/* Upload Section */}
            <div className='text-center'>
              <h2 className='text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                Upload Your Certificate
              </h2>
              <p className='text-gray-600 dark:text-gray-400'>
                Upload a .crt or .pem file to view its details
              </p>
            </div>

            <CertificateUpload
              onCertificateLoad={handleCertificateLoad}
              onError={handleError}
            />

            {/* Privacy Notice */}
            <div className='max-w-2xl mx-auto'>
              <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
                <div className='flex items-start space-x-3'>
                  <Shield className='h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0' />
                  <div>
                    <h3 className='text-blue-800 dark:text-blue-400 font-medium mb-1'>
                      Privacy & Security Notice
                    </h3>
                    <p className='text-blue-700 dark:text-blue-300 text-sm'>
                      Your certificate data is processed entirely in your
                      browser. No information is captured, transmitted, or
                      stored on our servers. All certificate parsing and
                      analysis happens locally on your device to ensure complete
                      privacy and security.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className='max-w-2xl mx-auto'>
                <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
                  <div className='flex items-center space-x-2'>
                    <AlertCircle className='h-5 w-5 text-red-600 dark:text-red-400' />
                    <span className='text-red-800 dark:text-red-400 font-medium'>
                      Error
                    </span>
                  </div>
                  <p className='text-red-700 dark:text-red-300 mt-2'>{error}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='space-y-6'>
            {/* Certificate Header */}
            <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    {certificate?.subject.commonName || 'API Response'}
                  </h2>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {fileName}
                  </p>
                </div>
                <button
                  onClick={clearCertificate}
                  className='px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
                >
                  Upload New Certificate
                </button>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
              <div className='border-b border-gray-200 dark:border-gray-700'>
                <nav className='flex space-x-8 px-6'>
                  {certificate && (
                    <button
                      onClick={() => setViewMode('details')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        viewMode === 'details'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Certificate Details
                    </button>
                  )}
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      viewMode === 'raw'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {certificate ? 'Raw View' : 'API Response'}
                  </button>
                </nav>
              </div>

              <div className='p-6'>
                {viewMode === 'details' && certificate ? (
                  <CertificateDetails certificate={certificate} />
                ) : (
                  <CertificateRawView rawText={rawText} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className='bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='text-center text-sm text-gray-600 dark:text-gray-400'>
            <p>
              Built with ❤️ by Nasr Aldin — making certificates human-friendly.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
