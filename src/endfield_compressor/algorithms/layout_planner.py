"""
Layout planning module for arranging buildings on the factory map.

This module implements Plan A: Hierarchical Layout Algorithm that arranges
buildings in layers based on their production dependencies.
"""

from typing import List, Dict, Set, Tuple, Optional
from ..core.building import Building, BuildingType
from ..core.factory_map import FactoryMap
from ..core.port import Direction
from ..core.recipe import Recipe
from .dependency_analyzer import DependencyGraph


class LayerLayout:
    """
    Represents the layout of buildings in a single layer.
    
    Attributes:
        layer_index: Index of this layer (0-based)
        buildings: List of buildings in this layer
        position: (x, y) position of the layer's origin
        size: (width, height) of the layer's bounding box
    """
    
    def __init__(self, layer_index: int):
        self.layer_index = layer_index
        self.buildings: List[Building] = []
        self.position: Tuple[int, int] = (0, 0)
        self.size: Tuple[int, int] = (0, 0)
    
    def add_building(self, building: Building):
        """Add a building to this layer."""
        self.buildings.append(building)
    
    def calculate_size(self) -> Tuple[int, int]:
        """Calculate the bounding box size of this layer."""
        if not self.buildings:
            return (0, 0)
        
        max_width = 0
        total_height = 0
        
        for building in self.buildings:
            w, h = building.get_size()
            max_width = max(max_width, w)
            total_height += h
        
        self.size = (max_width, total_height)
        return self.size
    
    def __repr__(self) -> str:
        return (f"LayerLayout(layer={self.layer_index}, "
                f"buildings={len(self.buildings)}, "
                f"size={self.size})")


class LayoutPlanner:
    """
    Plans the spatial layout of buildings on the factory map.
    
    Uses a hierarchical approach where buildings are arranged in layers
    based on their production dependencies.
    """
    
    def __init__(self, factory_map: FactoryMap):
        self.factory_map = factory_map
        self.layers: List[LayerLayout] = []
        self.spacing_x = 5  # Horizontal spacing between layers
        self.spacing_y = 2  # Vertical spacing between buildings
    
    def plan_layout(
        self,
        dependency_graph: DependencyGraph,
        recipes_to_buildings: Dict[str, List[Building]]
    ) -> bool:
        """
        Plan the layout based on dependency graph.
        
        Args:
            dependency_graph: Analyzed dependency graph
            recipes_to_buildings: Map of recipe_id -> list of buildings
            
        Returns:
            True if layout was successful
        """
        # Create layer layouts
        dep_layers = dependency_graph.layers
        
        for layer_idx, recipe_ids in enumerate(dep_layers):
            layer_layout = LayerLayout(layer_idx)
            
            # Add all buildings for recipes in this layer
            for recipe_id in recipe_ids:
                if recipe_id in recipes_to_buildings:
                    for building in recipes_to_buildings[recipe_id]:
                        layer_layout.add_building(building)
            
            self.layers.append(layer_layout)
        
        # Arrange layers spatially
        self._arrange_layers()
        
        # Place buildings on the map
        return self._place_buildings()
    
    def _arrange_layers(self):
        """
        Arrange layers horizontally with appropriate spacing.
        Each layer is positioned to the right of the previous layer.
        """
        current_x = 5  # Starting x position
        
        for layer in self.layers:
            # Set layer position
            layer.position = (current_x, 5)
            
            # Arrange buildings within this layer vertically
            self._arrange_layer_buildings(layer)
            
            # Calculate layer size
            layer.calculate_size()
            
            # Move to next layer position
            current_x += layer.size[0] + self.spacing_x
    
    def _arrange_layer_buildings(self, layer: LayerLayout):
        """
        Arrange buildings within a layer vertically.
        
        Args:
            layer: Layer to arrange
        """
        layer_x, layer_y = layer.position
        current_y = layer_y
        
        # Group buildings by type for better organization
        buildings_by_type: Dict[BuildingType, List[Building]] = {}
        for building in layer.buildings:
            if building.building_type not in buildings_by_type:
                buildings_by_type[building.building_type] = []
            buildings_by_type[building.building_type].append(building)
        
        # Place each type group
        for building_type, buildings in buildings_by_type.items():
            for building in buildings:
                # Update building position
                building.position = (layer_x, current_y)
                
                # Move to next position
                _, height = building.get_size()
                current_y += height + self.spacing_y
    
    def _place_buildings(self) -> bool:
        """
        Place all buildings on the factory map.
        
        Returns:
            True if all buildings were placed successfully
        """
        for layer in self.layers:
            for building in layer.buildings:
                success = self.factory_map.place_building(building)
                if not success:
                    print(f"Warning: Failed to place building {building.building_id}")
                    return False
        
        return True
    
    def get_layout_summary(self) -> str:
        """Get a summary of the layout."""
        summary = "Layout Summary:\n"
        summary += f"Total layers: {len(self.layers)}\n"
        
        for layer in self.layers:
            summary += f"\nLayer {layer.layer_index}:\n"
            summary += f"  Position: {layer.position}\n"
            summary += f"  Size: {layer.size}\n"
            summary += f"  Buildings: {len(layer.buildings)}\n"
            
            # Group by type
            type_counts: Dict[str, int] = {}
            for building in layer.buildings:
                type_name = building.building_type.value
                type_counts[type_name] = type_counts.get(type_name, 0) + 1
            
            for type_name, count in type_counts.items():
                summary += f"    - {type_name}: {count}\n"
        
        bbox = self.factory_map.get_bounding_box()
        area = self.factory_map.get_area()
        summary += f"\nTotal map area: {area} cells\n"
        summary += f"Bounding box: ({bbox[0]}, {bbox[1]}) to ({bbox[2]}, {bbox[3]})\n"
        
        return summary
    
    def __repr__(self) -> str:
        return (f"LayoutPlanner(layers={len(self.layers)}, "
                f"map_size={self.factory_map.width}x{self.factory_map.height})")


def create_buildings_from_recipes(
    recipes: Dict[str, Recipe],
    building_counts: Dict[str, int],
    building_types: Dict[str, BuildingType]
) -> Dict[str, List[Building]]:
    """
    Create building instances from recipes.
    
    Args:
        recipes: Dict of recipe_id -> Recipe
        building_counts: Dict of recipe_id -> number of buildings needed
        building_types: Dict of recipe_id -> BuildingType for each recipe
        
    Returns:
        Dict of recipe_id -> list of Building instances
    """
    buildings_map: Dict[str, List[Building]] = {}
    
    for recipe_id, recipe in recipes.items():
        count = building_counts.get(recipe_id, 1)
        building_type = building_types.get(recipe_id, BuildingType.REFINERY)
        
        buildings = []
        for i in range(count):
            building = Building(
                building_id=f"{recipe_id}_{i}",
                building_type=building_type,
                position=(0, 0),  # Will be set by layout planner
                recipe=recipe,
                orientation=Direction.EAST
            )
            buildings.append(building)
        
        buildings_map[recipe_id] = buildings
    
    return buildings_map
