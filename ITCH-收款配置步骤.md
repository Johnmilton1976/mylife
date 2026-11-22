# itch.io 收款配置步骤（PRO 从"邮件申请"改为 itch.io 结账）

> 目标：不申请任何支付网关，用 itch.io 自带的支付收 $4.99，付款后系统自动发一个唯一解锁码给买家。
> 代码侧已全部改好并推送；**下面是你需要在 itch.io 后台点几次的操作**，做完当天就能收钱。

---

## 为什么这样改

| | 改之前 | 改之后 |
|---|---|---|
| 支付方式 | 没有链接，只能发邮件要 | itch.io 自带结账（卡 / PayPal / Apple Pay），零申请、零月租 |
| 解锁码 | 一个明文码写死在源码里，人人可读、白嫖 | 120 个唯一码，源码里只有不可逆指纹，读代码也拿不到码 |
| 泄露影响 | 全站作废 | 只作废泄露的那一个，其余买家不受影响 |
| 发货 | 手工回邮件 | itch.io 自动发唯一码，无需你介入 |

---

## 第 1 步：给免费游戏加一个 $4.99 的付费文件

游戏页已经在：`https://mylifesim.itch.io/my-life-sim`

1. 登录 itch.io → 右上角头像 → **Dashboard** → 找到 **My Life Sim** → **Edit**
2. 顶部选 **Uploads** 标签
3. 上传一个新文件：点 **Upload files**，选择这个文件：
   `pro-deliverable/README.txt`（在同目录里，是给买家的领取说明）
4. 上传后在这个文件那一行点 **编辑**（铅笔图标），找到 **Price / 价格** 设置：
   - 勾选 "Set a separate price for this file"（为此文件单独定价）
   - 填 **$4.99**
   - 文件名建议改成易懂的：`PRO unlock — $4.99 (read me)`
5. 保存。这样买家在项目页点 Download 时，会弹出支付框，勾上这个文件付 $4.99，其他文件仍免费。

> 关键：项目本身要保持**免费/Name your own price（最低 $0）**，只是这**一个文件**卖 $4.99。
> 免费玩家照常玩，只有想要 PRO 的人付钱。

---

## 第 2 步：把 120 个唯一码导入 itch.io external keys

1. 在同一个项目 **Edit** 页，顶部选 **Distribution** 标签 → 找到 **External keys** 区
2. 点 **Add keys**（添加兑换码）
3. 打开本地文件 `PRO-CODES.txt`，复制里面所有 `MLPRO-XXXX-XXXX` 开头的行
   （前面 6 行是说明，不要复制）
4. 粘贴到 itch.io 的 key 输入框（支持一次粘贴多行，每行一个）
5. 给这批 key 起个 label，比如 `PRO-2026-11`，方便以后辨认可信度
6. 保存

> 效果：每卖出一份，itch.io 从这 120 个里发**一个**给买家，买家在他的下载页点
> "Claim your key" 就能看到。卖完 120 份前不用补码。

---

## 第 3 步：确认收款方式（payout）

1. itch.io 右上角头像 → **User settings** → **Payments**
2. 确认已绑定收款账户（PayPal 或 Payoneer；中国大陆可用 Payoneer）
3. itch.io 平台分成默认 10%（可自行在 0–100% 调整），每笔 $4.99 到账约 $4.49 再减支付通道费
4. 余额满 $5 即可提现

---

## 第 4 步：验证整条链路（强烈建议）

1. 自己下单一份（用 itch.io 的测试/真实购买都可）
2. 在下载页确认能看到 "Claim your key"，复制那个码
3. 打开 `https://mylifesim.com/` → SETTINGS → SUPPORT MY LIFE → 粘贴码 → UNLOCK
4. 确认三条剧情线出现在角色选择页

---

## 日常维护

### 码快用完了
```
node tools/gen_pro_codes.js 120
```
- 会重新生成 `PRO-CODES.txt`（覆盖旧的！旧的没发出去的码会作废，先确认）
- 打印一段指纹数组 → 复制替换 `index.html` 里的 `PRO_FINGERPRINTS`
- 把新明文码导入 itch.io external keys
- 推送 `index.html`

### 有人泄露了码
- 从 `index.html` 的 `PRO_FINGERPRINTS` 里删掉那一个码对应的指纹
- 推送即可。只有那个码失效，其他 119 个照常。

> 怎么知道哪个指纹对应泄露的码？
> `node -e "const{sha256}=require('./tools/sha256.js');console.log(sha256('泄露的码'.toUpperCase()).slice(0,16))"`
> 得到的 16 位十六进制就是要删的那一行。

---

## 已改动的文件（无需你操作，仅供参考）

| 文件 | 改动 |
|---|---|
| `index.html` | PRO 校验改为 120 个指纹白名单 + 内嵌 SHA-256；"安全结账链接"文案改为 itch.io |
| `pro/index.html` | 按钮跳转 itch.io 作品页；付款说明改为"下载页领码"；移除全部 Stripe / 邮件申请文案 |
| `privacy/index.html` | 支付处理方 Stripe → itch.io（3 处 meta + 正文） |
| `terms/index.html` | 支付处理方 Stripe → itch.io（2 处） |
| `contact/index.html` | 退款凭证 Stripe → itch.io |
| `tests/verify_pro.js`、`tests/probe_pro_onetomany.js` | 测试改用真实唯一码 |
| `tools/gen_pro_codes.js`、`tools/sha256.js` | 码生成器 + 共享哈希实现 |
| `PRO-CODES.txt` | 120 个明文码（**已在 .gitignore，绝不上传**） |
| `pro-deliverable/README.txt` | 买家付款后下载到的领取说明 |
