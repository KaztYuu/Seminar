import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CircleDollarSign,
  ShieldCheck,
  Store,
  Users,
  UserRoundCheck,
} from "lucide-react";
import Card from "../../components/common/Card";
import FullPageLoading from "../../components/common/FullPageLoading";
import api from "../../utils/api";
import { toast } from "react-hot-toast";

const ROLE_META = {
  tourist: {
    label: "Du khách",
    tone: "bg-blue-50 text-blue-600",
  },
  vendor: {
    label: "Chủ quán",
    tone: "bg-orange-50 text-orange-600",
  },
  admin: {
    label: "Quản trị viên",
    tone: "bg-emerald-50 text-emerald-600",
  },
};

const formatCurrency = (value = 0) =>
  Number(value).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

const formatLastLogin = (value) => {
  if (!value) return "Chưa đăng nhập";

  const date = new Date(value);
  return `${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      try {
        const res = await api.get("/users/dashboard-stats");
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch {
        toast.error("Không thể tải dữ liệu thống kê");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return <FullPageLoading />;
  }

  const dashboardStats = stats || {
    total_revenue: 0,
    total_users: 0,
    online_users: 0,
    tourist_count: 0,
    vendor_count: 0,
    admin_count: 0,
    recent_users: [],
  };

  const summaryCards = [
    {
      title: "Tổng tiền",
      value: formatCurrency(dashboardStats.total_revenue),
      note: "Doanh thu từ các giao dịch thành công",
      icon: CircleDollarSign,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Tổng số user",
      value: `${dashboardStats.total_users} tài khoản`,
      note: "Tổng số tài khoản đang có trong hệ thống",
      icon: Users,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      title: "User đang online",
      value: `${dashboardStats.online_users} người`,
      note: "Đếm theo session còn hoạt động trong hệ thống",
      icon: UserRoundCheck,
      iconClass: "bg-orange-50 text-orange-600",
    },
  ];

  const roleCards = [
    {
      label: "Du khách",
      count: dashboardStats.tourist_count,
      icon: Users,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      label: "Chủ quán",
      count: dashboardStats.vendor_count,
      icon: Store,
      iconClass: "bg-orange-50 text-orange-600",
    },
    {
      label: "Quản trị viên",
      count: dashboardStats.admin_count,
      icon: ShieldCheck,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="min-h-full bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-blue-700 p-8 text-white shadow-2xl shadow-slate-300/40">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-blue-200">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Thống kê hệ thống quản trị
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">
            Theo dõi nhanh doanh thu, người dùng và tình hình hoạt động của hệ
            thống trên cùng một màn hình.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="p-0 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-500">
                        {card.title}
                      </p>
                      <p className="mt-3 text-3xl font-black text-gray-900">
                        {card.value}
                      </p>
                      <p className="mt-2 text-sm text-gray-400">{card.note}</p>
                    </div>
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconClass}`}>
                      <Icon size={28} />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Phân bố tài khoản
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Nhìn nhanh hệ thống hiện đang tập trung ở nhóm người dùng nào.
                </p>
              </div>
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
                Quản lý user <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {roleCards.map((item) => {
                const Icon = item.icon;
                const totalUsers = dashboardStats.total_users || 1;
                const percent = Math.round((item.count / totalUsers) * 100);

                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconClass}`}>
                        <Icon size={22} />
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500">
                        {percent}%
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-gray-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-2xl font-black text-gray-900">
                      {item.count}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Hoạt động gần đây
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Một vài tài khoản có lần đăng nhập mới nhất.
                </p>
              </div>
              <Link
                to="/admin/transactions"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
                Xem giao dịch <ArrowRight size={16} />
              </Link>
            </div>

            <div className="space-y-3">
              {dashboardStats.recent_users.length > 0 ? (
                dashboardStats.recent_users.map((user) => {
                  const roleMeta = ROLE_META[user.role] || {
                    label: user.role,
                    tone: "bg-gray-100 text-gray-600",
                  };

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-gray-900">
                          {user.name}
                        </p>
                        <p className="truncate text-sm text-gray-400">
                          {user.email}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatLastLogin(user.last_login)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${roleMeta.tone}`}>
                        {roleMeta.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
                  Chưa có dữ liệu đăng nhập gần đây.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
