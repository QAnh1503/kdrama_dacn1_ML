import joblib
from sqlalchemy import create_engine, text
import pandas as pd
import numpy as np
import json
import psycopg2
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional  

from services.stats_service import get_db_stats # Import hàm từ file mới
from services.recommend_service import get_recommendations_for_user, update_user_profile # Import 2 hàm xử lý hệ thống khuyến nghị
import traceback

# from passlib.context import CryptContext
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
import bcrypt

# Cấu hình kết nối Postgres
DATABASE_URL = "postgresql://postgres:123456@localhost:5432/kdrama"

# DATABASE_URL = "postgresql://postgres:123456@localhost:5432/kdrama_dacn1_db"
engine = create_engine(DATABASE_URL)

def get_db_connection():
    return psycopg2.connect(
        host="localhost", 
        # database="kdrama_dacn1_db", 
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

# Khởi tạo công cụ mã hóa mật khẩu theo chuẩn bcrypt
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Tạo cấu trúc dữ liệu (Schema) nhận diện từ Frontend gửi lên
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginInput(BaseModel):
    email: EmailStr
    password: str


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
#     try:
#         # 1. Trích xuất chính xác danh sách cột huấn luyện thô của từng mô hình từ file pkl mới
#         cols_rating = feature_lists.get('RATING_LINEAR_FEATURES')
#         cols_watchers = feature_lists.get('WATCHERS_LINEAR_FEATURES')
#         cols_pop = feature_lists.get('POPULARITY_LINEAR_FEATURES')

#         # 2. Chuyển đổi dữ liệu & Feature Engineering cơ bản
#         input_df = pd.DataFrame([data.model_dump()])
#         input_df['movie_age'] = 2026 - data.start_year
#         input_df['start_month_sin'] = np.sin(2 * np.pi * data.start_month / 12)
#         input_df['start_month_cos'] = np.cos(2 * np.pi * data.start_month / 12)
        
#         age_map = {'G': 1, '13+': 2, '15+': 3, '18+': 4, 'Unknown': 0}
#         input_df['age_rating_val'] = age_map.get(data.age_rating, 0)
#         input_df['broadcast_season_val'] = 1  
#         input_df['cast_count'] = 4            
#         input_df['platform_count'] = 1        

#         # 3. Hàm mã hóa Target Encoding linh hoạt theoDB
#         def get_score(val, category, target_type):
#             global_mean = system_configs.get("global_rating_mean", 7.43) if target_type == "by_rating" else system_configs.get("global_watchers_log_mean", 7.95)
#             try: return encoding_maps[target_type][category].get(val, global_mean)
#             except KeyError: return global_mean

#         # 4. Trích xuất NLP (TF-IDF & MLB)
#         genres_encoded = mlb.transform([[i.strip() for i in data.genres.split(',')]])
#         tags_encoded = tfidf_tag.transform([clean_tags(data.tags)])
#         content_encoded = tfidf_content.transform([data.content])

#         genres_df = pd.DataFrame(genres_encoded, columns=[f"genre_{c}" for c in mlb.classes_])
#         tags_df = pd.DataFrame(tags_encoded.toarray(), columns=[f"tag_{c}" for c in tfidf_tag.get_feature_names_out()])
#         content_df = pd.DataFrame(content_encoded.toarray(), columns=[f"txt_{c}" for c in tfidf_content.get_feature_names_out()])

#         # 5. Hàm dựng ma trận tính năng chuẩn chỉ theo cấu trúc cột riêng biệt
#         def build_matrix(map_type, target_cols):
#             df_temp = input_df.copy()
            
#             # Đọc chuẩn xác hậu tố đang có trong tập cột truyền vào
#             col_lead1 = next(c for c in target_cols if 'main_lead1' in c or 'lead1' in c)
#             col_lead2 = next(c for c in target_cols if 'main_lead2' in c or 'lead2' in c)
#             col_director = next(c for c in target_cols if 'director' in c)
#             col_writer = next(c for c in target_cols if 'writer' in c or 'screenwriter' in c)
            
#             df_temp[col_lead1] = get_score(data.main_lead1, 'main_lead1', map_type)
#             df_temp[col_lead2] = get_score(data.main_lead2, 'main_lead2', map_type)
#             df_temp[col_director] = get_score(data.directors, 'directors', map_type)
#             df_temp[col_writer] = get_score(data.screenwriters, 'screenwriters', map_type)
            
#             numeric_features = [
#                 'episodes', 'duration_mins', 'start_year', 'movie_age', 'age_rating_val',
#                 'broadcast_season_val', 'cast_count', 'platform_count',
#                 col_lead1, col_lead2, col_director, col_writer, 'start_month_sin', 'start_month_cos'
#             ]
            
#             X_out = pd.concat([df_temp[numeric_features].reset_index(drop=True), genres_df, tags_df, content_df], axis=1)
            
#             # Điền bù các cột NLP thiếu bằng giá trị 0.0
#             for col in target_cols:
#                 if col not in X_out.columns: X_out[col] = 0.0
#             return X_out[target_cols]

#         # 6. Tiến hành tính toán dự đoán qua vòng lặp đa mô hình
#         comparison_results = {algo: {"rating": 0, "watchers": 0, "popularity_rank": 0} for algo in ["SVR", "Ridge", "KNN"]}
        
#         # Tính cast_count thực tế dựa trên dữ liệu gửi lên
#         cast_list = [data.main_lead1, data.main_lead2]
#         input_df['cast_count'] = len([c for c in cast_list if c and c != "Unknown"])

#         for algo in ["SVR", "Ridge", "KNN"]:
#             # Dự đoán RATING (Sử dụng tập cột và map tính năng riêng biệt của bài Rating)
#             if "RATING" in models_dict and algo in models_dict["RATING"]:
#                 X_r = build_matrix(map_type='by_watchers', target_cols=feature_lists["KNN_FEATURES"]["RATING"] if algo == "KNN" else cols_rating)
#                 sub = models_dict["RATING"][algo]
#                 comparison_results[algo]["rating"] = round(float(sub["model"].predict(sub["scaler"].transform(X_r))[0]), 2)

#             # Dự đoán WATCHERS
#             if "WATCHERS_LOG" in models_dict and algo in models_dict["WATCHERS_LOG"]:
#                 X_w = build_matrix(map_type='by_rating', target_cols=feature_lists["KNN_FEATURES"]["WATCHERS_LOG"] if algo == "KNN" else cols_watchers)
#                 sub = models_dict["WATCHERS_LOG"][algo]
#                 comparison_results[algo]["watchers"] = int(np.expm1(sub["model"].predict(sub["scaler"].transform(X_w))[0]))

#             # Dự đoán POPULARITY
#             if "POPULARITY_LOG" in models_dict and algo in models_dict["POPULARITY_LOG"]:
#                 X_p = build_matrix(map_type='by_rating', target_cols=feature_lists["KNN_FEATURES"]["POPULARITY_LOG"] if algo == "KNN" else cols_pop)
#                 sub = models_dict["POPULARITY_LOG"][algo]
#                 comparison_results[algo]["popularity_rank"] = int(np.expm1(sub["model"].predict(sub["scaler"].transform(X_p))[0]))

#         return {"title": data.title, "predictions": comparison_results}

#     except Exception as e:
#         print(f"[CRITICAL ERROR]: {str(e)}")
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=f"Pipeline Error: {str(e)}")



# -------- TẠO API LOGIC DỰ ĐOÁN & SO SÁNH 3 MÔ HÌNH --------
@app.post("/predict")
async def predict_kdrama(data: MovieInput):
    try:
        # 1. Trích xuất chính xác danh sách cột huấn luyện thô của từng mô hình từ file pkl
        cols_rating = feature_lists.get('RATING_LINEAR_FEATURES')
        cols_watchers = feature_lists.get('WATCHERS_LINEAR_FEATURES')
        cols_pop = feature_lists.get('POPULARITY_LINEAR_FEATURES')

        # 2. Chuyển đổi dữ liệu & Feature Engineering cơ bản (Khớp hoàn toàn Colab)
        input_df = pd.DataFrame([data.model_dump()])
        input_df['movie_age'] = 2026 - data.start_year
        input_df['start_month_sin'] = np.sin(2 * np.pi * data.start_month / 12)
        input_df['start_month_cos'] = np.cos(2 * np.pi * data.start_month / 12)
        
        # Mã hóa độ tuổi (Age Rating)
        age_map = {'G': 1, '13+': 2, '15+': 3, '18+': 4, 'Unknown': 0, 'Not Yet Rated': 0}
        input_df['age_rating_val'] = age_map.get(data.age_rating, 0)
        
        # Mã hóa mùa (Broadcast Season) - Thay vì gán cứng bằng 1, hãy chuyển đổi từ text nếu frontend gửi lên
        # Nếu frontend gửi dạng chữ (spring, summer...), hãy map qua season_map, nếu gửi số thì giữ nguyên
        season_map = {"spring": 1, "summer": 2, "fall": 3, "winter": 4}
        # if isinstance(data.broadcast_season, str):
        #     input_df['broadcast_season_val'] = season_map.get(data.broadcast_season.lower(), 0)
        # else:
        #     input_df['broadcast_season_val'] = data.broadcast_season if data.broadcast_season else 0
        # --- TỰ ĐỘNG SUY RA MÙA (BROADCAST SEASON) TỪ THÁNG PHÁT HÀNH (GIỐNG COLAB) ---
        month = int(data.start_month)

        if month in [3, 4, 5]:
            input_df['broadcast_season_val'] = 1  # Spring
        elif month in [6, 7, 8]:
            input_df['broadcast_season_val'] = 2  # Summer
        elif month in [9, 10, 11]:
            input_df['broadcast_season_val'] = 3  # Fall
        else:
            input_df['broadcast_season_val'] = 4  # Winter (Tháng 12, 1, 2)

        # Tính toán cast_count động thực tế dựa trên dữ liệu gửi lên
        cast_list = [data.main_lead1, data.main_lead2]
        input_df['cast_count'] = len([c for c in cast_list if c and c != "Unknown"])
        input_df['platform_count'] = 1  # Giữ nguyên cấu hình hệ thống tạm thời

        # --- BƯỚC BỔ SUNG: XỬ LÝ ĐẶC TRƯNG NHÓM (BINNING) DÀNH RIÊNG CHO KNN ---
        episodes_val = int(data.episodes)
        if episodes_val <= 4: input_df['episodes_group_val'] = 1       # Short
        elif episodes_val <= 20: input_df['episodes_group_val'] = 2    # Medium
        else: input_df['episodes_group_val'] = 3                       # Long

        duration_val = int(data.duration_mins)
        if duration_val <= 45: input_df['duration_groups_val'] = 1     # Short Movie
        elif duration_val <= 90: input_df['duration_groups_val'] = 2   # Standard
        else: input_df['duration_groups_val'] = 3                      # Long Series


        # 3. Hàm mã hóa Target Encoding linh hoạt theo DB
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


        # 5. Hàm dựng ma trận tính năng chuẩn chỉ (Đã sửa lỗi phân tách KNN và Linear riêng biệt)
        def build_matrix(map_type, target_cols, is_knn=False):
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
            
            # RẼ NHÁNH ĐẶC TRƯNG SỐ THEO ĐÚNG HÀM TRÊN COLAB
            if is_knn:
                # Cấu trúc của hàm `finalize_df_for_knr` trong Colab
                numeric_features = [
                    'episodes_group_val', 'duration_groups_val', 'movie_age', 'age_rating_val',
                    'broadcast_season_val', 'cast_count', 'platform_count', 'start_month_sin', 'start_month_cos',
                    col_lead1, col_lead2, col_director, col_writer
                ]
            else:
                # Cấu trúc của hàm `finalize_df_for_linear_svr` trong Colab
                numeric_features = [
                    'episodes', 'duration_mins', 'start_year', 'movie_age', 'age_rating_val',
                    'broadcast_season_val', 'cast_count', 'platform_count', 'start_month_sin', 'start_month_cos',
                    col_lead1, col_lead2, col_director, col_writer
                ]
            
            X_out = pd.concat([df_temp[numeric_features].reset_index(drop=True), genres_df, tags_df, content_df], axis=1)
            
            # Điền bù các cột NLP thiếu bằng giá trị 0.0 và xếp chuẩn thứ tự cột như lúc Train
            for col in target_cols:
                if col not in X_out.columns: X_out[col] = 0.0
            return X_out[target_cols]


        # 6. Tiến hành tính toán dự đoán qua vòng lặp đa mô hình
        comparison_results = {algo: {"rating": 0, "watchers": 0, "popularity_rank": 0} for algo in ["SVR", "Ridge", "KNN"]}
        
        for algo in ["SVR", "Ridge", "KNN"]:
            is_knn_flag = (algo == "KNN")

            # 6.1. Dự đoán RATING
            if "RATING" in models_dict and algo in models_dict["RATING"]:
                target_columns = feature_lists["KNN_FEATURES"]["RATING"] if is_knn_flag else cols_rating
                X_r = build_matrix(map_type='by_watchers', target_cols=target_columns, is_knn=is_knn_flag)
                sub = models_dict["RATING"][algo]
                comparison_results[algo]["rating"] = round(float(sub["model"].predict(sub["scaler"].transform(X_r))[0]), 2)

            # 6.2. Dự đoán WATCHERS
            if "WATCHERS_LOG" in models_dict and algo in models_dict["WATCHERS_LOG"]:
                target_columns = feature_lists["KNN_FEATURES"]["WATCHERS_LOG"] if is_knn_flag else cols_watchers
                X_w = build_matrix(map_type='by_rating', target_cols=target_columns, is_knn=is_knn_flag)
                sub = models_dict["WATCHERS_LOG"][algo]
                comparison_results[algo]["watchers"] = int(np.expm1(sub["model"].predict(sub["scaler"].transform(X_w))[0]))

            # 6.3. Dự đoán POPULARITY
            if "POPULARITY_LOG" in models_dict and algo in models_dict["POPULARITY_LOG"]:
                target_columns = feature_lists["KNN_FEATURES"]["POPULARITY_LOG"] if is_knn_flag else cols_pop
                X_p = build_matrix(map_type='by_rating', target_cols=target_columns, is_knn=is_knn_flag)
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
    
    # Gọi hàm xử lý tính điểm toán học từ file recommend_service.py
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


@app.post("/api/auth/signup")
def signup_user(payload: SignupRequest):
    username = payload.name
    email = payload.email
    password = payload.password

    # Sử dụng kết nối Database của SQLAlchemy có sẵn trong dự án của bạn
    with engine.begin() as connection:
        # 1. Kiểm tra xem email đã tồn tại hay chưa
        check_query = text("SELECT email FROM user_data.accounts WHERE email = :email")
        existing_user = connection.execute(check_query, {"email": email}).fetchone()
        
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")

        # 2. Mã hóa mật khẩu bằng Bcrypt
        # password_hash = pwd_context.hash(password)
        # 2. Mã hóa mật khẩu bằng Bcrypt gốc
        # Chuyển chuỗi chữ (str) sang dạng bytes trước khi băm
        password_bytes = password.encode('utf-8') 
        salt = bcrypt.gensalt()
        # Tiến hành hash mật khẩu và ép kiểu ngược lại về chuỗi str để lưu DB
        password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

        # 3. Thêm bản ghi mới vào bảng accounts (khởi tạo mảng trống cho sở thích)
        insert_query = text("""
            INSERT INTO user_data.accounts (
                username, email, password_hash, fav_genres, created_at, fav_actors, fav_tags, user_code
            ) 
            VALUES (:username, :email, :password_hash, '{}', NOW(), '{}', '{}', '') 
            RETURNING user_id
        """)
        
        result = connection.execute(insert_query, {
            "username": username,
            "email": email,
            "password_hash": password_hash
        }).fetchone()
        
        new_user_id = result[0]

        # 4. Tự động sinh mã user_code định dạng U0007, U0008... và cập nhật lại
        user_code = f"U{str(new_user_id).zfill(4)}"
        
        update_query = text("UPDATE user_data.accounts SET user_code = :user_code WHERE user_id = :user_id")
        connection.execute(update_query, {"user_code": user_code, "user_id": new_user_id})

    return {
        "success": True, 
        "message": "Account created successfully", 
        "user_id": new_user_id, 
        "user_code": user_code
    }


@app.post("/api/auth/login")
async def login_user(data: LoginInput):
    print(f"\n[LOGIN] Tiếp nhận yêu cầu đăng nhập từ Email: {data.email}")
    
    try:
        with engine.begin() as connection:
            # Tìm thông tin người dùng dựa trên email trong DB
            query = text("""
                SELECT user_id, password_hash, username 
                FROM user_data.accounts 
                WHERE email = :email
            """)
            user = connection.execute(query, {"email": data.email}).mappings().first()
            
            # Nếu không tìm thấy Email
            if not user:
                print(" -> Đăng nhập thất bại: Không tìm thấy Email này.")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, 
                    detail="Invalid email or password. Please try again."
                )
                
            # Xác thực mật khẩu băm (Sử dụng bcrypt độc lập chuẩn)
            password_bytes = data.password.encode('utf-8')
            stored_hash_bytes = user["password_hash"].encode('utf-8')
            
            if not bcrypt.checkpw(password_bytes, stored_hash_bytes):
                print(" -> Đăng nhập thất bại: Sai mật khẩu.")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, 
                    detail="Invalid email or password. Please try again."
                )
                
            # Kiểm tra trạng thái Onboarding: Đã tồn tại cấu hình sở thích chưa
            profile_query = text("""
                SELECT 1 FROM user_data.user_profiles WHERE user_id = :user_id
            """)
            has_profile = connection.execute(profile_query, {"user_id": user["user_id"]}).first()
            onboarded = True if has_profile else False
            
            print(f" -> Đăng nhập thành công! User ID: {user['user_id']} | Onboarded: {onboarded}")
            
            return {
                "status": "success",
                "user_id": user["user_id"],
                "username": user["username"],
                "onboarded": onboarded,
                "message": "Login successful!"
            }
            
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"[LOGIN ERROR] Lỗi hệ thống: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during login.")


if __name__ == "__main__":
    import uvicorn
    # Chạy uvicorn server tại cổng 8000
    print("\n--- Khởi động Uvicorn Server tại http://localhost:8000 ---")
    uvicorn.run(app, host="0.0.0.0", port=8000)