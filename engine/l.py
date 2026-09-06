import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "json" / "experimental" / "engine"
import numpy as np
from sentence_transformers import SentenceTransformer

# 載入語意向量、meta、語句
embeddings = np.load('combined_embeddings.npy')
with open(str(DATA_DIR / str(DATA_DIR / "combined_meta.json")), 'r', encoding='utf-8') as f:
    meta = json.load(f)
with open(str(DATA_DIR / str(DATA_DIR / "sentences.json")), 'r', encoding='utf-8') as f:
    sentences = json.load(f)

# 載入要補全的檔案
with open(str(DATA_DIR / str(DATA_DIR / "runes64_alldata.json")), 'r', encoding='utf-8') as f:
    runes = json.load(f)

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

for rune in runes:
    # 假設要補「建議」欄位，且它是 array
    if not rune.get('愛情建議') or len(rune['愛情建議']) == 0:
        query = f"{rune['符文名稱']} {rune.get('關鍵詞', '')}"
        query_emb = model.encode([query])[0]
        sims = np.dot(embeddings, query_emb) / (np.linalg.norm(embeddings, axis=1) * np.linalg.norm(query_emb))
        # 取前3名
        topk = 3
        best_indices = np.argsort(sims)[-topk:][::-1]
        rune['愛情建議'] = [sentences[i] for i in best_indices]

# 儲存補全後的檔案
with open(str(DATA_DIR / str(DATA_DIR / "data_filled.json")), 'w', encoding='utf-8') as f:
    json.dump(runes, f, ensure_ascii=False, indent=2)