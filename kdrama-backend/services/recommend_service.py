import json
import traceback  # Dùng để in chi tiết dòng bị lỗi (Traceback)
from sqlalchemy import text

def parse_weights(weight_field):
    """Hàm helper ép kiểu an toàn đề phòng Postgres trả về dạng chuỗi '{}' thay vì dict"""
    if not weight_field:
        return {}
    if isinstance(weight_field, str):
        try:
            return json.loads(weight_field)
        except Exception:
            return {}
    return weight_field


def get_recommendations_for_user(user_id, engine, top_n=10):
    """Tính toán và gợi ý phim dựa trên trọng số bằng câu lệnh SQL tối ưu"""
    print(f"\n[RECOMMENDATION] Bắt đầu xử lý gợi ý cho User ID: {user_id} (Top N: {top_n})")
    try:
        with engine.connect() as connection:
            # 1. Lấy profile trọng số của người dùng
            profile_query = text("""
                SELECT genre_weights, actor_weights, tag_weights 
                FROM user_data.user_profiles WHERE user_id = :user_id
            """)
            profile = connection.execute(profile_query, {"user_id": user_id}).mappings().first()
            
            genre_w, actor_w, tag_w = {}, {}, {}
            is_new_user = False
            
            if not profile:
                print(f"[RECOMMENDATION] Không tìm thấy hồ sơ hệ thống. Xác định: USER MỚI.")
                is_new_user = True
            else:
                genre_w = parse_weights(profile['genre_weights'])
                actor_w = parse_weights(profile['actor_weights'])
                tag_w = parse_weights(profile['tag_weights'])
                if not genre_w and not actor_w and not tag_w:
                    print(f"[RECOMMENDATION] Hồ sơ trống rỗng (Weights rỗng). Xác định: USER MỚI.")
                    is_new_user = True
            
            # Khởi tạo biến chứa kết quả thô thống nhất từ DB
            raw_result = []
            
            # 2. Trường hợp User mới: Trả về phim Hot
            if is_new_user:
                print(f"[RECOMMENDATION] Tiến hành tính Điểm Xu Hướng tổng hợp (3 cột mục tiêu) cho User mới.")
                fallback_query = text("""
                    SELECT drama_id, title, genres, main_lead1, main_lead2, rating, popularity, 
                           watchers, start_year, episodes, content, directors, image_url,
                           0.0 as match_score
                    FROM public.dramas 
                    ORDER BY 
                        -- 🌟 CÔNG THỨC CÁCH 2: Tính Điểm Xu Hướng tổng hợp
                        -- Điểm = (watchers * rating) / (popularity + 1)
                        -- Phim có watchers lớn, rating cao và hạng popularity nhỏ (tức là rất nổi tiếng) sẽ có điểm cao nhất.
                        -- Dùng COALESCE và ép kiểu thực (::float) để tính toán chính xác tuyệt đối.
                        (COALESCE(watchers, 0)::float * COALESCE(rating, 0.0)::float) / (COALESCE(popularity, 0)::float + 1.0) DESC,
                        -- Nếu trùng Điểm Xu Hướng, phim nào rating cao hơn sẽ đứng trước
                        rating DESC,
                        -- Nếu vẫn trùng, phim nhiều người xem hơn đứng trước
                        watchers DESC
                    LIMIT :limit
                """)
                raw_result = connection.execute(fallback_query, {"limit": top_n}).mappings().all()
                print(f"[RECOMMENDATION] Đã áp dụng thuật toán Cách 2 thành công. Lấy ra {len(raw_result)} phim quốc dân/bom tấn nhất.")
                # fallback_query = text("""
                #     SELECT drama_id, title, genres, main_lead1, main_lead2, rating, popularity, 
                #            watchers, start_year, episodes, content, directors,
                #            0.0 as match_score
                #     FROM public.dramas 
                #     ORDER BY 
                #         rating DESC, 
                #         popularity ASC, 
                #         -- Vì watchers đã là INT trong DB, ta chỉ việc ORDER BY trực tiếp không cần hàm gì cả!
                #         watchers DESC
                #     LIMIT :limit
                # """)
                # raw_result = connection.execute(fallback_query, {"limit": top_n}).mappings().all()
                # print(f"[RECOMMENDATION] Đã lấy thành công {len(raw_result)} phim Hot/Xu hướng cho User mới.")

            # 3. Trường hợp User cũ: Tính điểm trực tiếp bằng SQL
            else:
                print(f"[RECOMMENDATION] Tìm thấy hồ sơ tương tác. Xác định: USER CŨ.")
                genre_keys = list(genre_w.keys()) if genre_w else []
                genre_vals = [float(v) for v in genre_w.values()] if genre_w else []
                
                actor_keys = list(actor_w.keys()) if actor_w else []
                actor_vals = [float(v) for v in actor_w.values()] if actor_w else []
                
                tag_keys = list(tag_w.keys()) if tag_w else []
                tag_vals = [float(v) for v in tag_w.values()] if tag_w else []

                recommend_query = text("""
                    WITH scored_dramas AS (
                        SELECT 
                            drama_id, title, genres, main_lead1, main_lead2, tags, rating, 
                            start_year, episodes, watchers, content, directors, image_url,
                            -- TÍNH ĐIỂM THỂ LOẠI
                            (SELECT COALESCE(SUM(val), 0.0)
                             FROM unnest(CAST(:genre_keys AS text[]), CAST(:genre_vals AS float[])) AS w(key, val)
                             WHERE w.key = ANY(string_to_array(genres, ', '))) AS genre_score,
                            
                            -- TÍNH ĐIỂM DIỄN VIÊN
                            COALESCE((SELECT val FROM unnest(CAST(:actor_keys AS text[]), CAST(:actor_vals AS float[])) AS w(key, val) WHERE w.key = TRIM(main_lead1)), 0.0) +
COALESCE((SELECT val FROM unnest(CAST(:actor_keys AS text[]), CAST(:actor_vals AS float[])) AS w(key, val) WHERE w.key = TRIM(main_lead2)), 0.0) AS actor_score,
                                       
                            -- TÍNH ĐIỂM TAGS
                            (SELECT COALESCE(SUM(val), 0.0)
                             FROM unnest(CAST(:tag_keys AS text[]), CAST(:tag_vals AS float[])) AS w(key, val)
                             WHERE w.key = ANY(string_to_array(tags, ', '))) AS tag_score
                        FROM public.dramas
                    )
                    SELECT 
                        drama_id, title, genres, main_lead1, main_lead2, rating, 
                        start_year, episodes, watchers, content, directors, image_url,
                        ROUND(CAST(genre_score + actor_score + tag_score AS numeric), 2) AS match_score
                    FROM scored_dramas
                    ORDER BY match_score DESC, rating DESC
                    LIMIT :limit
                """)
                
                params = {
                    "genre_keys": genre_keys, "genre_vals": genre_vals,
                    "actor_keys": actor_keys, "actor_vals": actor_vals,
                    "tag_keys": tag_keys, "tag_vals": tag_vals,
                    "limit": top_n
                }
                
                # 🔥 ĐÃ SỬA: Gán chính xác vào biến thống nhất raw_result (thay vì biến result cũ)
                raw_result = connection.execute(recommend_query, params).mappings().all()
                print(f"[RECOMMENDATION] Đã tính toán điểm sở thích SQL thành công. Tổng số phim gợi ý thô: {len(raw_result)}")
            
            # 4. Khối làm sạch dữ liệu output trước khi gửi về Client
            recommendation_list = []
            for row in raw_result:
                drama_dict = dict(row)
                raw_watchers = drama_dict["watchers"]
                clean_watchers_int = 0
                
                if raw_watchers is not None:
                    if isinstance(raw_watchers, (int, float)):
                        clean_watchers_int = int(raw_watchers)
                    else:
                        try:
                            clean_watchers_int = int(str(raw_watchers).replace(',', '').strip())
                        except ValueError:
                            clean_watchers_int = 0
                            
                # Định dạng cấu trúc chuỗi chứa dấu phẩy ngăn cách hàng nghìn theo đúng yêu cầu Frontend
                drama_dict["watchers"] = f"{clean_watchers_int:,}"
                drama_dict["match_score"] = float(drama_dict["match_score"]) if drama_dict.get("match_score") is not None else 0.0
                recommendation_list.append(drama_dict)
                
            print(f"[RECOMMENDATION] Hoàn tất chuẩn hóa dữ liệu. Sẵn sàng phản hồi cho Client.")
            return recommendation_list
            
    except Exception as e:
        print(f"[ERROR] Lỗi nghiêm trọng xảy ra tại hàm get_recommendations_for_user:")
        traceback.print_exc()  # In chi tiết log lỗi hệ thống kèm số dòng chính xác
        return None
    

def update_user_profile(user_id, drama_id, action_type, rating_val, engine):
    """Cập nhật tăng/giảm trọng số điểm khi có tương tác (Favorite, Comment, Rating)"""
    print(f"\n[PROFILE-UPDATE] Nhận yêu cầu cập nhật hồ sơ. User: {user_id}, Drama: {drama_id}, Hành động: '{action_type}', Rating: {rating_val}")
    try:
        with engine.begin() as connection:  # Tự động commit/rollback khi kết thúc transaction
            # 1. Lấy thông tin thuộc tính của phim
            drama_query = text("SELECT title, genres, main_lead1, main_lead2, tags FROM public.dramas WHERE drama_id = :drama_id")
            drama = connection.execute(drama_query, {"drama_id": drama_id}).mappings().first()
            if not drama:
                print(f"[PROFILE-UPDATE] [CẢNH BÁO] Không tìm thấy phim với ID {drama_id} trong cơ sở dữ liệu.")
                return False
                
            # Đặt mức điểm cộng dựa theo hành động tương tác
            weight_to_add = 5.0 if action_type == 'favorite' else 2.0
            if rating_val is not None:
                # Nếu người dùng đánh giá thấp (1, 2 sao), biến điểm cộng thành điểm trừ để hạ độ ưu tiên
                weight_to_add = float(rating_val) if rating_val >= 3 else (float(rating_val) - 3.0)

            print(f"[PROFILE-UPDATE] Phim tương tác: '{drama['title']}'. Tính toán trọng số cộng dồn: {weight_to_add}")

            # 2. Lấy profile hiện tại của người dùng
            profile_query = text("SELECT genre_weights, actor_weights, tag_weights FROM user_data.user_profiles WHERE user_id = :user_id")
            profile = connection.execute(profile_query, {"user_id": user_id}).mappings().first()
            
            # Khởi tạo hoặc parse an toàn bằng hàm helper
            if profile:
                genre_w = parse_weights(profile['genre_weights'])
                actor_w = parse_weights(profile['actor_weights'])
                tag_w = parse_weights(profile['tag_weights'])
            else:
                print(f"[PROFILE-UPDATE] Người dùng chưa từng khởi tạo hồ sơ sở thích. Tiến hành tạo mới hoàn toàn.")
                genre_w, actor_w, tag_w = {}, {}, {}

            # 3. Tính toán cộng dồn điểm mới (Có giới hạn giữ mức sàn tối thiểu là 0.0)
            if drama['genres']:
                genres_list = [g.strip() for g in drama['genres'].split(',')]
                for g in genres_list:
                    genre_w[g] = round(max(0.0, genre_w.get(g, 0.0) + weight_to_add), 2)
            
            # Cộng điểm cho Diễn viên chính 1
            if drama['main_lead1']:
                a1 = drama['main_lead1'].strip()
                actor_w[a1] = round(max(0.0, actor_w.get(a1, 0.0) + weight_to_add), 2)

            # Cộng điểm cho Diễn viên chính 2
            if drama['main_lead2']:
                a2 = drama['main_lead2'].strip()
                actor_w[a2] = round(max(0.0, actor_w.get(a2, 0.0) + weight_to_add), 2)
                
            if drama['tags']:
                tags_list = [t.strip() for t in drama['tags'].split(',')]
                for t in tags_list:
                    tag_w[t] = round(max(0.0, tag_w.get(t, 0.0) + weight_to_add), 2)

            # 4. Ghi ngược lại vào bảng user_profiles (UPSERT)
            upsert_query = text("""
                INSERT INTO user_data.user_profiles (user_id, genre_weights, actor_weights, tag_weights, updated_at)
                VALUES (:user_id, :genre_w, :actor_w, :tag_w, NOW())
                ON CONFLICT (user_id) DO UPDATE 
                SET genre_weights = EXCLUDED.genre_weights,
                    actor_weights = EXCLUDED.actor_weights,
                    tag_weights = EXCLUDED.tag_weights,
                    updated_at = NOW();
            """)
            connection.execute(upsert_query, {
                "user_id": user_id,
                "genre_w": json.dumps(genre_w),
                "actor_w": json.dumps(actor_w),
                "tag_w": json.dumps(tag_w)
            })
            print(f"[PROFILE-UPDATE] Thành công: Đã UPSERT lưu dữ liệu trọng số mới của User {user_id} vào Database.")
            return True
            
    except Exception as e:
        print(f"[ERROR] Lỗi nghiêm trọng xảy ra tại hàm update_user_profile:")
        traceback.print_exc()  # In chi tiết log lỗi kèm số dòng chính xác
        return False