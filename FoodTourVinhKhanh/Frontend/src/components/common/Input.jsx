const Input = ({ label, error, ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-medium text-gray-700 ml-1">{label}</label>}
      <input
        {...props}
        className={`px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all
          focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500
          placeholder:text-gray-400 ${error ? "border-red-500 ring-red-500/10" : ""}`}
      />
      {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
    </div>
  );
};

export default Input;