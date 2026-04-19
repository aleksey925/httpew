import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import path from 'node:path';

function timeAgo(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 3) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const minutes = Math.floor(diff / 60);
  return `${minutes}m ago`;
}

export default function StatusBar({ filePath, activeEnvironment, lastUpdated, screenMode }) {
  const [, forceUpdate] = useState(0);

  // re-render every second for "time ago"
  useEffect(() => {
    const timer = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const envLabel = activeEnvironment || '—';
  const fileName = filePath ? path.basename(filePath) : '';
  const updated = timeAgo(lastUpdated);

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} overflow="hidden">
      <Box flexShrink={1} overflow="hidden">
        <Text color="whiteBright" bold wrap="truncate">
          [{envLabel}]
        </Text>
        <Text wrap="truncate"> {fileName}</Text>
        {updated && (
          <Text dimColor wrap="truncate"> ↻ updated {updated}</Text>
        )}
        {screenMode && screenMode !== 'normal' && (
          <Text color="yellow" wrap="truncate"> [{screenMode}]</Text>
        )}
      </Box>
      <Box flexGrow={1} minWidth={1} />
      <Box flexShrink={0}>
        <Text dimColor>Tab panels  +/- resize  ? help  q quit</Text>
      </Box>
    </Box>
  );
}
