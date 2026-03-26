const Button = ({ children, onClick, variant = "primary", size = "md", className = "" }) => {
  const base = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50";

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const styles = {
    primary: "bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700 hover:shadow-lg",
    danger: "bg-red-500 text-white shadow-md shadow-red-200 hover:bg-red-600",
    outline: "border-2 border-gray-200 text-gray-400 hover:border-blue-500 hover:text-blue-600 bg-white"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;