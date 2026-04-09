import React, { createContext, useContext, useState } from 'react';

const SearchModeContext = createContext({
  isSearchActive: false,
  setSearchActive: () => {},
});

export function SearchModeProvider({ children }) {
  const [isSearchActive, setSearchActive] = useState(false);

  return React.createElement(
    SearchModeContext.Provider,
    { value: { isSearchActive, setSearchActive } },
    children,
  );
}

export function useSearchMode() {
  return useContext(SearchModeContext);
}
