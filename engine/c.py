from transformers import AutoTokenizer, AutoModelForCausalLM

# 下載並載入 tokenizer 和模型（第一次會自動下載到本地 ~/.cache/huggingface/hub）
tokenizer = AutoTokenizer.from_pretrained("THUDM/chatglm3-6b", trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained("THUDM/chatglm3-6b", trust_remote_code=True,local_files_only=True)

# 若有 NVIDIA 顯卡可加上 .half().cuda()，否則用 .float() 跑在 CPU
#model = model.half().cuda()
model = model.float()  # CPU 跑會比較慢
