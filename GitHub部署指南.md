# 部署到 GitHub Pages（手把手）

> 目标：得到一个形如 `https://你的用户名.github.io/仓库名/` 的网址，iPhone Safari 打开后「添加到主屏幕」即可当 App 用。
> GitHub Pages 完全免费，无需绑卡。

你的电脑上目前**没有安装 Git**，所以最省事的是用**方法一：网页上传**，全程在浏览器点一点，不用装任何软件、不用敲命令。

---

## 方法一：网页直接上传（推荐，无需 Git）

### 第 1 步：注册 / 登录 GitHub

打开 <https://github.com>，用邮箱注册（如果还没有账号）。记住你的**用户名**，后面网址要用。

### 第 2 步：新建仓库

1. 点右上角 **「+」→「New repository」**。
2. 填写：
   - **Repository name**：填一个名字，例如 `watering`（网址会变成 `用户名.github.io/watering/`）
   - 选 **Public**（公开，GitHub Pages 免费版要求公开）
   - **不要**勾选 "Add a README file"、".gitignore"、"License"（保持空仓库，上传更省事）
3. 点 **「Create repository」**。

### 第 3 步：上传 pwa 文件夹里的文件

1. 在新建好的仓库页面，点 **「uploading an existing file」**（或 "Add file" → "Upload files"）。
2. 打开文件窗口，定位到：
   ```
   C:\个人\打卡记录微信小程序\pwa
   ```
3. **把这个文件夹里的全部文件选中**（共 10 个）：
   - `index.html`、`app.js`、`store.js`、`plants.js`、`style.css`、`sw.js`、`manifest.json`
   - `icon-192.png`、`icon-512.png`
   - `.nojekyll`（隐藏文件，Windows 资源管理器需在「查看」勾选「隐藏的项目」才看得到；**如果找不到它也没关系**，可跳过，影响很小）
4. 把文件拖到上传区域，或点选择。
5. 页面底部 Commit message 随便填，比如 `first deploy`，点 **「Commit changes」**。

> 注意：上传的是 pwa 文件夹**里面的文件**，不是 pwa 文件夹本身。仓库根目录应该直接能看到 `index.html`。

### 第 4 步：开启 GitHub Pages

1. 仓库页面点 **「Settings」** 标签。
2. 左侧栏点 **「Pages」**。
3. 在 "Build and deployment" 下：
   - **Source** 选 **「Deploy from a branch」**
   - **Branch** 选 **`main`**，目录选 **`/ (root)`**
   - 点 **「Save」**
4. 等 1–2 分钟，刷新页面，顶部会出现一个网址，形如：
   ```
   https://你的用户名.github.io/watering/
   ```
   点旁边的链接访问，能看到「🌿 浇花打卡」页面就成功了。

> 如果页面空白或 404：等几分钟再刷新（首次部署有延迟）；确认仓库根目录确实有 `index.html`；确认仓库是 Public。

### 第 5 步：iPhone 添加到主屏幕

1. 用 **Safari**（必须是 Safari，Chrome 不行）打开上面的 https 网址。
2. 点底部**分享按钮**（方框带向上箭头）。
3. 下滑找到 **「添加到主屏幕」**，点它。
4. 确认名称（默认「浇花打卡」），点「添加」。
5. 桌面出现图标，点开就是全屏 App，断网也能用。

---

## 方法二：用脚本一键上传（需先装 Git）

如果以后你装了 Git，可以用我写好的脚本，以后每次改代码都能一条命令更新：

1. 安装 Git：<https://git-scm.com/download/win>（一路下一步即可）。
2. 按方法一的第 1、2 步先建好空仓库（复制仓库地址，形如 `https://github.com/用户名/watering.git`）。
3. 在 `pwa` 文件夹里打开 PowerShell（在文件夹地址栏输入 `powershell` 回车）。
4. 运行：
   ```powershell
   .\deploy.ps1 -RepoUrl "https://github.com/你的用户名/watering.git"
   ```
5. 首次会弹 GitHub 登录窗口，登录一次即可。
6. 之后按方法一的第 4、5 步开启 Pages 并添加到主屏幕。

以后改了代码，重新运行一次脚本就更新了。

---

## 更新网站内容

- **方法一**：在仓库页面把改动后的文件重新上传覆盖（同名文件会替换），自动生效，等 1–2 分钟。
- **方法二**：重新运行 `deploy.ps1`。

---

## 重要提醒：换设备/清数据前先备份

PWA 数据存在手机本地。虽然做了双份存储和自动快照，但**换手机、卸载、系统清理**仍可能丢失。

- 在 App 里进 **设置 → 导出备份文件**，把 JSON 存到「文件」App 或发给自己。
- 新设备打开网址后，用 **设置 → 从备份恢复** 导入即可。

---

## 常见问题

| 问题 | 处理 |
|---|---|
| 网址打开 404 | 首次部署等 2-5 分钟；确认仓库根目录有 index.html；确认是 Public 仓库 |
| 页面能开但样式/功能异常 | 确认 10 个文件都上传了，尤其 app.js / store.js / style.css |
| iPhone 找不到「添加到主屏幕」 | 必须用 Safari 打开 https 网址；Chrome 里没有这个选项 |
| Safari 提示"无法添加到主屏幕" | 确认网址是 https 开头；局域网 http 地址不行 |
| 部署后数据没了 | 新设备本来就是空的，用备份文件恢复；老设备数据还在本机 |
| 想改仓库名 | Settings → General → Repository name 改名后，Pages 网址也跟着变 |
