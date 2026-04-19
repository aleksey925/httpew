import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import chalk from 'chalk';
import { toCurl } from '../utils/curlExport.js';
import { highlightText } from '../utils/highlight.js';
import { useSearchMode } from '../hooks/useSearchMode.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

function highlightHttp(content, activeStartLine, activeEndLine) {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    const isInActiveRegion = i >= activeStartLine && i <= activeEndLine;

    // separator / request name
    if (line.startsWith('###')) {
      return {
        key: i,
        text: line,
        color: isInActiveRegion ? 'whiteBright' : 'gray',
        bold: true,
        inverse: isInActiveRegion,
      };
    }
    // HTTP method line
    const methodMatch = line.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(.+)/);
    if (methodMatch) {
      return {
        key: i,
        parts: [
          { text: methodMatch[1], color: 'green', bold: true },
          { text: ' ' + methodMatch[2], color: 'yellow' },
        ],
      };
    }
    // header
    const headerMatch = line.match(/^([A-Za-z][\w-]+):\s*(.+)/);
    if (headerMatch) {
      return {
        key: i,
        parts: [
          { text: headerMatch[1], color: 'magenta' },
          { text: ': ' + headerMatch[2], color: 'white' },
        ],
      };
    }
    // variable
    if (line.includes('{{')) {
      const highlighted = line.replace(/\{\{(\w+)\}\}/g, chalk.magenta.bold('{{$1}}'));
      return { key: i, rawText: highlighted };
    }
    // httpyac metadata (# @name, # @ref, etc.)
    const metaMatch = line.match(/^#\s*(@\w+)\s*(.*)/);
    if (metaMatch) {
      return {
        key: i,
        parts: [
          { text: '# ', color: 'gray' },
          { text: metaMatch[1], color: 'yellow', bold: true },
          { text: metaMatch[2] ? ' ' + metaMatch[2] : '', color: 'white' },
        ],
      };
    }
    // comment
    if (line.startsWith('#') || line.startsWith('//')) {
      return { key: i, text: line, color: 'gray' };
    }
    return { key: i, text: line || ' ', color: 'white' };
  });
}

export default function RequestViewer({
  rawContent,
  requests,
  activeRequestId,
  setActiveRequestId,
  execute,
  isRunning,
  isFocused,
  filePath,
  variables,
  onEdit,
}) {
  const { setSearchActive } = useSearchMode();
  const scrollOffsetRef = useRef(0);
  const [, forceRender] = useState(0);
  const [searchModeLocal, setSearchModeLocal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimerRef.current), []);

  const [searchMatchIdx, setSearchMatchIdx] = useState(0);
  const prevActiveIdRef = useRef(null);
  const scrollFromCenterRef = useRef(false);
  const preSearchOffsetRef = useRef(0);

  const searchMode = searchModeLocal;
  const setSearchMode = (active) => {
    setSearchModeLocal(active);
    setSearchActive(active);
  };

  const setScrollOffset = (val) => {
    scrollOffsetRef.current = val;
    forceRender((n) => n + 1);
  };

  // helper: get the ### line number for a request
  const getSepLine = (req) => {
    if (!req) return null;
    const sep = req.region?.symbol?.children?.find((c) => c.kind === 'metaData');
    return sep?.startLine ?? req.region?.symbol?.startLine ?? null;
  };

  const activeReq = requests.find((r) => r.id === activeRequestId);
  const activeNameLine = getSepLine(activeReq) ?? -1;
  const activeEndLine = activeReq?.region?.symbol?.endLine ?? -1;

  // synchronous scroll: when activeRequestId changes from left panel, snap immediately
  if (activeRequestId !== prevActiveIdRef.current) {
    prevActiveIdRef.current = activeRequestId;
    if (!scrollFromCenterRef.current && activeReq) {
      const line = getSepLine(activeReq);
      if (line !== null) {
        scrollOffsetRef.current = line;
      }
    }
    scrollFromCenterRef.current = false;
  }

  const lines = highlightHttp(rawContent || '', activeNameLine, activeEndLine);
  const { rows: termRows } = useTerminalSize();
  // panel chrome: border(2) + header(1) + footer(1) + statusbar(3) + search(1 if active)
  const visibleHeight = Math.max(1, termRows - 8);

  // lines containing search matches (for jumping between them)
  const searchMatchLines = (searchMode && searchQuery)
    ? lines.reduce((acc, line, i) => {
        const text = line.text || line.parts?.map((p) => p.text).join('') || '';
        if (text.toLowerCase().includes(searchQuery.toLowerCase())) acc.push(i);
        return acc;
      }, [])
    : [];

  // find which request region contains a given line
  const getRequestAtLine = useCallback((lineNum) => {
    if (!requests.length) return null;
    let matched = requests[0];
    for (const req of requests) {
      const startLine = getSepLine(req) ?? 0;
      if (startLine <= lineNum) {
        matched = req;
      } else {
        break;
      }
    }
    return matched;
  }, [requests]);

  useInput(
    (input, key) => {
      if (!isFocused) return;

      if (searchMode) {
        if (key.escape) {
          // restore position before search
          setScrollOffset(preSearchOffsetRef.current);
          setSearchMode(false);
          setSearchQuery('');
          return;
        }
        if (key.backspace || key.delete) {
          setSearchQuery((prev) => prev.slice(0, -1));
          setSearchMatchIdx(0);
          return;
        }
        if (key.return) {
          // keep current position
          setSearchMode(false);
          return;
        }
        if (key.downArrow) {
          if (searchMatchLines.length > 0) {
            const nextIdx = (searchMatchIdx + 1) % searchMatchLines.length;
            setSearchMatchIdx(nextIdx);
            setScrollOffset(searchMatchLines[nextIdx]);
          }
          return;
        }
        if (key.upArrow) {
          if (searchMatchLines.length > 0) {
            const prevIdx = (searchMatchIdx - 1 + searchMatchLines.length) % searchMatchLines.length;
            setSearchMatchIdx(prevIdx);
            setScrollOffset(searchMatchLines[prevIdx]);
          }
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setSearchQuery((prev) => prev + input);
          setSearchMatchIdx(0);
        }
        return;
      }

      if (input === '/') {
        preSearchOffsetRef.current = scrollOffsetRef.current;
        setSearchMatchIdx(0);
        setSearchMode(true);
        setSearchQuery('');
        return;
      }

      if (input === '[') {
        const currentIdx = requests.findIndex((r) => r.id === activeRequestId);
        if (currentIdx > 0) {
          const prevReq = requests[currentIdx - 1];
          const line = getSepLine(prevReq);
          if (line !== null) {
            scrollFromCenterRef.current = true;
            setActiveRequestId(prevReq.id);
            setScrollOffset(line);
          }
        }
        return;
      }

      if (input === ']') {
        const currentIdx = requests.findIndex((r) => r.id === activeRequestId);
        if (currentIdx < requests.length - 1) {
          const nextReq = requests[currentIdx + 1];
          const line = getSepLine(nextReq);
          if (line !== null) {
            scrollFromCenterRef.current = true;
            setActiveRequestId(nextReq.id);
            setScrollOffset(line);
          }
        }
        return;
      }

      if (key.upArrow || input === 'k') {
        const next = Math.max(0, scrollOffsetRef.current - 1);
        const req = getRequestAtLine(next);
        if (req && req.id !== activeRequestId) {
          scrollFromCenterRef.current = true;
          setActiveRequestId(req.id);
        }
        setScrollOffset(next);
        return;
      }

      if (key.downArrow || input === 'j') {
        const next = Math.min(lines.length - 1, scrollOffsetRef.current + 1);
        const req = getRequestAtLine(next);
        if (req && req.id !== activeRequestId) {
          scrollFromCenterRef.current = true;
          setActiveRequestId(req.id);
        }
        setScrollOffset(next);
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

  const visible = lines.slice(scrollOffsetRef.current, scrollOffsetRef.current + visibleHeight);
  const isSearching = searchMode && searchQuery;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={isFocused ? 'whiteBright' : 'gray'} flexGrow={1} flexBasis={0}>
      <Box paddingX={1}>
        <Text bold color={isFocused ? 'whiteBright' : 'white'}>
          Source
        </Text>
        {copied && <Text color="green"> ✓ copied</Text>}
      </Box>
      <Box flexDirection="column" paddingX={1} flexGrow={1} overflow="hidden">
        {visible.map((line) => {
          if (line.parts) {
            return (
              <Text key={line.key} wrap="truncate">
                {line.parts.map((p, j) =>
                  isSearching ? (
                    <React.Fragment key={j}>
                      {highlightText(p.text, searchQuery, p.color, p.bold, false)}
                    </React.Fragment>
                  ) : (
                    <Text key={j} color={p.color} bold={p.bold}>{p.text}</Text>
                  )
                )}
              </Text>
            );
          }
          if (line.rawText) {
            return <Text key={line.key} wrap="truncate">{line.rawText}</Text>;
          }
          if (isSearching) {
            return (
              <Text key={line.key} wrap="truncate">
                {highlightText(line.text, searchQuery, line.color, line.bold, line.inverse)}
              </Text>
            );
          }
          return (
            <Text key={line.key} wrap="truncate" color={line.color} bold={line.bold} inverse={line.inverse}>
              {line.text || ''}
            </Text>
          );
        })}
      </Box>
      {searchMode && (
        <Box paddingX={1} overflow="hidden">
          <Text color="yellow">/ </Text>
          <Text wrap="truncate">{searchQuery}</Text>
          <Text color="gray">▌</Text>
          {searchQuery && (
            <Text color={searchMatchLines.length > 0 ? 'green' : 'red'} wrap="truncate">
              {searchMatchLines.length > 0
                ? ` ${searchMatchIdx + 1}/${searchMatchLines.length} lines`
                : ' no matches'}
            </Text>
          )}
        </Box>
      )}
      <Box paddingX={1}>
        <Text dimColor>
          {scrollOffsetRef.current + 1}/{lines.length}
        </Text>
      </Box>
    </Box>
  );
}
