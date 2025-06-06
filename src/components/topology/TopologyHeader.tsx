import { useState, useRef, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  ArrowsPointingOutIcon,
  ArrowPathIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { TopologyData, SearchResult } from '@/hooks/useTopology';

interface TopologyHeaderProps {
  topology: TopologyData | null;
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  onSearchSelect: (result: SearchResult) => void;
  onRefresh: () => void;
}

export function TopologyHeader({
  topology,
  searchResults,
  onSearch,
  onClearSearch,
  onSearchSelect,
  onRefresh,
}: TopologyHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle search input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
    setShowResults(value.length > 0);
  };

  // Handle search result selection
  const handleResultSelect = (result: SearchResult) => {
    onSearchSelect(result);
    setSearchQuery('');
    setShowResults(false);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
    onClearSearch();
  };

  // Handle Fit View - will be connected to ReactFlow context
  const handleFitView = () => {
    // This will trigger the fit view function in the parent component
    const event = new CustomEvent('topology-fit-view');
    window.dispatchEvent(event);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 z-30 bg-gray-800 bg-opacity-95 backdrop-blur-sm border-b border-gray-700">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Section - Search */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search buses, lines, transformers..."
                className="w-80 pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-white"
                >
                  <XMarkIcon />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultSelect(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center space-x-3 border-b border-gray-700 last:border-b-0"
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      result.type === 'bus' ? 'bg-blue-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <div className="text-white font-medium">{result.name}</div>
                      <div className="text-gray-400 text-sm capitalize">{result.type}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Section - Grid Info */}
        <div className="flex items-center space-x-6 text-white">
          {topology && (
            <>
              <div className="text-center">
                <div className="text-sm text-gray-400">Buses</div>
                <div className="font-bold">{topology.buses.length}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Branches</div>
                <div className="font-bold">{topology.branches.length}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Grid</div>
                <div className="font-bold">{topology.name}</div>
              </div>
            </>
          )}
        </div>

        {/* Right Section - Controls and Legend */}
        <div className="flex items-center space-x-4">
          {/* Voltage Legend */}
          <div className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-2">
            <span className="text-white text-sm font-medium">Voltage:</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-300">Low/High</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xs text-gray-300">Warning</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-300">Normal</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFitView}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              title="Fit View"
            >
              <ArrowsPointingOutIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Fit View</span>
            </button>
            
            <button
              onClick={onRefresh}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              title="Refresh Topology"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 