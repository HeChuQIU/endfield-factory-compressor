"""
Basic tests for core data structures.
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from endfield_compressor.core import (
    Building, BuildingType, Direction, Port, Recipe,
    Conveyor, PowerTower, FactoryMap
)


def test_building_creation():
    """Test creating a basic building."""
    recipe = Recipe(
        recipe_id="steel_ingot",
        name="钢块",
        inputs={"dense_blue_iron_powder": 1.0},
        outputs={"steel_ingot": 1.0},
        production_time=2.0,
        machine_type="精炼炉"
    )
    
    building = Building(
        building_id="refinery_1",
        building_type=BuildingType.REFINERY,
        position=(10, 10),
        recipe=recipe
    )
    
    assert building.building_id == "refinery_1"
    assert building.building_type == BuildingType.REFINERY
    assert building.position == (10, 10)
    assert len(building.inputs) == 3  # 3x3 building has 3 ports
    assert len(building.outputs) == 3
    print(f"✓ Building creation test passed: {building}")


def test_conveyor_creation():
    """Test creating a conveyor."""
    conveyor = Conveyor(
        conveyor_id="conv_1",
        position=(5, 5),
        input_direction=Direction.WEST,
        output_direction=Direction.EAST,
        item_type="steel_ingot"
    )
    
    assert conveyor.position == (5, 5)
    assert conveyor.can_connect_from(Direction.WEST)
    assert conveyor.can_connect_to(Direction.EAST)
    assert not conveyor.can_connect_from(Direction.EAST)
    print(f"✓ Conveyor creation test passed: {conveyor}")


def test_power_tower():
    """Test power tower coverage."""
    tower = PowerTower(
        tower_id="tower_1",
        position=(10, 10),
        coverage_radius=5
    )
    
    # Test coverage
    assert tower.covers_position((10, 10))  # Self
    assert tower.covers_position((15, 10))  # Distance 5
    assert tower.covers_position((12, 13))  # Distance 5 (2+3)
    assert not tower.covers_position((16, 10))  # Distance 6
    print(f"✓ Power tower test passed: {tower}")


def test_factory_map():
    """Test factory map operations."""
    factory_map = FactoryMap(width=50, height=50)
    
    # Create and place a building
    recipe = Recipe(
        recipe_id="test",
        name="测试",
        inputs={},
        outputs={"test_item": 1.0},
        production_time=1.0,
        machine_type="精炼炉"
    )
    
    building = Building(
        building_id="test_building",
        building_type=BuildingType.REFINERY,
        position=(5, 5),
        recipe=recipe
    )
    
    # Place building
    assert factory_map.place_building(building)
    assert not factory_map.is_area_free(5, 5, 3, 3)
    
    # Check bounding box
    bbox = factory_map.get_bounding_box()
    assert bbox == (5, 5, 7, 7)  # 3x3 building
    
    # Check area
    area = factory_map.get_area()
    assert area == 9  # 3x3 = 9
    
    print(f"✓ Factory map test passed: {factory_map}")


def test_direction_enum():
    """Test Direction enum."""
    assert Direction.NORTH.opposite() == Direction.SOUTH
    assert Direction.EAST.opposite() == Direction.WEST
    assert Direction.NORTH.is_vertical()
    assert Direction.EAST.is_horizontal()
    print("✓ Direction enum test passed")


if __name__ == "__main__":
    print("Running basic tests...\n")
    test_direction_enum()
    test_building_creation()
    test_conveyor_creation()
    test_power_tower()
    test_factory_map()
    print("\n✅ All basic tests passed!")
