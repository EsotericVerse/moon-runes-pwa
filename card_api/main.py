import json
import thulac
from transformers import T5Tokenizer, T5ForConditionalGeneration
from zhdate import ZhDate
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# 載入資料（全局，一次載入）
with open('new_runes.json', 'r', encoding='utf-8') as f:
    RUNES = json.load(f)
with open('runes_all_data.json', 'r', encoding='utf-8') as f:
    RUNE_SINGLE = json.load(f)

# 建立符文編號到資料的映射
RUNES_MAP = {r["編號"]: r for r in RUNES["runes"]}
RUNE_SINGLE_MAP = {r["符文名稱"]: r for r in RUNE_SINGLE}

# 初始化 THULAC
thulac_model = thulac.thulac(seg_only=True)

# 預載 T5 模型和 tokenizer（全局，一次載入）
tokenizer = T5Tokenizer.from_pretrained("Langboat/mengzi-t5-base", legacy=True)
model = T5ForConditionalGeneration.from_pretrained("Langboat/mengzi-t5-base")

# 月相計算
def get_lunar_phase(date):
    zh_date = ZhDate.from_datetime(date)
    lunar_day = zh_date.lunar_day
    if lunar_day in range(1, 8):
        return "新月"
    elif lunar_day in range(8, 15):
        return "上弦"
    elif lunar_day in range(15, 22):
        return "滿月"
    elif lunar_day in range(22, 29):
        return "下弦"
    else:
        return "空亡"

# 月相交互表
MOON_INTERACTIONS = {
    ("新月", "新月"): {"語氣": "啟發性積極", "前綴": "請積極地面對"},
    ("新月", "上弦"): {"語氣": "謹慎引導", "前綴": "請謹慎地面對"},
    ("新月", "滿月"): {"語氣": "耐心等待", "前綴": "請耐心地等待"},
    ("新月", "下弦"): {"語氣": "溫和警醒", "前綴": "請溫和地面對"},
    ("新月", "空亡"): {"語氣": "深邃內省", "前綴": "請深入地面對"},
    ("上弦", "新月"): {"語氣": "謹慎引導", "前綴": "請謹慎地面對"},
    ("上弦", "上弦"): {"語氣": "積極突破", "前綴": "請積極地面對"},
    ("上弦", "滿月"): {"語氣": "高壓評估", "前綴": "請審慎地面對"},
    ("上弦", "下弦"): {"語氣": "矛盾疲憊", "前綴": "請溫和地面對"},
    ("上弦", "空亡"): {"語氣": "內省調整", "前綴": "請深入地面對"},
    ("滿月", "新月"): {"語氣": "低調觀察", "前綴": "請耐心地等待"},
    ("滿月", "上弦"): {"語氣": "積極推進", "前綴": "請積極地面對"},
    ("滿月", "滿月"): {"語氣": "顯化高峰", "前綴": "請積極地面對"},
    ("滿月", "下弦"): {"語氣": "價值檢視", "前綴": "請溫和地面對"},
    ("滿月", "空亡"): {"語氣": "內省調整", "前綴": "請深入地面對"},
    ("下弦", "新月"): {"語氣": "溫和警醒", "前綴": "請溫和地面對"},
    ("下弦", "上弦"): {"語氣": "矛盾疲憊", "前綴": "請溫和地面對"},
    ("下弦", "滿月"): {"語氣": "刺眼檢討", "前綴": "請審慎地面對"},
    ("下弦", "下弦"): {"語氣": "深度釋放", "前綴": "請溫和地面對"},
    ("下弦", "空亡"): {"語氣": "終章內省", "前綴": "請深入地面對"}
}

# 分組語氣
GROUP_TONES = {
    "靈魂": {"語氣": "沉靜內省", "句型": "你的{關鍵詞}指引你：{目標}"},
    "連結": {"語氣": "平衡引導", "句型": "你的{關鍵詞}帶領你：{目標}"},
    "生命": {"語氣": "感性共鳴", "句型": "你的{關鍵詞}喚醒你：{目標}"},
    "礦物": {"語氣": "沉重思辨", "句型": "你的{關鍵詞}啟示你：{目標}"},
    "元素": {"語氣": "動態強烈", "句型": "你的{關鍵詞}激發你：{目標}"},
    "自然": {"語氣": "柔和流動", "句型": "你的{關鍵詞}引導你：{目標}"},
    "秩序": {"語氣": "理性克制", "句型": "你的{關鍵詞}促使你：{目標}"},
    "無序": {"語氣": "劇烈轉折", "句型": "你的{關鍵詞}觸發你：{目標}"},
    "個人": {"語氣": "深邃引導", "句型": "你的{關鍵詞}引領你：{目標}"}
}

# 定義 ACTION_KEYWORDS
ACTION_KEYWORDS = {
    "goal": ["成長", "進展", "實現"]
}

# 輸入提示生成（雙卡，模式 2 或 2d）
def create_prompt(mode, rune1_id, rune1_dir, rune2_id, rune2_dir, debug=False):
    if mode not in ["2", "2d"]:
        raise ValueError("僅支援模式 2 或 2d")
    if rune1_id == rune2_id:
        raise ValueError("符文不可重複")
    if rune1_id not in range(1, 65) or rune2_id not in range(1, 65):
        raise ValueError("符文編號必須在 1-64 之間")
    
    rune1 = RUNES_MAP.get(rune1_id, {})
    rune2 = RUNES_MAP.get(rune2_id, {})
    rune1_name = rune1.get("名稱", "未知")
    rune2_name = rune2.get("名稱", "未知")
    rune1_moon = rune1.get("月相", "未知")
    rune2_moon = rune2.get("月相", "未知")
    rune1_group = rune1.get("所屬分組", "未知")
    rune2_group = rune2.get("所屬分組", "未知")
    dir_map = {1: "正位", 2: "半正位", 3: "半逆位", 4: "逆位"}
    
    real_moon = get_lunar_phase(datetime.now())
    moon_interaction = MOON_INTERACTIONS.get((real_moon, rune1_moon), MOON_INTERACTIONS.get((real_moon, rune2_moon), {"語氣": "中性", "前綴": ""}))
    
    # 修正關鍵詞來源
    rune1_keywords = (rune1.get("顯化形式", "").split("・") + rune1.get("關鍵詞", "").split("・")) if rune1_dir in [1, 2] else (rune1.get("陰暗面", "").split("・") + rune1.get("反向關鍵詞", "").split("・"))
    rune2_keywords = (rune2.get("顯化形式", "").split("・") + rune2.get("關鍵詞", "").split("・")) if rune2_dir in [1, 2] else (rune2.get("陰暗面", "").split("・") + rune2.get("反向關鍵詞", "").split("・"))
    
    # 定義 target
    target1 = select_reverse_meaning(rune1_id, rune1_dir) if rune1_dir in [3, 4] else ACTION_KEYWORDS['goal'][0]
    target2 = select_reverse_meaning(rune2_id, rune2_dir) if rune2_dir in [3, 4] else ACTION_KEYWORDS['goal'][0]
    
    prompt = f"""
    模式: {mode}
    符文1: {rune1_name}, {dir_map[rune1_dir]}, 月相: {rune1_moon}, 分組: {rune1_group}, 關鍵詞: {', '.join(rune1_keywords)}
    符文2: {rune2_name}, {dir_map[rune2_dir]}, 月相: {rune2_moon}, 分組: {rune2_group}, 關鍵詞: {', '.join(rune2_keywords)}
    現實月相: {real_moon}
    語氣: {moon_interaction['語氣']}
    前綴: {moon_interaction['前綴']}
    生成: 因, 果, 完整現況, 牌面解說, 占卜結論
    要求: 
    - 從符文1關鍵詞（{', '.join(rune1_keywords)}）中選擇與{moon_interaction['語氣']}最匹配的關鍵詞作為 cause。
    - 從符文2關鍵詞（{', '.join(rune2_keywords)}）中選擇與{moon_interaction['語氣']}最匹配的關鍵詞作為 effect。
    - 完整現況：格式為「您抽的符文有兩張：{rune1_name}（{dir_map[rune1_dir]}）和{rune2_name}（{dir_map[rune2_dir]}）。」
    - 牌面解說：格式為「你的{{cause}}，引導{{effect}}顯現」，使用逗號分隔 cause 和引導，結尾單個句號。
    - 占卜結論：格式為「{moon_interaction['前綴']}：{{target1 if rune1_dir in [3, 4] else target2}}」，結尾單個句號，無其他內容。
    """
    return prompt, rune1_keywords, rune2_keywords, target1, target2

# 關鍵詞選擇邏輯（使用 T5 模型）
def select_keyword(rune_id, direction, rune_keywords, tone):
    if not rune_keywords:
        return "未知"
    
    # 簡化 prompt 僅用於關鍵詞選擇
    prompt = f"""
    語氣: {tone}
    關鍵詞: {', '.join(rune_keywords)}
    要求: 從關鍵詞（{', '.join(rune_keywords)}）中選擇與語氣 {tone} 最匹配的關鍵詞。
    輸出格式: 關鍵詞: {{選中的關鍵詞}}
    """
    inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
    outputs = model.generate(inputs["input_ids"], max_length=50, num_beams=5, early_stopping=True)
    result = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    try:
        # 假設 T5 輸出格式為 "關鍵詞: 某關鍵詞"
        keyword = result.split(": ")[1].strip() if result.startswith("關鍵詞: ") else rune_keywords[0]
        if keyword in rune_keywords:
            base_keyword = keyword
        else:
            base_keyword = rune_keywords[0]
    except:
        base_keyword = rune_keywords[0]
    
    if direction == 2:
        return f"初顯{base_keyword}"
    elif direction in [3, 4]:
        return f"過度{base_keyword}"
    return base_keyword

# 語句生成（雙卡，模式 2 或 2d）
def generate_divination(mode, rune1_id, rune1_dir, rune2_id, rune2_dir, debug=False):
    if mode not in ["2", "2d"]:
        raise ValueError("僅支援模式 2 或 2d")
    if rune1_id == rune2_id:
        raise ValueError("符文不可重複")
    if rune1_id not in range(1, 65) or rune2_id not in range(1, 65):
        raise ValueError("符文編號必須在 1-64 之間")
    
    prompt, rune1_keywords, rune2_keywords, target1, target2 = create_prompt(mode, rune1_id, rune1_dir, rune2_id, rune2_dir, debug)
    inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
    outputs = model.generate(inputs["input_ids"], max_length=100, num_beams=5, early_stopping=True)
    result = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    rune1 = RUNES_MAP.get(rune1_id, {})
    rune2 = RUNES_MAP.get(rune2_id, {})
    rune1_name = rune1.get("名稱", "未知")
    rune2_name = rune2.get("名稱", "未知")
    rune1_moon = rune1.get("月相", "未知")
    rune2_moon = rune2.get("月相", "未知")
    rune1_group = rune1.get("所屬分組", "未知")
    rune2_group = rune2.get("所屬分組", "未知")
    dir_map = {1: "正位", 2: "半正位", 3: "半逆位", 4: "逆位"}
    real_moon = get_lunar_phase(datetime.now())
    moon_interaction = MOON_INTERACTIONS.get((real_moon, rune1_moon), MOON_INTERACTIONS.get((real_moon, rune2_moon), {"語氣": "中性", "前綴": ""}))
    
    # 使用 T5 模型選擇關鍵詞
    cause = select_keyword(rune1_id, rune1_dir, rune1_keywords, moon_interaction['語氣'])
    effect = select_keyword(rune2_id, rune2_dir, rune2_keywords, moon_interaction['語氣'])
    
    # 使用 T5 模型輸出作為補充
    try:
        lines = result.split("\n")
        nlp_cause = lines[0].split(": ")[1].strip() if len(lines) > 0 and lines[0].startswith("因: ") else cause
        nlp_effect = lines[1].split(": ")[1].strip() if len(lines) > 1 and lines[1].startswith("果: ") else effect
        nlp_explanation = lines[2] if len(lines) > 2 else ""
        nlp_conclusion = lines[3] if len(lines) > 3 else ""
        # 放寬檢查條件，確保 T5 輸出被採用
        if (nlp_explanation and nlp_explanation.startswith("你的") and "," in nlp_explanation 
            and nlp_explanation.endswith("顯現") and nlp_conclusion 
            and nlp_conclusion.startswith(moon_interaction['前綴']) 
            and ":" in nlp_conclusion and nlp_conclusion.endswith("。")
            and nlp_cause in rune1_keywords and nlp_effect in rune2_keywords):
            cause = nlp_cause
            effect = nlp_effect
            explanation = nlp_explanation
            conclusion = nlp_conclusion
        else:
            raise ValueError("NLP 輸出格式不正確")
    except:
        # 回退到模板拼接
        direction_comb = adjust_direction_combination(rune1_dir, rune2_dir)
        explanation = direction_comb["結構"].format(因=cause, 果=effect)
        if rune1_dir in [3, 4]:
            conclusion = f"{moon_interaction['前綴']}：{target1}。"
        elif rune2_dir in [3, 4]:
            conclusion = f"{moon_interaction['前綴']}：{target2}。"
        else:
            conclusion = f"{moon_interaction['前綴']}：{ACTION_KEYWORDS['goal'][0]}。"

    
    result = {
        "完整現況": f"您抽的符文有兩張：{rune1_name}之符文（{dir_map[rune1_dir]}）和{rune2_name}之符文（{dir_map[rune2_dir]}）。",
        "牌面解說": explanation,
        "占卜結論": conclusion
    }
    if debug:
        result["因"] = cause
        result["果"] = effect
        result["現在月相"] = get_lunar_phase(datetime.now())
    
    return result

# 反向含義選擇
def select_reverse_meaning(rune_id, direction):
    rune = RUNES_MAP.get(rune_id, {})
    return rune.get("反向含義", "內在的阻滯需要溫柔面對")

# 分組語氣調整
def adjust_group_tone(rune1_group, rune2_group):
    if rune1_group == rune2_group:
        return {"張力": "低", "語氣": GROUP_TONES[rune1_group]["語氣"], "句型": GROUP_TONES[rune1_group]["句型"]}
    elif (rune1_group, rune2_group) in [("靈魂", "礦物"), ("元素", "無序"), ("秩序", "無序")]:
        return {"張力": "高", "語氣": "沉重思辨" if rune1_group == "靈魂" else "劇烈轉折", "句型": "你的{關鍵詞}啟示你：{目標}"}
    else:
        return {"張力": "中", "語氣": "平衡引導", "句型": "你的{關鍵詞}帶領你：{目標}"}

# 方向組合調整
def adjust_direction_combination(rune1_dir, rune2_dir):
    if rune1_dir == 1 and rune2_dir == 4:
        return {"結構": "你的{因}，引導{果}顯現", "語氣": "矛盾修正"}
    elif rune1_dir == 2 and rune2_dir == 3:
        return {"結構": "你的{因}，逐漸顯現需審慎面對{果}", "語氣": "平衡調整"}
    elif rune1_dir == 4 and rune2_dir == 4:
        return {"結構": "你的{因}，與{果}皆受阻需深度清理", "語氣": "深度療癒"}
    return {"結構": "你的{因}，引導{果}顯現", "語氣": "標準因果"}

# FastAPI 應用
app = FastAPI()

# 定義輸入模型
class RuneInput(BaseModel):
    mode: str
    rune1_id: int
    rune1_dir: int
    rune2_id: int
    rune2_dir: int
    debug: bool = False  # 預設 False

# API 端點
@app.post("/divination")
def divination(input: RuneInput):
    try:
        # 驗證輸入
        if input.mode not in ["2", "2d"]:
            raise ValueError("僅支援模式 2 或 2d")
        if input.rune1_id == input.rune2_id:
            raise ValueError("符文不可重複")
        if input.rune1_id not in range(1, 65) or input.rune2_id not in range(1, 65):
            raise ValueError("符文編號必須在 1-64 之間")
        if input.rune1_dir not in [1, 2, 3, 4] or input.rune2_dir not in [1, 2, 3, 4]:
            raise ValueError("無效的方向")
        
        # 呼叫生成函數
        result = generate_divination(input.mode, input.rune1_id, input.rune1_dir, input.rune2_id, input.rune2_dir, input.debug)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"內部錯誤: {str(e)}")

# 啟動伺服器（本地測試用）
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
 
from mangum import Mangum

handler = Mangum(app)