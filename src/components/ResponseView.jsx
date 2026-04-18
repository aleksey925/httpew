import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { saveBody } from '../utils/autoSave.js';
import { highlightText, highlightJsonLine, countMatches, SPINNER_FRAMES } from '../utils/highlight.js';
import { useSearchMode } from '../hooks/useSearchMode.js';

function tryParseJson(result) {
  if (!result) return null;
  if (result.bodyParsed) return result.bodyParsed;
  if (result.body && typeof result.body === 'string') {
    try { return JSON.parse(result.body); } catch { return null; }
  }
  return null;
}

function getBodyText(result, prettyMode) {
  if (!result || !result.body) return '';
  const parsed = tryParseJson(result);
  if (prettyMode && parsed) return JSON.stringify(parsed, null, 2);
  return result.body;
}

function BodyTab({ result, prettyMode, scrollOffset, visibleHeight, searchQuery }) {
  if (!result || result.status === 'idle') {
    return <Text dimColor>No response yet. Press Enter to send request.</Text>;
  }

  if (result.status === 'loading') {
    return <LoadingSpinner startTime={result.startTime} />;
  }

  if (result.error && !result.body) {
    return <Text color="red">{result.error}</Text>;
  }

  const bodyStr = getBodyText(result, prettyMode);
  const lines = bodyStr.split('\n');
  const visible = lines.slice(scrollOffset, scrollOffset + visibleHeight);
  const isJson = tryParseJson(result) != null;
  return (
    <Box flexDirection="column">
      {result.error && !result.body && <Text color="red">{result.error}</Text>}
      {visible.map((line, i) => (
        <Text key={scrollOffset + i}>
          {searchQuery ? highlightText(line, searchQuery) : isJson ? highlightJsonLine(line) : line}
        </Text>
      ))}
    </Box>
  );
}

function HeadersTab({ result }) {
  if (!result?.headers) return <Text dimColor>No headers</Text>;

  return (
    <Box flexDirection="column" overflow="hidden">
      {Object.entries(result.headers).map(([key, value]) => (
        <Box key={key} flexShrink={0}>
          <Text color="magenta" bold>
            {key.padEnd(25)}
          </Text>
          <Text wrap="truncate">{String(value)}</Text>
        </Box>
      ))}
    </Box>
  );
}

function InfoTab({ result }) {
  if (!result || result.status === 'idle') return <Text dimColor>No response yet</Text>;

  const statusColor = result.statusCode < 400 ? 'green' : 'red';

  function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes}b`;
    return `${(bytes / 1024).toFixed(1)}kb`;
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>{'Status'.padEnd(14)}</Text>
        <Text color={statusColor}>
          {result.statusCode} {result.statusText}
        </Text>
      </Box>
      <Box>
        <Text bold>{'Time'.padEnd(14)}</Text>
        <Text>{result.time ? `${Math.round(result.time)}ms` : '—'}</Text>
      </Box>
      <Box>
        <Text bold>{'Size'.padEnd(14)}</Text>
        <Text>{formatSize(result.size)}</Text>
      </Box>
      <Box>
        <Text bold>{'URL'.padEnd(14)}</Text>
        <Text>{result.url || '—'}</Text>
      </Box>
      <Box>
        <Text bold>{'Timestamp'.padEnd(14)}</Text>
        <Text>{result.timestamp ? result.timestamp.toLocaleTimeString() : '—'}</Text>
      </Box>
    </Box>
  );
}

function LoadingSpinner({ startTime }) {
  const [frame, setFrame] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
      setElapsed(Date.now() - startTime);
    }, 80);
    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <Text color="yellow">
      {SPINNER_FRAMES[frame]} Loading... {Math.round(elapsed / 1000)}s
    </Text>
  );
}

export default function ResponseView({
  result,
  isFocused,
  filePath,
  activeRequest,
  width,
}) {
  const { setSearchActive } = useSearchMode();
  const [activeTab, setActiveTab] = useState(0); // 0=Body, 1=Headers, 2=Info
  const [prettyMode, setPrettyMode] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(null);
  const [searchModeLocal, setSearchModeLocal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const copiedTimerRef = useRef(null);
  const savedTimerRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(copiedTimerRef.current);
    clearTimeout(savedTimerRef.current);
  }, []);

  const searchMode = searchModeLocal;
  const setSearchMode = (active) => {
    setSearchModeLocal(active);
    setSearchActive(active);
  };

  const visibleHeight = process.stdout.rows ? process.stdout.rows - 8 : 25;
  const tabs = ['Body', 'Headers', 'Info'];

  const bodyText = getBodyText(result, prettyMode);
  const totalLines = bodyText ? bodyText.split('\n').length : 0;
  const maxScroll = Math.max(0, totalLines - visibleHeight);


  useInput(
    (input, key) => {
      if (!isFocused) return;

      if (searchMode) {
        if (key.escape) {
          setSearchMode(false);
          setSearchQuery('');
          return;
        }
        if (key.backspace || key.delete) {
          setSearchQuery((prev) => prev.slice(0, -1));
          return;
        }
        if (key.return) {
          setSearchMode(false);
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setSearchQuery((prev) => prev + input);
        }
        return;
      }

      if (input === ']') { setActiveTab((prev) => (prev + 1) % tabs.length); return; }
      if (input === '[') { setActiveTab((prev) => (prev - 1 + tabs.length) % tabs.length); return; }

      if (input === 'p') {
        setPrettyMode((prev) => !prev);
        setScrollOffset(0);
        return;
      }

      if (key.upArrow || input === 'k') {
        setScrollOffset((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow || input === 'j') {
        setScrollOffset((prev) => Math.min(maxScroll, prev + 1));
        return;
      }

      if (input === 'c') {
        if (result?.body) {
          import('clipboardy').then((clip) => {
            clip.default.writeSync(result.body);
            setCopied(true);
            copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
          });
        }
        return;
      }

      if (input === 's') {
        if (result?.body && filePath && activeRequest) {
          const outputPath = saveBody(filePath, activeRequest, result);
          if (outputPath) {
            setSaved(outputPath);
            savedTimerRef.current = setTimeout(() => setSaved(null), 3000);
          }
        }
        return;
      }

      if (input === '/') {
        setSearchMode(true);
        setSearchQuery('');
        return;
      }

    },
  );

  const statusLine = result?.statusCode
    ? `${result.statusCode < 400 ? '✅' : '❌'} ${result.statusCode} ${result.statusText}  ${result.time ? Math.round(result.time) + 'ms' : ''}`
    : '';

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={isFocused ? 'whiteBright' : 'gray'} width={width} flexGrow={width ? 0 : 1}>
      <Box paddingX={1} justifyContent="space-between">
        <Box>
          {tabs.map((tab, i) => (
            <Text key={tab}>
              {i > 0 && <Text> </Text>}
              <Text
                color={activeTab === i ? 'whiteBright' : 'gray'}
                bold={activeTab === i}
              >
                {activeTab === i ? '· ' : '  '}{tab}
              </Text>
            </Text>
          ))}
        </Box>
        {activeTab === 0 && (
          <Text dimColor>{prettyMode ? 'Pretty' : 'Raw'}</Text>
        )}
      </Box>
      {statusLine && (
        <Box paddingX={1}>
          <Text color={result.statusCode < 400 ? 'green' : 'red'} bold>
            {statusLine}
          </Text>
        </Box>
      )}
      {copied && (
        <Box paddingX={1}>
          <Text color="green">✓ copied to clipboard</Text>
        </Box>
      )}
      {saved && (
        <Box paddingX={1}>
          <Text color="green">✓ saved: {saved}</Text>
        </Box>
      )}
      <Box flexDirection="column" paddingX={1} flexGrow={1} overflow="hidden">
        {activeTab === 0 && (
          <BodyTab
            result={result}
            prettyMode={prettyMode}
            scrollOffset={scrollOffset}
            visibleHeight={visibleHeight}
            searchQuery={searchMode ? searchQuery : ''}
          />
        )}
        {activeTab === 1 && <HeadersTab result={result} />}
        {activeTab === 2 && <InfoTab result={result} />}
      </Box>
      {searchMode && (() => {
        const bodyMatchCount = searchQuery && result?.body ? countMatches(result.body, searchQuery) : 0;
        return (
        <Box paddingX={1}>
          <Text color="yellow">/ </Text>
          <Text>{searchQuery}</Text>
          <Text color="gray">▌</Text>
          {searchQuery && (
            <Text color={bodyMatchCount > 0 ? 'green' : 'red'}> {bodyMatchCount} match{bodyMatchCount !== 1 ? 'es' : ''}</Text>
          )}
        </Box>
        );
      })()}
    </Box>
  );
}
