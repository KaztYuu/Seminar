CREATE DATABASE FoodTourVinhKhanh;
USE FoodTourVinhKhanh;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    phoneNumber VARCHAR(15),
    role ENUM('tourist', 'vendor', 'admin'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_Blocked BOOLEAN DEFAULT FALSE,
    is_Deleted BOOLEAN DEFAULT FALSE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE pois (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT,
    name VARCHAR(255),
    thumbnail VARCHAR(255),
    banner VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_Active BOOLEAN DEFAULT FALSE,
    is_Deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE
    SET NULL ON UPDATE CASCADE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE poi_position (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT,
    latitude DOUBLE,
    longitude DOUBLE,
    audio_range INT DEFAULT 30,
    access_range INT DEFAULT 10,
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE ON UPDATE CASCADE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE poi_localized_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT,
    lang_code VARCHAR(10),
    name VARCHAR(255),
    description TEXT,
    audio_url VARCHAR(255),
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE(poi_id, lang_code)
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE subscription_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    -- Ví dụ: "Gói du khách 1 ngày", "Gói chủ quán 1 tháng"
    target_role ENUM('tourist', 'vendor'),
    -- Gói này dành cho ai
    price DECIMAL(10, 2),
    duration_hours INT,
    -- Thời hạn của gói tính bằng giờ
    daily_poi_limit INT DEFAULT 1,
    -- Maximum POIs a vendor can create per day
    is_Active BOOLEAN DEFAULT TRUE,
    description TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    amount DECIMAL(10, 2),
    package_id INT,
    transaction_ref VARCHAR(100) UNIQUE,
    payment_method VARCHAR(50),
    status ENUM('pending', 'success', 'failed'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE
    SET NULL ON UPDATE CASCADE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE tourist_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    start_time DATETIME,
    end_time DATETIME,
    payment_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE
    SET NULL ON UPDATE CASCADE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE vendor_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    start_time DATETIME,
    end_time DATETIME,
    payment_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE
    SET NULL ON UPDATE CASCADE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE poi_knowledge_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT,
    category ENUM('menu', 'history', 'promotion', 'other'), -- Loại nội dung dùng cho chatbot RAG
    content TEXT,
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
) CHARSET = utf8mb4;
-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
-- Index for daily POI count queries (critical for daily limit checks)
CREATE INDEX idx_pois_owner_created ON pois(owner_id, created_at);
-- Indexes for subscription lookups
CREATE INDEX idx_vendor_subscriptions_user ON vendor_subscriptions(user_id, end_time);
CREATE INDEX idx_tourist_subscriptions_user ON tourist_subscriptions(user_id, end_time);
-- Index for payment lookups
CREATE INDEX idx_payments_user ON payments(user_id, created_at);
-- Index for POI position searches (for nearby/map queries)
CREATE INDEX idx_poi_position_coords ON poi_position(latitude, longitude);
-- ============================================================================
-- DEFAULT DATA INITIALIZATION
-- ============================================================================
-- Insert default subscription packages (safe - prevents duplicates)
INSERT INTO subscription_packages (
        name,
        target_role,
        price,
        duration_hours,
        daily_poi_limit,
        is_Active,
        description
    )
SELECT 'FREE',
    'vendor',
    0,
    999999,
    1,
    TRUE,
    'Free tier subscription - 1 POI per day'
WHERE NOT EXISTS (
        SELECT 1
        FROM subscription_packages
        WHERE name = 'FREE'
            AND target_role = 'vendor'
    )
UNION ALL
SELECT 'BASIC',
    'vendor',
    99000,
    720,
    3,
    TRUE,
    'Basic subscription - 3 POIs per day'
WHERE NOT EXISTS (
        SELECT 1
        FROM subscription_packages
        WHERE name = 'BASIC'
            AND target_role = 'vendor'
    )
UNION ALL
SELECT 'VIP',
    'vendor',
    199000,
    720,
    5,
    TRUE,
    'Premium subscription - 5 POIs per day'
WHERE NOT EXISTS (
        SELECT 1
        FROM subscription_packages
        WHERE name = 'VIP'
            AND target_role = 'vendor'
    )
UNION ALL
SELECT 'FREE_TOURIST',
    'tourist',
    0,
    999999,
    999,
    TRUE,
    'Free tier for tourists'
WHERE NOT EXISTS (
        SELECT 1
        FROM subscription_packages
        WHERE name = 'FREE_TOURIST'
            AND target_role = 'tourist'
    );
-- Insert default admin account (safe - prevents duplicates)
-- Password hash: bcrypt hash of 'admin123'
-- To update password, use: UPDATE users SET password = '$2b$12$NEW_HASH' WHERE email = 'admin@test.com';
INSERT INTO users (
        name,
        email,
        password,
        phoneNumber,
        role,
        is_Blocked,
        is_Deleted
    )
SELECT 'System Admin',
    'admin@test.com',
    '$2b$12$/wq4UkFfOWPpkFzhr/j.PO.kod0FwRanReLx59ZcDNELZM4EqXB/a',
    '0900000001',
    'admin',
    FALSE,
    FALSE
WHERE NOT EXISTS (
        SELECT 1
        FROM users
        WHERE email = 'admin@test.com'
            AND role = 'admin'
    );
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE tours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_Active BOOLEAN DEFAULT TRUE,           -- TRUE: hiển thị cho Tourist
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE tour_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tour_id INT NOT NULL,
    poi_id INT NOT NULL,
    point_order INT NOT NULL,                 -- Thứ tự điểm dừng trong Tour
    FOREIGN KEY (tour_id) REFERENCES tours(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (poi_id) REFERENCES pois(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
