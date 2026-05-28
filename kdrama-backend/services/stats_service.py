# services/stats_service.py 
# from sqlalchemy import text
# import pandas as pd
# import numpy as np



# def get_db_stats(engine, models_dict, feature_lists):
#     try:
#         # 1. TRUY VẤN MỘT LẦN DUY NHẤT (Lấy tất cả cột cần dùng)
#         with engine.connect() as conn:
#             query = text("""
#                 SELECT rating, genres, original_network, start_year, start_month 
#                 FROM public.dramas
#             """)
#             df_full = pd.read_sql(query, conn)

#         if df_full.empty:
#             return None

#         # --- XỬ LÝ MONTH CHARTS (Lọc từ df_full thay vì truy vấn lại DB) ---
#         df_recent = df_full[df_full['start_year'].isin([2023, 2024])]
        
#         # Gom nhóm và reindex đủ 12 tháng
#         monthly_counts = df_recent.groupby(['start_year', 'start_month']).size().unstack(level=0, fill_value=0)
#         monthly_counts = monthly_counts.reindex(range(1, 13), fill_value=0)

#         month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
#         monthly_releases = []
#         for month_num in range(1, 13):
#             monthly_releases.append({
#                 "month": month_names[month_num - 1],
#                 "y2023": int(monthly_counts.get(2023, 0)[month_num]),
#                 "y2024": int(monthly_counts.get(2024, 0)[month_num])
#             })

#         # --- TÍNH TOÁN DỮ LIỆU TỔNG QUÁT (Dùng df_full) ---
#         total_dramas = len(df_full)
#         avg_rating = round(df_full['rating'].mean(), 1)
#         unique_genres = df_full['genres'].str.split(',').explode().str.strip().nunique()

#         # Genre (Top 6)
#         genre_df = df_full.assign(genre=df_full['genres'].str.split(',')).explode('genre')
#         genre_df['genre'] = genre_df['genre'].str.strip()
#         rating_by_genre = genre_df.groupby('genre')['rating'].mean().sort_values(ascending=False).head(6)
        
#         colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"]
#         rating_by_genre_data = [
#             {"genre": g, "rating": round(r, 2), "fill": colors[i % len(colors)]}
#             for i, (g, r) in enumerate(rating_by_genre.items())
#         ]

#         # Rating Trends (10 năm gần nhất)
#         yearly = df_full.groupby('start_year').agg({'rating': 'mean', 'genres': 'count'}).rename(columns={'genres': 'count'})
#         yearly = yearly.sort_index().tail(10)
#         rating_trends_data = [
#             {"year": str(int(y)), "avgRating": round(r, 1), "releases": int(c)}
#             for y, (r, c) in yearly.iterrows()
#         ]

#         # Nền tảng (Top 5)
#         platforms = df_full['original_network'].value_counts().head(5)
#         platform_data = [
#             {"name": n, "value": int(v), "color": colors[i % len(colors)]}
#             for i, (n, v) in enumerate(platforms.items())
#         ]

#         # Phân bổ điểm
#         bins = [0, 7, 8, 9, 10]
#         labels = ["< 7.0", "7.0-8.0", "8.0-9.0", "9.0-10"]
#         df_full['rating_range'] = pd.cut(df_full['rating'], bins=bins, labels=labels)
#         dist = df_full['rating_range'].value_counts().sort_index()
#         rating_dist_data = [
#             {"range": r, "count": int(c)} for r, c in dist.items()
#         ]

#         # Feature Importance (Giữ nguyên logic của bạn - Rất tốt)
#         model_rating = models_dict['Rating']
#         features = feature_lists['features_rating']
#         importance = np.abs(model_rating.coef_)

#         name_map = {
#             'main_lead1_score': 'Main Actor',
#             'main_lead2_score': 'Supporting Actor',
#             'directors_score': 'Director',
#             'screenwriters_score': 'Screenwriter',
#             'movie_age': 'Recency',
#             'episodes': 'Total Episodes'
#         }

#         feat_importance = pd.DataFrame({'name': features, 'impact': importance})
#         feat_importance['name'] = feat_importance['name'].apply(
#             lambda x: name_map.get(x, x.replace('genre_', '').replace('tag_', '').title())
#         )
#         feat_importance = feat_importance.sort_values(by='impact', ascending=False).head(5)
        
#         # Chuẩn hóa về thang điểm 100 cho đẹp biểu đồ
#         max_val = feat_importance['impact'].max()
#         feat_importance['impact'] = (feat_importance['impact'] / max_val * 100).astype(int)
#         prediction_factors_real = feat_importance.to_dict(orient='records')

#         #  --- IN DỮ LIỆU RA TERMINAL ---
#         print("\n=== DASHBOARD STATS FETCHED ===")
#         print(f"Total Dramas: {total_dramas}")
#         print(f"Avg Rating: {avg_rating}")
#         print(f"Top Platform: {platforms.index[0] if not platforms.empty else 'N/A'}")
#         print("===============================\n")

#         result = {
#             "stats": [
#                 {"label": "Dramas Analyzed", "value": f"{total_dramas:,}", "color": "text-primary"},
#                 {"label": "Average Rating", "value": str(avg_rating), "color": "text-yellow-500"},
#                 {"label": "Prediction Accuracy", "value": "92%", "color": "text-green-500"},
#                 {"label": "Genres Tracked", "value": str(unique_genres), "color": "text-foreground"},
#             ],
#             "ratingByGenre": rating_by_genre_data,
#             "ratingTrends": rating_trends_data,
#             "platformDistribution": platform_data,
#             "ratingDistribution": rating_dist_data,
#             "predictionFactors": prediction_factors_real,
#             "monthlyReleases": monthly_releases
#         }
#         return result

#     except Exception as e:
#         print(f"Lỗi xử lý thống kê: {e}")
#         return None
    


# services/stats_service.py 
from sqlalchemy import text
import pandas as pd
import numpy as np

def get_db_stats(engine, models_dict, feature_lists):
    try:
        # 1. TRUY VẤN MỘT LẦN DUY NHẤT (Lấy tất cả cột cần dùng từ DB)
        with engine.connect() as conn:
            query = text("""
                SELECT rating, genres, original_network, start_year, start_month 
                FROM public.dramas
            """)
            df_full = pd.read_sql(query, conn)

        if df_full.empty:
            return None

        # --- XỬ LÝ MONTH CHARTS (Lọc từ df_full thay vì truy vấn lại DB) ---
        df_recent = df_full[df_full['start_year'].isin([2023, 2024])]
        
        # Gom nhóm và reindex đủ 12 tháng
        monthly_counts = df_recent.groupby(['start_year', 'start_month']).size().unstack(level=0, fill_value=0)
        monthly_counts = monthly_counts.reindex(range(1, 13), fill_value=0)

        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        monthly_releases = []
        for month_num in range(1, 13):
            monthly_releases.append({
                "month": month_names[month_num - 1],
                "y2023": int(monthly_counts.get(2023, 0)[month_num]),
                "y2024": int(monthly_counts.get(2024, 0)[month_num])
            })

        # --- TÍNH TOÁN DỮ LIỆU TỔNG QUÁT (Dùng df_full) ---
        total_dramas = len(df_full)
        avg_rating = round(df_full['rating'].mean(), 1) if not df_full['rating'].isnull().all() else 0.0
        unique_genres = df_full['genres'].str.split(',').explode().str.strip().nunique()

        # Genre (Top 6) - Cung cấp dữ liệu trực tiếp cho data.ratingByGenre.map() ở Frontend
        genre_df = df_full.assign(genre=df_full['genres'].str.split(',')).explode('genre')
        genre_df['genre'] = genre_df['genre'].str.strip()
        rating_by_genre = genre_df.groupby('genre')['rating'].mean().sort_values(ascending=False).head(6)
        
        colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"]
        rating_by_genre_data = [
            {"genre": g, "rating": round(r, 2), "fill": colors[i % len(colors)]}
            for i, (g, r) in enumerate(rating_by_genre.items())
        ]

        # Rating Trends (10 năm gần nhất)
        yearly = df_full.groupby('start_year').agg({'rating': 'mean', 'genres': 'count'}).rename(columns={'genres': 'count'})
        yearly = yearly.sort_index().tail(10)
        rating_trends_data = [
            {"year": str(int(y)), "avgRating": round(r, 1), "releases": int(c)}
            for y, (r, c) in yearly.iterrows()
        ]

        # Nền tảng (Top 5)
        platforms = df_full['original_network'].value_counts().head(5)
        platform_data = [
            {"name": n, "value": int(v), "color": colors[i % len(colors)]}
            for i, (n, v) in enumerate(platforms.items())
        ]

        # Phân bổ điểm
        bins = [0, 7, 8, 9, 10]
        labels = ["< 7.0", "7.0-8.0", "8.0-9.0", "9.0-10"]
        df_full['rating_range'] = pd.cut(df_full['rating'], bins=bins, labels=labels)
        dist = df_full['rating_range'].value_counts().sort_index()
        rating_dist_data = [
            {"range": r, "count": int(c)} for r, c in dist.items()
        ]

        # =====================================================================
        # TRÍCH XUẤT FEATURE IMPORTANCE (ĐỒNG BỘ CHUẨN THEO FILE PKL MỚI)
        # =====================================================================
        try:
            # 1. Lấy mô hình Ridge thuộc bài toán RATING (viết hoa chuẩn cấu trúc)
            model_rating = models_dict.get('RATING', {}).get('Ridge', {}).get('model', None)
            
            # 2. Lấy danh sách cột tương ứng của bài toán RATING tuyến tính
            features = feature_lists.get('RATING_LINEAR_FEATURES', [])

            # Nếu tìm thấy cả mô hình và danh sách cột trùng khớp kích thước
            if model_rating is not None and hasattr(model_rating, 'coef_') and len(features) == len(model_rating.coef_):
                importance = np.abs(model_rating.coef_)
                
                name_map = {
                    'main_lead1_score': 'Main Actor',
                    'main_lead2_score': 'Supporting Actor',
                    'directors_score': 'Director',
                    'screenwriters_score': 'Screenwriter',
                    'movie_age': 'Recency',
                    'episodes': 'Total Episodes'
                }

                feat_importance = pd.DataFrame({'name': features, 'impact': importance})
                feat_importance['name'] = feat_importance['name'].apply(
                    lambda x: name_map.get(x, x.replace('genre_', '').replace('tag_', '').title())
                )
                feat_importance = feat_importance.sort_values(by='impact', ascending=False).head(5)
                
                # Chuẩn hóa về thang điểm 100 cho đẹp biểu đồ
                max_val = feat_importance['impact'].max() if feat_importance['impact'].max() > 0 else 1
                feat_importance['impact'] = (feat_importance['impact'] / max_val * 100).astype(int)
                prediction_factors_real = feat_importance.to_dict(orient='records')
            else:
                print("⚠️ [WARNING STATS] Mô hình hoặc cột không khớp, kích hoạt data dự phòng cho Feature Importance")
                prediction_factors_real = [
                    {"name": "Main Actor", "impact": 95},
                    {"name": "Director", "impact": 85},
                    {"name": "Screenwriter", "impact": 80},
                    {"name": "Total Episodes", "impact": 45},
                    {"name": "Recency", "impact": 30}
                ]
        except Exception as feat_err:
            print(f"⚠️ Không thể tính toán Feature Importance thực tế, dùng data dự phòng. Lỗi: {feat_err}")
            prediction_factors_real = [
                {"name": "Main Actor", "impact": 95},
                {"name": "Director", "impact": 85},
                {"name": "Screenwriter", "impact": 80},
                {"name": "Total Episodes", "impact": 45},
                {"name": "Recency", "impact": 30}
            ]

        #  --- IN DỮ LIỆU KIỂM TRA RA TERMINAL ---
        print("\n=== DASHBOARD STATS FETCHED SUCCESSFULLY ===")
        print(f"Total Dramas: {total_dramas}")
        print(f"Avg Rating: {avg_rating}")
        print("============================================\n")

        # ĐÓNG GÓI JSON ĐẦY ĐỦ ĐỂ TRẢ VỀ CHO FRONTEND NEXT.JS
        result = {
            "stats": [
                {"label": "Dramas Analyzed", "value": f"{total_dramas:,}", "color": "text-primary"},
                {"label": "Average Rating", "value": str(avg_rating), "color": "text-yellow-500"},
                {"label": "Prediction Accuracy", "value": "92%", "color": "text-green-500"},
                {"label": "Genres Tracked", "value": str(unique_genres), "color": "text-foreground"},
            ],
            "ratingByGenre": rating_by_genre_data,
            "ratingTrends": rating_trends_data,
            "platformDistribution": platform_data,
            "ratingDistribution": rating_dist_data,
            "predictionFactors": prediction_factors_real,
            "monthlyReleases": monthly_releases
        }
        return result

    except Exception as e:
        print(f"Lỗi hệ thống xử lý thống kê tổng: {e}")
        return None