# Endfield Factory Compressor - 使用说明

## 项目结构

```
endfield-factory-compressor/
├── src/endfield_compressor/    # 源代码
│   ├── core/                   # 核心数据结构
│   │   ├── building.py         # 建筑类
│   │   ├── conveyor.py         # 传送带类
│   │   ├── port.py             # 端口和方向
│   │   ├── power_tower.py      # 电力塔类
│   │   ├── factory_map.py      # 工厂地图类
│   │   └── recipe.py           # 生产配方类
│   ├── algorithms/             # 优化算法（待实现）
│   └── utils/                  # 工具函数
├── tests/                      # 测试文件
├── examples/                   # 示例代码
└── IMPLEMENTATION_PLAN.md      # 实现计划文档
```

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行基础测试

```bash
python tests/test_basic.py
```

### 运行示例

```bash
python examples/steel_production_example.py
```

## 核心概念

### 1. 建筑 (Building)

表示工厂中的生产建筑，如精炼炉、研磨机等。

```python
from endfield_compressor.core import Building, BuildingType, Recipe

# 创建配方
recipe = Recipe(
    recipe_id="steel",
    name="钢块",
    inputs={"blue_iron": 2.0},
    outputs={"steel": 1.0},
    production_time=3.0,
    machine_type="精炼炉"
)

# 创建建筑
building = Building(
    building_id="refinery_1",
    building_type=BuildingType.REFINERY,
    position=(10, 10),
    recipe=recipe
)
```

### 2. 工厂地图 (FactoryMap)

管理所有建筑、传送带和电力塔的布局。

```python
from endfield_compressor.core import FactoryMap

# 创建地图
factory_map = FactoryMap(width=100, height=100)

# 放置建筑
factory_map.place_building(building)

# 获取统计信息
area = factory_map.get_area()
bbox = factory_map.get_bounding_box()
```

### 3. 传送带 (Conveyor)

连接建筑之间的物品传输带。

```python
from endfield_compressor.core import Conveyor, Direction

conveyor = Conveyor(
    conveyor_id="conv_1",
    position=(5, 5),
    input_direction=Direction.WEST,
    output_direction=Direction.EAST,
    item_type="steel"
)
```

### 4. 电力塔 (PowerTower)

为建筑提供电力覆盖。

```python
from endfield_compressor.core import PowerTower

tower = PowerTower(
    tower_id="tower_1",
    position=(10, 10),
    coverage_radius=5
)

# 检查覆盖
if tower.covers_position((12, 13)):
    print("Position is covered!")
```

## 已实现功能

✅ **核心数据结构**
- 建筑类型定义（精炼炉、研磨机、粉碎机等）
- 端口和方向系统
- 生产配方系统
- 传送带和传送带桥
- 电力塔和覆盖计算
- 工厂地图管理

✅ **基础功能**
- 建筑放置和冲突检测
- 网格占用管理
- 边界框和面积计算
- 电力覆盖验证

## 待实现功能

⏳ **Phase 3: 布局算法**
- 依赖关系分析
- 自动建筑布局优化
- 传送带路径规划
- 电力塔优化放置

⏳ **Phase 4: 验证和测试**
- 精选荞愈胶囊案例
- 满带钢块生产线测试
- 可视化工具

## 开发指南

### 运行测试

```bash
# 运行所有测试
python -m pytest tests/

# 运行特定测试
python tests/test_basic.py
```

### 代码风格

使用 Black 格式化代码：

```bash
black src/ tests/
```

### 类型检查

使用 mypy 进行类型检查：

```bash
mypy src/
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 参考资源

- [实现计划文档](../IMPLEMENTATION_PLAN.md) - 详细的实现计划和设计思路
- [精选荞愈胶囊案例](../examples/premium-buckwheat-capsule.md) - 完整的生产线需求分析

## 许可证

本项目使用 MIT 许可证。详见 LICENSE 文件。
