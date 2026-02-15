"""
Test dependency analysis.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from endfield_compressor.core import Recipe
from endfield_compressor.algorithms.dependency_analyzer import DependencyGraph


def test_simple_dependency_chain():
    """
    Test a simple production chain:
    Blue Iron Ore -> Blue Iron Ingot -> Steel Ingot
    """
    print("\n=== Testing Simple Dependency Chain ===")
    
    # Create recipes
    blue_iron_recipe = Recipe(
        recipe_id="blue_iron",
        name="蓝铁块",
        inputs={"blue_iron_ore": 1.0},
        outputs={"blue_iron_ingot": 1.0},
        production_time=2.0,
        machine_type="精炼炉"
    )
    
    steel_recipe = Recipe(
        recipe_id="steel",
        name="钢块",
        inputs={"blue_iron_ingot": 2.0},
        outputs={"steel_ingot": 1.0},
        production_time=3.0,
        machine_type="精炼炉"
    )
    
    # Build dependency graph
    dep_graph = DependencyGraph()
    dep_graph.add_recipe(blue_iron_recipe, building_count=2)
    dep_graph.add_recipe(steel_recipe, building_count=1)
    
    # Calculate layers
    layers = dep_graph.calculate_layers()
    
    print(f"Created dependency graph: {dep_graph}")
    print(f"\nNumber of layers: {len(layers)}")
    
    # Print layer summary
    print(dep_graph.get_layer_summary())
    
    # Verify layers
    assert len(layers) == 2, f"Expected 2 layers, got {len(layers)}"
    assert "blue_iron" in layers[0], "Blue iron should be in layer 0"
    assert "steel" in layers[1], "Steel should be in layer 1"
    
    print("✓ Dependency layers calculated correctly")
    
    # Calculate flow rates
    print("\n--- Flow Rate Analysis ---")
    flow_rates = dep_graph.calculate_flow_rates("steel_ingot", target_rate=1.0)
    
    print(f"Target: 1.0 steel_ingot/sec")
    for item, rate in flow_rates.items():
        print(f"  {item}: {rate:.2f}/sec")
    
    print("\n✅ Simple dependency chain test passed!")


def test_complex_production_chain():
    """
    Test a more complex production chain with multiple inputs.
    """
    print("\n=== Testing Complex Production Chain ===")
    
    # Blue Iron chain
    blue_iron_ore_recipe = Recipe(
        recipe_id="blue_iron_ingot",
        name="蓝铁块",
        inputs={"blue_iron_ore": 1.0},
        outputs={"blue_iron_ingot": 1.0},
        production_time=2.0,
        machine_type="精炼炉"
    )
    
    # Crushing blue iron
    blue_iron_powder_recipe = Recipe(
        recipe_id="blue_iron_powder",
        name="蓝铁粉末",
        inputs={"blue_iron_ingot": 1.0},
        outputs={"blue_iron_powder": 2.0},
        production_time=1.5,
        machine_type="粉碎机"
    )
    
    # Grinding to dense powder
    dense_powder_recipe = Recipe(
        recipe_id="dense_blue_iron_powder",
        name="致密蓝铁粉末",
        inputs={"blue_iron_powder": 2.0, "sand_powder": 1.0},
        outputs={"dense_blue_iron_powder": 1.0},
        production_time=2.0,
        machine_type="研磨机"
    )
    
    # Final steel production
    steel_recipe = Recipe(
        recipe_id="steel_ingot",
        name="钢块",
        inputs={"dense_blue_iron_powder": 1.0},
        outputs={"steel_ingot": 1.0},
        production_time=2.0,
        machine_type="精炼炉"
    )
    
    # Build dependency graph
    dep_graph = DependencyGraph()
    dep_graph.add_recipe(blue_iron_ore_recipe, building_count=4)
    dep_graph.add_recipe(blue_iron_powder_recipe, building_count=4)
    dep_graph.add_recipe(dense_powder_recipe, building_count=2)
    dep_graph.add_recipe(steel_recipe, building_count=2)
    
    # Calculate layers
    layers = dep_graph.calculate_layers()
    
    print(f"Created dependency graph: {dep_graph}")
    print(dep_graph.get_layer_summary())
    
    # Verify layer count
    assert len(layers) == 4, f"Expected 4 layers, got {len(layers)}"
    
    print("✓ Complex production chain layers calculated correctly")
    print("\n✅ Complex production chain test passed!")


if __name__ == "__main__":
    print("Running dependency analysis tests...")
    test_simple_dependency_chain()
    test_complex_production_chain()
    print("\n✅✅ All dependency analysis tests passed!")
