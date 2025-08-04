import os
import json

# 複製 g.py 的 flatten_value 函數
def flatten_value(value):
    if isinstance(value, list):
        new_list = []
        for v in value:
            if isinstance(v, dict) and v:
                new_list.append(str(list(v.values())[0]))
            else:
                new_list.append(str(v))
        return " ".join([s for s in new_list if s])
    elif isinstance(value, dict) and value:
        return str(list(value.values())[0])
    elif value is None:
        return ""
    else:
        return str(value)

# 初始化訓練資料
train_data = []

# 1. 處理 runes07.json
try:
    with open('runes07.json', 'r', encoding='utf-8') as f:
        runes07 = json.load(f)
    for r in runes07:
        rune = r if isinstance(r, dict) else r[0] if isinstance(r, list) and r else {}
        if not isinstance(rune, dict):
            print(f"警告：runes07.json 項目無效，跳過：{r}")
            continue
        for direction, field in [
            ("正位", "正向表示"),
            ("半正位", "半正向表示"),
            ("半逆位", "半逆向表示"),
            ("逆位", "逆向表示")
        ]:
            text = rune.get(field, "")
            if text:
                prompt = f"符文名稱：{rune.get('名稱')}，英文名稱：{rune.get('英文')}，所屬分組：{rune.get('所屬分組')}，符文月相：{rune.get('月相')}, 方向：{direction} 。"
                completion = text
                train_data.append({"prompt": prompt, "completion": completion})
        prompt = f"符文名稱：{rune.get('名稱')}，英文名稱：{rune.get('英文')}，所屬分組：{rune.get('所屬分組')}，符文月相：{rune.get('月相')}, 靈魂咒語：{rune.get('靈魂咒語')} 。"
        
except FileNotFoundError:
    print("錯誤：runes07.json 不存在，請確認檔案路徑！")
except json.JSONDecodeError:
    print("錯誤：runes07.json 格式無效，請檢查 JSON 內容！")
except Exception as e:
    print(f"處理 runes07.json 時發生錯誤：{str(e)}")

# 2. 處理 runes_all_data.json
try:
    with open('runes_all_data.json', 'r', encoding='utf-8') as f:
        all_data = json.load(f)
    advice_fields = ["現在月相", "狀況形容", "狀況表達", "每日占卜提醒", "每日占卜祝福"]
    for item in all_data:
        if not isinstance(item, dict):
            print(f"警告：runes_all_data.json 項目無效，結構：{item}")
            continue
        rune_name = flatten_value(item.get('符文名稱', '未知'))
        rune_moon = flatten_value(item.get('符文月相', '未知'))
        directions = item.get('卡牌方向', []) if isinstance(item.get('卡牌方向'), list) else []
        for dir_item in directions:
            if not isinstance(dir_item, dict):
                print(f"警告：卡牌方向項目無效，結構：{dir_item}")
                continue
            direction = flatten_value(dir_item.get('方向', '未知'))
            situations = dir_item.get('現況', []) if isinstance(dir_item.get('現況'), list) else []
            for situation in situations:
                if not isinstance(situation, dict):
                    print(f"警告：現況項目無效，結構：{situation}")
                    continue
                # 合併現況
                advice = [flatten_value(situation.get(field)) for field in advice_fields]
                advice_text = " ".join([s for s in advice if s])
                if advice_text:
                    prompt = (
                        f"符文名稱：{rune_name}，符文月相：{rune_moon}，"
                        f"卡牌方向：{direction}。"
                    )
                    completion = advice_text
                    train_data.append({"prompt": prompt, "completion": completion})
                else:
                    print(f"警告：項目無有效現況欄位，結構：{situation}")
except FileNotFoundError:
    print("錯誤：runes_all_data.json 不存在，請確認檔案路徑！")
except json.JSONDecodeError:
    print("錯誤：runes_all_data.json 格式無效，請檢查 JSON 內容！")
except Exception as e:
    print(f"處理 runes_all_data.json 時發生錯誤：{str(e)}")

# 儲存訓練專用檔案
with open('training_data.json', 'w', encoding='utf-8') as f:
    json.dump(train_data, f, ensure_ascii=False, indent=2)

print(f"訓練專用檔案 training_data.json 已生成，總筆數：{len(train_data)}")