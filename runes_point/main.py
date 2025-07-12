import pandas as pd
import networkx as nx
import plotly.graph_objects as go
from sklearn.manifold import MDS

# 讀取 Excel 資料
excel_path = "LunaRune64.xlsx"
df = pd.read_excel(excel_path, sheet_name="Basic")
df.rename(columns=lambda x: x.strip(), inplace=True)

# 建立符文圖
G = nx.DiGraph()

# 加入節點（符文名稱、所屬分組、圖騰）
for _, row in df.iterrows():
    rune = row['符文名稱']
    group = row.get('所屬分組', '未分類')
    icon = row.get('圖騰', '')
    G.add_node(rune, group=group, icon=icon)

# 加入相生與相剋的邊
for _, row in df.iterrows():
    source = row['符文名稱']
    for target in str(row.get('相生', '')).split("/"):
        target = target.strip()
        if target in G.nodes:
            G.add_edge(source, target, type="生")
    for target in str(row.get('相剋', '')).split("/"):
        target = target.strip()
        if target in G.nodes:
            G.add_edge(source, target, type="剋")

# 使用 MDS 計算節點位置（避免擁擠）
pos = nx.spring_layout(G, seed=42, k=1.5, iterations=300)
x_vals = [pos[node][0] for node in G.nodes]
y_vals = [pos[node][1] for node in G.nodes]

# 分組上色
groups = list(set(nx.get_node_attributes(G, 'group').values()))
group_color_map = {g: f"hsl({i * 360 / len(groups)},70%,60%)" for i, g in enumerate(groups)}
node_colors = [group_color_map[G.nodes[node]['group']] for node in G.nodes]

# 建立節點圖層（含圖騰與符文名稱）
node_trace = go.Scatter(
    x=x_vals,
    y=y_vals,
    mode='markers+text',
    text=[f"{G.nodes[node]['icon']}<br>{node}" for node in G.nodes],
    textposition='bottom center',
    marker=dict(
        size=24,
        color=node_colors,
        line=dict(width=2, color='DarkSlateGrey')
    ),
    hoverinfo='text'
)

# 建立邊圖層（分生與剋）
edge_traces = []
for u, v, data in G.edges(data=True):
    x0, y0 = pos[u]
    x1, y1 = pos[v]
    color = 'green' if data['type'] == '生' else 'red'
    dash = 'solid' if data['type'] == '生' else 'dot'
    edge_traces.append(
        go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(width=1.5, color=color, dash=dash),
            hoverinfo='none'
        )
    )

# 繪製互動圖
fig = go.Figure(
    data=edge_traces + [node_trace],
    layout=go.Layout(
        title=dict(
            text="月之符文互動網絡圖",
            font=dict(size=28),
            x=0.5
        ),
        showlegend=False,
        hovermode='closest',
        margin=dict(b=20, l=20, r=20, t=60),
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        height=1000
    )
)

# 匯出 HTML
fig.write_html("luna_rune_interactive.html")
print("完成：已產出 luna_rune_interactive.html")
