import { useState, useEffect } from "react";
import Card from "../../components/common/Card";
import Table from "../../components/common/Table";
import api from "../../utils/api";
import toast from "react-hot-toast";

const TouristTransactions = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        const res = await api.get("/payments/my-payments");
        if (res.data.success) {
          setPayments(res.data.data);
        }
      } catch (error) {
        toast.error("Không thể tải lịch sử thanh toán");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, []);

  // Định nghĩa các cột cho Table
  const columns = [
    {
      header: "Gói dịch vụ",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900">{row.package_name}</span>
          <span className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold md:hidden">
            {row.payment_method}
          </span>
        </div>
      ),
    },
    {
      header: "Số tiền",
      render: (row) => (
        <span className="font-mono font-bold text-gray-900">
          {row.amount.toLocaleString()} <span className="text-gray-400 text-xs">VNĐ</span>
        </span>
      ),
    },
    {
      header: "Phương thức",
      accessor: "payment_method",
      render: (row) => (
        <div className="hidden md:block">
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">
            {row.payment_method.toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      header: "Thời hạn",
      accessor: "duration",
      render: (row) => (
        <div className="hidden md:block">
          <span className="font-mono font-bold text-gray-900">
            {row.duration < 24 ? `${row.duration} giờ` : Math.floor(row.duration / 24) + " ngày" + (row.duration % 24 > 0 ? ` ${row.duration % 24} giờ` : "")}
          </span>
        </div>
      ),
    },
    {
      header: "Ngày thanh toán",
      render: (row) => {
        const date = new Date(row.bought_at);
        return (
          <div className="flex flex-col text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              {date.toLocaleDateString("vi-VN")}
            </span>
            <span className="text-xs opacity-70">
              {date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-300 py-10 px-4 md:px-8 space-y-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Lịch Sử <span className="text-blue-600">Giao Dịch</span>
            </h1>
            <p className="text-gray-500 mt-1">
              Quản lý và xem lại tất cả các hóa đơn thanh toán gói dịch vụ của bạn.
            </p>
          </div>
          
          <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
             <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Tổng chi tiêu</p>
                <p className="text-lg font-black text-blue-600">
                   {payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} VNĐ
                </p>
             </div>
             <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75m0 1.5v.75m0 1.5v.75m0 1.5V15m11.25-10.5h3.75a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25h-3.75M12 11.25h3.75m-3.75 3h3.75m-9.75-10.5c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V3.75c0-.621-.504-1.125-1.125-1.125h-9.75c-.621 0-1.125.504-1.125 1.125v.75z" />
                </svg>
             </div>
          </div>
        </div>

        {/* Table Content */}
        <Card className="p-0 max-h-90 overflow-hidden border-none shadow-xl shadow-gray-200/50">
          {payments.length > 0 ? (
            <Table columns={columns} data={payments} className="max-h-[300px]" />
          ) : (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-bold text-lg">Chưa có giao dịch nào</h3>
              <p className="text-gray-500 text-sm">Các gói dịch vụ bạn đã mua sẽ xuất hiện tại đây.</p>
            </div>
          )}
        </Card>
      </div>
      {/* Support Info */}
      <p className="text-center text-xs text-gray-400">
        Nếu có bất kỳ thắc mắc nào về hóa đơn, vui lòng liên hệ <span className="text-blue-500 font-medium underline"><a href="mailto:nguyenkhanh0127@gmail.com">Hỗ trợ khách hàng</a></span>
      </p>
    </div>
  );
};

export default TouristTransactions;