INSERT INTO `users` (
        `id`,
        `name`,
        `email`,
        `password`,
        `phoneNumber`,
        `role`,
        `created_at`,
        `last_login`,
        `is_Blocked`,
        `is_Deleted`
    )
VALUES (
        1,
        'admin',
        'admin@test.com',
        '$2b$12$FBbK3NcyOwHozXgt.0tV3u0JKlrju4iWjVOWJZNK6r5bdbzSbYKgO',
        '0900000001',
        'admin',
        NOW(),
        NULL,
        0,
        0
    ),
    (
        2,
        'vendor1',
        'vendor1@test.com',
        '$2b$12$hsAXGUQk8jA.FfZlHUj0WOrUZ1XpRFnJJxDmtUEZSO0OcfXTn1a5S',
        '0900000002',
        'vendor',
        NOW(),
        NULL,
        0,
        0
    ),
    (
        3,
        'vendor2',
        'vendor2@test.com',
        '$2b$12$eucN7UcXFbDAAN6X3dPxSOn0UQQAgKpITH4c.SR/gH4jyYmaCRb62',
        '0900000003',
        'vendor',
        NOW(),
        NULL,
        0,
        0
    );
INSERT INTO pois (
        id,
        owner_id,
        name,
        thumbnail,
        banner,
        created_at,
        is_Active,
        status,
        is_Deleted
    )
VALUES (
        5,
        2,
        'Gian hàng "tuổi Thần Tiên"',
        '/uploads/images/thumb.png',
        '/uploads/images/banner.png',
        NOW(),
        1,
        'approved',
        0
    ),
    (
        6,
        2,
        'Gian hàng Bùi Chu',
        '/uploads/images/thumb.png',
        '/uploads/images/banner.png',
        NOW(),
        1,
        'approved',
        0
    ),
    (
        8,
        2,
        'Nhà ăn quân đội',
        '/uploads/images/thumb.png',
        '/uploads/images/banner.png',
        NOW(),
        1,
        'approved',
        0
    ),
    (
        10,
        3,
        'Quán ăn vườn xoài',
        '/uploads/images/thumb.png',
        '/uploads/images/banner.png',
        NOW(),
        1,
        'approved',
        0
    ),
    (
        11,
        3,
        'Gian hàng "Siêu Sao hạng A"',
        '/uploads/images/thumb.png',
        '/uploads/images/banner.png',
        NOW(),
        1,
        'approved',
        0
    ),
    (
        12,
        3,
        'Quán "Bánh canh cua 14"',
        '/uploads/images/thumb.png',
        '/uploads/images/banner.png',
        NOW(),
        1,
        'approved',
        0
    ),
    (
        13,
        3,
        'Gian hàng "Circle K"',
        '/uploads/images/thumb.png',
        '/uploads/images/banner.png',
        NOW(),
        1,
        'approved',
        0
    );
INSERT INTO `poi_knowledge_base` (`id`, `poi_id`, `category`, `content`)
VALUES (19, 6, 'menu', 'Cá viên chiên - 10000 VND'),
    (20, 6, 'menu', 'Bánh cuốn - 20000 VND'),
    (21, 6, 'menu', 'Nước giải khát 7-Up - 10000 VND'),
    (22, 6, 'history', 'Hơn 3 năm hoạt động'),
    (
        23,
        6,
        'other',
        'Vận hành bởi cha xứ Nguyễn Đắc Đạo, kinh phí đầu tư bởi hơn 30 hộ gia đình trong giáo xứ. 50% thu nhập sẽ được đem đi từ thiện.'
    ),
    (24, 5, 'menu', 'Mì xào - 25000 VND'),
    (25, 5, 'menu', 'Nước suối - 8000 VND'),
    (
        26,
        5,
        'other',
        'Thành lập bởi Nguyễn Mai Trúc - Đại học Sài Gòn cùng 10 em học sinh trên địa bàn. Toàn bộ tiền kiếm được sẽ mang đi làm từ thiện.'
    ),
    (27, 5, 'menu', 'Trứng cút chiên - 15000 VND'),
    (35, 8, 'menu', 'Cơm thịt xay - 18000 VND'),
    (36, 8, 'menu', 'Canh chua trứng - 8000 VND'),
    (37, 8, 'menu', 'Thịt gà thái sợi - 20000 VND'),
    (38, 8, 'menu', 'Nước suối - 6000 VND'),
    (39, 8, 'menu', 'Bún chân heo - 22000 VND'),
    (
        40,
        8,
        'history',
        'Đã tồn tại và vận hành hơn 10 năm'
    ),
    (
        41,
        8,
        'other',
        'Đây là khu nhà ăn cho quân đội. Tiền thu được sẽ được góp cho kho bạc.'
    ),
    (89, 10, 'menu', 'Cơm trộn xoài 35000 VND'),
    (90, 10, 'menu', 'Nước ép xoài - 18000 VND'),
    (
        91,
        10,
        'promotion',
        'Khuyến mãi tặng thêm 1 khi mua 3 phần nước ép xoài'
    ),
    (
        92,
        10,
        'history',
        'Hoạt động từ tháng 1 năm 2025'
    ),
    (93, 11, 'menu', 'Cơm tấm - 20000VND'),
    (94, 11, 'menu', 'Mì xào bò - 25000VND'),
    (
        95,
        11,
        'promotion',
        'Mua 2 phần bất kỳ tặng 1 chai nước suối'
    ),
    (96, 11, 'menu', 'Nước ngọt các loại - 10000VND'),
    (115, 13, 'menu', 'Mì cay - 30000VND'),
    (116, 13, 'menu', 'Nước ngọt các loại - 10000VND'),
    (117, 13, 'menu', 'Bánh snack - 8000VND'),
    (118, 13, 'menu', 'Bánh mì sữa - 18000 VND'),
    (
        119,
        13,
        'promotion',
        'Giảm giá 10% cho đơn trên 200000VND'
    ),
    (
        120,
        13,
        'other',
        'Quản lý bởi Trần Thanh Tâm - 20 tuổi. Có chỗ để xe thu phí'
    ),
    (
        121,
        12,
        'menu',
        'Bánh canh chân heo - 35000 VND'
    ),
    (122, 12, 'menu', 'Bánh canh bò - 40000 VND'),
    (123, 12, 'menu', 'Bánh canh trẻ em - 15000 VND'),
    (124, 12, 'history', 'Buôn bán được hơn 8 năm'),
    (
        125,
        12,
        'promotion',
        'Mua 2 tô, tặng một chai nước suối miễn phí'
    ),
    (
        126,
        12,
        'other',
        'Quán có chỗ gửi xe và nơi chăm sóc trẻ em'
    );
INSERT INTO `poi_localized_data` (
        `id`,
        `poi_id`,
        `lang_code`,
        `name`,
        `description`,
        `audio_url`
    )
VALUES (
        9,
        5,
        'vi',
        'Gian hàng \"tuổi Thần Tiên\"',
        'Gian hàng của các em học sinh, sinh viên. Với mục đích mang đến các món ngon và chất lượng cho cộng đồng. Mong mọi người ghé thăm và có một chuyến đi vui vẻ.',
        '/uploads/audio/tts/poi_5_vi.wav'
    ),
    (
        10,
        5,
        'en',
        'Gian hàng \"tuổi Thần Tiên\"',
        'This is a stall run by students. Our goal is to offer delicious and high-quality dishes to the community. We hope everyone will visit and have a great time.',
        '/uploads/audio/tts/poi_5_en.wav'
    ),
    (
        11,
        5,
        'kr',
        'Gian hàng \"tuổi Thần Tiên\"',
        '학생 및 대학생들이 운영하는 가판대입니다. 지역 사회에 맛있고 품질 좋은 음식을 제공하는 것이 목적입니다. 많은 분들이 방문하셔서 즐거운 시간 보내시길 바랍니다.',
        '/uploads/audio/tts/poi_5_kr.wav'
    ),
    (
        12,
        5,
        'fr',
        'Gian hàng \"tuổi Thần Tiên\"',
        'C\'est le stand des élèves et des étudiants. Notre objectif est d\'offrir des plats délicieux et de qualité à la communauté. Nous espérons que tout le monde viendra nous rendre visite et passera un agréable moment.',
        '/uploads/audio/tts/poi_5_fr.wav'
    ),
    (
        13,
        6,
        'vi',
        'Gian hàng Bùi Chu',
        'Được thành lập bởi giáo xứ Bùi Chu, hướng đến người nghèo và vô gia cư. Đây là nơi mà các du khách không thể bỏ qua.',
        '/uploads/audio/tts/poi_6_vi.wav'
    ),
    (
        14,
        6,
        'en',
        'Gian hàng Bùi Chu',
        'Founded by Bui Chu parish, aimed at the poor and the homeless. This is a place that visitors cannot miss.',
        '/uploads/audio/tts/poi_6_en.wav'
    ),
    (
        15,
        6,
        'kr',
        'Gian hàng Bùi Chu',
        '부이 추 교구에 의해 설립되어 가난한 사람들과 무임승차를 돕기 위해 만들어졌습니다. 이곳은 방문객이 놓칠 수 없는 곳입니다.',
        '/uploads/audio/tts/poi_6_kr.wav'
    ),
    (
        16,
        6,
        'fr',
        'Gian hàng Bùi Chu',
        'Fondé par la paroisse Bui Chu, destiné aux pauvres et aux sans-abri. C\'est un endroit que les visiteurs ne peuvent manquer.',
        '/uploads/audio/tts/poi_6_fr.wav'
    ),
    (
        20,
        8,
        'vi',
        'Nhà ăn quân đội',
        'Nhà ăn phục vụ quân khu 7. Tọa lạc tại Đường số 13, đây là nơi cung cấp suất ăn dinh dưỡng cho các lính nghĩa vụ.',
        '/uploads/audio/tts/poi_8_vi.wav'
    ),
    (
        21,
        8,
        'en',
        'Nhà ăn quân đội',
        'The cafeteria serves the 7th military zone. Located on 13th Street, it provides nutritious meals for conscripted soldiers.',
        '/uploads/audio/tts/poi_8_en.wav'
    ),
    (
        22,
        8,
        'kr',
        'Nhà ăn quân đội',
        '군사 식당은 7 군 지역을 담당합니다. 13 번가에 위치한 이곳은 의무 병사를 위한 영양 식사를 제공합니다.',
        '/uploads/audio/tts/poi_8_kr.wav'
    ),
    (
        23,
        8,
        'fr',
        'Nhà ăn quân đội',
        'La cafétéria sert la 7e zone militaire. Située sur la 13e rue, elle fournit des repas nutritifs pour les soldats conscrits.',
        '/uploads/audio/tts/poi_8_fr.wav'
    ),
    (
        24,
        10,
        'vi',
        'Quán ăn vườn xoài',
        'Quán ăn dành cho khách du lịch với nhiều đặc sản địa phương. Là nơi dừng chân tuyệt vời cho các đoàn du lịch đường xa.',
        '/uploads/audio/tts/poi_10_vi.wav'
    ),
    (
        25,
        10,
        'en',
        'Quán ăn vườn xoài',
        'A restaurant for tourists with many local specialties. It\'s a great stop for long-distance travel groups.',
        '/uploads/audio/tts/poi_10_en.wav'
    ),
    (
        26,
        10,
        'kr',
        'Quán ăn vườn xoài',
        '관광객을 위한 음식점으로 지역 특산물이 많습니다. 장거리여행 단체들에게 좋은 중간休息처입니다.',
        '/uploads/audio/tts/poi_10_kr.wav'
    ),
    (
        27,
        10,
        'fr',
        'Quán ăn vườn xoài',
        'Un restaurant pour les touristes avec de nombreuses spécialités locales. C\'est une halte parfaite pour les groupes de voyageurs en route pour les longs trajets.',
        '/uploads/audio/tts/poi_10_fr.wav'
    ),
    (
        64,
        11,
        'vi',
        'Gian hàng \"Siêu Sao hạng A\"',
        'Được thành lập với mục đích mang đến những bữa ăn bổ dưỡng cho các em học sinh. Được tin tưởng và cấp giấy chứng nhận vệ sinh an toàn thực phẩm bởi ủy ban nhân dân xã. Mong quý khách ghé thăm và ủng hộ chúng tôi.',
        '/uploads/audio/tts/poi_11_vi.mp3'
    ),
    (
        65,
        11,
        'en',
        'Gian hàng \"Siêu Sao hạng A\"',
        'Established with the purpose of providing nutritious meals for students. Trusted and certified for food safety by the local people\'s committee. We hope you visit and support us.',
        '/uploads/audio/tts/poi_11_en.mp3'
    ),
    (
        66,
        11,
        'kr',
        'Gian hàng \"Siêu Sao hạng A\"',
        ' 학생들에게 영양 있는 식사를 제공하는 것을 목적으로 설립되었습니다. 지방 의회에서 식품 위생 안전을 신뢰하고 인증했습니다. 저희를 방문하셔서 지지해 주시기 바랍니다.',
        '/uploads/audio/tts/poi_11_kr.mp3'
    ),
    (
        67,
        11,
        'fr',
        'Gian hàng \"Siêu Sao hạng A\"',
        'Créé dans le but d\'offrir des repas équilibrés aux élèves. Fait confiance et certifié en matière de sécurité alimentaire par le comité populaire local. Nous espérons que vous nous rendrez visite et nous soutiendrez.',
        '/uploads/audio/tts/poi_11_fr.mp3'
    ),
    (
        68,
        12,
        'vi',
        'Quán \"Bánh canh cua 14\"',
        'Tọa lạc tại đường Trần Bình Trọng, nơi đây mang đến cho bạn món bánh canh truyền thống mang đậm bản chất địa phương. Với mong muốn phục vụ cộng đồng một cách hết mình, hy vọng quý du khách ghé thăm và ủng hộ chúng tôi',
        '/uploads/audio/tts/poi_12_vi.wav'
    ),
    (
        69,
        12,
        'en',
        'Quán \"Bánh canh cua 14\"',
        'Located on Trần Bình Trọng Street, this place offers you traditional bánh canh, boasting a rich local flavor. With a strong desire to serve the community, we hope all visitors will come and support us.',
        '/uploads/audio/tts/poi_12_en.wav'
    ),
    (
        70,
        12,
        'kr',
        'Quán \"Bánh canh cua 14\"',
        '쩐빈쫑 거리에 위치한 이곳은 현지 본연의 맛을 물씬 풍기는 전통 반깐(bánh canh)을 여러분께 선사합니다. 지역 사회에 최선을 다해 봉사하고자 하는 마음으로, 귀한 방문객 여러분께서 찾아와 저희를 지지해 주시기를 바랍니다.',
        '/uploads/audio/tts/poi_12_kr.wav'
    ),
    (
        71,
        12,
        'fr',
        'Quán \"Bánh canh cua 14\"',
        'Situé sur la rue Trần Bình Trọng, cet endroit vous propose du bánh canh traditionnel, avec une saveur locale prononcée. Animés par le désir de servir la communauté de tout cœur, nous espérons que chers visiteurs viendront nous rendre visite et nous soutenir.',
        '/uploads/audio/tts/poi_12_fr.wav'
    ),
    (
        72,
        13,
        'vi',
        'Gian hàng \"Circle K\"',
        'Là một trong các thương hiệu nổi tiếng trên toàn quốc, nơi đây cung cấp nhiều thực phẩm, nước uống từ các thương hiệu chất lương.',
        '/uploads/audio/tts/poi_13_vi.wav'
    ),
    (
        73,
        13,
        'en',
        'Gian hàng \"Circle K\"',
        'As one of the most famous brands nationwide, this place offers a wide range of food and beverages from quality brands.',
        '/uploads/audio/tts/poi_13_en.wav'
    ),
    (
        74,
        13,
        'kr',
        'Gian hàng \"Circle K\"',
        '전국적으로 유명한 브랜드 중 하나로, 이곳은 고품질 브랜드의 다양한 음식과 음료를 제공합니다.',
        '/uploads/audio/tts/poi_13_kr.wav'
    ),
    (
        75,
        13,
        'fr',
        'Gian hàng \"Circle K\"',
        'En tant que l\'une des marques les plus célèbres du pays, cet endroit propose une large gamme d\'aliments et de boissons provenant de marques de qualité.',
        '/uploads/audio/tts/poi_13_fr.wav'
    );
INSERT INTO `poi_position` (
        `id`,
        `poi_id`,
        `latitude`,
        `longitude`,
        `audio_range`,
        `access_range`
    )
VALUES (
        1,
        5,
        10.967531003730855,
        106.95909809682807,
        1000,
        400
    ),
    (2, 6, 10.7589, 106.7076, 30, 10),
    (
        4,
        8,
        10.95229549551936,
        106.90852793678913,
        35,
        15
    ),
    (
        5,
        10,
        10.919092085336755,
        106.93341564701987,
        30,
        10
    ),
    (
        6,
        11,
        10.965703488592458,
        106.95720499229515,
        600,
        400
    ),
    (
        7,
        12,
        10.759337272107487,
        106.6802453859649,
        250,
        100
    ),
    (
        8,
        13,
        10.760308572245501,
        106.6808782964129,
        200,
        100
    );
INSERT INTO subscription_packages (
        id,
        name,
        price,
        duration_hours,
        is_Active,
        poi_create_limit,
        is_default,
        is_protected
    )
VALUES -- FREE VENDOR
    (
        1,
        'FREE - Vendor',
        0.00,
        999999,
        1,
        1,
        TRUE,
        TRUE
    ),
    -- BASIC VENDOR
    (
        2,
        'Basic Vendor',
        10000.00,
        24,
        1,
        3,
        FALSE,
        FALSE
    ),
    -- PRO VENDOR
    (
        3,
        'Pro Vendor',
        50000.00,
        720,
        1,
        10,
        FALSE,
        FALSE
    );
INSERT INTO vendor_subscriptions (
        user_id,
        start_time,
        end_time,
        payment_id
    )
VALUES (
        2,
        NOW(),
        DATE_ADD(NOW(), INTERVAL 999999 HOUR),
        NULL
    ),
    (
        3,
        NOW(),
        DATE_ADD(NOW(), INTERVAL 999999 HOUR),
        NULL
    );