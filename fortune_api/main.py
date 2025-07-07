import sys
from fortune_engine import generate_fortune

if __name__ == "__main__":
    print("=== 月之符文 占卜語句產生引擎 ===")
    card_name = input("請輸入符文卡名稱（例如：彩）：").strip()

    print("請選擇卡牌方向：")
    print("1 - 正位")
    print("2 - 半正位")
    print("3 - 半逆位")
    print("4 - 逆位")
    direction_index = int(input("輸入數字（1-4）：").strip())

    print("請選擇當前月相：")
    print("1 - 新月")
    print("2 - 上弦")
    print("3 - 滿月")
    print("4 - 下弦")
    moon_index = int(input("輸入數字（1-4）：").strip())

    try:
        result = generate_fortune(card_name, direction_index, moon_index)
        print("\n占卜語句：")
        for line in result:
            print(line)
    except Exception as e:
        print("\n⚠️ 發生錯誤：", str(e))