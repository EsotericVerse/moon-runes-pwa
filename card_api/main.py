import json
import random
import requests
from zhdate import ZhDate
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

# 建立 FastAPI 應用
app = FastAPI(
    title="Rune Divination API",
    description="符文占卜 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 添加 CORS 中間件 (限制只允許來自 https://esotericverse.github.io 的請求)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://esotericverse.github.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 載入資料（全局，一次載入）
try:
    with open('new_runes.json', 'r', encoding='utf-8') as f:
        RUNES = json.load(f)
except Exception as e:
    RUNES = {"runes": []}
    print(f"Warning: Failed to load new_runes.json: {e}")

try:
    with open('runes_all_data.json', 'r', encoding='utf-8') as f:
        RUNE_SINGLE = json.load(f)
except Exception as e:
    RUNE_SINGLE = []
    print(f"Warning: Failed to load runes_all_data.json: {e}")

# 載入三卡組合表
try:
    with open('three_card_combinations.json', 'r', encoding='utf-8') as f:
        THREE_CARD_COMBINATIONS = json.load(f)
except Exception as e:
    THREE_CARD_COMBINATIONS = {}
    print(f"Warning: Failed to load three_card_combinations.json: {e}")

# 建立符文編號到資料的映射
RUNES_MAP = {r.get("編號", i): r for i, r in enumerate(RUNES.get("runes", []), 1)}
RUNE_SINGLE_MAP = {r.get("符文名稱", f"rune_{i}"): r for i, r in enumerate(RUNE_SINGLE)}

# 月相計算
def get_lunar_phase(date):
    try:
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
    except Exception:
        return "新月"

# 月相交互表（從文件第八章）
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

# 語氣評分系統
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

def select_keyword_by_tone(rune_keywords, tone):
    if not rune_keywords:
        return "未知"
    
    tone_preferred = TONE_KEYWORDS.get(tone, [])
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

def select_keyword(rune_id, direction, rune_keywords, tone):
    if not rune_keywords:
        return "未知"
    
    base_keyword = select_keyword_by_tone(rune_keywords, tone)
    
    if direction == 2:
        return f"初顯{base_keyword}"
    elif direction in [3, 4]:
        return f"過度{base_keyword}"
    return base_keyword

def select_reverse_meaning(rune_id, direction):
    rune = RUNES_MAP.get(rune_id, {})
    return rune.get("反向含義", "內在的阻滯需要溫柔面對")

def adjust_direction_combination(rune1_dir, rune2_dir):
    if rune1_dir == 1 and rune2_dir == 4:
        return {"結構": "你的{因}，引導{果}顯現", "語氣": "矛盾修正"}
    elif rune1_dir == 2 and rune2_dir == 3:
        return {"結構": "你的{因}，逐漸顯現需審慎面對{果}", "語氣": "平衡調整"}
    elif rune1_dir == 4 and rune2_dir == 4:
        return {"結構": "你的{因}，與{果}皆受阻需深度清理", "語氣": "深度療癒"}
    return {"結構": "你的{因}，引導{果}顯現", "語氣": "標準因果"}

def adjust_three_direction_combination(rune1_dir, rune2_dir, rune3_dir):
    dir_map = {1: "正", 2: "半正", 3: "半逆", 4: "逆"}
    key = f"{dir_map[rune1_dir]} + {dir_map[rune2_dir]} + {dir_map[rune3_dir]}"
    return THREE_CARD_COMBINATIONS.get(key, {"能量模式": "中性", "圖景意涵": ""})

def generate_divination(mode, rune1_id, rune1_dir, rune2_id, rune2_dir, rune3_id=None, rune3_dir=None, debug=False):
    if mode not in ["2", "2d", "3", "3d"]:
        raise ValueError("僅支援模式 2, 2d, 3 或 3d")
    if rune1_id == rune2_id or (mode in ["3", "3d"] and (rune1_id == rune3_id or rune2_id == rune3_id)):
        raise ValueError("符文不可重複")
    if rune1_id not in range(1, 65) or rune2_id not in range(1, 65) or (mode in ["3", "3d"] and rune3_id not in range(1, 65)):
        raise ValueError("符文編號必須在 1-64 之間")

    rune1 = RUNES_MAP.get(rune1_id, {})
    rune2 = RUNES_MAP.get(rune2_id, {})
    rune1_name = rune1.get("名稱", "未知")
    rune2_name = rune2.get("名稱", "未知")
    rune1_moon = rune1.get("月相", "未知")
    rune2_moon = rune2.get("月相", "未知")
    dir_map = {1: "正位", 2: "半正位", 3: "半逆位", 4: "逆位"}

    real_moon = get_lunar_phase(datetime.now())
    moon_interaction = MOON_INTERACTIONS.get(
        (real_moon, rune1_moon), 
        MOON_INTERACTIONS.get(
            (real_moon, rune2_moon), 
            {"語氣": "中性", "前綴": "請平和地面對"}
        )
    )

    if mode in ["2", "2d"]:
        rune1_keywords = (
            rune1.get("顯化形式", "").split("・") + rune1.get("關鍵詞", "").split("・")
        ) if rune1_dir in [1, 2] else (
            rune1.get("陰暗面", "").split("・") + rune1.get("反向關鍵詞", "").split("・")
        )
        rune2_keywords = (
            rune2.get("顯化形式", "").split("・") + rune2.get("關鍵詞", "").split("・")
        ) if rune2_dir in [1, 2] else (
            rune2.get("陰暗面", "").split("・") + rune2.get("反向關鍵詞", "").split("・")
        )
        
        rune1_keywords = [k for k in rune1_keywords if k.strip()]
        rune2_keywords = [k for k in rune2_keywords if k.strip()]
        
        cause = select_keyword(rune1_id, rune1_dir, rune1_keywords, moon_interaction['語氣'])
        effect = select_keyword(rune2_id, rune2_dir, rune2_keywords, moon_interaction['語氣'])
        
        target1 = select_reverse_meaning(rune1_id, rune1_dir) if rune1_dir in [3, 4] else ACTION_KEYWORDS['goal'][0]
        target2 = select_reverse_meaning(rune2_id, rune2_dir) if rune2_dir in [3, 4] else ACTION_KEYWORDS['goal'][0]
        
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

    elif mode in ["3", "3d"]:
        if rune3_id is None or rune3_dir is None:
            raise ValueError("模式 3 需要三張符文")
        
        rune3 = RUNES_MAP.get(rune3_id, {})
        rune3_name = rune3.get("名稱", "未知")
        rune3_moon = rune3.get("月相", "未知")
        
        moon_interaction = MOON_INTERACTIONS.get(
            (real_moon, rune1_moon), 
            {"語氣": "中性", "前綴": "請平和地面對"}
        )
        
        rune1_keywords = (
            rune1.get("顯化形式", "").split("・") + rune1.get("關鍵詞", "").split("・")
        ) if rune1_dir in [1, 2] else (
            rune1.get("陰暗面", "").split("・") + rune1.get("反向關鍵詞", "").split("・")
        )
        rune2_keywords = (
            rune2.get("顯化形式", "").split("・") + rune2.get("關鍵詞", "").split("・")
        ) if rune2_dir in [1, 2] else (
            rune2.get("陰暗面", "").split("・") + rune2.get("反向關鍵詞", "").split("・")
        )
        rune3_keywords = (
            rune3.get("顯化形式", "").split("・") + rune3.get("關鍵詞", "").split("・")
        ) if rune3_dir in [1, 2] else (
            rune3.get("陰暗面", "").split("・") + rune3.get("反向關鍵詞", "").split("・")
        )
        
        rune1_keywords = [k for k in rune1_keywords if k.strip()]
        rune2_keywords = [k for k in rune2_keywords if k.strip()]
        rune3_keywords = [k for k in rune3_keywords if k.strip()]
        
        source = select_keyword(rune1_id, rune1_dir, rune1_keywords, moon_interaction['語氣'])
        transition = select_keyword(rune2_id, rune2_dir, rune2_keywords, moon_interaction['語氣'])
        effect = select_keyword(rune3_id, rune3_dir, rune3_keywords, moon_interaction['語氣'])
        
        target1 = select_reverse_meaning(rune1_id, rune1_dir) if rune1_dir in [3, 4] else ACTION_KEYWORDS['goal'][0]
        target2 = select_reverse_meaning(rune2_id, rune2_dir) if rune2_dir in [3, 4] else ACTION_KEYWORDS['goal'][0]
        target3 = select_reverse_meaning(rune3_id, rune3_dir) if rune3_dir in [3, 4] else ACTION_KEYWORDS['goal'][0]
        
        direction_comb = adjust_three_direction_combination(rune1_dir, rune2_dir, rune3_dir)
        explanation = f"你正處於{source}，經歷{transition}，將{effect}。"
        
        conclusion = f"{moon_interaction['前綴']}：{target3 if rune3_dir in [3, 4] else ACTION_KEYWORDS['goal'][0]}。"
        
        result = {
            "完整現況": f"您抽的符文有三張：{rune1_name}之符文（{dir_map[rune1_dir]}）、{rune2_name}之符文（{dir_map[rune2_dir]}）和{rune3_name}之符文（{dir_map[rune3_dir]}）。",
            "牌面解說": explanation,
            "占卜結論": conclusion
        }
        
        if debug:
            result["源"] = source
            result["轉"] = transition
            result["合"] = effect
            result["現在月相"] = real_moon
            result["語氣"] = moon_interaction['語氣']
            result["圖景意涵"] = direction_comb['圖景意涵']
        
        return result

# 定義輸入模型
class RuneInput(BaseModel):
    mode: str
    rune1_id: int
    rune1_dir: int
    rune2_id: int
    rune2_dir: int
    rune3_id: int | None = None
    rune3_dir: int | None = None
    debug: bool = False

# 根路由 - 健康檢查
@app.get("/")
async def root():
    return {
        "status": "healthy",
        "message": "Rune Divination API",
        "version": "1.0.0",
        "endpoints": {
            "divination": "/divination",
            "health": "/health",
            "docs": "/docs"
        }
    }

# 健康檢查端點
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "runes_loaded": len(RUNES_MAP),
        "single_runes_loaded": len(RUNE_SINGLE_MAP)
    }

# API 端點
@app.post("/divination")
async def divination(input: RuneInput):
    try:
        if input.mode not in ["2", "2d", "3", "3d"]:
            raise ValueError("僅支援模式 2, 2d, 3 或 3d")
        if input.rune1_id == input.rune2_id:
            raise ValueError("符文不可重複")
        if input.mode in ["3", "3d"]:
            if input.rune3_id is None or input.rune3_dir is None:
                raise ValueError("模式 3 需要三張符文")
            if input.rune1_id == input.rune3_id or input.rune2_id == input.rune3_id:
                raise ValueError("符文不可重複")
        if input.rune1_id not in range(1, 65) or input.rune2_id not in range(1, 65) or (input.mode in ["3", "3d"] and input.rune3_id not in range(1, 65)):
            raise ValueError("符文編號必須在 1-64 之間")
        if input.rune1_dir not in [1, 2, 3, 4] or input.rune2_dir not in [1, 2, 3, 4] or (input.mode in ["3", "3d"] and input.rune3_dir not in [1, 2, 3, 4]):
            raise ValueError("無效的方向")
        
        result = generate_divination(
            input.mode,
            input.rune1_id,
            input.rune1_dir,
            input.rune2_id,
            input.rune2_dir,
            input.rune3_id,
            input.rune3_dir,
            input.debug
        )
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"內部錯誤: {str(e)}")

# 測試端點
@app.get("/test")
async def test_endpoint():
    return {
        "message": "API 測試成功",
        "current_time": datetime.now().isoformat(),
        "moon_phase": get_lunar_phase(datetime.now())
    }

# 新增代理端點：用來代理前端載入 runes64.json（解決 CORS 問題）
@app.get("/get-runes64")
async def get_runes64():
    try:
        with open('runes64.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Vercel handler
try:
    from mangum import Mangum
    handler = Mangum(app)
except ImportError:
    def handler(event, context):
        return {
            "statusCode": 200,
            "body": json.dumps({"error": "Mangum not installed"})
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)