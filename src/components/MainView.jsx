import React, { useEffect, useCallback } from 'react';
import { Box, useInput } from 'ink';
import { spawnSync } from 'node:child_process';
import RequestList from './RequestList.jsx';
import RequestViewer from './RequestViewer.jsx';
import ResponseView from './ResponseView.jsx';
import StatusBar from './StatusBar.jsx';
import { useHttpYac } from '../hooks/useHttpYac.js';
import { useActiveRequest } from '../hooks/useActiveRequest.js';
import { useFocus } from '../hooks/useFocus.js';
import { useSearchMode } from '../hooks/useSearchMode.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

function getLayout(focusedPanel, screenMode) {
  if (screenMode === 'normal') {
    return { left: '25%', right: '35%', hideLeft: false, hideCenter: false, hideRight: false };
  }

  if (screenMode === 'half') {
    if (focusedPanel === 'left') {
      return { left: '50%', right: '25%', hideLeft: false, hideCenter: false, hideRight: false };
    }
    if (focusedPanel === 'center') {
      return { left: '15%', right: '25%', hideLeft: false, hideCenter: false, hideRight: false };
    }
    // right
    return { left: '15%', right: '50%', hideLeft: false, hideCenter: false, hideRight: false };
  }

  // full — only focused panel visible
  return {
    left: undefined, right: undefined,
    hideLeft: focusedPanel !== 'left',
    hideCenter: focusedPanel !== 'center',
    hideRight: focusedPanel !== 'right',
  };
}

export default function MainView({ filePath, fileWatcher, environments }) {
  const { focusedPanel, nextPanel, prevPanel, screenMode, nextScreenMode, prevScreenMode, toggleFullScreen } = useFocus();
  const { isSearchActive } = useSearchMode();
  const { activeRequestId, setActiveRequestId } = useActiveRequest();
  const httpYac = useHttpYac(filePath, environments.activeEnvironment);

  // re-parse when file content changes
  useEffect(() => {
    if (fileWatcher.rawContent) {
      httpYac.reparse();
    }
  }, [fileWatcher.rawContent]);

  const activeResult = httpYac.results.get(activeRequestId) || null;
  const activeRequest = httpYac.requests.find((r) => r.id === activeRequestId) || null;

  const openEditor = useCallback(() => {
    const editor = process.env.EDITOR || 'vim';
    const req = httpYac.requests.find((r) => r.id === activeRequestId);
    const sep = req?.region?.symbol?.children?.find((c) => c.kind === 'metaData');
    // editors use 1-based line numbers
    const line = (sep?.startLine ?? req?.region?.symbol?.startLine ?? 0) + 1;
    spawnSync(editor, [`+${line}`, filePath], { stdio: 'inherit' });
  }, [filePath, activeRequestId, httpYac.requests]);

  useInput((input, key) => {
    if (isSearchActive) return;

    if (key.tab) {
      if (key.shift) {
        prevPanel();
      } else {
        nextPanel();
      }
      return;
    }

    if (input === '+') {
      nextScreenMode();
      return;
    }
    if (input === '_') {
      prevScreenMode();
      return;
    }

    // Alt+1/2/3 — toggle full screen for specific panel
    if (key.meta && input === '1') { toggleFullScreen('left'); return; }
    if (key.meta && input === '2') { toggleFullScreen('center'); return; }
    if (key.meta && input === '3') { toggleFullScreen('right'); return; }
  });

  const layout = getLayout(focusedPanel, screenMode);
  const { rows: termRows } = useTerminalSize();

  return (
    <Box flexDirection="column" height={termRows}>
      <Box flexGrow={1}>
        {!layout.hideLeft && (
          <RequestList
            requests={httpYac.requests}
            results={httpYac.results}
            activeRequestId={activeRequestId}
            setActiveRequestId={setActiveRequestId}
            execute={httpYac.execute}
            isRunning={httpYac.isRunning}
            isFocused={focusedPanel === 'left'}
            variables={environments.variables}
            onEdit={openEditor}
            width={layout.left}
          />
        )}
        {!layout.hideCenter && (
          <RequestViewer
            rawContent={fileWatcher.rawContent}
            requests={httpYac.requests}
            activeRequestId={activeRequestId}
            setActiveRequestId={setActiveRequestId}
            execute={httpYac.execute}
            isRunning={httpYac.isRunning}
            isFocused={focusedPanel === 'center'}
            filePath={filePath}
            variables={environments.variables}
            onEdit={openEditor}
          />
        )}
        {!layout.hideRight && (
          <ResponseView
            result={activeResult}
            isFocused={focusedPanel === 'right'}
            filePath={filePath}
            activeRequest={activeRequest}
            width={layout.right}
          />
        )}
      </Box>
      <StatusBar
        filePath={filePath}
        activeEnvironment={environments.activeEnvironment}
        lastUpdated={fileWatcher.lastUpdated}
        screenMode={screenMode}
      />
    </Box>
  );
}
