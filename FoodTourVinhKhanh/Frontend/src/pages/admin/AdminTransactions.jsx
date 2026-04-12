import { useState, useEffect } from "react";
import Card from "../../components/common/Card";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import api from "../../utils/api";
import toast from "react-hot-toast";
import FullPageLoading from "../../components/common/FullPageLoading";
import { Eye, DollarSign, CheckCircle2, Clock, Inbox } from "lucide-react";

const AdminTransactions = () => {
  const [payments, setPayments] = useState([]);
  const [loadingFetch, setLoadingFetch] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAllPayments();
  }, []);

  const fetchAllPayments = async () => {
    setLoadingFetch(true);
    try {
      const res = await api.get("/payments/all");
      if (res.data.success) {
        setPayments(res.data.data);
      }
    } catch {
      toast.error("Không thể tải lịch sử giao dịch");
    } finally {
      setLoadingFetch(false);
    }
  };

  const handleViewDetail = (payment) => {
    setSelectedPayment(payment);
    setIsDetailModalOpen(true);
  };

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const matchStatus = !statusFilter || payment.status === statusFilter;
    const matchSearch =
      payment.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.package_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Table columns
  const columns = [
    {
      header: "Khách hàng",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900">{row.user_name}</span>
          <span className="text-xs text-gray-500">{row.user_email}</span>
        </div>
      ),
    },
    {
      header: "Gói dịch vụ",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">
            {row.package_name}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            {row.duration < 24
              ? `${row.duration} giờ`
              : Math.floor(row.duration / 24) + " ngày"}
          </span>
        </div>
      ),
    },
    {
      header: "Số tiền",
      render: (row) => (
        <span className="font-mono font-bold text-gray-900">
          {row.amount.toLocaleString()}{" "}
          <span className="text-gray-400 text-xs">VNĐ</span>
        </span>
      ),
    },
    {
      header: "Phương thức",
      render: (row) => (
        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">
          {row.payment_method.toUpperCase()}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      render: (row) => {
        const statusConfig = {
          success: {
            bg: "bg-green-100",
            text: "text-green-700",
            label: "✓ Thành công",
          },
          pending: {
            bg: "bg-yellow-100",
            text: "text-yellow-700",
            label: "⏳ Chờ xử lý",
          },
          failed: {
            bg: "bg-red-100",
            text: "text-red-700",
            label: "✗ Thất bại",
          },
        };
        const config = statusConfig[row.status] || statusConfig.pending;
        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text} border border-current border-opacity-20`}>
            {config.label}
          </span>
        );
      },
    },
    {
      header: "Ngày tạo",
      render: (row) => {
        const date = new Date(row.created_at);
        return (
          <div className="flex flex-col text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              {date.toLocaleDateString("vi-VN")}
            </span>
            <span className="text-xs opacity-70">
              {date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        );
      },
    },
    {
      header: "Chi tiết",
      render: (row) => (
        <button
          onClick={() => handleViewDetail(row)}
          disabled={loadingFetch}
          className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Xem chi tiết">
          <Eye size={16} />
        </button>
      ),
    },
  ];

  if (loadingFetch) {
    return <FullPageLoading />;
  }

  const totalRevenue = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);
  const successCount = payments.filter((p) => p.status === "success").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Lịch Sử <span className="text-blue-600">Giao Dịch</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Quản lý toàn bộ giao dịch thanh toán của hệ thống
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Tổng doanh thu
                </p>
                <p className="text-2xl font-black text-gray-900 mt-2">
                  {totalRevenue.toLocaleString()}{" "}
                  <span className="text-sm text-gray-400">VNĐ</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                <DollarSign size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Giao dịch thành công
                </p>
                <p className="text-2xl font-black text-gray-900 mt-2">
                  {successCount}{" "}
                  <span className="text-sm text-gray-400">lần</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                <CheckCircle2 size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Chờ xử lý</p>
                <p className="text-2xl font-black text-gray-900 mt-2">
                  {pendingCount}{" "}
                  <span className="text-sm text-gray-400">lần</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600">
                <Clock size={24} />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Tìm khách hàng hoặc gói..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-w-48">
            <option value="">Tất cả trạng thái</option>
            <option value="success">✓ Thành công</option>
            <option value="pending">⏳ Chờ xử lý</option>
            <option value="failed">✗ Thất bại</option>
          </select>
        </div>

        {/* Table */}
        <Card className="p-0 border-none shadow-xl shadow-gray-200/50 overflow-hidden">
          {filteredPayments.length > 0 ? (
            <Table columns={columns} data={filteredPayments} />
          ) : (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox size={40} className="text-gray-300" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg">
                Không tìm thấy giao dịch nào
              </h3>
              <p className="text-gray-500 text-sm">
                Các giao dịch sẽ xuất hiện tại đây
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Chi tiết giao dịch">
        {selectedPayment && (
          <div className="min-w-96 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Khách hàng
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {selectedPayment.user_name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedPayment.user_email}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Gói dịch vụ
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {selectedPayment.package_name}
                </p>
              </div>
            </div>

            <div className="border-t pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Số tiền
                </p>
                <p className="text-lg font-black text-gray-900 mt-1">
                  {selectedPayment.amount.toLocaleString()} VNĐ
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Phương thức
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-1 uppercase">
                  {selectedPayment.payment_method}
                </p>
              </div>
            </div>

            <div className="border-t pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Thời hạn
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {selectedPayment.duration < 24
                    ? `${selectedPayment.duration} giờ`
                    : Math.floor(selectedPayment.duration / 24) + " ngày"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Trạng thái
                </p>
                <p className="text-sm font-semibold mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedPayment.status === "success"
                        ? "bg-green-100 text-green-700"
                        : selectedPayment.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}>
                    {selectedPayment.status === "success"
                      ? "✓ Thành công"
                      : selectedPayment.status === "pending"
                        ? "⏳ Chờ xử lý"
                        : "✗ Thất bại"}
                  </span>
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 font-bold uppercase">
                Ngày tạo
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {new Date(selectedPayment.created_at).toLocaleString("vi-VN")}
              </p>
            </div>

            <div className="border-t pt-4 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1">
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminTransactions;
