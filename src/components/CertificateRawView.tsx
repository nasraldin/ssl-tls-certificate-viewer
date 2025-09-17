'use client';

import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  vscDarkPlus,
  vs,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useTheme } from 'next-themes';

interface CertificateRawViewProps {
  rawText: string;
}

export default function CertificateRawView({
  rawText,
}: CertificateRawViewProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const highlightStyle = mounted && resolvedTheme === 'dark' ? vscDarkPlus : vs;

  if (!mounted) {
    return (
      <div className='space-y-4'>
        <div className='relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm'>
          <div className='p-6 bg-gray-50 dark:bg-gray-800'>
            <div className='animate-pulse'>
              <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2'></div>
              <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2'></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Certificate Content */}
      <div className='relative'>
        <SyntaxHighlighter
          language='text'
          style={highlightStyle}
          customStyle={{
            margin: 0,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            lineHeight: '1.5',
          }}
          showLineNumbers
          wrapLines
          wrapLongLines
        >
          {rawText}
        </SyntaxHighlighter>

        {/* Copy Button in top right corner */}
        <button
          onClick={handleCopy}
          className={`absolute top-3 right-3 p-2 rounded-lg transition-colors ${
            copied
              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title='Copy certificate text'
        >
          {copied ? (
            <Check className='h-4 w-4' />
          ) : (
            <Copy className='h-4 w-4' />
          )}
        </button>
      </div>
    </div>
  );
}
