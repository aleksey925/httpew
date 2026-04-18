import { useState, useEffect } from 'react';

// single shared stdout listener — avoids stacking one per subscriber
const subscribers = new Set();
let currentSize = readSize();

function readSize() {
  return {
    rows: process.stdout.rows || 40,
    columns: process.stdout.columns || 80,
  };
}

process.stdout.on('resize', () => {
  currentSize = readSize();
  subscribers.forEach((fn) => fn(currentSize));
});

export function useTerminalSize() {
  const [size, setSize] = useState(currentSize);

  useEffect(() => {
    subscribers.add(setSize);
    return () => { subscribers.delete(setSize); };
  }, []);

  return size;
}
