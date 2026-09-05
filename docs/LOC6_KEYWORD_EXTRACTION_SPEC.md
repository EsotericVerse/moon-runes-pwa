# LOC6 Keyword Extraction Spec v0.1

## 目的

LOC6 的關鍵字庫以「低 API 依賴、可重跑、可追溯」為原則。大量資料建置不得依賴雲端 LLM；雲端模型只處理少量高價值、模糊或衝突案例。

## 資料優先序

1. 原始 Threads corpus
2. ChatGPT 對話紀錄文件
3. 小說、歌曲、Reels 與其他作品
4. Canon／整理稿

Canon 是治理結果，不反過來覆蓋原始證據。

## 三層詞彙模型

### Surface Term
原文實際出現的詞或短語。只描述「寫了什麼」，不直接等同概念。

### Concept
由多個 Surface Term、文章脈絡與時間分布支持的抽象概念。

### Canonical Concept
經人工治理後的穩定概念節點。用於跨來源、跨 ERA 與後續 Graph 關聯。

## 建置流程

```
Raw corpus
  ↓
Normalize / de-noise
  ↓
Document segmentation
  ↓
Corpus-derived phrase discovery
  ↓
Candidate ranking
  ↓
ERA distribution / source distribution
  ↓
Human review
  ↓
Concept normalization
  ↓
Canonical keyword registry
```

### Level 0：零 API
- Unicode／Meta export 編碼修正
- 主貼文與 reply 分離
- URL、純連結、極短低資訊內容標記
- CJK 2–6 字 n-gram 候選
- TF / document frequency / ERA spread
- 規則式停用片段
- 產出候選詞 CSV / JSON

### Level 1：本機模型（可選）
- local embedding
- clustering
- semantic similarity
- 近義詞候選

此層不要求 API Key。

### Level 2：雲端 LLM（可選）
只用於：
- 高價值長文的核心 Concept 判斷
- 近義概念是否合併
- 「提出／修正／反轉／整合」的語意角色
- 人工無法快速處理的衝突案例

不得把整個 corpus 逐篇送 API。

## 每個候選詞至少保留

- `term`
- `score`
- `term_frequency`
- `document_frequency`
- `era_distribution`
- `source_type`
- `examples`
- `status`: candidate / accepted / rejected / merged
- `canonical_concept`
- `confidence`
- `review_note`

## Concept Article 標註

高價值文章另外記錄：

- `primary_concepts`
- `secondary_concepts`
- `surface_terms`
- `representative_phrases`
- `semantic_role`: propose / define / extend / revise / contradict / integrate / transition
- `era`
- `source_id`
- `confidence`

## ERA

LOC8 Life ERA 與 LOC6 Style ERA 分開保存，不互相取代。

- LOC8：P0、P0.5、P1–P8
- LOC6 Style：政德風前傳、第一代、第二代、第三代

關鍵字候選先以 LOC8 時間段統計，之後再映射 LOC6 Style ERA。

## API 使用原則

1. 能由規則與統計完成的，不呼叫 LLM。
2. 能由本機 embedding 完成的，不呼叫雲端 embedding。
3. 只將「人工治理仍有歧義」的少量項目送雲端。
4. API 回傳不得直接成為 Canon，必須保留 evidence 與 review status。
5. 模型可以替換，資料規格不能綁定供應商。

## Demo 成熟度判準

LOC6 關鍵字展示至少能完成：

1. 從原始 Threads 匯出檔重建候選詞。
2. 顯示每個詞在 P0–P8 的分布。
3. 點詞可看到原文例證。
4. 人工接受／拒絕／合併候選詞。
5. 不提供 API Key 也能完成 1–4。
6. 後續可將 accepted concept 交給 LOC3、LOC8 與 Graph 關聯層使用。

## 版本

- v0.1：建立 API-minimal baseline；先以 Threads 為主資料源。
