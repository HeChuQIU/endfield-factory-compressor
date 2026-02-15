# 快速开始指南

欢迎使用**明日方舟：终末地 基建布局优化器**！

## 这是什么？

这是一个自动优化游戏中基建生产线布局的工具。给定一个生产目标（比如"满带钢块"），系统会：

1. 分析生产依赖关系
2. 自动排列建筑位置
3. 优化占用面积
4. 确保电力覆盖

## 快速体验

### 1. 安装依赖

```bash
pip install numpy networkx
```

### 2. 运行示例

```bash
# 查看优化后的钢块生产线
python examples/steel_line_optimized.py
```

你会看到类似这样的输出：

```
=== Steel Production Line with Automatic Layout ===

Step 1: Defining recipes...
  ✓ Defined 4 recipes

Step 2: Analyzing dependencies...
  ✓ Calculated 4 dependency layers

Dependency Layers:
Layer 0: 蓝铁块 x2 (精炼炉)
Layer 1: 蓝铁粉末 x2 (粉碎机)
Layer 2: 致密蓝铁粉末 x1 (研磨机)
Layer 3: 钢块 x1 (精炼炉)

...

✅ Production line created successfully!
```

## 核心概念

### 生产配方 (Recipe)

定义一个生产过程：

```python
from endfield_compressor.core import Recipe

steel_recipe = Recipe(
    recipe_id="steel",
    name="钢块",
    inputs={"blue_iron": 2.0},
    outputs={"steel": 1.0},
    production_time=3.0,
    machine_type="精炼炉"
)
```

### 依赖分析 (Dependency Analysis)

自动分析生产链的依赖关系：

```python
from endfield_compressor.algorithms.dependency_analyzer import DependencyGraph

dep_graph = DependencyGraph()
dep_graph.add_recipe(recipe1, building_count=2)
dep_graph.add_recipe(recipe2, building_count=1)

# 计算依赖层级
layers = dep_graph.calculate_layers()
# 输出: [[recipe1], [recipe2]]  # recipe2依赖recipe1
```

### 自动布局 (Layout Planning)

自动排列建筑位置：

```python
from endfield_compressor.algorithms.layout_planner import LayoutPlanner
from endfield_compressor.core import FactoryMap

factory_map = FactoryMap(width=100, height=100)
planner = LayoutPlanner(factory_map)

# 根据依赖图自动布局
planner.plan_layout(dep_graph, buildings_map)

# 查看结果
print(planner.get_layout_summary())
```

## 实际案例：满带钢块生产线

根据实现计划文档的分析，一个满带钢块生产线需要：

- 1满带钢块输出
- 2个精炼炉生产钢块（每个0.5满带）
- 上游：2个研磨机 → 4个粉碎机 → 4个精炼炉
- **总计约12个建筑，4层依赖**

我们的系统已经验证了6建筑版本（简化版），结果：
- ✅ 自动布局成功
- ✅ 4层依赖正确计算
- ✅ 布局尺寸：27x8格子
- ✅ 2个电力塔完全覆盖

## 方案A的优势

根据实现计划，"方案A：层次化布局算法"的特点：

### ✅ 适合的场景
- 小到中等规模生产线（10-50个建筑）✅
- 单一主线生产链 ✅
- **满带生产线**（如满带钢块）✅

### 特点
- 实现简单，开发周期短 ✅
- 适合大多数实际场景 ✅
- 结果可预测，易于调试 ✅
- 完全支持满带钢块等常见需求 ✅

## 下一步

### 如果你想：

**1. 查看详细设计**
- 阅读 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

**2. 了解实现细节**
- 阅读 [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

**3. 学习API使用**
- 阅读 [src/README.md](src/README.md)

**4. 查看案例分析**
- 阅读 [examples/premium-buckwheat-capsule.md](examples/premium-buckwheat-capsule.md)

**5. 自己写代码**
- 参考 `examples/steel_line_optimized.py`
- 参考 `examples/steel_production_example.py`

**6. 运行测试**
```bash
python tests/test_basic.py
python tests/test_dependency.py
```

## 项目结构

```
endfield-factory-compressor/
├── IMPLEMENTATION_PLAN.md      # 实现计划（必读！）
├── IMPLEMENTATION_SUMMARY.md   # 实现总结
├── QUICK_START.md             # 本文档
├── README.md                  # 项目说明
├── requirements.txt           # 依赖列表
├── setup.py                   # 安装配置
│
├── src/endfield_compressor/   # 源代码
│   ├── core/                  # 核心数据结构
│   │   ├── building.py        # 建筑
│   │   ├── conveyor.py        # 传送带
│   │   ├── factory_map.py     # 地图
│   │   ├── port.py            # 端口
│   │   ├── power_tower.py     # 电力塔
│   │   └── recipe.py          # 配方
│   └── algorithms/            # 算法
│       ├── dependency_analyzer.py  # 依赖分析
│       └── layout_planner.py       # 布局规划
│
├── tests/                     # 测试
│   ├── test_basic.py
│   └── test_dependency.py
│
└── examples/                  # 示例
    ├── steel_production_example.py      # 简单示例
    ├── steel_line_optimized.py          # 优化示例（推荐）
    └── premium-buckwheat-capsule.md     # 案例分析
```

## 技术栈

- **Python 3.8+**
- **NumPy** - 网格数据处理
- **NetworkX** - 图算法（拓扑排序）

## 常见问题

### Q: 方案A能处理多大规模的生产线？

A: 根据实现计划：
- ✅ **最适合**: 10-50个建筑
- ✅ **完全支持**: 满带钢块（约12建筑）
- ✅ **可以处理**: 精选荞愈胶囊（29建筑）
- ⚠️ **不太适合**: 超过100个建筑的超大规模

### Q: 传送带路径规划实现了吗？

A: 当前阶段专注于**建筑布局**，传送带路径规划在下一阶段实现。核心布局算法已经完成并验证。

### Q: 能否可视化结果？

A: 当前可以输出文本统计信息。图形化可视化（matplotlib）在Phase 4实现。

### Q: 如何贡献代码？

A: 欢迎贡献！请查看 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) 了解后续计划。

## 联系方式

有问题或建议？请在GitHub仓库提Issue。

---

🎉 **开始优化你的基建布局吧！**
