import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { toCurl } from '../utils/curlExport.js';
import { SPINNER_FRAMES } from '../utils/highlight.js';
import { useSearchMode } from '../hooks/useSearchMode.js';

function useSpinner(hasRunning) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!hasRunning) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(timer);
  }, [hasRunning]);

  return SPINNER_FRAMES[frame];
}

function getStatusIcon(status, isRunning, spinnerChar) {
  if (isRunning) return { char: spinnerChar, color: 'yellow' };
  if (status === 'success') return { char: '✓', color: 'green' };
  if (status === 'error') return { char: '✗', color: 'red' };
  return { char: '○', color: 'gray' };
}

function methodColor(method) {
  const colors = {
    GET: 'green',
    POST: 'yellow',
    PUT: 'blue',
    PATCH: 'magenta',
    DELETE: 'red',
    HEAD: 'cyan',
    OPTIONS: 'gray',
  };
  return colors[method] || 'white';
}

export default function RequestList({
  requests,
  results,
  activeRequestId,
  setActiveRequestId,
  execute,
  isRunning,
  isFocused,
  variables,
  onEdit,
  width,
}) {
  const { setSearchActive } = useSearchMode();
  const hasRunning = requests.some((r) => isRunning(r.id));
  const spinnerChar = useSpinner(hasRunning);
  const [searchMode, setSearchModeLocal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimerRef.current), []);

  const setSearchMode = (active) => {
    setSearchModeLocal(active);
    setSearchActive(active);
  };

  const filtered = searchMode && searchQuery
    ? requests.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.url.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : requests;

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
        // allow arrow navigation while searching
        if (key.upArrow || key.downArrow) {
          // fall through to navigation below
        } else {
          if (input && !key.ctrl && !key.meta) {
            setSearchQuery((prev) => prev + input);
          }
          return;
        }
      }

      if (input === '/') {
        setSearchMode(true);
        setSearchQuery('');
        return;
      }

      if (key.upArrow) {
        const idx = filtered.findIndex((r) => r.id === activeRequestId);
        if (idx > 0) setActiveRequestId(filtered[idx - 1].id);
        return;
      }

      if (key.downArrow) {
        const idx = filtered.findIndex((r) => r.id === activeRequestId);
        if (idx < filtered.length - 1) setActiveRequestId(filtered[idx + 1].id);
        return;
      }

      if (key.return) {
        if (!isRunning(activeRequestId)) {
          execute(activeRequestId);
        }
        return;
      }

      if (input === 'c') {
        const req = requests.find((r) => r.id === activeRequestId);
        if (req) {
          const curl = toCurl(req, variables);
          import('clipboardy').then((clip) => {
            clip.default.writeSync(curl);
            setCopied(true);
            copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
          });
        }
        return;
      }

      if (input === 'i') {
        if (onEdit) onEdit();
        return;
      }
    },
  );

  const widthFraction = typeof width === 'string' && width.endsWith('%')
    ? parseInt(width) / 100
    : 0.25;
  const panelWidth = Math.floor((process.stdout.columns || 80) * widthFraction) - 4;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={isFocused ? 'cyan' : 'gray'} flexGrow={width ? 0 : 1} width={width}>
      <Box paddingX={1}>
        <Text bold color={isFocused ? 'cyan' : 'white'}>
          Requests
        </Text>
        {copied && <Text color="green"> ✓ copied</Text>}
      </Box>
      <Box flexDirection="column" paddingX={1} flexGrow={1}>
        {filtered.length === 0 && <Text dimColor>No requests found</Text>}
        {filtered.map((req) => {
          const isActive = req.id === activeRequestId;
          const result = results.get(req.id);
          const running = isRunning(req.id);

          // show name, truncate if needed
          const maxName = Math.max(6, panelWidth - 12);
          const displayName = req.name.length > maxName ? req.name.slice(0, maxName - 1) + '…' : req.name;

          const { char: icon, color: iconColor } = getStatusIcon(result?.status, running, spinnerChar);
          const cursor = isActive && isFocused ? '> ' : '  ';

          return (
            <Text key={req.id} wrap="truncate">
              <Text color={isActive && isFocused ? 'cyan' : undefined}>{cursor}</Text>
              <Text color={iconColor}>{icon}</Text>
              <Text> </Text>
              <Text color={methodColor(req.method)} bold>
                {req.method.padEnd(6)}
              </Text>
              <Text color={isActive ? 'white' : 'gray'}> {displayName}</Text>
            </Text>
          );
        })}
      </Box>
      {searchMode && (
        <Box paddingX={1} borderStyle="single" borderColor="yellow" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
          <Text color="yellow">/ </Text>
          <Text>{searchQuery}</Text>
          <Text color="gray">▌</Text>
          {searchQuery && (
            <Text color={filtered.length > 0 ? 'green' : 'red'}> {filtered.length}/{requests.length}</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
