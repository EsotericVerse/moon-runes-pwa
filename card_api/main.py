import json
import random
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

# 定義 ACTION_KEYWORDS
ACTION_KEYWORDS = {
    "goal": ["成長", "進展", "實現"]
}

# 語氣評分系統 (替代AI模型)
TONE_KEYWORDS = {
    "啟發性積極": ["創造", "啟動", "新生", "機會", "突破"],
    "謹慎引導": ["平衡", "調和", "穩定", "保護", "引導"],
    "耐心等待": ["耐心", "等待", "累積", "沉澱", "醞釀"],
    "溫和警醒": ["溫和", "理解", "包容", "療癒", "釋放"],
    "深邃內省": ["內省", "深層", "靈性", "覺醒", "轉化"],
    "積極突破": ["行動", "勇氣", "前進", "衝刺", "力量"],
    "高壓評估": ["評估", "檢視", "決斷", "責任", "承擔"],
    "矛盾疲憊": ["休息", "緩解", "調整", "重整", "恢復"],
    "內省調整": ["反思", "調整", "修正", "整理", "清理"],
    "低調觀察": ["觀察", "學習", "理解", "接納", "順應"],
    "積極推進": ["推進", "展開", "發展", "實踐", "成就"],
    "顯化高峰": ["顯化", "成果", "豐收", "完成", "滿足"],
    "價值檢視": ["價值", "意義", "選擇", "捨棄", "重新定義"],
    "刺眼檢討": ["檢討", "面對", "承認", "改變", "突破"],
    "深度釋放": ["釋放", "放下", "清除", "淨化", "重生"],
    "終章內省": ["結束", "總結", "昇華", "轉換", "新開始"],
    "中性": ["平衡", "中庸", "和諧", "適度", "穩定"]
}

# 關鍵詞選擇邏輯（不使用AI模型）
def select_keyword_by_tone(rune_keywords, tone):
    if not rune_keywords:
        return "未知"
    
    tone_preferred = TONE_KEYWORDS.get(tone, [])
    
    # 計算每個關鍵詞的匹配分數
    best_keyword = rune_keywords[0]
    best_score = 0
    
    for keyword in rune_keywords:
        score = 0
        for preferred in tone_preferred:
            if preferred in keyword:
                score += 2
            elif any(char in keyword for char in preferred):
                score += 1
        
        if score > best_score:
            best_score = score
            best_keyword = keyword
    
    return best_keyword

# 關鍵詞選擇邏輯（使用基於規則的方法替代T5模型）
def select_keyword(rune_id, direction, rune_keywords, tone):
    if not rune_keywords:
        return "未知"
    
    base_keyword = select_keyword_by_tone(rune_keywords, tone)
    
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
    
    rune1 = RUNES_MAP.get(rune1_id, {})
    rune2 = RUNES_MAP.get(rune2_id, {})
    rune1_name = rune1.get("名稱", "未知")
    rune2_name = rune2.get("名稱", "未知")
    rune1_moon = rune1.get("月相", "未知")
    rune2_moon = rune2.get("月相", "未知")
    dir_map = {1: "正位", 2: "半正位", 3: "半逆位", 4: "逆位"}
    
    real_moon = get_lunar_phase(datetime.now())
    moon_interaction = MOON_INTERACTIONS.get((real_moon, rune1_moon), MOON_INTERACTIONS.get((real_moon, rune2_moon), {"語氣": "中性", "前綴": "請平和地面對"}))
    
    # 修正關鍵詞來源
    rune1_keywords = (rune1.get("顯化形式", "").split("・") + rune1.get("關鍵詞", "").split("・")) if rune1_dir in [1, 2] else (rune1.get("陰暗面", "").split("・") + rune1.get("反向關鍵詞", "").split("・"))
    rune2_keywords = (rune2.get("顯化形式", "").split("・") + rune2.get("關鍵詞", "").split("・")) if rune2_dir in [1, 2] else (rune2.get("陰暗面", "").split("・") + rune2.get("反向關鍵詞", "").split("・"))
    
    # 清理空字符串
    rune1_keywords = [k for k in rune1_keywords if k.strip()]
    rune2_keywords = [k for k in rune2_keywords if k.strip()]
    
    # 使用基於規則的方法選擇關鍵詞
    cause = select_keyword(rune1_id, rune1_dir, rune1_keywords, moon_interaction['語氣'])
    effect = select_keyword(rune2_id, rune2_dir, rune2_keywords, moon_interaction['語氣'])
    
    # 定義 target
    target1 = select_reverse_meaning(rune1_id, rune1_dir) if rune1_dir in [3, 4] else ACTION_KEYWORDS['goal'][0]
    target2 = select_reverse_meaning(rune2_id, rune2_dir) if rune2_dir in [3, 4] else ACTION_KEYWORDS['goal'][0]
    
    # 生成解釋和結論
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
        result["語氣"] = moon_interaction['語氣']
    
    return result

# 反向含義選擇
def select_reverse_meaning(rune_id, direction):
    rune = RUNES_MAP.get(rune_id, {})
    return rune.get("反向含義", "內在的阻滯需要溫柔面對")

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
    debug: bool = False

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

# 健康檢查端點
@app.get("/")
def health_check():
    return {"status": "healthy", "message": "Rune Divination API"}

# Vercel handler
from mangum import Mangum
handler = Mangum(app)