import numpy as np
import json
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# 1. 載入語意向量、meta、語句
embeddings = np.load('combined_embeddings.npy')
with open('combined_meta.json', 'r', encoding='utf-8') as f:
    meta = json.load(f)
with open('sentences.json', 'r', encoding='utf-8') as f:
    sentences = json.load(f)

# 2. 載入 runes64_alldata.json
with open('runes64_alldata.json', 'r', encoding='utf-8') as f:
    alldata = json.load(f)

# 3. 初始化模型
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# 4. 自動填補空白建議
for item in alldata:
    if not item.get("建議", ""):
        # 組合查詢語句（可依你的資料結構調整）
        query = f"{item.get('符文名稱', '')} {item.get('方向', '')} {item.get('主題', '')}"
        query_vec = model.encode([query])
        sims = cosine_similarity(query_vec, embeddings)[0]
        best_idx = sims.argmax()
        item['建議'] = sentences[best_idx]

# 5. 儲存新檔案
with open('runes64_alldata_filled.json', 'w', encoding='utf-8') as f:
    json.dump(alldata, f, ensure_ascii=False, indent=2)

print("自動填補完成，已儲存為 runes64_alldata_filled.json")