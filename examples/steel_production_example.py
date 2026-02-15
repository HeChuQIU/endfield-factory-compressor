"""
Simple example: Steel ingot production line
一个简单的钢块生产线示例

This example demonstrates creating a simple production line that makes steel ingots.
Production chain: Blue Iron Ore -> Blue Iron Ingot -> Steel Ingot
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from endfield_compressor.core import (
    Building, BuildingType, Direction, Recipe,
    PowerTower, FactoryMap
)


def create_steel_production_line():
    """
    Create a simple steel ingot production line.
    
    Production chain:
    - 2x Refinery (Blue Iron Ore -> Blue Iron Ingot)
    - 1x Refinery (Blue Iron Ingot -> Steel Ingot)
    """
    
    # Initialize map
    factory_map = FactoryMap(width=100, height=100)
    
    # Define recipes
    blue_iron_recipe = Recipe(
        recipe_id="blue_iron_ingot",
        name="蓝铁块",
        inputs={"blue_iron_ore": 1.0},
        outputs={"blue_iron_ingot": 1.0},
        production_time=2.0,
        machine_type="精炼炉"
    )
    
    steel_recipe = Recipe(
        recipe_id="steel_ingot",
        name="钢块",
        inputs={"blue_iron_ingot": 2.0},
        outputs={"steel_ingot": 1.0},
        production_time=3.0,
        machine_type="精炼炉"
    )
    
    # Create buildings
    # Two refineries for blue iron production
    blue_iron_refinery_1 = Building(
        building_id="blue_iron_ref_1",
        building_type=BuildingType.REFINERY,
        position=(5, 10),
        recipe=blue_iron_recipe,
        orientation=Direction.EAST
    )
    
    blue_iron_refinery_2 = Building(
        building_id="blue_iron_ref_2",
        building_type=BuildingType.REFINERY,
        position=(5, 15),
        recipe=blue_iron_recipe,
        orientation=Direction.EAST
    )
    
    # One refinery for steel production
    steel_refinery = Building(
        building_id="steel_ref",
        building_type=BuildingType.REFINERY,
        position=(15, 12),
        recipe=steel_recipe,
        orientation=Direction.EAST
    )
    
    # Place buildings on map
    print("Placing buildings...")
    factory_map.place_building(blue_iron_refinery_1)
    factory_map.place_building(blue_iron_refinery_2)
    factory_map.place_building(steel_refinery)
    
    print(f"✓ Placed {len(factory_map.buildings)} buildings")
    
    # Add power tower
    power_tower = PowerTower(
        tower_id="tower_1",
        position=(10, 13),
        coverage_radius=8
    )
    factory_map.place_power_tower(power_tower)
    print(f"✓ Placed {len(factory_map.power_towers)} power tower")
    
    # Verify power coverage
    is_covered, uncovered = factory_map.verify_power_coverage()
    if is_covered:
        print("✓ All buildings are covered by power")
    else:
        print(f"⚠ {len(uncovered)} positions not covered by power")
    
    # Calculate layout statistics
    bbox = factory_map.get_bounding_box()
    area = factory_map.get_area()
    
    print("\n=== Layout Statistics ===")
    print(f"Bounding box: ({bbox[0]}, {bbox[1]}) to ({bbox[2]}, {bbox[3]})")
    print(f"Total area used: {area} grid cells")
    print(f"Buildings: {len(factory_map.buildings)}")
    print(f"Power towers: {len(factory_map.power_towers)}")
    
    # Print building details
    print("\n=== Building Details ===")
    for building in factory_map.buildings.values():
        print(f"- {building.building_id}: {building.recipe.name} at {building.position}")
        print(f"  Size: {building.get_size()}")
        print(f"  Inputs: {len(building.inputs)} ports")
        print(f"  Outputs: {len(building.outputs)} ports")
    
    return factory_map


if __name__ == "__main__":
    print("=== Steel Ingot Production Line Example ===")
    print("钢块生产线示例\n")
    
    factory_map = create_steel_production_line()
    
    print("\n✅ Example completed successfully!")
    print("\nNote: This is a basic layout demonstration.")
    print("In the full implementation, we will add:")
    print("- Automatic conveyor belt routing")
    print("- Optimal building placement algorithms")
    print("- Layout optimization")
    print("- Visualization")
