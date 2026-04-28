﻿import React, { useState, useMemo, useEffect, useRef } from 'react';

// --- Type Definitions ---
type SeverityLevel = 'High' | 'Medium' | 'Low';

interface Finding {
  id: string;
  source: string;
  line: number;
  snippet: string;
  match: string;
  category: string;
  severity: SeverityLevel;
  name: string;
  libraryName: string | null;
  version: string | null;
}

interface RegexPattern {
  name: string;
  regex: RegExp;
  category: string;
  severity: SeverityLevel;
  exclusions?: RegExp[];
}

interface SeverityConfig {
  color: string;
  ring: string;
  bg: string;
  text: string;
}

interface IconProps {
  className: string;
}

type IconComponent = React.ComponentType<IconProps>;

type CategoryIconsMap = Record<string, IconComponent>;

type IconsMap = Record<string, IconComponent>;

interface InputSectionProps {
  activeTab: 'upload' | 'url';
  setActiveTab: (tab: 'upload' | 'url') => void;
  files: File[];
  setFiles: (files: File[]) => void;
  url: string;
  setUrl: (url: string) => void;
  isLoading: boolean;
  beautify: boolean;
  setBeautify: (beautify: boolean) => void;
  handleScan: () => void;
  clearState: () => void;
  hasResults: boolean;
}

interface ResultsDisplayProps {
  activeResults: Finding[];
  hiddenResults: Finding[] | null;
  handleDismiss: (id: string) => void;
  handleRestore: (id: string) => void;
  exportResults: (format: 'json' | 'csv', dataToExport: Finding[], fileName: string) => void;
}

interface SummaryDashboardProps {
  summary: Record<'High' | 'Medium' | 'Low', number>;
  total: number;
  exportResults: (format: 'json' | 'csv') => void;
}

interface SummaryPillProps {
  severity: SeverityLevel;
  count: number;
}

interface CollapsibleCategoryProps {
  category: string;
  findings: Finding[];
  onDismiss?: (id: string) => void;
  onRestore?: (id: string) => void;
  isDismissed?: boolean;
}

interface FindingCardProps {
  finding: Finding;
  onDismiss?: (id: string) => void;
  onRestore?: (id: string) => void;
  isDismissed?: boolean;
}

interface ChatbotProps {
  scanResults: Finding[];
}

interface TabButtonProps {
  name: 'upload' | 'url';
  activeTab: 'upload' | 'url';
  setActiveTab: (tab: 'upload' | 'url') => void;
  children: React.ReactNode;
}

interface FileUploadProps {
  files: File[];
  setFiles: (files: File[]) => void;
}

interface UrlInputProps {
  url: string;
  setUrl: (url: string) => void;
}

interface SimpleMarkdownProps {
  text: string;
}

interface ChatSimpleMarkdownProps {
  text: string;
}

// --- Helper & Icon Components ---

const ICONS: IconsMap = {
  API_KEY: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 7.07a2 2 0 1 0 2.83-2.83L3 3"/><path d="M12 12 21 21"/><path d="m16 12 5 5"/><path d="M9 12a3 3 0 1 1-4.24-4.24 3 3 0 0 1 4.24 4.24Z"/></svg>,
  SECRET: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  CREDENTIALS: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>,
  ENDPOINT: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>,
  CONFIG: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>,
  CLOUD: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
  PII: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  CHEVRON_DOWN: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  CHATBOT: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6V4H8a2 2 0 0 0-2 2v2"/><path d="M12 18v2h4a2 2 0 0 0 2-2v-2"/><path d="M18 12h2v-4a2 2 0 0 0-2-2h-2"/><path d="M6 12H4v4a2 2 0 0 0 2 2h2"/><path d="M12 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/><path d="M16 12h-2"/><path d="M18 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/><path d="M12 16v-2"/></svg>,
  SEND: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
  CLOSE: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  DISMISS: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  RESTORE: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  CVE: ({ className }: IconProps) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1.5s-8 4.5-8 10.5c0 5.25 8 10.5 8 10.5s8-5.25 8-10.5c0-6-8-10.5-8-10.5z"/><path d="M12 7.5s-4 2.25-4 5.25c0 2.625 4 5.25 4 5.25s4-2.625 4-5.25c0-3-4-5.25-4-5.25z"/></svg>
};

const SEVERITY_CONFIG: Record<SeverityLevel, SeverityConfig> = {
  High: { color: 'red', ring: 'ring-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400' },
  Medium: { color: 'orange', ring: 'ring-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  Low: { color: 'green', ring: 'ring-green-500/30', bg: 'bg-green-500/10', text: 'text-green-400' },
};

// --- Expanded & Refined Regex Definitions ---
const REGEX_PATTERNS: RegexPattern[] = [
  // High Severity
  { name: 'Generic Secret', regex: new RegExp(/(secret|token|password|passwd|pwd|auth_token|secret_key)\s*[:=]\s*['"`][^'"`\s]{12,}['"`]/, 'gi'), category: 'Credentials', severity: 'High' },
  { name: 'AWS Secret Access Key', regex: new RegExp(/(?![/a-zA-Z0-9]*\/[a-zA-Z0-9]*\/)(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/, 'g'), category: 'Secrets', severity: 'High' },
  { name: 'Google Maps/Firebase API Key', regex: new RegExp(/AIza[0-9A-Za-z\-_]{35}/, 'g'), category: 'API Keys', severity: 'High' },
  { name: 'Stripe API Key', regex: new RegExp(/(?:r|s)k_live_[0-9a-zA-Z]{24}/, 'g'), category: 'API Keys', severity: 'High' },
  { name: 'JWT Token', regex: new RegExp(/eyJ[a-zA-Z0-9-_]+\.eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_.+=-]+/, 'g'), category: 'Secrets', severity: 'High' },
  { name: 'SSH Private Key', regex: new RegExp(/-----BEGIN ((RSA|OPENSSH|EC|PGP) )?PRIVATE KEY-----/, 'g'), category: 'Credentials', severity: 'High' },
  { name: 'OAuth2 Token', regex: new RegExp(/[Oo][Aa][Uu][Tt][Hh][\w-]*\s*[:=]\s*['"`]([a-zA-Z0-9-_.]{20,})['"`]/, 'g'), category: 'Secrets', severity: 'High' },

  // Medium Severity
  { name: 'AWS Access Key ID', regex: new RegExp(/AKIA[0-9A-Z]{16}/, 'g'), category: 'API Keys', severity: 'Medium' },
  { name: 'Database URL with credentials', regex: new RegExp(/(?:mysql|mongodb|postgres|redis)(?:\+srv)?:\/\/\w+:[^@]+@/, 'g'), category: 'Credentials', severity: 'Medium' },
  { name: 'Internal IP Address', regex: new RegExp(/(10(\.\d{1,3}){3}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|192\.168(\.\d{1,3}){2})/, 'g'), category: 'Sensitive Endpoints', severity: 'Medium' },
  { name: 'Firebase Database URL', regex: new RegExp(/https?:\/\/[a-zA-Z0-9-]+\.firebaseio\.com/, 'g'), category: 'Cloud Configs', severity: 'Medium' },
  { name: 'AWS S3 Bucket URL', regex: new RegExp(/s3:\/\/[a-zA-Z0-9\.\-_]{3,63}/, 'g'), category: 'Cloud Configs', severity: 'Medium' },
  { name: 'Admin/Debug URL', regex: new RegExp(/['"`]\/[a-zA-Z0-9-_]*(admin|debug|test|backup|staging|dev)[a-zA-Z0-9-_]*\/['"`]/, 'gi'), category: 'Sensitive Endpoints', severity: 'Medium' },
  { name: 'Sensitive Info in Comments', regex: new RegExp(/(?:\/\/|#|\/\*|<!--)\s*.*(SECRET|PASSWORD|KEY|TOKEN|DANGER)/, 'gi'), category: 'Config Leaks', severity: 'Medium' },

  // Low Severity
  { name: 'Email Address', regex: new RegExp(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, 'g'), category: 'PII/Business Logic', severity: 'Low' },
  { name: 'Indian Phone Number', regex: new RegExp(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/, 'g'), category: 'PII/Business Logic', severity: 'Low' },
  { name: 'Environment Variable Leak', regex: new RegExp(/process\.env\.[A-Z_0-9]+/, 'g'), category: 'Config Leaks', severity: 'Low', exclusions: [new RegExp(/process\.env\.(NODE_ENV|PUBLIC_URL|CI)\b/, 'i')] },
  { name: 'Source Map Reference', regex: new RegExp(/sourceMappingURL=/, 'g'), category: 'Config Leaks', severity: 'Low' },
  { name: 'Hidden Form Field', regex: new RegExp(/<input[^>]+type=["']hidden["']/, 'gi'), category: 'PII/Business Logic', severity: 'Low' },
  { name: 'Library Version Leak', regex: new RegExp(/(['"`])([a-zA-Z0-9\-_@/.]+)\1\s*:\s*\1(?:[\^~])?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\1/, 'g'), category: 'Config Leaks', severity: 'Low' },
];

const CATEGORY_ICONS: CategoryIconsMap = {
  'API Keys': ICONS.API_KEY,
  'Secrets': ICONS.SECRET,
  'Credentials': ICONS.CREDENTIALS,
  'Sensitive Endpoints': ICONS.ENDPOINT,
  'Config Leaks': ICONS.CONFIG,
  'Cloud Configs': ICONS.CLOUD,
  'PII/Business Logic': ICONS.PII,
};

const SimpleMarkdown = ({ text }: SimpleMarkdownProps) => {
    if (!text) return null;
    const html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-slate-700/50 text-cyan-300 text-xs px-1.5 py-0.5 rounded">$1</code>')
        .replace(/```javascript\n([\s\S]*?)```/g, '<pre class="bg-slate-900/50 p-3 rounded-md mt-2 text-sm"><code class="text-cyan-300">$1</code></pre>')
        .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
        .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html.replace(/<br \/>(<li|<pre)/g, '$1') }} />;
};

// --- Core App Component ---
export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [results, setResults] = useState<Finding[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [beautify, setBeautify] = useState<boolean>(false);
  const [dismissedFindings, setDismissedFindings] = useState<Set<string>>(new Set());

  const CORS_PROXIES = [
    (targetUrl: string) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    (targetUrl: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    (targetUrl: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
  ];

  const fetchWithCorsFallback = async (targetUrl: string): Promise<string> => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxyUrl = CORS_PROXIES[i](targetUrl);
      try {
        console.log(`Trying CORS proxy ${i + 1}/${CORS_PROXIES.length}: ${new URL(proxyUrl).hostname}`);
        const response = await fetch(proxyUrl, { method: 'GET' });
        
        if (response.ok) {
          const text = await response.text();
          if (text && text.length > 0 && !text.includes('<html')) {
            console.log(`Successfully fetched via proxy ${i + 1}`);
            return text;
          }
        }
        lastError = new Error(`Proxy ${new URL(proxyUrl).hostname} returned status ${response.status}`);
      } catch (e) {
        console.warn(`Proxy ${i + 1} failed:`, e);
        lastError = e as Error;
      }
    }
    
    throw lastError || new Error('All CORS proxies failed. The URL may be inaccessible or blocked.');
  };

  const handleScan = async () => {
    setIsLoading(true);
    setError('');
    setResults(null);
    setDismissedFindings(new Set());
    let allFindings: Finding[] = [];

    try {
      if (activeTab === 'upload' && files.length > 0) {
        for (const file of files) {
          const content = await file.text();
          const findings = scanContent(content, file.name);
          allFindings = [...allFindings, ...findings];
        }
      } else if (activeTab === 'url' && url) {
        const content = await fetchWithCorsFallback(url);
        const findings = scanContent(content, url);
        allFindings = [...allFindings, ...findings];
      } else {
        setError('Please select file(s) or enter a URL.');
        setIsLoading(false);
        return;
      }
    } catch (e) {
      setError(`An error occurred: ${(e as Error).message}`);
    }

    setResults(allFindings);
    setIsLoading(false);
  };

  const handleDismiss = (findingId: string) => {
    setDismissedFindings(prev => new Set(prev).add(findingId));
  };

  const handleRestore = (findingId: string) => {
    setDismissedFindings(prev => {
        const newSet = new Set(prev);
        newSet.delete(findingId);
        return newSet;
    });
  };

  const activeResults = useMemo(() => {
    if (!results) return [];
    return results.filter(f => !dismissedFindings.has(f.id));
  }, [results, dismissedFindings]);

  const hiddenResults = useMemo(() => {
    if (!results) return null;
    return results.filter(f => dismissedFindings.has(f.id));
  }, [results, dismissedFindings]);

  const simpleBeautify = (code: string): string => {
    return code.replace(/;/g, ';\n').replace(/{/g, '{\n').replace(/}/g, '\n}\n').replace(/, /g, ',\n').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  };

  const scanContent = (content: string, sourceName: string): Finding[] => {
    const findings: Finding[] = [];
    const processedContent = beautify ? simpleBeautify(content) : content;
    const lines = processedContent.split('\n');

    lines.forEach((line, index) => {
      REGEX_PATTERNS.forEach(pattern => {
        const regex = pattern.regex;
        let match;
        while ((match = regex.exec(line)) !== null) {
          const matchedText = match[0];
          const isExcluded = pattern.exclusions?.some(ex => ex.test(matchedText));

          if (!isExcluded) {
            let finding: Finding = {
              id: `${sourceName}-${index}-${pattern.name}-${match.index}`,
              source: sourceName, line: index + 1, snippet: line.trim(), match: matchedText,
              category: pattern.category, severity: pattern.severity, name: pattern.name,
              libraryName: null, version: null,
            };

            if (pattern.name === 'Library Version Leak') {
                finding.libraryName = match[2];
                finding.version = match[3];
            }

            findings.push(finding);
          }
        }
      });
    });
    return findings;
  };

  const clearState = () => {
    setFiles([]); setUrl(''); setResults(null); setError(''); setDismissedFindings(new Set());
  };

  const exportResults = (format: 'json' | 'csv', dataToExport: Finding[], fileName: string) => {
    if (!dataToExport || dataToExport.length === 0) return;
    const summary = dataToExport.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, { High: 0, Medium: 0, Low: 0 });

    if (format === 'json') {
        const dataStr = JSON.stringify({ summary, results: dataToExport }, null, 2);
        downloadFile('data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr), `${fileName}.json`);
    } else if (format === 'csv') {
        const headers = 'Category,Severity,Name,Source,Line,Match,Snippet,Library,Version';
        const rows = dataToExport.map(r => [r.category, r.severity, r.name, `"${r.source}"`, r.line, `"${r.match}"`, `"${r.snippet.replace(/"/g, '""')}"`, r.libraryName || '', r.version || ''].join(','));
        const csvContent = [headers, ...rows].join('\n');
        downloadFile('data:text/csv;charset=utf-8,'+ encodeURIComponent(csvContent), `${fileName}.csv`);
    }
  };

  const downloadFile = (dataUri: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUri; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 text-slate-300 min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        <main className="mt-8">
          <InputSection {...{ activeTab, setActiveTab, files, setFiles, url, setUrl, isLoading, beautify, setBeautify, handleScan, clearState, hasResults: !!results }} />
          {error && <div className="mt-6 bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/30"><p><strong>Error:</strong> {error}</p></div>}
          {isLoading && <LoadingSpinner />}
          {activeResults && <ResultsDisplay {...{ activeResults, hiddenResults, handleDismiss, handleRestore, exportResults }} />}
          {activeResults && activeResults.length > 0 && <Chatbot scanResults={activeResults} />}
        </main>
      </div>
    </div>
  );
}

const Header = () => (
  <header className="text-center">
    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">JS Analyzer</h1>
    <p className="mt-2 text-slate-400 max-w-2xl mx-auto">Scan JavaScript & HTML files to detect hardcoded secrets, API keys, and other sensitive data.</p>
  </header>
);

const InputSection = ({ activeTab, setActiveTab, files, setFiles, url, setUrl, isLoading, beautify, setBeautify, handleScan, clearState, hasResults }: InputSectionProps) => (
    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg ring-1 ring-slate-700">
        <div className="flex border-b border-slate-700">
            <TabButton name="upload" activeTab={activeTab} setActiveTab={setActiveTab}>Upload File(s)</TabButton>
            <TabButton name="url" activeTab={activeTab} setActiveTab={setActiveTab}>Fetch from URL</TabButton>
        </div>
        <div className="mt-6">{activeTab === 'upload' ? <FileUpload files={files} setFiles={setFiles} /> : <UrlInput url={url} setUrl={setUrl} />}</div>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={beautify} onChange={(e) => setBeautify(e.target.checked)} className="form-checkbox h-5 w-5 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500/50"/>
                <span className="text-slate-400">Beautify JS <span className="text-xs text-slate-500">(for minified code)</span></span>
            </label>
            <div className="flex items-center gap-4">
                {hasResults && <button onClick={clearState} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-700 hover:bg-slate-600 transition-colors">New Scan</button>}
                <button onClick={handleScan} disabled={isLoading} className="px-6 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                    {isLoading ? <><SpinnerIcon /> Scanning...</> : 'Scan Now'}
                </button>
            </div>
        </div>
    </div>
);

const TabButton = ({ name, activeTab, setActiveTab, children }: TabButtonProps) => (<button onClick={() => setActiveTab(name)} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === name ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}>{children}</button>);

const FileUpload = ({ files, setFiles }: FileUploadProps) => (
  <div>
    <label htmlFor="file-upload" className="block text-sm font-medium text-slate-400 mb-2">Select .js, .jsx, or .html files:</label>
    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-md">
      <div className="space-y-1 text-center">
         <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div className="flex text-sm text-slate-400">
          <label htmlFor="file-upload" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-cyan-400 hover:text-cyan-300"><input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept=".js,.jsx,.html" onChange={e => setFiles(e.target.files ? Array.from(e.target.files) : [])} /><span>Upload file(s)</span></label>
          <p className="pl-1">or drag and drop</p>
        </div>
        <p className="text-xs text-slate-500">{files.length > 0 ? `${files.length} file(s) selected: ${files.map(f => f.name).join(', ')}` : 'Up to 10MB each'}</p>
      </div>
    </div>
  </div>
);

const UrlInput = ({ url, setUrl }: UrlInputProps) => (
  <div>
    <label htmlFor="url-input" className="block text-sm font-medium text-slate-400">JavaScript or HTML File URL:</label>
    <div className="mt-1"><input id="url-input" type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/script.js" className="w-full bg-slate-900/50 border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"/></div>
  </div>
);

const ResultsDisplay = ({ activeResults, hiddenResults, handleDismiss, handleRestore, exportResults }: ResultsDisplayProps) => {
    const [showDismissed, setShowDismissed] = useState(false);

    const activeGrouped = useMemo(() => {
        return activeResults.reduce((acc, f) => { (acc[f.category] = acc[f.category] || []).push(f); return acc; }, {} as Record<string, Finding[]>);
    }, [activeResults]);

    const hiddenGrouped = useMemo(() => {
        return hiddenResults?.reduce((acc, f) => { (acc[f.category] = acc[f.category] || []).push(f); return acc; }, {} as Record<string, Finding[]>) || {};
    }, [hiddenResults]);

    const activeSummary = useMemo(() => {
        return activeResults ? activeResults.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, { High: 0, Medium: 0, Low: 0 }) : { High: 0, Medium: 0, Low: 0 };
    }, [activeResults]);

    return (
        <div className="mt-8">
            <SummaryDashboard summary={activeSummary} total={activeResults.length} exportResults={(format) => exportResults(format, activeResults, 'active_scan_results')} />

            <div className="mt-4 flex justify-end">
                <button onClick={() => setShowDismissed(!showDismissed)} className="text-sm text-slate-400 hover:text-cyan-400">
                    {showDismissed ? 'Hide' : 'Show'} Dismissed Findings ({hiddenResults?.length || 0})
                </button>
            </div>

            <div className="mt-2 space-y-4">
                {Object.keys(activeGrouped).sort().map(category => (
                    <CollapsibleCategory key={category} category={category} findings={activeGrouped[category]} onDismiss={handleDismiss} />
                ))}
            </div>

            {showDismissed && (
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-slate-400 mb-4 border-b border-slate-700 pb-2">Dismissed Findings</h2>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => exportResults('json', hiddenResults || [], 'dismissed_scan_results')} className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition">Export JSON</button>
                        <span className="text-slate-600 mx-2">|</span>
                        <button onClick={() => exportResults('csv', hiddenResults || [], 'dismissed_scan_results')} className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition">Export CSV</button>
                    </div>
                    <div className="space-y-4">
                        {Object.keys(hiddenGrouped).sort().map(category => (
                            <CollapsibleCategory key={`dismissed-${category}`} category={category} findings={hiddenGrouped[category]} onRestore={handleRestore} isDismissed />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const SummaryDashboard = ({ summary, total, exportResults }: SummaryDashboardProps) => (
    <div className="bg-slate-800/50 p-6 rounded-2xl ring-1 ring-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div><h2 className="text-xl font-bold text-white">Scan Summary</h2><p className="text-slate-400">{total} active issue(s) found.</p></div>
            <div className="flex items-center gap-2 sm:gap-4">
                <SummaryPill severity="High" count={summary.High} /><SummaryPill severity="Medium" count={summary.Medium} /><SummaryPill severity="Low" count={summary.Low} />
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => exportResults('json')} className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition">Export JSON</button>
                <span className="text-slate-600">|</span>
                <button onClick={() => exportResults('csv')} className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition">Export CSV</button>
            </div>
        </div>
    </div>
);

const SummaryPill = ({ severity, count }: SummaryPillProps) => { const config = SEVERITY_CONFIG[severity]; return (<div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}><span className={`h-2.5 w-2.5 rounded-full bg-${config.color}-500`}></span><span>{count} {severity}</span></div>); };

const CollapsibleCategory = ({ category, findings, onDismiss, onRestore, isDismissed }: CollapsibleCategoryProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const Icon = CATEGORY_ICONS[category] || ICONS.CONFIG;
    const severity = findings.reduce<SeverityLevel>((prev, curr) => (prev === 'High' || curr.severity === 'High') ? 'High' : (prev === 'Medium' || curr.severity === 'Medium') ? 'Medium' : 'Low', 'Low');
    
    return (
        <div className={`bg-slate-800/50 rounded-xl ring-1 ${isDismissed ? 'ring-slate-600 opacity-60' : 'ring-slate-700'} transition-all`}>
            <button onClick={() => setIsOpen(!isOpen)} title="Toggle category" className="w-full flex justify-between items-center p-4 text-left">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-700/50 ring-1 ${SEVERITY_CONFIG[severity].ring}`}><Icon className={`h-6 w-6 ${SEVERITY_CONFIG[severity].text}`} /></div>
                    <div><h3 className="font-semibold text-lg text-slate-200">{category}</h3><span className={`text-sm ${SEVERITY_CONFIG[severity].text}`}>{findings.length} issue(s)</span></div>
                </div>
                <ICONS.CHEVRON_DOWN className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="p-4 border-t border-slate-700/50"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{findings.map(f => <FindingCard key={f.id} finding={f} onDismiss={onDismiss} onRestore={onRestore} isDismissed={isDismissed}/>)}</div></div>}
        </div>
    );
};

const FindingCard = ({ finding, onDismiss, onRestore, isDismissed }: FindingCardProps) => {
    const config = SEVERITY_CONFIG[finding.severity];
    const isUrl = finding.source.startsWith('http');
    const [showContext, setShowContext] = useState(false);
    const [suggestion, setSuggestion] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const getContextSnippet = (snippet: string, match: string) => {
        const contextLength = 25; // Characters to show on each side
        const matchIndex = snippet.indexOf(match);
        if (matchIndex === -1) return snippet;

        const startIndex = Math.max(0, matchIndex - contextLength);
        const endIndex = Math.min(snippet.length, matchIndex + match.length + contextLength);

        let context = snippet.substring(startIndex, endIndex);

        if (startIndex > 0) context = '...' + context;
        if (endIndex < snippet.length) context = context + '...';

        return context;
    };

    const handleSuggestFix = async () => {
        setIsSuggesting(true);
        setSuggestion('');
        try {
            const systemPrompt = `You are a senior security engineer. A piece of JavaScript code has a vulnerability. Your task is to provide a concise, best-practice code example showing how to fix this. For example, suggest using environment variables for secrets. Explain the fix in one or two sentences. Format the response with a short explanation and a Markdown code block for the corrected code.`;
            const userQuery = `Vulnerability Type: \`${finding.name}\`\n\nVulnerable Code Snippet:\n\`\`\`javascript\n${finding.snippet}\n\`\`\`\n\nThe specific matched text that is the secret is: \`${finding.match}\``;

            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ role: "user", parts: [{ text: userQuery }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            };

            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);

            const result = await response.json();
            const suggestionText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (suggestionText) {
                setSuggestion(suggestionText);
            } else {
                throw new Error("No suggestion text from API.");
            }
        } catch (error) {
            console.error("Suggestion error:", error);
            setSuggestion(`**Error:** Could not generate a suggestion. ${(error as Error).message}`);
        } finally {
            setIsSuggesting(false);
        }
    };

    return (
        <div className={`bg-slate-800 rounded-lg p-4 ring-1 ${config.ring} flex flex-col h-full justify-between`}>
            <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full bg-${config.color}-500 flex-shrink-0`}></span><p className={`text-sm font-semibold ${config.text}`}>{finding.severity} Risk</p></div>
                    {!isDismissed && (
                        <button onClick={() => onDismiss?.(finding.id)} title="Dismiss Finding" className="text-slate-400 hover:text-orange-400"><ICONS.DISMISS className="w-5 h-5"/></button>
                    )}
                     {isDismissed && (
                        <button onClick={() => onRestore?.(finding.id)} title="Restore Finding" className="text-slate-400 hover:text-green-400"><ICONS.RESTORE className="w-5 h-5"/></button>
                    )}
                </div>
                <h4 className="font-medium text-slate-200">{finding.name}</h4>
                {finding.libraryName && (
                    <p className="text-sm text-cyan-400 font-mono bg-cyan-500/10 px-2 py-1 rounded inline-block my-1">
                        {finding.libraryName}: {finding.version}
                    </p>
                )}
                <p className="text-xs text-slate-500 truncate mb-3" title={finding.source}>Source: {isUrl ? <a href={finding.source} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline ml-1">{finding.source}</a> : <span className="ml-1">{finding.source}</span>} | Line: {finding.line}</p>
                <div className="bg-slate-900/70 p-3 rounded-md text-sm font-mono cursor-pointer" onClick={() => setShowContext(!showContext)}>
                    <code className="whitespace-pre-wrap break-all text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded">{finding.match}</code>
                    {showContext && (
                        <code className="block mt-2 pt-2 border-t border-slate-700/50 whitespace-pre-wrap break-all text-cyan-300">
                            {getContextSnippet(finding.snippet, finding.match).split(new RegExp(`(${escapeRegExp(finding.match)})`, 'g')).map((part, i) =>
                                i % 2 === 1 ?
                                <span key={i} className="bg-yellow-500/20 text-yellow-300 px-1 py-0.5 rounded">{part}</span> :
                                <React.Fragment key={i}>{part}</React.Fragment>
                            )}
                        </code>
                    )}
                </div>
            </div>
            <div className="mt-4 space-y-2">
                 {finding.libraryName && finding.version && !isDismissed && (
                    <a href={`https://www.cvedetails.com/version-search.php?vendor=&product=${encodeURIComponent(finding.libraryName)}&version=${encodeURIComponent(finding.version)}`}
                       target="_blank" rel="noopener noreferrer"
                       className="w-full text-sm font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-md transition-colors flex items-center justify-center gap-2">
                        <ICONS.CVE className="w-4 h-4" /> Check for Vulnerabilities (CVE)
                    </a>
                )}
                {!isDismissed && !suggestion && !isSuggesting && !finding.libraryName && (
                    <button onClick={handleSuggestFix} className="w-full text-sm font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-md transition-colors flex items-center justify-center gap-2">
                        ✨ Suggest Fix
                    </button>
                )}
                {isSuggesting && (
                    <div className="text-sm text-slate-400 flex items-center justify-center gap-2 p-1.5">
                        <SpinnerIcon /> Thinking...
                    </div>
                )}
                {suggestion && (
                    <div className="text-sm border-t border-slate-700 pt-3">
                        <h5 className="font-bold text-slate-300 mb-2">Suggested Fix:</h5>
                        <div className="text-slate-400 space-y-2">
                           <SimpleMarkdown text={suggestion}/>
                        </div>
                    </div>
                )}
                <button onClick={() => setShowContext(!showContext)} className="w-full text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-700/50 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors">{showContext ? 'Hide Context' : 'Show Context'}</button>
            </div>
        </div>
    );
};


const LoadingSpinner = () => (<div className="mt-8 flex flex-col items-center justify-center gap-4 text-slate-400"><SpinnerIcon /><p className="text-lg font-semibold">Analyzing files...</p><p className="text-sm">Please wait while we scan for sensitive information.</p></div>);
const SpinnerIcon = () => (<svg className="animate-spin h-6 w-6 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);

const Chatbot = ({ scanResults }: ChatbotProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ from: 'bot', text: 'Hi! I can help summarize these scan results. Ask me to "summarize the findings" or explain a specific issue.' }]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isThinking) return;

      const userMessage = { from: 'user', text: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsThinking(true);

      try {
          const systemPrompt = `You are an expert cybersecurity analyst. A user has scanned a file for vulnerabilities. The results below are the valid, non-dismissed findings. Your task is to analyze these findings and answer the user's questions. If asked for a summary, provide a concise, professional analysis of the security posture, highlight the most critical risks found, and suggest a prioritized list of actions for remediation. Focus on the potential impact of each finding.`;
          const userQuery = `Scan Results:\n${JSON.stringify(scanResults, null, 2)}\n\nUser Question: ${input}`;

          const apiKey = "";
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
          const payload = {
              contents: [{ role: "user", parts: [{ text: userQuery }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
          };

          const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);

          const result = await response.json();
          const botResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

          if (botResponseText) {
              setMessages(prev => [...prev, { from: 'bot', text: botResponseText }]);
          } else {
              throw new Error("No response text from API.");
          }
      } catch (error) {
          console.error("Chatbot API error:", error);
          setMessages(prev => [...prev, { from: 'bot', text: "Sorry, I encountered an error. Please try again." }]);
      } finally {
          setIsThinking(false);
      }
    };

    const ChatSimpleMarkdown = ({ text }: ChatSimpleMarkdownProps) => {
        const html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code class="bg-slate-700/50 text-cyan-300 text-xs px-1.5 py-0.5 rounded">$1</code>').replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>').replace(/\n/g, '<br />');
        return <div dangerouslySetInnerHTML={{ __html: html.replace(/<br \/>(<li)/g, '$1') }} />;
    };

    return (
        <>
            <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-6 bg-gradient-to-r from-sky-500 to-cyan-500 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform z-50" aria-label="Toggle Chatbot"><ICONS.CHATBOT className="w-8 h-8" /></button>
            {isOpen && (
                 <div className="fixed bottom-24 right-6 w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-2xl ring-1 ring-slate-700 h-[70vh] flex flex-col transition-all origin-bottom-right z-50">
                    <header className="flex items-center justify-between p-4 border-b border-slate-700">
                        <div className="flex items-center gap-3"><ICONS.CHATBOT className="w-6 h-6 text-cyan-400" /><h3 className="font-bold text-white">Analysis Assistant</h3></div>
                        <button onClick={() => setIsOpen(false)} title="Close chatbot" className="text-slate-400 hover:text-white"><ICONS.CLOSE className="w-6 h-6" /></button>
                    </header>
                    <div className="flex-1 p-4 overflow-y-auto">
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-end gap-2 ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.from === 'bot' && <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0"><ICONS.CHATBOT className="w-5 h-5 text-cyan-400" /></div>}
                                    <div className={`max-w-xs md:max-w-sm px-4 py-2.5 rounded-2xl text-white ${msg.from === 'user' ? 'bg-sky-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}><ChatSimpleMarkdown text={msg.text} /></div>
                                </div>
                            ))}
                             {isThinking && (<div className="flex items-end gap-2 justify-start"><div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0"><ICONS.CHATBOT className="w-5 h-5 text-cyan-400" /></div><div className="max-w-xs md:max-w-sm px-4 py-2.5 rounded-2xl text-white bg-slate-700 rounded-bl-none flex items-center gap-2"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-300"></div></div></div>)}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
                        <div className="relative">
                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g., Summarize the findings" className="w-full bg-slate-900 border-slate-700 rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"/>
                            <button type="submit" disabled={isThinking} title="Send message" className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"><ICONS.SEND className="w-5 h-5" /></button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

