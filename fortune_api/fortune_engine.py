import pandas as pd
import os

# 載入資料（路徑預設為當前資料夾）
FILE_PATH = os.path.join(os.path.dirname(__file__), 'LunaRune64.xlsx')
df_direction = pd.read_excel(FILE_PATH, sheet_name='Direction')
df_history = pd.read_excel(FILE_PATH, sheet_name='History')
df_moon = pd.read_excel(FILE_PATH, sheet_name='Moon')

# 模板轉換器（方向語句 → 你 的句型）
def convert_to_you_statement(text: str) -> str:
    if text.startswith("我"):
        return "你" + text[1:]
    return text

# 結語生成器（依分組給提示）
def generate_conclusion_hint(group: str) -> str:
    if group == "靈魂":
        return "你可以試著相信，那些模糊的聲音其實是靈魂的訊號。"
    elif group == "礦物":
        return "你可以試著相信，時間與堅持正在慢慢塑造你的核心。"
    elif group == "生命":
        return "你可以試著相信，當下的脆弱也是你成長的節奏之一。"
    elif group == "元素":
        return "你可以試著相信，情緒如風，終會吹散厚重的雲。"
    elif group == "無序":
        return "你可以試著相信，混亂背後也有你未察覺的契機。"
    elif group == "秩序":
        return "你可以試著相信，宇宙的規律會在適當時刻帶來指引。"
    elif group == "自然":
        return "你可以試著相信，大自然的節奏會在你體內悄悄回應。"
    elif group == "連結":
        return "你可以試著相信，真正的理解有時源自誤解的裂縫。"
    else:
        return "你可以試著相信，這一切的安排都有其未明的用意。"

# 主函式（改為三句式）
def generate_fortune(card_name: str, direction_index: int, moon_index: int) -> list:
    # 查找方向語句
    dir_row = df_direction[df_direction['名稱'] == card_name].iloc[0]
    valid_directions = {
        1: "正向表示",
        2: "半正向表示",
        3: "半逆向表示",
        4: "逆向表示"
    }
    if direction_index not in valid_directions:
        raise ValueError(f"方向輸入錯誤：{direction}。請使用以下選項：{list(valid_directions.keys())}")
    dir_key = valid_directions[direction_index]
    direction_text = dir_row[dir_key]

    # 查找卡牌屬性
    info_row = df_history[df_history['名稱'] == card_name].iloc[0]
    group = info_row['所屬分組']
    card_moon = info_row['月相']
    group_desc = info_row['分組說明']

    # 月相組合語句
    valid_moons = {
        1: "新月",
        2: "上弦",
        3: "滿月",
        4: "下弦"
    }
    if moon_index not in valid_moons:
        raise ValueError(f"月相輸入錯誤：{moon_index}。請使用以下選項：{list(valid_moons.keys())}")
    real_moon_phase = valid_moons[moon_index]
    _ = df_moon.loc[df_moon['Unnamed: 0'] == card_moon, real_moon_phase].values[0]

    # 三段語句
    primary = convert_to_you_statement(direction_text)
    summary = f"這張牌與{group_desc.strip('。').replace('，', '、')}有關。"
    hint = generate_conclusion_hint(group)

    return [primary, summary, hint]
