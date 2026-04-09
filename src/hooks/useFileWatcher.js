import { useState, useEffect, useCallback, useRef } from 'react';
import fs from 'node:fs';
import { watch } from 'chokidar';

export function useFileWatcher(filePath) {
  const [rawContent, setRawContent] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const watcherRef = useRef(null);

  const readFile = useCallback(() => {
    if (!filePath) return;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      setRawContent(content);
      setLastUpdated(new Date());
    } catch {
      // file might be mid-write
    }
  }, [filePath]);

  useEffect(() => {
    if (!filePath) return;

    readFile();

    const watcher = watch(filePath, {
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50,
      },
    });

    watcher.on('change', () => {
      readFile();
    });

    watcherRef.current = watcher;

    return () => {
      watcher.close();
      watcherRef.current = null;
    };
  }, [filePath, readFile]);

  return { rawContent, lastUpdated, reload: readFile };
}
