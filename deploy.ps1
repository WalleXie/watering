# deploy.ps1 — 一键把 pwa 文件夹发布到 GitHub Pages
# 使用方法（在 pwa 目录下打开 PowerShell）：
#   .\deploy.ps1 -RepoUrl "https://github.com/你的用户名/仓库名.git"
#
# 前置条件：
#   1. 电脑已安装 Git（https://git-scm.com/download/win）
#   2. 已在 GitHub 网页创建一个空仓库（不要勾选 README/.gitignore/License）
#   3. 已配置 GitHub 凭据（首次会弹浏览器或输入框登录）

param(
  [Parameter(Mandatory=$true)]
  [string]$RepoUrl,

  [string]$CommitMessage = "Deploy 浇花打卡 PWA"
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

Write-Host "==> 检查 Git"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "未找到 Git，请先安装：https://git-scm.com/download/win"
}

Write-Host "==> 初始化仓库"
if (-not (Test-Path .git)) { git init }

Write-Host "==> 配置 Pages（从 pwa 文件夹本身作为站点根目录）"
$branchPart = "gh-pages"
git checkout -B $branchPart 2>$null
if ($LASTEXITCODE -ne 0) { git checkout -b $branchPart }

Write-Host "==> 暂存并提交文件"
git add -A
git commit -m $CommitMessage

Write-Host "==> 关联远程仓库"
$existing = git remote get-url origin 2>$null
if ($existing) { git remote set-url origin $RepoUrl } else { git remote add origin $RepoUrl }

Write-Host "==> 推送到 GitHub"
git push -f origin $branchPart

Write-Host ""
Write-Host "完成！接下来到 GitHub 网页："
Write-Host "  仓库 -> Settings -> Pages -> Build and deployment"
Write-Host "  Source 选择 'Deploy from a branch'，Branch 选 '$branchPart' / '(root)'，Save"
Write-Host "  等待 1-2 分钟，访问地址形如："
Write-Host "  https://<用户名>.github.io/<仓库名>/"
