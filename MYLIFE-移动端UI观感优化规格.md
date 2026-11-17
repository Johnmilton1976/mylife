# MY LIFE 移动端 UI 观感优化规格 v1

生成时间：2026-11-17 ｜ 目标：单文件 `index.html`（纯 CSS/SVG，无引擎）｜ 实测视口：390×844（iPhone/微信 webview）
设计原则：**先量数字再改**；规格与实现分离；已确认项不动，待定项单列；不放量直到基准确认。

---

## 0. 结论先行

用户抱怨的"一进界面字多、字大、不舒服"**不是单一字号问题，是三件事叠加**，按严重度排序：

1. **教程卡被 toast 盖住**（最严重）：`#tut` z-index 60，`#toastWrap` z-index 85。开局 `flash("Welcome to New York...")` + `flash("A cab pulls over...")` 两句 21px 白色大字直接压在教程正文上 → 视觉上"字涌现"。这是层级 bug，不是字号问题。
2. **封面信息密度过高**：390px 宽度里堆了 品牌标题 + 2 行副标题 + 2 行重复说明（`<p>` 与 H1 内 `.coverSub` 语义重复）+ 按钮 + 存档入口 + 4 行献词 + 8 个链接 + 4 行 legal，首屏塞满。
3. **字号阶梯偏大且字距过宽**：中文/英文混排下 letter-spacing 2.5–7px 普遍过大；正文 14.5px、教程 13px/行高 1.75 在 390px 屏上显得"顶"。

**修复策略**：先修层级（toast 不压教程）→ 再收封面密度 → 最后微调字号阶梯。**第一轮只做基准改动并截图验证，确认后再放量到游戏内各面板。**

---

## 1. 实测数据（改前基线，390×844）

| 元素 | 选择器 | 实测字号 | 字距 | 行高 | 问题 |
|---|---|---|---|---|---|
| 品牌标题 | `#picker h1.coverTitle .coverBrand` | clamp(40,12vw,86)=46.8px | clamp(8,3vw,26)=11.7px | normal | 可接受（品牌焦点） |
| H1 副标题 | `.coverSub` | 12px | 4px | normal | 字距偏大，与下一行重复 |
| 重复说明 | `#picker p` | 12px | 4px | normal | 与 coverSub 语义重复 |
| 开始按钮 | `#coverBtn` | 19px | 4px | — | 可接受 |
| 献词 | `.picker-dedi` | 12.5px | 1px | 1.8 | 4 行占高 |
| 导航链接 | `.cover-guides a` | 10px | 2.5px | — | 8 个链接两行 |
| legal | `.cover-legal` | 10.5px | .4px | 1.7 | 底部 4 行 |
| 教程卡标题 | `#tutCard h2` | 21px | 4px | — | 偏大 |
| 教程正文 | `.tutRow` | 13px | 0 | 22.75px(1.75) | 6 段 × 129–207 字符，占满 86vh |
| toast | `.tmsg` | **21px** | 1px | — | **z-index 85 > 教程 60，盖住正文** |

合计教程卡 6 段正文 ≈ 958 字符；开局 2 条 toast 同时出现 → 首屏可见文字量翻倍。

---

## 2. 字号阶梯（Type Scale）—— 引擎中立规格

统一到 5 档，全部对齐到整数 px（避免半像素模糊）。移动端值：

| 档位 | 语义 | 桌面 | 移动 | 用于 |
|---|---|---|---|---|
| D / Display | 品牌唯一焦点 | 86px | **clamp(36px,10vw,46px)** | `.coverBrand` |
| H1 | 屏主标题 | 78→38px | **clamp(22px,6.4vw,30px)** | `#create h2`、教程 h2 |
| B / Body | 正文 | 14.5px | **13px / line-height 1.55** | `.tutRow`、`.act-desc`、`.fin-i` |
| C / Caption | 辅助说明 | 10.5–12px | **11px / line-height 1.5** | `.picker-dedi`、`.coverSub`、chip |
| M / Micro | 法律/角标 | 9–10px | **9.5px** | `.cover-legal`、`.cover-guides a`、`.sbNum` |

字距规则（英文全大写场景）：Display ≤ 6px、H1 ≤ 3px、Body/Caption ≤ 1px、Micro = 0.5px。**禁止再出现 4px+ 的正文全大写字距**——这是"散"和"占宽"的主因。

---

## 3. 第一轮基准改动（待确认后放量）

### 3.1 层级修复（P0，无视觉争议）
| 改动 | 选择器 | 从 | 到 | 依据 |
|---|---|---|---|---|
| toast 不压教程卡 | `#tut` z-index | 60 | **90** | 教程是模态引导，必须高于所有 toast(85)；低于 shareModal(88)? → 取 90 同时高于两者；不遮 z-99999 的 fatal |
| 教程期间抑制开局 toast | `showTutorial()` | — | 进入时 `clearToasts()` | 从源头去掉 2 条大字，比调层级更干净（两条都做，双保险） |

### 3.2 封面密度（P1）
| 改动 | 选择器 | 从 | 到 | 依据 |
|---|---|---|---|---|
| 删除重复说明行 | `#picker p` | 显示 | **移动端 display:none** | 与 coverSub 语义重复，SEO 关键词已在 H1 内，删这行不丢词 |
| 副标题字距 | `.coverSub` | 12px/4px | **11px/1.5px** | D→C 档；字距 4→1.5，宽度省约 12% |
| 献词收紧 | `.picker-dedi` | 12.5px/1.8 | **11px/1.5** | C 档；4 行→约 3 行 |
| 导航字距/间距 | `.cover-guides` | 10px/2.5px/gap22 | **10px/1px/gap 14px 12px** | M 档；8 链接更紧凑 |
| legal 收紧 | `.cover-legal` | 10.5px/1.7 | **9.5px/1.5** | M 档 |

### 3.3 教程卡字号（P1）
| 改动 | 选择器 | 从 | 到 | 依据 |
|---|---|---|---|---|
| 卡标题 | `#tutCard h2` | 21px/4px | **19px/2px** | H1 档 |
| 正文 | `.tutRow` | 13px/1.75 | **13px/1.5，段距 14→11px** | B 档；行高 1.75→1.5 省约 14% 高度 |
| 图标 | `.tutIc` | 26px | **22px** | 与 19px 标题配平 |

**不动项（已确认）**：`.coverBrand` 金渐变、几何位置（`_shot_cover.js` 双尺寸钉死）、`#coverBtn` 尺寸/字距（品牌 CTA）、所有颜色值、所有点击区尺寸（触控 ≥44px）。

---

## 4. 待确认后才放量（第二轮，本次不动）

- 游戏内面板字号（HUD/账本/交易/目标/新闻）：272 处 font-size 里有大量 10.5/11.5/12.5/14.5 的零散值，需统一到 §2 阶梯——**风险高、面广，等首屏基准确认再动**。
- toast 正文字号 21px：游戏内提示是否也要降到 16–18px（目前很大）——待朱朱定。
- 中文字体栈：当前 `Georgia, Times New Roman, serif` 对中文是 fallback，若未来加中文文案需补 `PingFang SC, Microsoft YaHei`。

---

## 5. 验证方式

- 基准截图：390×844 + 1440×900，改前/改后对比（`/tmp/ui_cover.png`、`ui_tut.png` 为改前）。
- 几何断言：`node _shot_cover.js` 核对封面 H1/按钮 top/left 未漂移。
- 回归：`node tests/smoke.js`、`node tests/verify_mobile.js`（38 pass）、封面 H1 关键词 grep 仍在。
