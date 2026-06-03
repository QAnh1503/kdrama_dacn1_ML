# services/recommend_service.py
import json
import pandas as pd
from sqlalchemy import text

def get_recommendations_for_user(user_id, engine, top_n=10):
    """Tính toán và gợi ý phim dựa trên trọng số trong user_profiles"""
    try:
        with engine.connect() as connection:
            # Ép kiểu an toàn đề phòng Postgres trả về dạng chuỗi '{}' thay vì dict
            def parse_weights(weight_field):
                if not weight_field:
                    return {}
                if isinstance(weight_field, str):
                    try:
                        return json.loads(weight_field)
                    except:
                        return {}
                return weight_field
            
            # 1. Lấy profile trọng số của người dùng
            profile_query = text("""
                SELECT genre_weights, actor_weights, tag_weights 
                FROM user_data.user_profiles WHERE user_id = :user_id
            """)
            profile = connection.execute(profile_query, {"user_id": user_id}).mappings().first()
            
            # Khởi tạo ma trận trọng số rỗng
            genre_w, actor_w, tag_w = {}, {}, {}
            # Kiểm tra xem có phải user mới tinh hoặc chưa có gu sở thích không
            is_new_user = False
            if not profile:
                is_new_user = True
            else:
                genre_w = parse_weights(profile['genre_weights'])
                actor_w = parse_weights(profile['actor_weights'])
                tag_w = parse_weights(profile['tag_weights'])
                
                # Nếu tất cả các ma trận sở thích đều trống rỗng, xác định là User mới
                if not genre_w and not actor_w and not tag_w:
                    is_new_user = True
                
            # 2. Nếu chưa có profile (User mới), trả về top phim "Hot" nhất dựa trên cả 3 cột mục tiêu
            # if not profile:
                # SỬ SỬA TẠI ĐÂY: CAST thẳng watchers thành INTEGER trong SQL để đồng bộ kiểu số nguyên sạch
                # fallback_query = text("""
                #     SELECT drama_id, title, genres, main_lead1, main_lead2, rating, popularity, 
                #            CASE 
                #                WHEN watchers ~ '^[0-9, ]+$' THEN CAST(REPLACE(watchers, ',', '') AS INT)
                #                ELSE 0 
                #            END as watchers, 
                #            start_year, episodes, content, directors
                #     FROM public.dramas 
                #     ORDER BY 
                #         rating DESC, 
                #         popularity ASC, 
                #         watchers DESC
                #     LIMIT :limit
                # """)
            if is_new_user:
                fallback_query = text("""
                    SELECT drama_id, title, genres, main_lead1, main_lead2, rating, popularity, 
                           watchers, start_year, episodes, content, directors
                    FROM public.dramas 
                    ORDER BY 
                        rating DESC, 
                        popularity ASC, 
                        watchers DESC
                    LIMIT :limit
                """)
                result = connection.execute(fallback_query, {"limit": top_n}).mappings().all()
                return [dict(row) for row in result]
            
            # Đọc ma trận trọng số sở thích của người dùng (nếu có)
            # genre_w = profile['genre_weights'] or {}
            # actor_w = profile['actor_weights'] or {}
            # tag_w = profile['tag_weights'] or {}
            # 3. Lấy lại trọng số chuẩn đã parse để tính điểm cho User cũ
            
            # genre_w = parse_weights(profile['genre_weights'])
            # actor_w = parse_weights(profile['actor_weights'])
            # tag_w = parse_weights(profile['tag_weights'])
            
            # 3. Lấy tất cả phim trong kho ra để tính điểm hợp gu
            # (Để tối ưu, thực tế chỉ cần lấy drama_id và các trường thuộc tính)
            dramas_query = text("SELECT drama_id, title, genres, main_lead1, main_lead2, tags, rating, start_year, episodes, watchers, content, directors FROM public.dramas")
            all_dramas = connection.execute(dramas_query).mappings().all()
            
            recommendation_list = []
            for drama in all_dramas:
                score = 0.0
                # Cộng điểm theo Thể loại (Mảng TEXT[] từ Postgres tự động chuyển thành List trong Python) (Bảng lưu string, ví dụ: 'Romance, Comedy')
                if drama['genres']:
                    genres_list = [g.strip() for g in drama['genres'].split(',')]
                    for g in genres_list:
                        score += genre_w.get(g, 0.0)
                
                # Cộng điểm theo Diễn viên chính 1 (Nữ)
                if drama['main_lead1']:
                    actor_1 = drama['main_lead1'].strip()
                    score += actor_w.get(actor_1, 0.0)
                    
                # Cộng điểm theo Diễn viên chính 2 (Nam)
                if drama['main_lead2']:
                    actor_2 = drama['main_lead2'].strip()
                    score += actor_w.get(actor_2, 0.0)
                
                # Cộng điểm theo Tags/Mô-típ (Bảng lưu string, ví dụ: 'Office Romance, First Love')
                if drama['tags']:
                    tags_list = [t.strip() for t in drama['tags'].split(',')]
                    for t in tags_list:
                        score += tag_w.get(t, 0.0)
                        
              

                # Xử lý làm sạch watchers an toàn từ Python trước khi ném về Frontend
                raw_watchers = drama["watchers"]
                clean_watchers_int = 0
                if raw_watchers is not None:
                    if isinstance(raw_watchers, (int, float)):
                        clean_watchers_int = int(raw_watchers)
                    else:
                        try:
                            clean_watchers_int = int(str(raw_watchers).replace(',', '').strip())
                        except ValueError:
                            clean_watchers_int = 0

                recommendation_list.append({
                    "drama_id": drama["drama_id"],
                    "title": drama["title"],
                    "genres": drama["genres"],
                    "main_lead1": drama["main_lead1"],
                    "main_lead2": drama["main_lead2"],
                    "rating": drama["rating"],
                    "start_year": drama["start_year"],
                    "episodes": drama["episodes"],
                    "watchers": str(clean_watchers_int), # <--- BÂY GIỜ LÀ KIỂU SỐ NGUYÊN XỊN CHUẨN 100%
                    "content": drama["content"],
                    "directors": drama["directors"],
                    "match_score": round(score, 2)
                })
                
            # Sắp xếp theo điểm số giảm dần và lấy Top N phim hợp gu nhất
            recommendation_list = sorted(recommendation_list, key=lambda x: x['match_score'], reverse=True)
            return recommendation_list[:top_n]
            
    except Exception as e:
        print(f"Recommendation Error: {e}")
        return None

def update_user_profile(user_id, drama_id, action_type, rating_val, engine):
    """Cập nhật tăng/giảm trọng số điểm khi có tương tác (Favorite, Comment, Rating)"""
    try:
        with engine.begin() as connection:  # Dùng engine.begin() để tự động commit/rollback (Transaction)
            # 1. Lấy thông tin thuộc tính của phim
            drama_query = text("SELECT genres, main_lead1, main_lead2, tags FROM public.dramas WHERE drama_id = :drama_id")
            drama = connection.execute(drama_query, {"drama_id": drama_id}).mappings().first()
            if not drama:
                return False
                
            # Đặt mức điểm cộng dựa theo hành động
            weight_to_add = 5.0 if action_type == 'favorite' else 2.0
            if rating_val is not None:
                # Nếu người dùng đánh giá thấp (1, 2 sao), biến điểm cộng thành điểm trừ để hạ độ ưu tiên
                weight_to_add = float(rating_val) if rating_val >= 3 else (float(rating_val) - 3.0)

            # 2. Lấy profile hiện tại của người dùng
            profile_query = text("SELECT genre_weights, actor_weights, tag_weights FROM user_data.user_profiles WHERE user_id = :user_id")
            profile = connection.execute(profile_query, {"user_id": user_id}).mappings().first()
            
            genre_w = profile['genre_weights'] if profile else {}
            actor_w = profile['actor_weights'] if profile else {}
            tag_w = profile['tag_weights'] if profile else {}
            
        

            # 3. Tính toán cộng dồn điểm mới (Có xử lý cắt tách chuỗi bằng dấu phẩy)
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
            return True
    except Exception as e:
        print(f"Profile Update Error: {e}")
        return False