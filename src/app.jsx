import React, { useState, useCallback } from 'react';
import { useInput, useApp } from 'ink';
import FileBrowser from './components/FileBrowser.jsx';
import MainView from './components/MainView.jsx';
import EnvPicker from './components/EnvPicker.jsx';
import HelpOverlay from './components/HelpOverlay.jsx';
import { useEnvironments } from './hooks/useEnvironments.js';
import { useFileWatcher } from './hooks/useFileWatcher.js';
import { SearchModeProvider, useSearchMode } from './hooks/useSearchMode.js';

export default function App({ initialFile }) {
  return (
    <SearchModeProvider>
      <AppInner initialFile={initialFile} />
    </SearchModeProvider>
  );
}

function AppInner({ initialFile }) {
  const { exit } = useApp();
  const { isSearchActive } = useSearchMode();
  const [mode, setMode] = useState(initialFile ? 'MAIN_VIEW' : 'FILE_BROWSER');
  const [filePath, setFilePath] = useState(initialFile || null);
  const [showEnvPicker, setShowEnvPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const environments = useEnvironments(filePath);
  const fileWatcher = useFileWatcher(filePath);

  const handleFileSelect = useCallback((path) => {
    setFilePath(path);
    setMode('MAIN_VIEW');
  }, []);

  const handleOpenFileBrowser = useCallback(() => {
    setMode('FILE_BROWSER');
  }, []);

  const handleReload = useCallback(() => {
    fileWatcher.reload();
  }, [fileWatcher]);

  useInput((input, key) => {
    if (showEnvPicker || showHelp) return;

    // Ctrl+C always works
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    // skip all single-key hotkeys when search input is active
    if (isSearchActive) return;

    if (input === 'q') {
      exit();
      return;
    }

    if (input === '?') {
      setShowHelp(true);
      return;
    }

    if (mode === 'MAIN_VIEW') {
      if (input === 'E') {
        setShowEnvPicker(true);
        return;
      }
      if (input === 'o') {
        handleOpenFileBrowser();
        return;
      }
      if (input === 'r') {
        handleReload();
        return;
      }
    }
  });

  if (showHelp) {
    return <HelpOverlay onClose={() => setShowHelp(false)} />;
  }

  if (showEnvPicker) {
    return (
      <EnvPicker
        environments={environments.environments}
        activeEnvironment={environments.activeEnvironment}
        onSelect={(env) => {
          environments.setEnvironment(env);
          setShowEnvPicker(false);
        }}
        onClose={() => setShowEnvPicker(false)}
      />
    );
  }

  if (mode === 'FILE_BROWSER') {
    return (
      <FileBrowser
        onSelect={handleFileSelect}
        onCancel={filePath ? () => setMode('MAIN_VIEW') : null}
        initialPath={filePath}
      />
    );
  }

  return (
    <MainView
      filePath={filePath}
      fileWatcher={fileWatcher}
      environments={environments}
    />
  );
}
