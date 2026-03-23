const touristMenu = [
  { label: 'Tổng quan', icon: '🏠', path: '/tourist' },
  { label: 'Khám phá', icon: '🗺️', path: '/tourist/explore' },
  { label: 'Hồ sơ', icon: '👤', path: '/tourist/profile' },
  { label: 'Lịch sử giao dịch', icon: '💸', path: '/tourist/transactions' }
]

const vendorMenu = [
  { label: 'Tổng quan', icon: '📊', path: '/vendor' },
  { label: 'Gian hàng của tôi', icon: '🏪', path: '/vendor/my-pois' },
  { label: 'Hồ sơ', icon: '👤', path: '/vendor/profile' },
  { label: 'Lịch sử giao dịch', icon: '💸', path: '/vendor/transactions' }
]

const adminMenu = [
  { label: 'Tổng quan', icon: '📈', path: '/admin' },
  { label: 'Quản lý người dùng', icon: '👥', path: '/admin/users' },
  { label: 'Quản lý POIs', icon: '🍱', path: '/admin/pois' },
  { label: 'Quản lý gói dịch vụ', icon: '📦', path: '/admin/packages' },
  { label: 'Hồ sơ', icon: '👤', path: '/admin/profile' },
  { label: 'Quản lý giao dịch', icon: '💸', path: '/admin/transactions' }
]

export { touristMenu, vendorMenu, adminMenu };