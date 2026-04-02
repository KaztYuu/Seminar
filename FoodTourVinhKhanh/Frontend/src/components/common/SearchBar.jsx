import { useState } from "react";
import { Search } from "lucide-react";

const SearchBar = ({ placeholder = "Search...", onSearch, className }) => {
  const [value, setValue] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onSearch(value);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className="absolute left-3 top-2.5 text-gray-400">
        <Search />
      </span>
    </div>
  );
};

export default SearchBar