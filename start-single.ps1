#!/usr/bin/env pwsh
# Endfield Factory Compressor - 一键启动脚本（单窗口版本）
# 在同一个终端中启动并管理前后端服务

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Endfield Factory Compressor" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查依赖
Write-Host "检查依赖..." -ForegroundColor Yellow
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到 uv" -ForegroundColor Red
    exit 1
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到 pnpm" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ uv: $(uv --version)" -ForegroundColor Green
Write-Host "  ✓ pnpm: $(pnpm --version)" -ForegroundColor Green
Write-Host ""

# 快速检查依赖
Write-Host "准备环境..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\backend"
uv sync --quiet 2>$null | Out-Null
Pop-Location

Push-Location "$ProjectRoot\frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "首次运行，安装前端依赖..." -ForegroundColor Yellow
    pnpm install --silent 2>$null
}
Pop-Location
Write-Host ""

# 创建清理函数
$Cleanup = {
    Write-Host ""
    Write-Host "正在停止服务..." -ForegroundColor Yellow
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    Write-Host "✓ 已停止所有服务" -ForegroundColor Green
}

# 注册 Ctrl+C 处理
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action $Cleanup | Out-Null

try {
    # 启动后端作业
    Write-Host "启动后端服务器 (http://localhost:8080)..." -ForegroundColor Cyan
    $BackendJob = Start-Job -ScriptBlock {
        Set-Location $using:ProjectRoot\backend
        uv run uvicorn solver.app:app --host 0.0.0.0 --port 8080 --reload
    }

    Start-Sleep -Seconds 3

    # 启动前端作业
    Write-Host "启动前端服务器 (http://localhost:5173)..." -ForegroundColor Cyan
    $FrontendJob = Start-Job -ScriptBlock {
        Set-Location $using:ProjectRoot\frontend
        pnpm dev
    }

    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  ✓ 服务已启动！" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  后端: http://localhost:8080" -ForegroundColor White
    Write-Host "  前端: http://localhost:5173" -ForegroundColor White
    Write-Host ""
    Write-Host "按 Ctrl+C 停止所有服务" -ForegroundColor Gray
    Write-Host ""
    Write-Host "--- 服务日志 ---" -ForegroundColor DarkGray
    Write-Host ""

    # 持续显示输出
    while ($true) {
        $BackendOutput = Receive-Job -Job $BackendJob 2>&1
        $FrontendOutput = Receive-Job -Job $FrontendJob 2>&1

        if ($BackendOutput) {
            $BackendOutput | ForEach-Object {
                Write-Host "[后端] $_" -ForegroundColor Blue
            }
        }

        if ($FrontendOutput) {
            $FrontendOutput | ForEach-Object {
                Write-Host "[前端] $_" -ForegroundColor Magenta
            }
        }

        # 检查作业是否失败
        if ($BackendJob.State -eq 'Failed') {
            Write-Host "错误: 后端服务器启动失败" -ForegroundColor Red
            break
        }
        if ($FrontendJob.State -eq 'Failed') {
            Write-Host "错误: 前端服务器启动失败" -ForegroundColor Red
            break
        }

        Start-Sleep -Milliseconds 100
    }
} finally {
    & $Cleanup
}
