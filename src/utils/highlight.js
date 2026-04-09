import React from 'react';
import { Text } from 'ink';

export function highlightText(text, query, color, bold, inverse) {
  if (!query || !text) {
    return <Text color={color} bold={bold} inverse={inverse}>{text || ''}</Text>;
  }
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts = [];
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerQuery, lastIndex);
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push(<Text key={lastIndex} color={color} bold={bold} inverse={inverse}>{text.slice(lastIndex, idx)}</Text>);
    }
    parts.push(<Text key={`m${idx}`} color="black" backgroundColor="yellow" bold>{text.slice(idx, idx + query.length)}</Text>);
    lastIndex = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) {
    parts.push(<Text key={lastIndex} color={color} bold={bold} inverse={inverse}>{text.slice(lastIndex)}</Text>);
  }
  return parts.length > 0 ? <>{parts}</> : <Text color={color} bold={bold} inverse={inverse}>{text}</Text>;
}

export function countMatches(text, query) {
  if (!query || !text) return 0;
  const lower = text.toLowerCase();
  const lq = query.toLowerCase();
  let n = 0;
  let idx = lower.indexOf(lq);
  while (idx !== -1) {
    n++;
    idx = lower.indexOf(lq, idx + lq.length);
  }
  return n;
}

export function highlightJsonLine(line) {
  // tokenize a single line of pretty-printed JSON
  const tokens = [];
  const re = /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|([-+]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],:])/g;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(<Text key={lastIndex}>{line.slice(lastIndex, match.index)}</Text>);
    }
    if (match[1] !== undefined) {
      // object key
      tokens.push(<Text key={match.index} color="blue">{match[1]}</Text>);
      tokens.push(<Text key={match.index + 0.1}>{line.slice(match.index + match[1].length, match.index + match[0].length)}</Text>);
    } else if (match[2] !== undefined) {
      tokens.push(<Text key={match.index} color="green">{match[2]}</Text>);
    } else if (match[3] !== undefined) {
      tokens.push(<Text key={match.index} color="cyan">{match[3]}</Text>);
    } else if (match[4] !== undefined) {
      tokens.push(<Text key={match.index} color="yellow">{match[4]}</Text>);
    } else if (match[5] !== undefined) {
      tokens.push(<Text key={match.index} color="red">{match[5]}</Text>);
    } else if (match[6] !== undefined) {
      tokens.push(<Text key={match.index} dimColor>{match[6]}</Text>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    tokens.push(<Text key={lastIndex}>{line.slice(lastIndex)}</Text>);
  }
  return tokens.length > 0 ? <>{tokens}</> : <Text>{line}</Text>;
}

export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
