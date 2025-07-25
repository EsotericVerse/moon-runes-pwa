import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer

# 1. 擷取 runes07.json 的語句
with open('runes07.json', 'r', encoding='utf-8') as f:
    runes07 = json.load(f)

sentences = []
meta = []

for r in runes07:
    for direction, field in [
        ("正位", "正向表示"),
        ("半正位", "半正向表示"),
        ("半逆位", "半逆向表示"),
        ("逆位", "逆向表示")
    ]:
        text = r.get(field, "")
        if text:
            sentences.append(text)
            meta.append({
                "來源": "runes07",
                "符文名稱": r.get("名稱"),
                "方向": direction,
                "欄位": field
            })

# 2. 擷取 runes_all_data.json 的語句
with open('runes_all_data.json', 'r', encoding='utf-8') as f:
    all_data = json.load(f)

for item in all_data:
    # 這裡以 "建議" 欄位為例，若有多個欄位可自行擴充
    advice = item.get("建議", "")
    if advice:
        sentences.append(advice)
        meta.append({
            "來源": "runes_all_data",
            "符文名稱": item.get("符文名稱"),
            "符文月相": item.get("符文月相"),
            "真實月相": item.get("真實月相"),
            "方向": item.get("方向"),
            "主題": item.get("主題")
        })

# 3. 產生語意向量
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
embeddings = model.encode(sentences, show_progress_bar=True)

# 4. 儲存
np.save('combined_embeddings.npy', embeddings)
with open('combined_meta.json', 'w', encoding='utf-8') as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)
with open('sentences.json', 'r', encoding='utf-8') as f:
    sentences = json.load(f)
# ...
item['建議'] = sentences[best_idx]

print("語意向量與 meta 已儲存完成！")