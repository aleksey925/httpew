import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

const SECTIONS = [
  {
    title: 'Global',
    keys: [
      ['Tab / Shift+Tab', 'switch panel'],
      ['+ / _', 'expand / shrink focused panel'],
      ['Alt+1 / Alt+2 / Alt+3', 'toggle full screen panel'],
      ['E', 'select environment'],
      ['o', 'open file browser'],
      ['r', 'reload file'],
      ['q / Ctrl+C', 'quit'],
      ['?', 'this help'],
    ],
  },
  {
    title: 'Request List (left)',
    keys: [
      ['↑↓', 'navigate requests'],
      ['Enter', 'execute request'],
      ['i', 'open in $EDITOR'],
      ['c', 'copy as curl'],
      ['/', 'search (↑↓ navigate, Esc cancel)'],
    ],
  },
  {
    title: 'Source (center)',
    keys: [
      ['↑↓', 'scroll line by line'],
      ['J / K', 'jump between requests'],
      ['Enter', 'execute request'],
      ['i', 'open in $EDITOR'],
      ['c', 'copy as curl'],
      ['/', 'search (↑↓ jump, Enter keep, Esc cancel)'],
    ],
  },
  {
    title: 'Response (right)',
    keys: [
      ['1/2/3', 'Body / Headers / Info tab'],
      ['p', 'toggle Pretty / Raw'],
      ['↑↓', 'scroll'],
      ['c', 'copy body'],
      ['s', 'save body to file'],
      ['/', 'search body'],
    ],
  },
  {
    title: 'File Browser',
    keys: [
      ['↑↓', 'navigate'],
      ['Enter / → / l', 'open'],
      ['← / h', 'go up'],
      ['Esc', 'go up / back to main view'],
    ],
  },
];

const KEY_PAD = 22;
const COL_GAP = 4;

const MAX_LINE_WIDTH = SECTIONS.reduce((max, s) => {
  const keyMax = s.keys.reduce(
    (m, [k, d]) => Math.max(m, 2 + Math.max(k.length, KEY_PAD) + d.length),
    0,
  );
  return Math.max(max, s.title.length, keyMax);
}, 0);

const COL_WIDTH = MAX_LINE_WIDTH + COL_GAP;

function buildLines(sections, colCount) {
  const lines = [];
  for (let i = 0; i < sections.length; i += colCount) {
    const row = sections.slice(i, i + colCount);
    const rowHeight = Math.max(...row.map((s) => 1 + s.keys.length));
    if (lines.length > 0) lines.push(null); // gap between rows
    for (let li = 0; li < rowHeight; li++) {
      lines.push(row.map((section) => {
        if (li === 0) return { type: 'title', text: section.title };
        const entry = section.keys[li - 1];
        if (!entry) return { type: 'empty' };
        return { type: 'key', key: entry[0], desc: entry[1] };
      }));
    }
  }
  return lines;
}

export default function HelpOverlay({ onClose }) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const termCols = process.stdout.columns || 80;
  const termRows = process.stdout.rows || 24;
  const colCount = Math.max(1, Math.floor(termCols / COL_WIDTH));
  const lines = buildLines(SECTIONS, colCount);

  const visibleHeight = Math.max(1, termRows - 4);
  const needsScroll = lines.length > visibleHeight;
  const maxScroll = Math.max(0, lines.length - visibleHeight);
  const visible = needsScroll ? lines.slice(scrollOffset, scrollOffset + visibleHeight) : lines;

  useInput((input, key) => {
    if (key.escape || input === '?' || input === 'q') {
      onClose();
      return;
    }
    if (needsScroll && key.upArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
      return;
    }
    if (needsScroll && key.downArrow) {
      setScrollOffset((prev) => Math.min(maxScroll, prev + 1));
      return;
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="whiteBright">
        httpew — Keyboard Shortcuts
      </Text>
      {visible.map((line, li) => {
        if (line === null) return <Text key={scrollOffset + li}> </Text>;
        return (
          <Box key={scrollOffset + li}>
            {line.map((cell, ci) => (
              <Box key={ci} width={COL_WIDTH}>
                {cell.type === 'title' && <Text color="yellow" bold>{cell.text}</Text>}
                {cell.type === 'key' && (
                  <Text>
                    <Text dimColor>  {cell.key.padEnd(KEY_PAD)}</Text>
                    {cell.desc}
                  </Text>
                )}
              </Box>
            ))}
          </Box>
        );
      })}
      <Box justifyContent="flex-end">
        <Text dimColor>
          {needsScroll ? `↑↓ scroll  ` : ''}? or Esc to close{needsScroll ? `  ${scrollOffset + 1}/${lines.length}` : ''}
        </Text>
      </Box>
    </Box>
  );
}
