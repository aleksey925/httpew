import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export default function EnvPicker({ environments, activeEnvironment, onSelect, onClose }) {
  const [cursor, setCursor] = useState(() => {
    const idx = environments.indexOf(activeEnvironment);
    return idx >= 0 ? idx : 0;
  });

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setCursor((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((prev) => Math.min(environments.length - 1, prev + 1));
      return;
    }

    if (key.return) {
      if (environments[cursor]) {
        onSelect(environments[cursor]);
      }
      return;
    }
  });

  return (
    <Box flexDirection="column" padding={1} alignItems="center" justifyContent="center">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
      >
        <Text bold color="cyan">
          Select environment
        </Text>
        <Text dimColor>{'─'.repeat(22)}</Text>
        {environments.length === 0 ? (
          <Text dimColor>Environment file not found</Text>
        ) : (
          environments.map((env, i) => {
            const isActive = env === activeEnvironment;
            const isCursor = i === cursor;
            const bullet = isActive ? '●' : '○';
            return (
              <Text key={env}>
                {isCursor ? (
                  <Text color="green" bold>
                    {bullet} {env}
                  </Text>
                ) : (
                  <Text>
                    {bullet} {env}
                  </Text>
                )}
              </Text>
            );
          })
        )}
      </Box>
      <Text dimColor>↑↓ navigate  Enter select  Esc close</Text>
    </Box>
  );
}
