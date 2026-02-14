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
dotnet run
```

**终端 2 - 前端:**
```bash
cd frontend
pnpm install
pnpm dev
```

## 技术栈

### 后端
- **ASP.NET Core 8.0** (with Minimal APIs + SignalR)
- **Microsoft.Z3** (native Z3 SAT/SMT solver)

### 前端
- **React 18** + TypeScript + Vite
- **Tailwind CSS v4**
- **@microsoft/signalr** (SignalR client)
- **pnpm** (package manager)
- **Canvas** for grid visualization

## 项目结构

```
 backend/                 # .NET 后端
    backend.csproj
    Program.cs           # 最小化 API + SignalR 配置
    Models.cs            # 数据模型 (Enums + Classes)
    Z3Solver.cs          # Z3 求解器逻辑
    Hubs/
        SolverHub.cs     # SignalR Hub (solve streaming 方法)
 frontend/                # React 前端
    package.json         # pnpm 配置
    src/
        App.tsx           # 主应用
        types/models.ts   # TypeScript 类型定义
        solver/           # SignalR 客户端
        examples/         # 示例产线
        components/       # UI 组件
 examples/                # 产线文档
 start.ps1                # 一键启动脚本（多窗口）
 start-single.ps1         # 一键启动脚本（单窗口）
 README.md
```

## 依赖要求

- **.NET 8.0 SDK** ([下载](https://dotnet.microsoft.com/en-us/download/dotnet/8.0))
- **Node.js 18+**
- **pnpm** - `npm install -g pnpm`

## 工作原理

1. **前端** 通过 SignalR 连接到后端的 `/solver` Hub
2. **用户配置** 产线数据和求解参数（初始尺寸、扩展步长等）
3. **Z3 求解器** (C# 后端) 迭代尝试不同的网格尺寸：
   - 构建 SAT 约束（建筑边界 + 两两不重叠）
   - 每次迭代通过 SignalR 流式推送进度到前端
4. **Canvas 可视化** 显示找到的布局方案

## 构建

```bash
# 前端
cd frontend && pnpm build

# 后端
cd backend && dotnet publish -c Release
```

## 开发

前端修改会热重载（Vite），后端也支持热重载。

- 后端 SignalR Hub: http://localhost:7238/solver
- 前端: http://localhost:5173
