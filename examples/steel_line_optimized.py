"""
Complete end-to-end example: Steel production line with layout optimization.
钢块生产线完整示例
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from endfield_compressor.core import (
    Building, BuildingType, Recipe, FactoryMap, PowerTower
)
from endfield_compressor.algorithms.dependency_analyzer import DependencyGraph
from endfield_compressor.algorithms.layout_planner import (
    LayoutPlanner, create_buildings_from_recipes
)


def create_steel_line_with_optimizer():
    """
    Create an optimized steel production line using the layout planner.
    
    Production chain:
    - Blue Iron Ore -> Blue Iron Ingot (2x Refinery)
    - Blue Iron Ingot -> Blue Iron Powder (2x Crusher)
    - Blue Iron Powder + Sand Powder -> Dense Blue Iron Powder (1x Grinder)
    - Dense Blue Iron Powder -> Steel Ingot (1x Refinery)
    """
    
    print("=== Steel Production Line with Automatic Layout ===\n")
    
    # Step 1: Define recipes
    print("Step 1: Defining recipes...")
    
    recipes = {
        "blue_iron_ingot": Recipe(
            recipe_id="blue_iron_ingot",
            name="蓝铁块",
            inputs={"blue_iron_ore": 1.0},
            outputs={"blue_iron_ingot": 1.0},
            production_time=2.0,
            machine_type="精炼炉"
        ),
        "blue_iron_powder": Recipe(
            recipe_id="blue_iron_powder",
            name="蓝铁粉末",
            inputs={"blue_iron_ingot": 1.0},
            outputs={"blue_iron_powder": 2.0},
            production_time=1.5,
            machine_type="粉碎机"
        ),
        "dense_powder": Recipe(
            recipe_id="dense_powder",
            name="致密蓝铁粉末",
            inputs={"blue_iron_powder": 2.0, "sand_powder": 1.0},
            outputs={"dense_blue_iron_powder": 1.0},
            production_time=2.0,
            machine_type="研磨机"
        ),
        "steel_ingot": Recipe(
            recipe_id="steel_ingot",
            name="钢块",
            inputs={"dense_blue_iron_powder": 1.0},
            outputs={"steel_ingot": 1.0},
            production_time=2.0,
            machine_type="精炼炉"
        ),
    }
    
    # Building counts for each recipe
    building_counts = {
        "blue_iron_ingot": 2,  # 2 refineries
        "blue_iron_powder": 2,  # 2 crushers
        "dense_powder": 1,      # 1 grinder
        "steel_ingot": 1,       # 1 refinery
    }
    
    # Building types for each recipe
    building_types = {
        "blue_iron_ingot": BuildingType.REFINERY,
        "blue_iron_powder": BuildingType.CRUSHER,
        "dense_powder": BuildingType.GRINDER,
        "steel_ingot": BuildingType.REFINERY,
    }
    
    print(f"  ✓ Defined {len(recipes)} recipes")
    
    # Step 2: Build dependency graph
    print("\nStep 2: Analyzing dependencies...")
    
    dep_graph = DependencyGraph()
    for recipe_id, recipe in recipes.items():
        count = building_counts[recipe_id]
        dep_graph.add_recipe(recipe, building_count=count)
    
    layers = dep_graph.calculate_layers()
    print(f"  ✓ Calculated {len(layers)} dependency layers")
    print("\n" + dep_graph.get_layer_summary())
    
    # Step 3: Calculate flow rates
    print("Step 3: Calculating flow rates...")
    flow_rates = dep_graph.calculate_flow_rates("steel_ingot", target_rate=0.5)
    
    print(f"  Target: 0.5 steel_ingot/sec")
    for item, rate in sorted(flow_rates.items()):
        print(f"    {item}: {rate:.2f}/sec")
    
    # Step 4: Create building instances
    print("\nStep 4: Creating building instances...")
    
    buildings_map = create_buildings_from_recipes(
        recipes, building_counts, building_types
    )
    
    total_buildings = sum(len(b) for b in buildings_map.values())
    print(f"  ✓ Created {total_buildings} buildings")
    
    # Step 5: Plan layout
    print("\nStep 5: Planning layout...")
    
    factory_map = FactoryMap(width=200, height=200)
    layout_planner = LayoutPlanner(factory_map)
    
    success = layout_planner.plan_layout(dep_graph, buildings_map)
    
    if success:
        print("  ✓ Layout planning successful!")
    else:
        print("  ✗ Layout planning failed!")
        return None
    
    print("\n" + layout_planner.get_layout_summary())
    
    # Step 6: Add power towers
    print("Step 6: Adding power towers...")
    
    # Simple strategy: place towers at strategic positions
    bbox = factory_map.get_bounding_box()
    center_x = (bbox[0] + bbox[2]) // 2
    center_y = (bbox[1] + bbox[3]) // 2
    
    tower1 = PowerTower(
        tower_id="tower_1",
        position=(center_x, center_y),
        coverage_radius=15
    )
    factory_map.place_power_tower(tower1)
    
    # Check coverage
    is_covered, uncovered = factory_map.verify_power_coverage()
    
    if is_covered:
        print("  ✓ All buildings covered by power towers")
    else:
        print(f"  ⚠ {len(uncovered)} positions not covered")
        # Add more towers if needed
        tower2 = PowerTower(
            tower_id="tower_2",
            position=(bbox[0] + 5, center_y),
            coverage_radius=15
        )
        factory_map.place_power_tower(tower2)
        
        is_covered, uncovered = factory_map.verify_power_coverage()
        if is_covered:
            print("  ✓ All buildings now covered with 2 towers")
    
    # Final statistics
    print("\n=== Final Statistics ===")
    print(f"Total buildings: {len(factory_map.buildings)}")
    print(f"Power towers: {len(factory_map.power_towers)}")
    print(f"Map area used: {factory_map.get_area()} cells")
    bbox = factory_map.get_bounding_box()
    width = bbox[2] - bbox[0] + 1
    height = bbox[3] - bbox[1] + 1
    print(f"Layout dimensions: {width} x {height}")
    
    return factory_map


if __name__ == "__main__":
    print("=" * 60)
    print("Steel Production Line - Automatic Layout Optimization")
    print("钢块生产线 - 自动布局优化")
    print("=" * 60)
    print()
    
    factory_map = create_steel_line_with_optimizer()
    
    if factory_map:
        print("\n" + "=" * 60)
        print("✅ Production line created successfully!")
        print("=" * 60)
        print("\nNext steps:")
        print("- Add conveyor belt routing (Phase 3)")
        print("- Optimize power tower placement (Phase 3)")
        print("- Add visualization (Phase 4)")
    else:
        print("\n❌ Failed to create production line")
