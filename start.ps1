#!/usr/bin/env pwsh
# Endfield Factory Compressor - 一键启动脚本
# 同时启动 ASP.NET Core 后端和 React 前端开发服务器

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Endfield Factory Compressor" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查依赖
Write-Host "[1/3] 检查依赖..." -ForegroundColor Yellow

# 检查 dotnet
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到 dotnet 命令。请先安装 .NET SDK: https://dotnet.microsoft.com/download" -ForegroundColor Red
    exit 1
}

# 检查 pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到 pnpm 命令。请先安装: npm install -g pnpm" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ dotnet: $(dotnet --version)" -ForegroundColor Green
Write-Host "  ✓ pnpm: $(pnpm --version)" -ForegroundColor Green
Write-Host ""

# 恢复后端依赖
Write-Host "[2/3] 恢复后端依赖..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\backend"
try {
    dotnet build --configuration Release -q 2>$null
    Write-Host "  ✓ 后端已构建" -ForegroundColor Green
} catch {
    Write-Host "  警告: 后端构建失败，尝试继续..." -ForegroundColor Yellow
} finally {
    Pop-Location
}
Write-Host ""

# 安装前端依赖
Write-Host "[3/3] 安装前端依赖..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\frontend"
try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "  首次运行，正在安装依赖（可能需要几分钟）..." -ForegroundColor Yellow
        pnpm install --silent 2>$null
    } else {
        pnpm install --frozen-lockfile --prefer-offline --silent 2>$null
    }
    Write-Host "  ✓ 前端依赖已安装" -ForegroundColor Green
} catch {
    Write-Host "  警告: 前端依赖安装失败，尝试继续..." -ForegroundColor Yellow
} finally {
    Pop-Location
}
Write-Host ""

# 启动服务
Write-Host "[4/4] 启动服务..." -ForegroundColor Yellow
Write-Host ""

# 启动后端 (新窗口)
Write-Host "  → 启动后端服务器..." -ForegroundColor Cyan
$BackendProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$ProjectRoot\backend'; Write-Host '🔧 后端服务器 (https://localhost:7238)' -ForegroundColor Magenta; dotnet run --configuration Release"
) -PassThru -WindowStyle Normal

Start-Sleep -Seconds 3

# 启动前端 (新窗口)
Write-Host "  → 启动前端服务器..." -ForegroundColor Cyan
$FrontendProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$ProjectRoot\frontend'; Write-Host '🎨 前端服务器 (http://localhost:5173)' -ForegroundColor Magenta; pnpm dev"
) -PassThru -WindowStyle Normal

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  ✓ 服务已启动！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  后端: https://localhost:7238" -ForegroundColor White
Write-Host "  前端: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "提示: 关闭新打开的窗口即可停止服务" -ForegroundColor Gray
Write-Host ""

# 等待用户输入以保持此窗口打开
Write-Host "按任意键关闭此窗口..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
