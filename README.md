# Endfield Factory Compressor

用于《明日方舟：终末地》基建布局压缩的 Web 工具，在给定产线下自动寻找更小的可行布局。

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
    src/solver/
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
```

## 开发

### 后端

```bash
cd backend
uv sync                     # 安装依赖
uv run serve                # 启动开发服务器 (localhost:8080)
```

### 前端

```bash
cd frontend
pnpm install                # 安装依赖
pnpm dev                    # 启动开发服务器 (localhost:5173)
```

Vite 开发服务器会将 /solver WebSocket 请求代理到后端 localhost:8080。

## 构建

```bash
# 前端
cd frontend && pnpm build

# 后端
cd backend && uv run serve
```
