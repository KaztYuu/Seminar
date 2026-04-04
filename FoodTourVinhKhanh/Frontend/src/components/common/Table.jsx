const Table = ({ columns, data, className = "" }) => {
  return (
    <div className={`w-full overflow-auto rounded-2xl border border-gray-100 shadow-sm ${className}`}>
      <table className="w-full border-collapse bg-white text-left">
        <thead className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
          <tr>
            {columns.map((col, index) => (
              <th 
                key={index} 
                className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, i) => (
            <tr key={i} className="group hover:bg-blue-50/30 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className="px-6 py-4 text-sm text-gray-600">
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;