import pandas as pd
import networkx as nx
import plotly.graph_objects as go
import os

# === 讀取符文資料 ===
df = pd.read_excel("LunaRune64.xlsx", sheet_name="Basic")
df.rename(columns=lambda x: x.strip(), inplace=True)

# === 構建圖形資料 ===
G = nx.DiGraph()

for _, row in df.iterrows():
    rune = row['符文名稱']
    group = row.get("所屬分組", "未分類")
    icon = row.get("圖騰", "")
    born = row.get("相生", "無")
    block = row.get("相剋", "無")
    G.add_node(rune, group=group, icon=icon, 相生=born, 相剋=block)

    for target in str(born).split("/"):
        target = target.strip()
        if target and target in df['符文名稱'].values:
            G.add_edge(rune, target, type="生")
    for target in str(block).split("/"):
        target = target.strip()
        if target and target in df['符文名稱'].values:
            G.add_edge(rune, target, type="剋")

# === 定位節點位置 ===
pos = nx.spring_layout(G, seed=42, k=2.2)

# === 建立 Plotly 圖表資料 ===
node_x, node_y, node_text, node_color, node_hover_text = [], [], [], [], []
group_colors = {}
groups = list(set(nx.get_node_attributes(G, 'group').values()))
for i, group in enumerate(groups):
    group_colors[group] = f"hsl({(i / len(groups)) * 360},70%,70%)"

for node in G.nodes():
    x, y = pos[node]
    node_x.append(x)
    node_y.append(y)
    data = G.nodes[node]
    node_text.append(f"{data['icon']} {node}")
    node_color.append(group_colors[data['group']])
    node_hover_text.append(
        f"<b>{data['icon']} {node}</b><br>分組：{data['group']}<br>相生：{data['相生']}<br>相剋：{data['相剋']}"
    )

edge_x, edge_y = [], []
for u, v, d in G.edges(data=True):
    x0, y0 = pos[u]
    x1, y1 = pos[v]
    edge_x += [x0, x1, None]
    edge_y += [y0, y1, None]

# === 畫邊線 ===
edge_trace = go.Scatter(
    x=edge_x, y=edge_y,
    line=dict(width=1, color="gray"),
    hoverinfo='none',
    mode='lines')

# === 畫節點 ===
node_trace = go.Scatter(
    x=node_x, y=node_y,
    mode='markers+text',
    text=node_text,
    textposition="top center",
    hoverinfo='text',
    marker=dict(
        color=node_color,
        size=28,
        line=dict(width=1, color='black')
    ),
    hovertext=node_hover_text
)

# === 插入額外說明與互動 ===
help_html = open("template_parts/help_block.html", encoding="utf-8").read()
dropdown_html = open("template_parts/dropdown_filter.html", encoding="utf-8").read()

# === 匯出互動式 HTML ===
fig = go.Figure(data=[edge_trace, node_trace],
                layout=go.Layout(
                    title='月之符文・互動網絡圖',
                    titlefont_size=22,
                    showlegend=False,
                    hovermode='closest',
                    margin=dict(b=20,l=5,r=5,t=60),
                    xaxis=dict(showgrid=False, zeroline=False),
                    yaxis=dict(showgrid=False, zeroline=False)
                ))

plot_html = fig.to_html(include_plotlyjs='cdn', full_html=False)

with open("output/luna_rune_interactive_graph.html", "w", encoding="utf-8") as f:
    f.write("<html><head><meta charset='utf-8'><title>月之符文網絡圖</title></head><body>")
    f.write(help_html)
    f.write(dropdown_html)
    f.write(plot_html)
    f.write("</body></html>")

print("✅ 完成輸出：output/luna_rune_interactive_graph.html")
