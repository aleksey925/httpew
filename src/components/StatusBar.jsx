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
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Text color="cyan" bold>
        [{envLabel}]
      </Text>
      <Text> {fileName} </Text>
      {updated && (
        <Text dimColor>
          ↻ updated {updated}
        </Text>
      )}
      {screenMode && screenMode !== 'normal' && (
        <Text color="yellow"> [{screenMode}] </Text>
      )}
      <Box flexGrow={1} />
      <Text dimColor>
        Tab panels  +/- resize  ? help  q quit
      </Text>
    </Box>
  );
}
