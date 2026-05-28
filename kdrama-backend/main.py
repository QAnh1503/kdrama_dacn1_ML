import joblib
from sqlalchemy import create_engine, text
import pandas as pd
import numpy as np
import json
import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional  

from services.stats_service import get_db_stats # Import hàm từ file mới
from services.recommend_service import get_recommendations_for_user, update_user_profile # Import 2 hàm xử lý hệ thống khuyến nghị
import traceback

# Cấu hình kết nối Postgres
DATABASE_URL = "postgresql://postgres:123456@localhost:5432/kdrama"
engine = create_engine(DATABASE_URL)

def get_db_connection():
    return psycopg2.connect(
        host="localhost", 
        database="kdrama", 
        user="postgres", 
        password="123456"
    )

app = FastAPI()

# Cấu hình CORS để Next.js gọi được API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ĐỊNH NGHĨA CÁC HÀM TIỀN XỬ LÝ NLP ---
def my_tokenizer(text):
    return text.split()

def clean_tags(text):
    return str(text).replace('(Vote tags)', '').replace(',', ' ')

# --- LOAD CÁC FILE .PKL -
# models_dict = joblib.load('models/models_ridge.pkl')
models_dict = joblib.load('models/models_all.pkl')
mlb = joblib.load('models/mlb_genres.pkl')
tfidf_tag = joblib.load('models/tfidf_tag.pkl')
tfidf_content = joblib.load('models/tfidf_content.pkl')
encoding_maps = joblib.load('models/encoding_maps.pkl')
feature_lists = joblib.load('models/feature_lists.pkl')  # Load danh sách cột để AI không bị "lẫn lộn"
print("--- [STARTUP] Đã tải thành công bộ ba mô hình so sánh từ models_all.pkl lên RAM! ---\n")

# --- TỰ ĐỘNG LOAD GLOBAL MEAN CHUẨN TỪ DATABASE ---
system_configs = {}
try:
    with engine.connect() as connection:
        config_df = pd.read_sql_query("SELECT config_key, config_value FROM scoring_data.system_config", connection)
        # Chuyển thành dictionary dạng: {'global_rating_mean': 7.434, 'global_watchers_log_mean': 7.957, ...}
        system_configs = dict(zip(config_df['config_key'], config_df['config_value']))
    print(f"--- [STARTUP] Đã tải cấu hình hệ thống từ DB thành công! Target rating mean: {system_configs.get('global_rating_mean')}\n")
except Exception as e:
    print(f"⚠️ [STARTUP WARNING] Không thể load system_config từ DB, sử dụng cấu hình dự phòng. Lỗi: {e}")
    # Cấu hình dự phòng nếu DB có sự cố
    system_configs = {
        "global_rating_mean": 7.43444,
        "global_watchers_log_mean": 7.95704
    }

# Các mốc Popularity (Bạn có thể lấy từ kết quả print ở Colab rồi điền số cứng vào đây)
# THRESHOLD_HOT = 500  # Ví dụ: Hạng dưới 500 là HOT
# THRESHOLD_MEDIUM = 1500

# --- ĐỊNH NGHĨA SCHEMA DỮ LIỆU NHẬN TỪ REACT ---
class MovieInput(BaseModel):
    title: str
    main_lead1: str
    main_lead2: str
    directors: str
    screenwriters: str
    genres: str
    tags: str
    content: str
    episodes: int
    duration_mins: int
    start_year: int
    start_month: int
    age_rating: str

# --- NEW ---
# Schema mới: Nhận dữ liệu từ Form đăng ký (Onboarding)
class OnboardingInput(BaseModel):
    user_id: int
    fav_genres: List[str]
    fav_actors: List[str]
    fav_tags: List[str]

# Schema mới: Nhận dữ liệu khi user nhấn nút Yêu thích phim
class FavoriteInput(BaseModel):
    user_id: int
    drama_id: int

# Schema mới: Nhận dữ liệu khi user đánh giá và bình luận phim
class CommentInput(BaseModel):
    user_id: int
    drama_id: int
    rating: int  # Số sao người dùng chấm (1 -> 5)
    content: str # Nội dung bằng chữ


# -------------- 5. CÁC API ENDPOINTS --------------

# -------- TẠO API LẤY DANH SÁCH metadata GỢI Ý Ở TRANG PAGE.TSX (AUTOCOMPLETE) --------
@app.get("/metadata")
def get_metadata():
    try:
        # Sử dụng engine.connect() của SQLAlchemy để ổn định hơn với Pandas
        with engine.connect() as connection:
            # LƯU Ý: Kiểm tra lại tên cột trong PgAdmin (actor hay main_lead?)
            # Dựa vào test_db.py, ta sẽ lấy đúng các bảng trong schema scoring_data
            # actors_df = pd.read_sql_query("SELECT DISTINCT actor FROM scoring_data.actor_scores", connection)
            # directors_df = pd.read_sql_query("SELECT DISTINCT directors FROM scoring_data.director_scores", connection)
            # writers_df = pd.read_sql_query("SELECT DISTINCT screenwriters FROM scoring_data.writer_scores", connection)
            actors_df = pd.read_sql_query("SELECT DISTINCT name FROM scoring_data.actor_scores", connection)
            directors_df = pd.read_sql_query("SELECT DISTINCT name FROM scoring_data.director_scores", connection)
            writers_df = pd.read_sql_query("SELECT DISTINCT name FROM scoring_data.writer_scores", connection)

        # In ra terminal để bạn kiểm tra xem có lấy được dữ liệu không
        print(f"Loaded {len(actors_df)} actors, {len(directors_df)} directors")

        print(f"[METADATA] Đã load {len(actors_df)} diễn viên, {len(directors_df)} đạo diễn từ DB.")
        # return {
        #     "actors": actors_df['actor'].dropna().tolist(),
        #     "directors": directors_df['directors'].dropna().tolist(),
        #     "screenwriters": writers_df['screenwriters'].dropna().tolist()
        # }
        return {
            "actors": actors_df['name'].dropna().tolist(),
            "directors": directors_df['name'].dropna().tolist(),
            "screenwriters": writers_df['name'].dropna().tolist()
        }
    except Exception as e:
        print(f"Metadata Error: {e}")
        return {"error": str(e), "actors": [], "directors": [], "screenwriters": []}


# -------- TẠO API LOGIC DỰ ĐOÁN & SO SÁNH 3 MÔ HÌNH --------
# @app.post("/predict")
# async def predict_kdrama(data: MovieInput):
#     # 1. Chuyển input về DataFrame & Feature Engineering sinh các cột số, thời gian
#     # input_df = pd.DataFrame([data.dict()])
#     input_df = pd.DataFrame([data.model_dump()])
#     input_df['movie_age'] = 2026 - data.start_year
#     input_df['start_month_sin'] = np.sin(2 * np.pi * data.start_month / 12)
#     input_df['start_month_cos'] = np.cos(2 * np.pi * data.start_month / 12)
    
#     age_map = {'G': 1, '13+': 2, '15+': 3, '18+': 4, 'Unknown': 0}
#     input_df['age_rating_val'] = age_map.get(data.age_rating, 0)

#     # 2. Apply Target Encoding (Lấy điểm từ encoding_maps.pkl)
#     # def get_score(val, map_type):
#     #     return encoding_maps[map_type].get(val, encoding_maps['global_mean'])

#     # 2. Apply Target Encoding (Lấy điểm từ encoding_maps.pkl)
#     def get_score(val, category, target_type="by_rating"):
#         # Lấy giá trị mặc định chuẩn từ DB đã load ở startup
#         if target_type == "by_rating":
#             global_mean = system_configs.get("global_rating_mean", 7.43)
#         else:
#             global_mean = system_configs.get("global_watchers_log_mean", 7.95)
            
#         try:
#             return encoding_maps[target_type][category].get(val, global_mean)
#         except KeyError:
#             return global_mean
        
#     # input_df['main_lead1_score'] = get_score(data.main_lead1, 'lead1')
#     # input_df['main_lead2_score'] = get_score(data.main_lead2, 'lead2')
#     # input_df['directors_score'] = get_score(data.directors, 'director')
#     # input_df['screenwriters_score'] = get_score(data.screenwriters, 'screenwriter')
#     input_df['main_lead1_score'] = get_score(data.main_lead1, 'main_lead1', 'by_rating')
#     input_df['main_lead2_score'] = get_score(data.main_lead2, 'main_lead2', 'by_rating')
#     input_df['directors_score'] = get_score(data.directors, 'directors', 'by_rating')
#     input_df['screenwriters_score'] = get_score(data.screenwriters, 'screenwriters', 'by_rating')

#     # 3. Xử lý NLP (TF-IDF & MultiLabelBinarizer)
#     genres_list = [i.strip() for i in data.genres.split(',')]
#     genres_encoded = mlb.transform([genres_list])
#     tags_cleaned = clean_tags(data.tags)
#     tags_encoded = tfidf_tag.transform([tags_cleaned])
#     content_encoded = tfidf_content.transform([data.content])

#     # 4. Gom tất cả đặc trưng thành ma trận tổng hợp X_total
#     # Tạo DataFrame từ các mảng NLP (Genres, Tags, Content)
#     genres_df = pd.DataFrame(genres_encoded, columns=[f"genre_{c}" for c in mlb.classes_])
#     tags_df = pd.DataFrame(tags_encoded.toarray(), columns=[f"tag_{c}" for c in tfidf_tag.get_feature_names_out()])
#     content_df = pd.DataFrame(content_encoded.toarray(), columns=[f"txt_{c}" for c in tfidf_content.get_feature_names_out()])

#     # Gom các cột số (numeric_features)
#     # Lưu ý: 'watchers_log', 'popularity_log', 'rating' trong code Colab là cột mục tiêu, 
#     # nhưng khi dự đoán phim MỚI ta chưa có chúng, nên ta không đưa vào X_total.
#     numeric_features = [
#         'episodes', 'duration_mins', 'start_year', 'movie_age', 'age_rating_val',
#         'main_lead1_score', 'main_lead2_score', 'directors_score', 'screenwriters_score',
#         'start_month_sin', 'start_month_cos'
#     ]
#     res_numeric = input_df[numeric_features].reset_index(drop=True)
#     # Tạo DataFrame tổng hợp X_total (bao gồm hàng trăm cột)
#     X_total = pd.concat([res_numeric, genres_df, tags_df, content_df], axis=1)


#     # 5. CHẠY VÒNG LẶP DỰ ĐOÁN QUA CẢ 3 MÔ HÌNH (Dùng feature_lists để lọc đúng cột cho mỗi model)
#     # # 5.1. Dự đoán Rating
#     # # Lọc ra đúng 137 cột mà model Rating cần
#     # input_r = X_total[feature_lists['features_rating']]
#     # res_rating = models_dict['Rating'].predict(input_r)[0]
    
#     # # 6.2. Dự đoán Watchers
#     # # Lọc ra đúng 180 cột mà model Watchers cần
#     # input_w = X_total[feature_lists['features_watchers']]
#     # log_watchers = models_dict['Watchers (Log)'].predict(input_w)[0]
#     # res_watchers = np.expm1(log_watchers) # Chuyển từ Log về số người thực

#     # # 6.3. Dự đoán Popularity (Hạng)
#     # # Lọc ra đúng 176 cột mà model Popularity cần
#     # input_p = X_total[feature_lists['features_pop']]
#     # log_pop = models_dict['Popularity (Log)'].predict(input_p)[0]
#     # rank_pop = np.expm1(log_pop) # Chuyển từ Log về Hạng thực (ví dụ: Hạng 100)

#     # # Xác định nhãn Popularity dựa trên mốc Threshold
#     # def get_status(rank):
#     #     if rank <= THRESHOLD_HOT: return "HOT (highly popular)"
#     #     if rank <= THRESHOLD_MEDIUM: return "Medium"
#     #     return "Thấp"

#     # print(f"[PREDICT RESULT] Rating: {round(float(res_rating), 2)}, Watchers: {int(res_watchers)}, Rank: {int(rank_pop)}")
#     # return {
#     #     "predicted_rating": round(float(res_rating), 2),
#     #     "predicted_watchers": int(res_watchers),
#     #     "popularity_rank": int(rank_pop),
#     #     "popularity_level": get_status(rank_pop)
#     # }

#     # Khởi tạo cấu hình rỗng cho 3 thuật toán so sánh
#     comparison_results = {
#         "SVR": {"rating": 0, "watchers": 0, "popularity_rank": 0},
#         "Ridge": {"rating": 0, "watchers": 0, "popularity_rank": 0},
#         "KNN": {"rating": 0, "watchers": 0, "popularity_rank": 0}
#     }
#     algos = ["SVR", "Ridge", "KNN"]
#     try:
#         # Lấy danh sách các cột đặc trưng từ feature_lists
#         cols_r = feature_lists['features_rating']
#         cols_w = feature_lists['features_watchers']
#         cols_p = feature_lists['features_pop']

#         for algo in algos:
#             # --- 5.1. Dự đoán RATING ---
#             if "RATING" in models_dict and algo in models_dict["RATING"]:
#                 sub_r = models_dict["RATING"][algo]
#                 X_scaled_r = sub_r["scaler"].transform(X_total[cols_r]) # Đi qua bộ Scaler riêng
#                 pred_r = sub_r["model"].predict(X_scaled_r)[0]
#                 comparison_results[algo]["rating"] = round(float(pred_r), 2)

#             # --- 5.2. Dự đoán WATCHERS (LOG) ---
#             if "WATCHERS_LOG" in models_dict and algo in models_dict["WATCHERS_LOG"]:
#                 sub_w = models_dict["WATCHERS_LOG"][algo]
#                 X_scaled_w = sub_w["scaler"].transform(X_total[cols_w]) # Đi qua bộ Scaler riêng
#                 pred_w_log = sub_w["model"].predict(X_scaled_w)[0]
#                 comparison_results[algo]["watchers"] = int(np.expm1(pred_w_log)) # Giải nén Log về số thực

#             # --- 5.3. Dự đoán POPULARITY (LOG) ---
#             if "POPULARITY_LOG" in models_dict and algo in models_dict["POPULARITY_LOG"]:
#                 sub_p = models_dict["POPULARITY_LOG"][algo]
#                 X_scaled_p = sub_p["scaler"].transform(X_total[cols_p]) # Đi qua bộ Scaler riêng
#                 pred_p_log = sub_p["model"].predict(X_scaled_p)[0]
#                 comparison_results[algo]["popularity_rank"] = int(np.expm1(pred_p_log)) # Giải nén Log về Hạng thực

#     except Exception as e:
#         print(f"[PREDICT ERROR] Lỗi tính toán mô hình: {e}")
#         raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

#     print(f"[PREDICT SUCCESS] Đã xuất kết quả so sánh đa mô hình cho phim: {data.title}")
#     return {
#         "title": data.title,
#         "predictions": comparison_results
#     }

@app.post("/predict")
async def predict_kdrama(data: MovieInput):
    try:
        # 1. Trích xuất chính xác danh sách cột huấn luyện thô của từng mô hình từ file pkl mới
        cols_rating = feature_lists.get('RATING_LINEAR_FEATURES')
        cols_watchers = feature_lists.get('WATCHERS_LINEAR_FEATURES')
        cols_pop = feature_lists.get('POPULARITY_LINEAR_FEATURES')

        # 2. Chuyển đổi dữ liệu & Feature Engineering cơ bản
        input_df = pd.DataFrame([data.model_dump()])
        input_df['movie_age'] = 2026 - data.start_year
        input_df['start_month_sin'] = np.sin(2 * np.pi * data.start_month / 12)
        input_df['start_month_cos'] = np.cos(2 * np.pi * data.start_month / 12)
        
        age_map = {'G': 1, '13+': 2, '15+': 3, '18+': 4, 'Unknown': 0}
        input_df['age_rating_val'] = age_map.get(data.age_rating, 0)
        input_df['broadcast_season_val'] = 1  
        input_df['cast_count'] = 4            
        input_df['platform_count'] = 1        

        # 3. Hàm mã hóa Target Encoding linh hoạt theoDB
        def get_score(val, category, target_type):
            global_mean = system_configs.get("global_rating_mean", 7.43) if target_type == "by_rating" else system_configs.get("global_watchers_log_mean", 7.95)
            try: return encoding_maps[target_type][category].get(val, global_mean)
            except KeyError: return global_mean

        # 4. Trích xuất NLP (TF-IDF & MLB)
        genres_encoded = mlb.transform([[i.strip() for i in data.genres.split(',')]])
        tags_encoded = tfidf_tag.transform([clean_tags(data.tags)])
        content_encoded = tfidf_content.transform([data.content])

        genres_df = pd.DataFrame(genres_encoded, columns=[f"genre_{c}" for c in mlb.classes_])
        tags_df = pd.DataFrame(tags_encoded.toarray(), columns=[f"tag_{c}" for c in tfidf_tag.get_feature_names_out()])
        content_df = pd.DataFrame(content_encoded.toarray(), columns=[f"txt_{c}" for c in tfidf_content.get_feature_names_out()])

        # 5. Hàm dựng ma trận tính năng chuẩn chỉ theo cấu trúc cột riêng biệt
        def build_matrix(map_type, target_cols):
            df_temp = input_df.copy()
            
            # Đọc chuẩn xác hậu tố đang có trong tập cột truyền vào
            col_lead1 = next(c for c in target_cols if 'main_lead1' in c or 'lead1' in c)
            col_lead2 = next(c for c in target_cols if 'main_lead2' in c or 'lead2' in c)
            col_director = next(c for c in target_cols if 'director' in c)
            col_writer = next(c for c in target_cols if 'writer' in c or 'screenwriter' in c)
            
            df_temp[col_lead1] = get_score(data.main_lead1, 'main_lead1', map_type)
            df_temp[col_lead2] = get_score(data.main_lead2, 'main_lead2', map_type)
            df_temp[col_director] = get_score(data.directors, 'directors', map_type)
            df_temp[col_writer] = get_score(data.screenwriters, 'screenwriters', map_type)
            
            numeric_features = [
                'episodes', 'duration_mins', 'start_year', 'movie_age', 'age_rating_val',
                'broadcast_season_val', 'cast_count', 'platform_count',
                col_lead1, col_lead2, col_director, col_writer, 'start_month_sin', 'start_month_cos'
            ]
            
            X_out = pd.concat([df_temp[numeric_features].reset_index(drop=True), genres_df, tags_df, content_df], axis=1)
            
            # Điền bù các cột NLP thiếu bằng giá trị 0.0
            for col in target_cols:
                if col not in X_out.columns: X_out[col] = 0.0
            return X_out[target_cols]

        # 6. Tiến hành tính toán dự đoán qua vòng lặp đa mô hình
        comparison_results = {algo: {"rating": 0, "watchers": 0, "popularity_rank": 0} for algo in ["SVR", "Ridge", "KNN"]}
        
        for algo in ["SVR", "Ridge", "KNN"]:
            # Dự đoán RATING (Sử dụng tập cột và map tính năng riêng biệt của bài Rating)
            if "RATING" in models_dict and algo in models_dict["RATING"]:
                X_r = build_matrix(map_type='by_watchers', target_cols=feature_lists["KNN_FEATURES"]["RATING"] if algo == "KNN" else cols_rating)
                sub = models_dict["RATING"][algo]
                comparison_results[algo]["rating"] = round(float(sub["model"].predict(sub["scaler"].transform(X_r))[0]), 2)

            # Dự đoán WATCHERS
            if "WATCHERS_LOG" in models_dict and algo in models_dict["WATCHERS_LOG"]:
                X_w = build_matrix(map_type='by_rating', target_cols=feature_lists["KNN_FEATURES"]["WATCHERS_LOG"] if algo == "KNN" else cols_watchers)
                sub = models_dict["WATCHERS_LOG"][algo]
                comparison_results[algo]["watchers"] = int(np.expm1(sub["model"].predict(sub["scaler"].transform(X_w))[0]))

            # Dự đoán POPULARITY
            if "POPULARITY_LOG" in models_dict and algo in models_dict["POPULARITY_LOG"]:
                X_p = build_matrix(map_type='by_rating', target_cols=feature_lists["KNN_FEATURES"]["POPULARITY_LOG"] if algo == "KNN" else cols_pop)
                sub = models_dict["POPULARITY_LOG"][algo]
                comparison_results[algo]["popularity_rank"] = int(np.expm1(sub["model"].predict(sub["scaler"].transform(X_p))[0]))

        return {"title": data.title, "predictions": comparison_results}

    except Exception as e:
        print(f"[CRITICAL ERROR]: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Pipeline Error: {str(e)}")

# -------- API Thống kê dữ liệu DB --------
@app.get("/api/stats")
async def get_stats_api():
    # Gọi hàm xử lý từ file stats_service.py
    data = get_db_stats(engine, models_dict, feature_lists)
    
    if data is None:
        return {"error": "Could not fetch stats", "stats": []}
        
    return data


    


# =========================================================================
# --- MỚI BỔ SUNG: CÁC API KẾT NỐI ĐẾN RECOMMEND_SERVICE ---
# =========================================================================
# API 1: Lưu form đăng ký (Onboarding) và thiết lập Vector sở thích ban đầu
@app.post("/api/onboarding")
async def save_onboarding(data: OnboardingInput):
    print(f"\n[ONBOARDING] Tiếp nhận Form đăng ký từ User ID: {data.user_id}")
    print(f" -> Thể loại chọn: {data.fav_genres}")
    print(f" -> Diễn viên chọn: {data.fav_actors}")
    print(f" -> Mô-típ chọn: {data.fav_tags}")
    
    try:
        # Sử dụng engine.begin() để đảm bảo tính an toàn dữ liệu (Transaction)
        with engine.begin() as connection:
            # Bước A: Lưu mảng sở thích tĩnh vào bảng user_data.accounts
            acc_query = text("""
                UPDATE user_data.accounts 
                SET fav_genres = :fav_genres, fav_actors = :fav_actors, fav_tags = :fav_tags 
                WHERE user_id = :user_id
            """)
            connection.execute(acc_query, {
                "fav_genres": data.fav_genres, 
                "fav_actors": data.fav_actors, 
                "fav_tags": data.fav_tags, 
                "user_id": data.user_id
            })
            print(" -> Đã cập nhật xong dữ liệu vào bảng user_data.accounts.")
            
            # Bước B: Khởi tạo điểm số mặc định 1.0 cho các lựa chọn vào bảng user_profiles
            genre_w = {g: 1.0 for g in data.fav_genres}
            actor_w = {a: 1.0 for a in data.fav_actors}
            tag_w = {t: 1.0 for t in data.fav_tags}
            
            prof_query = text("""
                INSERT INTO user_data.user_profiles (user_id, genre_weights, actor_weights, tag_weights, updated_at)
                VALUES (:user_id, :genre_w, :actor_w, :tag_w, NOW())
                ON CONFLICT (user_id) DO UPDATE
                SET genre_weights = EXCLUDED.genre_weights,
                    actor_weights = EXCLUDED.actor_weights,
                    tag_weights = EXCLUDED.tag_weights,
                    updated_at = NOW();
            """)
            connection.execute(prof_query, {
                "user_id": data.user_id, 
                "genre_w": json.dumps(genre_w),
                "actor_w": json.dumps(actor_w), 
                "tag_w": json.dumps(tag_w)
            })
            print(" -> Đã khởi tạo Vector Trọng số thành công tại bảng user_data.user_profiles.")
            
        return {"status": "success", "message": "Onboarding completed and user profile initialized!"}
    except Exception as e:
        print(f"[ONBOARDING ERROR] Lỗi: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# API 2: Lấy danh sách phim gợi ý cá nhân hóa cho Trang chủ
@app.get("/api/recommendations/{user_id}")
async def get_recommendations(user_id: int, top_n: int = 10):
    print(f"\n[RECOMMENDATION] Nhận yêu cầu tải danh sách gợi ý cho User ID: {user_id}")
    
    # Gọi hàm xử lý tính điểm toán học từ file recommend_service.py của bạn
    recs = get_recommendations_for_user(user_id, engine, top_n=top_n)
    
    if recs is None:
        print(f" -> Lỗi khi xử lý thuật toán gợi ý phim cho user {user_id}")
        raise HTTPException(status_code=500, detail="Error generating recommendations")
        
    print(f" -> Thuật toán chạy xong. Đã lọc ra Top {len(recs)} bộ phim tốt nhất cho người dùng này.")
    # In thử 3 bộ phim đầu tiên ra terminal để kiểm tra kết quả ngay lập tức
    if len(recs) > 0:
        print(f" -> Phim gợi ý tiêu biểu: {recs[:3]}")
        
    return {"user_id": user_id, "recommendations": recs}


# API 3: Người dùng nhấn nút Yêu thích phim (Thêm vào Favorite)
@app.post("/api/favorites")
async def add_favorite(data: FavoriteInput):
    print(f"\n[FAVORITE CHOSEN] Người dùng {data.user_id} vừa nhấn THÍCH bộ phim có ID: {data.drama_id}")
    try:
        with engine.begin() as connection:
            # Bước A: Lưu hành động vào lịch sử bảng favorites
            fav_query = text("""
                INSERT INTO user_data.favorites (user_id, drama_id, created_at)
                VALUES (:user_id, :drama_id, NOW())
            """)
            connection.execute(fav_query, {"user_id": data.user_id, "drama_id": data.drama_id})
            print(" -> Đã ghi nhận lịch sử vào bảng user_data.favorites.")
        
        # Bước B: Gọi hàm từ recommend_service để tự động cộng +5 điểm cho các thuộc tính của phim này
        success = update_user_profile(data.user_id, data.drama_id, action_type='favorite', rating_val=None, engine=engine)
        if success:
            print(" -> Vector sở thích (User Profile Weights) của người dùng đã được cộng điểm.")
        
        return {"status": "success", "message": "Added to favorites and profile learning updated"}
    except Exception as e:
        print(f"[FAVORITE ERROR] Lỗi: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# API 4: Người dùng viết bình luận và chấm sao (Comment & Rating)
@app.post("/api/comments")
async def add_comment(data: CommentInput):
    print(f"\n[COMMENT & RATING] Người dùng {data.user_id} đánh giá phim ID: {data.drama_id} với {data.rating} SAO.")
    print(f" -> Nội dung bình luận: '{data.content}'")
    try:
        with engine.begin() as connection:
            # Bước A: Ghi nhận thông tin vào bảng comments
            cmt_query = text("""
                INSERT INTO user_data.comments (user_id, drama_id, rating, content, created_at)
                VALUES (:user_id, :drama_id, :rating, :content, NOW())
            """)
            connection.execute(cmt_query, {
                "user_id": data.user_id, 
                "drama_id": data.drama_id, 
                "rating": data.rating, 
                "content": data.content
            })
            print(" -> Đã lưu đánh giá vào bảng user_data.comments.")
            
        # Bước B: Gọi hàm cập nhật điểm trọng số của phim dựa trên số sao thực tế (Khen cộng điểm, Chê trừ điểm)
        success = update_user_profile(data.user_id, data.drama_id, action_type='comment', rating_val=data.rating, engine=engine)
        if success:
            print(f" -> Đã điều chỉnh Vector trọng số của người dùng dựa trên mức {data.rating} sao.")
            
        return {"status": "success", "message": "Comment and rating saved successfully"}
    except Exception as e:
        print(f"[COMMENT ERROR] Lỗi: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    # Chạy uvicorn server tại cổng 8000
    print("\n--- Khởi động Uvicorn Server tại http://localhost:8000 ---")
    uvicorn.run(app, host="0.0.0.0", port=8000)