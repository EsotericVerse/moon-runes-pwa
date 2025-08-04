from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer
from peft import LoraConfig, get_peft_model
from datasets import load_dataset
import torch
import json

# 載入原模型（從 c.py）
tokenizer = AutoTokenizer.from_pretrained("THUDM/chatglm3-6b", trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained("THUDM/chatglm3-6b", trust_remote_code=True)
model = model.half().cuda()  # GPU；若 CPU 用 .float()

# 應用 LoRA：這是獨立的 "核心引擎" adapter
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["query_key_value"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, lora_config)

# 載入專門訓練資料
dataset = load_dataset('json', data_files='training_data.json', split='train')
dataset = dataset.train_test_split(test_size=0.1)

# 預處理
def preprocess(examples):
    inputs = [p + c for p, c in zip(examples['prompt'], examples['completion'])]
    model_inputs = tokenizer(inputs, max_length=512, truncation=True, padding="max_length")
    model_inputs["labels"] = model_inputs["input_ids"].copy()
    return model_inputs

tokenized_dataset = dataset.map(preprocess, batched=True, remove_columns=dataset['train'].column_names)

# 訓練設定
training_args = TrainingArguments(
    output_dir="./runes_adapter",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=1e-4,
    fp16=True,
    save_steps=200,
    evaluation_strategy="steps",
    eval_steps=200,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset['train'],
    eval_dataset=tokenized_dataset['test'],
    tokenizer=tokenizer
)

trainer.train()

# 儲存獨立 adapter（不污染原模型）
model.save_pretrained("./runes_adapter")
tokenizer.save_pretrained("./runes_adapter")
print("獨立核心引擎 (LoRA adapter) 訓練完成，儲存於 runes_adapter/")