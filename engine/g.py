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
                "英文": r.get("英文"),
                "顯化形式": r.get("顯化形式"),
                "關鍵詞": r.get("關鍵詞"),
                "靈魂咒語": r.get("靈魂咒語"),
                "靈魂課題": r.get("靈魂課題"),
                "實踐挑戰": r.get("實踐挑戰"),
                "所屬分組": r.get("所屬分組"),
                "月相": r.get("月相"),
                "陰暗面": r.get("陰暗面"),
                "反向關鍵字": r.get("反向關鍵字"),
                "反向含義": r.get("反向含義"),
                "正位": r.get("正向表示"),
                "半正位": r.get("半正向表示"),
                "半逆位": r.get("半逆向表示"),
                "逆位": r.get("逆向表示")
            })

# 2. 擷取 runes_all_data.json 的語句
import os

filename = 'runes_all_data.json'
if not os.path.exists(filename):
    print(f"檔案不存在：{filename}")
else:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
        print("檔案前100字：", content[:100])
        # 再嘗試解析
        import json
        data = json.loads(content)

def flatten_value(value):
    if isinstance(value, list):
        # 將 list 裡的 dict 轉成字串
        new_list = []
        for v in value:
            if isinstance(v, dict):
                # 假設你要取 'text' 欄位
                new_list.append(str(v.get('text', '')))
            else:
                new_list.append(str(v))
        return " ".join([s for s in new_list if s])
    elif isinstance(value, dict):
        # 如果直接是 dict，也取 'text'
        return str(value.get('text', ''))
    elif value is None:
        return ""
    else:
        return str(value)

advice_fields = ["符文名稱","符文月相","現在月相","卡牌方向","狀況形容", "狀況表達","每日占卜提醒","每日占卜引導","每日占卜祝福"]
for item in all_data:
    advice = []
    for key in advice_fields:
        value = item.get(key)
        advice.append(flatten_value(value))
    advice_text = " ".join([s for s in advice if s])
    if advice_text:
        sentences.append(advice_text)
        meta.append({
            "來源": "runes_all_data",
            "符文名稱": item.get("符文名稱"),
            "符文月相": item.get("符文月相"),
            "真實月相": item.get("現在月相"),
            "卡牌方向": item.get("卡牌方向"),
            "狀況形容": item.get("狀況形容"),
            "狀況表達": item.get("狀況表達"),
            "每日占卜提醒": item.get("每日占卜提醒"),
            "每日占卜引導": item.get("每日占卜引導"),
            "每日占卜祝福": item.get("每日占卜祝福")
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
