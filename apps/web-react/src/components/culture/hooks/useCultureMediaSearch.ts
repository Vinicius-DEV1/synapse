import { useState, useEffect } from 'react';
import { searchCultureMedia, type CultureSearchResult } from '../../../services/culture/culture-apis';

export function useCultureMediaSearch(type: string, initialQuery = '', isEdit = false) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<CultureSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (!searchQuery.trim() || isEdit) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, type, isEdit]);

  const handleSearch = async (queryToSearch = searchQuery) => {
    if (!queryToSearch.trim()) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      const results = await searchCultureMedia(queryToSearch, type || 'filme');
      setSearchResults(results.slice(0, 10));
    } catch (err) {
      console.error('[CultureAddModal] Erro detalhado na busca inteligente:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => {
    setSearchResults([]);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    handleSearch,
    clearResults,
  };
}
