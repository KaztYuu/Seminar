const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Content */}
      <div className="relative bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
        {title && <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>}
        <div className="text-gray-600">{children}</div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;