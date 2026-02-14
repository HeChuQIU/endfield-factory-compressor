# Endfield Factory Compressor

用于《明日方舟：终末地》基建布局压缩的 Web 工具，在给定产线下自动寻找更小的可行布局。

## 快速开始

### 一键启动（推荐）

**Windows PowerShell:**
```powershell
# 多窗口版本（推荐）- 后端和前端在独立窗口中运行
.\start.ps1

# 单窗口版本 - 在当前终端中查看所有日志
.\start-single.ps1
```

首次运行会自动安装所有依赖。启动后访问 http://localhost:5173

### 手动启动

需要两个终端窗口：

**终端 1 - 后端:**
```bash
cd backend
uv sync                     # 安装依赖
uv run uvicorn solver.app:app --host 0.0.0.0 --port 8080 --reload
```

**终端 2 - 前端:**
```bash
cd frontend
pnpm install                # 安装依赖
pnpm dev                    # 启动开发服务器
```

## 技术栈

### 后端
- **Python 3.12+** + uv (包管理)
- **FastAPI** + Uvicorn
- **z3-solver** (原生 Z3 SAT/SMT 求解器)
- **SignalR Hub Protocol** (JSON over WebSocket)

### 前端
- **React 18** + TypeScript + Vite
- **Tailwind CSS v4**
- **@microsoft/signalr** (SignalR 客户端)
- **pnpm** (包管理)
- **Canvas** 网格可视化

## 项目结构

```
 backend/                 # Python 后端
    pyproject.toml       # uv 项目配置
    solver/
        app.py           # FastAPI 入口 + WebSocket 端点
        signalr_hub.py   # SignalR JSON Hub Protocol 实现
        solver_hub.py    # 求解器 Hub 方法注册
        z3_solver.py     # Z3 约束构建 + 迭代求解
        models.py        # Pydantic 数据模型
        buildings.py     # 建筑定义
 frontend/                # React 前端
    package.json         # pnpm 配置
    src/
        App.tsx           # 主应用
        types/models.ts   # TypeScript 类型
        solver/           # SignalR 客户端
        examples/         # 示例产线
        components/       # UI 组件
 examples/                # 产线文档
 start.ps1                # 一键启动脚本（多窗口）
 start-single.ps1         # 一键启动脚本（单窗口）
```

## 依赖要求

- **Python 3.12+**
- **uv** - Python 包管理器 ([安装](https://docs.astral.sh/uv/))
- **Node.js 18+**
- **pnpm** - `npm install -g pnpm`

## 构建

```bash
# 前端
cd frontend && pnpm build

# 后端
cd backend && uv run uvicorn solver.app:app
```

## 工作原理

1. **前端** 通过 SignalR 连接到后端的 `/solver` WebSocket 端点
2. **用户配置** 产线数据和求解参数（初始尺寸、扩展步长等）
3. **Z3 求解器** 迭代尝试不同的网格尺寸：
   - 构建 SAT 约束（建筑边界 + 两两不重叠）
   - 每次迭代实时推送进度到前端
4. **Canvas 可视化** 显示找到的布局方案

## 开发

Vite 开发服务器会将 `/solver` WebSocket 请求代理到后端 `localhost:8080`。

前端修改会热重载，后端修改会自动重启（使用 `--reload` 选项）。
