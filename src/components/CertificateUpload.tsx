'use client';

import React, { useCallback, useState } from 'react';
import { Upload, FileText, Type, FileUp, Globe } from 'lucide-react';
import { fetchCertificateFromUrlWithData } from '@/lib/cert-api-parser';

interface CertificateUploadProps {
  onCertificateLoad: (
    certText: string,
    fileName: string,
    source?: 'file' | 'text' | 'url',
    apiData?: Record<string, unknown>
  ) => void;
  onError: (error: string) => void;
}

type UploadMode = 'file' | 'text' | 'url';

export default function CertificateUpload({
  onCertificateLoad,
  onError,
}: CertificateUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');

  const handleFile = useCallback(
    async (file: File) => {
      if (
        !file.name.toLowerCase().endsWith('.crt') &&
        !file.name.toLowerCase().endsWith('.pem')
      ) {
        onError('Please upload a .crt or .pem file');
        return;
      }

      setIsLoading(true);
      try {
        const text = await file.text();
        onCertificateLoad(text, file.name, 'file');
      } catch {
        onError('Failed to read file');
      } finally {
        setIsLoading(false);
      }
    },
    [onCertificateLoad, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
            break;
          }
        } else if (item.kind === 'string' && item.type === 'text/plain') {
          item.getAsString(text => {
            if (text.includes('-----BEGIN CERTIFICATE-----')) {
              onCertificateLoad(text, 'pasted-certificate.pem', 'text');
            }
          });
        }
      }
    },
    [handleFile, onCertificateLoad]
  );

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) {
      onError('Please enter certificate text');
      return;
    }

    if (!textInput.includes('-----BEGIN CERTIFICATE-----')) {
      onError(
        'Invalid certificate format. Please ensure the text contains a valid PEM-formatted certificate.'
      );
      return;
    }

    onCertificateLoad(textInput.trim(), 'pasted-certificate.pem', 'text');
  }, [textInput, onCertificateLoad, onError]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTextInput(e.target.value);
    },
    []
  );

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) {
      onError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchCertificateFromUrlWithData(urlInput.trim());
      const urlObj = new URL(
        urlInput.startsWith('http') ? urlInput : `https://${urlInput}`
      );
      onCertificateLoad(
        result.certificate,
        `${urlObj.hostname}.crt`,
        'url',
        result.apiData
      );
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch certificate from URL'
      );
    } finally {
      setIsLoading(false);
    }
  }, [urlInput, onCertificateLoad, onError]);

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrlInput(e.target.value);
    },
    []
  );

  return (
    <div className='w-full max-w-2xl mx-auto space-y-6'>
      {/* Mode Toggle */}
      <div className='flex justify-center'>
        <div className='bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex'>
          <button
            onClick={() => setUploadMode('file')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              uploadMode === 'file'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <FileUp className='h-4 w-4' />
            <span>Upload File</span>
          </button>
          <button
            onClick={() => setUploadMode('text')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              uploadMode === 'text'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Type className='h-4 w-4' />
            <span>Paste Text</span>
          </button>
          <button
            onClick={() => setUploadMode('url')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              uploadMode === 'url'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Globe className='h-4 w-4' />
            <span>From URL</span>
          </button>
        </div>
      </div>

      {/* File Upload Mode */}
      {uploadMode === 'file' && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${
              isDragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onPaste={handlePaste}
        >
          <input
            type='file'
            accept='.crt,.pem'
            onChange={handleFileInput}
            className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
            disabled={isLoading}
          />

          <div className='space-y-4'>
            <div className='flex justify-center'>
              {isLoading ? (
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
              ) : (
                <Upload className='h-12 w-12 text-gray-400' />
              )}
            </div>

            <div>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                Upload Certificate
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                Drag and drop a .crt or .pem file, or click to browse
              </p>
            </div>

            <div className='flex items-center justify-center space-x-2 text-xs text-gray-400 dark:text-gray-500'>
              <FileText className='h-4 w-4' />
              <span>Supports .crt and .pem files</span>
            </div>

            <div className='text-xs text-gray-400 dark:text-gray-500'>
              You can also paste certificate content directly
            </div>
          </div>
        </div>
      )}

      {/* Text Input Mode */}
      {uploadMode === 'text' && (
        <div className='space-y-4'>
          <div className='text-center'>
            <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
              Paste Certificate Text
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Paste your PEM-formatted certificate text below
            </p>
          </div>

          <div className='space-y-3'>
            <textarea
              value={textInput}
              onChange={handleTextChange}
              placeholder='-----BEGIN CERTIFICATE-----
MIIFjTCCA3WgAwIBAgIJAK...
-----END CERTIFICATE-----'
              className='w-full h-64 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm'
            />

            <div className='flex justify-between items-center'>
              <div className='text-xs text-gray-500 dark:text-gray-400'>
                {textInput.length} characters
              </div>
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || isLoading}
                className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium'
              >
                {isLoading ? 'Processing...' : 'Parse Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL Input Mode */}
      {uploadMode === 'url' && (
        <div className='space-y-4'>
          <div className='text-center'>
            <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
              Fetch Certificate from URL
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Enter a website URL to fetch and analyze its SSL certificate
            </p>
          </div>

          <div className='space-y-3'>
            <div className='relative'>
              <input
                type='url'
                value={urlInput}
                onChange={handleUrlChange}
                placeholder='https://example.com or example.com'
                className='w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                disabled={isLoading}
              />
              <Globe className='absolute right-3 top-3.5 h-5 w-5 text-gray-400' />
            </div>

            <div className='flex justify-between items-center'>
              <div className='text-xs text-gray-500 dark:text-gray-400'>
                {urlInput.length} characters
              </div>
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || isLoading}
                className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium'
              >
                {isLoading ? 'Fetching...' : 'Fetch Certificate'}
              </button>
            </div>

            <div className='text-xs text-gray-500 dark:text-gray-400 text-center'>
              <p>Examples: google.com, github.com, stackoverflow.com</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
