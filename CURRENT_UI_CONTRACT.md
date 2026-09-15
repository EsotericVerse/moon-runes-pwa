# Current UI contract

Homepage title: LOC月典
Homepage explanation: 語言模型框架（Language Model Framework）

LOC navigation: 月之符文、脈絡、統計、文化、設定、搜尋、回月典首頁。
LunaRunes navigation: 抽牌、符文圖鑑、遊戲、符文脈絡、符文統計、符文文化、抽籤紀錄、搜尋、回月典首頁。

Homepage architecture: `LOC Model Architecture｜月典模型架構` renders exactly eight bilingual functional modules: LunaRunes、Context、Music、Literary、MultiMedia、Algorithm、Module、Culture. Methodologies are consolidated into Algorithm; Module packages algorithms with data and functions; Culture owns time, trajectory, trend and textual evolution. Governance is presented separately as governance discourse and must not be encoded as an architecture layer or as part of the eight-module diagram.
Homepage visual placement: the Start Here second column renders `/pics/LunaRunes.jpg`; `/pics/LOC-FrameworkPic.png` is the large flow diagram inside the later model-architecture section. Activating that diagram reveals eight floating module-menu options; smaller screens place the menu below the image.
Homepage moon-phase example: card phase `無` and real phase `空亡` remain distinct fields.

The current contract is enforced by `scripts/current-ui-contract.mjs` and the known-parity guard.
