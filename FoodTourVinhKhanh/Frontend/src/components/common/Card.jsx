const Card = ({ children, className = "" }) => {
  return (
    <div className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-500/5 ring-1 ring-black/5 ${className}`}>
      {children}
    </div>
  );
};

export default Card;