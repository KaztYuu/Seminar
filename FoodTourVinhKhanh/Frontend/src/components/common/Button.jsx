const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled = false,
  title = "",
}) => {
  const base =
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const styles = {
    primary:
      "bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700 hover:shadow-lg disabled:hover:bg-blue-600",
    danger:
      "bg-red-500 text-white shadow-md shadow-red-200 hover:bg-red-600 disabled:hover:bg-red-500",
    success:
      "bg-green-500 text-white shadow-md shadow-green-200 hover:bg-green-600 disabled:hover:bg-green-500",
    disabled:
      "bg-gray-300 text-gray-500 shadow-md shadow-gray-200 cursor-not-allowed hover:bg-gray-300",
    outline:
      "border-2 border-gray-200 text-gray-400 hover:border-blue-500 hover:text-blue-600 bg-white disabled:hover:border-gray-200",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

export default Button;
