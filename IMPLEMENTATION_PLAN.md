# 实施计划文档 (Implementation Plan)

## 1. 项目概述

### 1.1 问题定义

在《明日方舟：终末地》(Arknights: Endfield) 游戏中，基建系统需要建立自动化生产流水线。给定目标产品后，所需建筑数量和类型是固定的。优化目标是**最小化占用的地图面积**，同时保证：

1. 所有机器通过传送带正确连接
2. 所有建筑被电力塔覆盖
3. 生产效率达到要求（满带生产）

### 1.2 核心约束

#### 建筑规则
- 所有建筑宽度统一为 3格
- 多数建筑长度为 3格（精炼炉、粉碎机、塑形机）
- 研磨机和灌装机长度为 6格
- 机器长边的格数 = 输入/输出口数量

#### 连接规则
- ❌ 机器输入输出口直接相邻**不视为有效连接**
- ✅ 必须通过传送带连接机器
- 传送带占地 1×1，有输入方向和输出方向
- 传送带桥可以让两条传送带交叉而不混合物品
- 如果机器之间只隔传送带桥，视为有效连接

#### 电力规则
- 所有建筑需要电力塔覆盖
- 电力塔有固定覆盖范围（待确定）
- 电力塔本身占用空间

## 2. 方案设计

### 2.1 方案A：层次化布局算法

**核心思想**：按照生产流程的依赖关系，将建筑分层布局，每一层处理一个生产阶段。

#### 算法流程

```
1. 分析生产链，构建依赖图
   - 识别原材料输入节点
   - 识别中间产物节点
   - 识别最终产品输出节点
   
2. 拓扑排序确定层级
   - 第0层：原材料输入（虚拟节点）
   - 第1层：处理原材料的第一批机器
   - 第k层：依赖第k-1层输出的机器
   - 最后一层：最终产品输出机器
   
3. 每层内部布局优化
   - 相同类型机器聚合放置
   - 最小化层内连接距离
   - 预留传送带空间
   
4. 层间连接规划
   - 计算物品流量需求
   - 规划传送带路径（最短路径优先）
   - 处理传送带交叉（使用传送带桥）
   
5. 电力塔布局
   - 计算所有建筑的覆盖需求
   - 使用贪心算法放置电力塔
   - 确保完全覆盖且数量最少
```

### 2.2 方案A的适用范围

#### 适合的场景
✅ **小到中等规模生产线**（10-50个建筑）
- 示例：精选荞愈胶囊（29个建筑）
- 生产链深度 ≤ 5层
- 物品流向相对简单

✅ **单一主线生产链**
- 从原材料到最终产品路径清晰
- 支线相对独立
- 合并点数量有限

✅ **满带生产线**（如满带钢块）
- **满带钢块生产线分析**：
  - 需求：1满带钢块输出
  - 建筑需求：2个精炼炉（每个输出0.5满带）
  - 上游：2个研磨机生产致密蓝铁粉末
  - 再上游：4个粉碎机生产蓝铁粉末
  - 更上游：4个精炼炉生产蓝铁块
  - **总计**：约12个建筑，4层依赖
  - **结论**：✅ 完全适用方案A

#### 不太适合的场景
❌ **大规模复杂生产线**（>100个建筑）
- 计算复杂度过高
- 需要更高级的优化算法（如SAT求解器）

❌ **高度交织的生产网络**
- 多个产品共享中间产物
- 循环依赖或复杂的物品分配

### 2.3 关于传送带的理解

**重要说明**：之前的实现可能错误理解了传送带机制。

#### 正确理解
- 传送带不是简单的"物品通道"
- 每条传送带是一个**1×1的独立节点**
- 必须明确指定每条传送带的**输入方向**和**输出方向**
- 传送带之间需要通过方向匹配来连接
- 传送带桥是特殊节点，允许物品流交叉

#### 实现要点
```
机器A → 传送带1 → 传送带2 → ... → 传送带N → 机器B

每个箭头代表一个有向连接：
- 机器A的输出口 → 传送带1的输入口
- 传送带1的输出口 → 传送带2的输入口
- ...
- 传送带N的输出口 → 机器B的输入口
```

## 3. 技术方案

### 3.1 技术栈选择

**编程语言**：Python 3.8+
- 原因：快速原型开发，丰富的科学计算库

**核心依赖库**：
- `numpy`：矩阵运算和网格表示
- `networkx`：图算法（拓扑排序、最短路径）
- `matplotlib`：可视化布局结果（可选）

**可选增强**：
- `python-sat` 或 `z3-solver`：如果需要更精确的SAT求解

### 3.2 核心数据结构

#### 建筑类 (Building)
```python
class Building:
    id: str                    # 唯一标识
    type: str                  # 类型（研磨机、精炼炉等）
    size: tuple[int, int]      # (宽度, 长度)
    position: tuple[int, int]  # (x, y) 在地图上的位置
    inputs: list[Port]         # 输入口列表
    outputs: list[Port]        # 输出口列表
    recipe: Recipe             # 生产配方
```

#### 端口类 (Port)
```python
class Port:
    building_id: str           # 所属建筑ID
    port_index: int            # 端口索引（0-based）
    direction: Direction       # 方向（上/下/左/右）
    position: tuple[int, int]  # 在地图上的绝对位置
    item_type: str             # 物品类型
```

#### 传送带类 (Conveyor)
```python
class Conveyor:
    id: str                    # 唯一标识
    position: tuple[int, int]  # (x, y) 位置
    input_direction: Direction # 输入方向
    output_direction: Direction# 输出方向
    item_type: str             # 传输的物品类型
```

#### 传送带桥类 (ConveyorBridge)
```python
class ConveyorBridge:
    id: str                    # 唯一标识
    position: tuple[int, int]  # (x, y) 位置
    primary_direction: Direction   # 主通道方向
    secondary_direction: Direction # 交叉通道方向
```

#### 电力塔类 (PowerTower)
```python
class PowerTower:
    id: str                    # 唯一标识
    position: tuple[int, int]  # (x, y) 位置
    coverage_radius: int       # 覆盖半径
```

#### 地图类 (FactoryMap)
```python
class FactoryMap:
    width: int                 # 地图宽度
    height: int                # 地图高度
    grid: np.ndarray           # 占用情况网格
    buildings: dict[str, Building]
    conveyors: dict[str, Conveyor]
    bridges: dict[str, ConveyorBridge]
    power_towers: dict[str, PowerTower]
    
    def is_occupied(self, x, y) -> bool
    def place_building(self, building: Building, x: int, y: int) -> bool
    def find_path(self, start: Port, end: Port) -> list[Conveyor]
```

### 3.3 算法模块

#### 依赖分析模块 (dependency_analyzer.py)
```python
def build_dependency_graph(recipe_chain: list[Recipe]) -> nx.DiGraph
def topological_sort_layers(graph: nx.DiGraph) -> list[list[str]]
def calculate_flow_rates(graph: nx.DiGraph) -> dict[str, float]
```

#### 布局规划模块 (layout_planner.py)
```python
def plan_layer_layout(buildings: list[Building], layer_index: int) -> Layout
def optimize_building_positions(buildings: list[Building]) -> list[Position]
def calculate_bounding_box(layout: Layout) -> tuple[int, int, int, int]
```

#### 路径规划模块 (path_planner.py)
```python
def plan_conveyor_path(start: Port, end: Port, map: FactoryMap) -> list[Conveyor]
def resolve_path_conflicts(paths: list[Path]) -> list[Path]
def insert_bridges(paths: list[Path]) -> list[Conveyor | ConveyorBridge]
```

#### 电力优化模块 (power_optimizer.py)
```python
def calculate_coverage_requirement(buildings: list[Building]) -> set[tuple[int, int]]
def greedy_tower_placement(coverage_req: set) -> list[PowerTower]
def verify_full_coverage(towers: list[PowerTower], buildings: list[Building]) -> bool
```

## 4. 实现步骤

### Phase 1: 基础框架 (Week 1)
1. ✅ 创建项目结构和目录
2. ✅ 定义核心数据类（Building, Port, Conveyor等）
3. ✅ 实现 FactoryMap 类和基础操作
4. ✅ 编写单元测试框架

### Phase 2: 依赖分析 (Week 2)
1. 实现配方链解析器
2. 构建依赖图（使用 networkx）
3. 实现拓扑排序分层
4. 计算物品流量
5. 测试：验证精选荞愈胶囊案例的依赖关系

### Phase 3: 布局算法 (Week 3-4)
1. 实现单层建筑布局算法
   - 同类建筑聚合
   - 预留传送带空间
2. 实现多层组合布局
3. 实现边界框最小化优化
4. 测试：简单3-5建筑场景

### Phase 4: 传送带规划 (Week 5)
1. 实现 A* 路径规划算法
2. 实现多路径冲突检测
3. 实现传送带桥自动插入
4. 验证连接的有效性
5. 测试：复杂交叉路径场景

### Phase 5: 电力系统 (Week 6)
1. 实现贪心电力塔放置
2. 实现覆盖验证
3. 优化电力塔数量
4. 测试：不同覆盖半径的影响

### Phase 6: 端到端集成 (Week 7)
1. 整合所有模块
2. 实现主流程控制器
3. 完整测试精选荞愈胶囊案例
4. 测试满带钢块生产线
5. 性能分析和优化

### Phase 7: 可视化和文档 (Week 8)
1. 实现布局可视化（matplotlib）
2. 生成布局报告
3. 编写用户文档
4. 编写API文档

## 5. 测试策略

### 5.1 单元测试
- 每个数据类的基本操作
- 路径规划算法的正确性
- 覆盖检测的准确性

### 5.2 集成测试
- 完整的精选荞愈胶囊生产线（29建筑）
- 满带钢块生产线（约12建筑）
- 简单的单机器测试案例

### 5.3 性能测试
- 测量不同规模下的运行时间
- 10建筑：< 1秒
- 30建筑：< 10秒
- 50建筑：< 60秒

### 5.4 质量指标
- 代码覆盖率 > 80%
- 所有测试用例通过
- 布局面积 ≤ 手工设计的 120%

## 6. 风险和挑战

### 6.1 技术风险
| 风险 | 影响 | 缓解策略 |
|------|------|---------|
| 传送带路径规划复杂度高 | 高 | 使用启发式算法，设置路径长度上限 |
| 交叉路径冲突难以解决 | 中 | 分阶段规划，优先处理主要流量路径 |
| 电力塔优化陷入局部最优 | 低 | 使用多次随机重启的贪心算法 |

### 6.2 需求风险
| 风险 | 影响 | 缓解策略 |
|------|------|---------|
| 游戏规则理解不准确 | 高 | 与实际游戏对比验证，迭代修正 |
| 电力塔覆盖范围未知 | 中 | 参数化设计，支持配置 |
| 建筑尺寸或端口数量变化 | 低 | 数据驱动设计，配置文件管理 |

## 7. 后续扩展

### 7.1 短期优化
- 支持用户手动调整布局
- 生成多个候选方案供选择
- 添加布局美观度评分

### 7.2 长期增强
- **方案B**：基于SAT求解器的精确优化
  - 适用于中大规模（50-100建筑）
  - 保证全局最优或接近最优
  - 使用 python-sat 或 z3
  
- **方案C**：启发式搜索 + 局部优化
  - 适用于大规模（100+建筑）
  - 结合遗传算法或模拟退火
  - 多目标优化（面积、电力塔数量、美观度）

### 7.3 功能扩展
- 支持多个最终产品的复合生产线
- 导出为游戏内可用的蓝图格式
- 3D 可视化（如果游戏是3D的）
- Web 界面交互式设计

## 8. 总结

方案A（层次化布局算法）是一个**平衡实用性和开发成本**的解决方案：

**优势**：
- ✅ 实现相对简单，开发周期短
- ✅ 适合大多数实际场景（10-50建筑）
- ✅ 结果可预测，易于调试
- ✅ **完全支持满带钢块等常见生产线需求**

**局限**：
- ❌ 无法保证全局最优
- ❌ 对于超大规模或极度复杂的网络效果有限

**建议**：
1. 先实现方案A，快速验证可行性
2. 用实际案例测试和优化
3. 根据需求决定是否投入方案B（SAT）或方案C（启发式搜索）

**时间规划**：
- 核心功能开发：6-8周
- 测试和优化：2周
- 文档和发布：1周
- **总计**：9-11周

---

*文档版本*: v1.0  
*创建日期*: 2026-02-15  
*作者*: Copilot AI Agent
