Hiện tại hệ thống POI đang chuyển từ cơ chế cũ:

- lưu audio mp3/audio_url cho từng language
- backend quản lý translation tự động
- generate nhiều language ngay khi tạo POI

sang cơ chế mới:

- Vietnamese (vi) là source narration chính thức duy nhất
- Vendor tự quản lý nội dung narration đa ngôn ngữ
- Translation API chỉ dùng để suggest/draft nội dung
- Vendor có thể chỉnh sửa translation trước khi lưu
- Audio sẽ không còn lưu mp3/audio_url trong database
- Frontend/mobile sẽ dùng runtime Text-To-Speech (TTS) theo language tourist chọn

Cần refactor lại toàn bộ flow POI localization để phù hợp hoàn toàn với cơ chế mới và loại bỏ toàn bộ logic cũ còn sót lại có thể gây conflict.

==================================================
MỤC TIÊU KIẾN TRÚC MỚI
======================

1. VI là source narration chính thức

- Chỉ có nội dung tiếng Việt là “source truth”
- Mọi language khác đều được xem là localized translation
- Translation khác có thể bị invalid khi VI thay đổi

2. Translation flow mới
   Vendor workflow:

VI source
→ translate suggestion API
→ vendor chỉnh sửa translation
→ vendor confirm save
→ backend lưu localized text

Backend KHÔNG:

- auto translate khi create/update
- auto generate nhiều language
- auto tạo audio mp3

3. Runtime audio
   Frontend/mobile sẽ:

- lấy text theo language hiện tại
- dùng TTS runtime để phát audio

Backend không còn quản lý:

- audio_url
- mp3 cache
- audio generation pipeline

==================================================
CÁC VẤN ĐỀ CẦN GIẢI QUYẾT
=========================

==================================================

1. # localized_data hiện tại gần như không hoạt động

Hiện tại createPOI chỉ lưu duy nhất VI:

localized_items = [{"lang_code": "vi", ...}]

→ localized_data frontend gửi lên đang bị ignore hoàn toàn.

Cần sửa:

- createPOI phải thực sự hỗ trợ lưu localized_data
- updatePOI cũng phải hỗ trợ update localized_data
- localized_data là các translation đã được vendor confirm

Rules:

- Không được duplicate lang_code
- Không được cho phép localized_data chứa "vi"
- "vi" luôn được quản lý riêng bằng localized
- Các language khác nằm trong localized_data

================================================== 2. updatePOI đang có bug Optional fields
========================================

Hiện tại updatePOI assume:

- data.position luôn tồn tại

nên nếu frontend chỉ update:

- thumbnail
- banner
- localized text

thì backend có thể crash:
'NoneType' object has no attribute ...

Cần:

- tất cả field optional phải được check trước khi update
- chỉ update phần nào thực sự được gửi lên

================================================== 3. Translation invalidation logic chưa đúng
===========================================

Hiện tại chỉ check:
description changed

Nhưng nếu:

- vendor đổi name
- description giữ nguyên

thì translation cũ vẫn tồn tại → sai logic.

Cần:

- invalidate translation nếu:
  - name thay đổi
    OR
  - description thay đổi

Khi invalid

- xóa toàn bộ non-VI localized_data
- giữ lại VI source

================================================== 4. Tourist language fallback đang thiếu
=======================================

Hiện tại:

- nếu tourist chọn EN
- nhưng POI chưa có EN

thì query trả:

- NULL name
- NULL description

Điều này có thể làm:

- UI crash
- text rỗng
- TTS fail

Cần:
fallback logic:

requested language
→ fallback vi

Áp dụng cho:

- getPois
- getPOIById
- getMapData
- get_nearby_pois
- mọi API trả localized content

================================================== 5. audio_url đã trở thành legacy field
======================================

Cơ chế mới không còn:

- mp3 storage
- audio_url persistence

Nhưng hiện tại backend vẫn:

- select ld.audio_url
- return audio_url ra API response

Điều này sẽ:

- khiến frontend cũ tiếp tục phụ thuộc audio_url
- giữ lại dead code cũ
- gây confusion về kiến trúc

Cần:

- remove toàn bộ dependency audio_url khỏi:
  - SQL query
  - response payload
  - DTO/schema
  - business logic

Không được để logic cũ sót lại.

================================================== 6. Language code "kr" không chuẩn
=================================

Hiện tại dùng:
kr

Nhưng chuẩn ISO:
ko

Cần migrate toàn bộ:

- kr → ko

bao gồm:

- LANGUAGE_PROMPTS
- frontend expectation
- translation flow
- localization records
- TTS mapping

================================================== 7. Translation API chỉ là suggestion API
========================================

translate_single_language hiện tại đúng hướng nhưng cần đảm bảo:

API này:

- KHÔNG tự save DB
- KHÔNG auto overwrite localized_data
- chỉ trả draft translation

Frontend/vendor:

- review
- edit
- confirm save

sau đó mới gọi create/update POI.

================================================== 8. Cleanup toàn bộ cơ chế cũ
============================

Cần chủ động đọc codebase để remove:

- logic auto translation cũ
- audio pipeline cũ
- audio_url dependency
- assumptions về mp3 storage
- assumptions backend-managed localization

Mục tiêu:
kiến trúc localization phải sạch hoàn toàn theo cơ chế mới.

==================================================
KIẾN TRÚC CUỐI CÙNG MONG MUỐN
=============================

Database:

- lưu text narration
- không lưu generated audio

Flow tourist:
language selected
→ backend trả localized text
→ frontend runtime TTS

Flow vendor:
VI source
→ translate suggestion
→ vendor edit
→ confirm
→ save localized text

Flow update:
VI changed
→ invalidate all non-VI translations
→ vendor generate lại translations mới

==================================================
YÊU CẦU IMPLEMENT
=================

- Tự đọc và phân tích codebase hiện tại
- Chủ động refactor flow localization
- Không giữ lại dead logic cũ
- Ưu tiên consistency giữa:
  - router
  - schema
  - services
  - database interaction

- Không implement kiểu vá tạm
- Refactor theo đúng kiến trúc mới end-to-end
