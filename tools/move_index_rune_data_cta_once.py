from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

cta='''            <a class="rune-data-cta" href="lots.html#library">
              <span>
                <strong>查看完整月之符文資料</strong>
                <small>月之符文66 圖鑑 · 八組分類 · 卡片詳細說明</small>
              </span>
              <span aria-hidden="true">→</span>
            </a>
'''

if cta not in s:
    raise SystemExit('rune data CTA block not found')

# Remove CTA from the single-card/玄 card column.
s=s.replace(cta,'',1)

# Reinsert as a section-level resource entry at the end of the right interaction column,
# after the draw-mode description rather than under the displayed card.
needle='''            </div>
          </div>
        </div>
      </div>
    </section>
'''
start=s.find('<div class="description" id="description">')
if start == -1:
    raise SystemExit('description block not found')
pos=s.find(needle,start)
if pos == -1:
    raise SystemExit('rune-entry closing structure not found')

replacement='''            </div>
          </div>

          <a class="rune-data-cta" href="lots.html#library">
            <span>
              <strong>查看完整月之符文資料</strong>
              <small>月之符文66 圖鑑 · 八組分類 · 卡片詳細說明</small>
            </span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
'''
s=s[:pos]+replacement+s[pos+len(needle):]

p.write_text(s,encoding='utf-8')
print('moved rune data CTA out of the 玄 card column')
