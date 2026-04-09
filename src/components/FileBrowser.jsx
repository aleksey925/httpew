import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'node:fs';
import path from 'node:path';

function getEntries(dir) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const dirs = items
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => ({ name: d.name, isDir: true }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const files = items
      .filter((f) => f.isFile() && f.name.endsWith('.http'))
      .map((f) => ({ name: f.name, isDir: false }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [{ name: '..', isDir: true, isParent: true }, ...dirs, ...files];
  } catch {
    return [{ name: '..', isDir: true, isParent: true }];
  }
}

const startDir = process.cwd();

export default function FileBrowser({ onSelect, onCancel, initialPath }) {
  const initialDir = initialPath ? path.dirname(initialPath) : startDir;
  const initialFile = initialPath ? path.basename(initialPath) : null;

  const [cwd, setCwd] = useState(initialDir);
  const [entries, setEntries] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [restoreName, setRestoreName] = useState(initialFile);

  useEffect(() => {
    const e = getEntries(cwd);
    setEntries(e);
    if (restoreName) {
      const idx = e.findIndex((entry) => entry.name === restoreName);
      setCursor(idx >= 0 ? idx : 0);
      setRestoreName(null);
    } else {
      setCursor(0);
    }
  }, [cwd]);

  const goUp = () => {
    const dirName = path.basename(cwd);
    setRestoreName(dirName);
    setCwd((prev) => path.dirname(prev));
  };

  const enterSelected = () => {
    const entry = entries[cursor];
    if (!entry) return;
    if (entry.isParent) {
      goUp();
      return;
    }
    const fullPath = path.join(cwd, entry.name);
    if (entry.isDir) {
      setCwd(fullPath);
    } else {
      onSelect(fullPath);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (cwd !== initialDir && path.dirname(cwd) !== cwd) {
        goUp();
      } else if (onCancel) {
        onCancel();
      }
      return;
    }

    if (key.upArrow) {
      setCursor((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((prev) => Math.min(entries.length - 1, prev + 1));
      return;
    }

    if (key.leftArrow || input === 'h') {
      goUp();
      return;
    }

    if (key.rightArrow || input === 'l' || key.return) {
      enterSelected();
      return;
    }
  });

  const visibleHeight = process.stdout.rows ? process.stdout.rows - 4 : 20;
  const scrollOffset = Math.max(0, cursor - visibleHeight + 1);
  const visible = entries.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        {cwd}
      </Text>
      <Text dimColor>
        ↑↓ navigate  Enter/→/l open  ←/h up  {onCancel ? 'Esc back' : ''}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {visible.length === 0 && <Text dimColor>No .http files or directories found</Text>}
        {visible.map((entry, i) => {
          const realIndex = scrollOffset + i;
          const isActive = realIndex === cursor;
          const icon = entry.isParent ? '↩' : entry.isDir ? '📁' : '📄';
          return (
            <Text key={entry.isParent ? '..' : entry.name}>
              {isActive ? (
                <Text color="green" bold>{`❯ ${icon} ${entry.name}`}</Text>
              ) : (
                <Text>{`  ${icon} ${entry.name}`}</Text>
              )}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}
