import psycopg2

def test_full_database():
    try:
        # Kết nối đến Postgres
        conn = psycopg2.connect(
            host="localhost", 
            database="kdrama", 
            user="postgres", 
            password="123456"
        )
        cur = conn.cursor()
        print("Connect to Postgres successfully!\n")

        # 1. Kiểm tra thống kê phim (Public Schema)
        cur.execute("SELECT start_year, COUNT(*) FROM public.dramas GROUP BY start_year ORDER BY start_year DESC LIMIT 3")
        print("--- Movie Statistics by Year ---")
        for row in cur.fetchall():
            print(f"Year {row[0]}: {row[1]} film")

        # 2. Kiểm tra Bảng điểm (Scoring Data Schema)
        print("\n--- Check grade report (SCORING) ---")
        
        cur.execute("SELECT COUNT(*) FROM scoring_data.actor_scores")
        print(f"The number of casts: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM scoring_data.director_scores")
        print(f"The number of directors: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM scoring_data.writer_scores")
        print(f"The number of screenwriters: {cur.fetchone()[0]}")

        cur.close()
        conn.close()
        print("\n=> Your database is ready to combine with AI")
        
    except Exception as e:
        print(f"Error: {e}")

test_full_database()

