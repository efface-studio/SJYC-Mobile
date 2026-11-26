import { useEffect, useState } from 'react';

export function useLiveSearch() {
  const [draft, change] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    if (!draft.trim()) {
      setTerm('');
      return;
    }
    const timer = setTimeout(() => setTerm(draft.trim()), 220);
    return () => clearTimeout(timer);
  }, [draft]);
  return [term, change] as const;
}
