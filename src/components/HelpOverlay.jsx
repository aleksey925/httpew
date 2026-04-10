import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

const LINES = [];

function addSection(title, keys) {
  LINES.push({ text: '', color: undefined });
  LINES.push({ text: title, color: 'yellow', bold: true });
  for (const [key, desc] of keys) {
    LINES.push({ text: `  ${key.padEnd(22)}${desc}`, color: undefined });
  }
}

addSection('Global', [
  ['Tab / Shift+Tab', 'switch panel'],
  ['+ / _', 'expand / shrink focused panel'],
  ['Alt+1 / Alt+2 / Alt+3', 'toggle full screen panel'],
  ['E', 'select environment'],
  ['o', 'open file browser'],
  ['r', 'reload file'],
  ['q / Ctrl+C', 'quit'],
  ['?', 'this help'],
]);

addSection('Request List (left)', [
  ['↑↓', 'navigate requests'],
  ['Enter', 'execute request'],
  ['i', 'open in $EDITOR'],
  ['c', 'copy as curl'],
  ['/', 'search (↑↓ navigate, Esc cancel)'],
]);

addSection('Source (center)', [
  ['↑↓', 'scroll line by line'],
  ['J / K', 'jump between requests'],
  ['Enter', 'execute request'],
  ['i', 'open in $EDITOR'],
  ['c', 'copy as curl'],
  ['/', 'search (↑↓ jump, Enter keep, Esc cancel)'],
]);

addSection('Response (right)', [
  ['1/2/3', 'Body / Headers / Info tab'],
  ['p', 'toggle Pretty / Raw'],
  ['↑↓', 'scroll'],
  ['c', 'copy body'],
  ['s', 'save body to file'],
  ['/', 'search body'],
]);

addSection('File Browser', [
  ['↑↓', 'navigate'],
  ['Enter / → / l', 'open'],
  ['← / h', 'go up'],
  ['Esc', 'go up / back to main view'],
]);

export default function HelpOverlay({ onClose }) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const visibleHeight = process.stdout.rows ? process.stdout.rows - 4 : 20;

  useInput((input, key) => {
    if (key.escape || input === '?' || input === 'q') {
      onClose();
      return;
    }
    if (key.upArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setScrollOffset((prev) => Math.min(LINES.length - visibleHeight, prev + 1));
      return;
    }
  });

  const visible = LINES.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="whiteBright">
        httpew — Keyboard Shortcuts
      </Text>
      <Text dimColor>{'─'.repeat(40)}</Text>
      {visible.map((line, i) => (
        <Text key={scrollOffset + i} color={line.color} bold={line.bold}>
          {line.text || ' '}
        </Text>
      ))}
      <Text dimColor>
        ↑↓ scroll  ? or Esc to close  {scrollOffset + 1}/{LINES.length}
      </Text>
    </Box>
  );
}
