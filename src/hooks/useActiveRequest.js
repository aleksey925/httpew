import { useState } from 'react';

export function useActiveRequest() {
  const [activeRequestId, setActiveRequestId] = useState('0');
  return { activeRequestId, setActiveRequestId };
}
