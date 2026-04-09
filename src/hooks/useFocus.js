import { useState, useCallback } from 'react';

const PANELS = ['left', 'center', 'right'];
const SCREEN_MODES = ['normal', 'half', 'full'];

export function useFocus() {
  const [focusedPanel, setFocusedPanel] = useState('left');
  const [screenMode, setScreenMode] = useState('normal');

  const nextPanel = useCallback(() => {
    setFocusedPanel((prev) => {
      const idx = PANELS.indexOf(prev);
      return PANELS[(idx + 1) % PANELS.length];
    });
  }, []);

  const prevPanel = useCallback(() => {
    setFocusedPanel((prev) => {
      const idx = PANELS.indexOf(prev);
      return PANELS[(idx - 1 + PANELS.length) % PANELS.length];
    });
  }, []);

  const setFocus = useCallback((panel) => {
    setFocusedPanel(panel);
  }, []);

  const nextScreenMode = useCallback(() => {
    setScreenMode((prev) => {
      const idx = SCREEN_MODES.indexOf(prev);
      return SCREEN_MODES[(idx + 1) % SCREEN_MODES.length];
    });
  }, []);

  const prevScreenMode = useCallback(() => {
    setScreenMode((prev) => {
      const idx = SCREEN_MODES.indexOf(prev);
      return SCREEN_MODES[(idx - 1 + SCREEN_MODES.length) % SCREEN_MODES.length];
    });
  }, []);

  const toggleFullScreen = useCallback((panel) => {
    setScreenMode((prevMode) => prevMode === 'full' && focusedPanel === panel ? 'normal' : 'full');
    setFocusedPanel(panel);
  }, [focusedPanel]);

  return { focusedPanel, setFocus, nextPanel, prevPanel, screenMode, nextScreenMode, prevScreenMode, toggleFullScreen };
}
