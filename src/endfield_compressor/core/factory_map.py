"""
Factory map class for managing the overall layout.
"""

import numpy as np
from typing import Dict, List, Optional, Set, Tuple
from .building import Building
from .conveyor import Conveyor, ConveyorBridge
from .power_tower import PowerTower
from .port import Port


class FactoryMap:
    """
    Represents the factory layout grid and manages all placed objects.
    
    Attributes:
        width: Map width in grid cells
        height: Map height in grid cells
        grid: 2D numpy array tracking occupied cells (0=empty, >0=occupied)
        buildings: Dict of building_id -> Building
        conveyors: Dict of conveyor_id -> Conveyor
        bridges: Dict of bridge_id -> ConveyorBridge
        power_towers: Dict of tower_id -> PowerTower
    """
    
    def __init__(self, width: int = 100, height: int = 100):
        """
        Initialize an empty factory map.
        
        Args:
            width: Map width in grid cells
            height: Map height in grid cells
        """
        self.width = width
        self.height = height
        self.grid = np.zeros((height, width), dtype=np.int32)
        
        self.buildings: Dict[str, Building] = {}
        self.conveyors: Dict[str, Conveyor] = {}
        self.bridges: Dict[str, ConveyorBridge] = {}
        self.power_towers: Dict[str, PowerTower] = {}
    
    def is_position_valid(self, x: int, y: int) -> bool:
        """Check if position is within map bounds."""
        return 0 <= x < self.width and 0 <= y < self.height
    
    def is_occupied(self, x: int, y: int) -> bool:
        """Check if a position is occupied."""
        if not self.is_position_valid(x, y):
            return True  # Out of bounds is considered occupied
        return self.grid[y, x] != 0
    
    def is_area_free(self, x: int, y: int, width: int, height: int) -> bool:
        """
        Check if a rectangular area is free.
        
        Args:
            x, y: Top-left corner
            width, height: Dimensions of the area
            
        Returns:
            True if all cells in the area are free
        """
        for dx in range(width):
            for dy in range(height):
                if self.is_occupied(x + dx, y + dy):
                    return False
        return True
    
    def place_building(self, building: Building) -> bool:
        """
        Place a building on the map.
        
        Args:
            building: Building to place
            
        Returns:
            True if successfully placed, False if location is occupied
        """
        # Check if area is free
        width, height = building.get_size()
        x, y = building.position
        
        if not self.is_area_free(x, y, width, height):
            return False
        
        # Mark cells as occupied
        for cell_x, cell_y in building.get_occupied_cells():
            self.grid[cell_y, cell_x] = 1
        
        # Add to buildings dict
        self.buildings[building.building_id] = building
        return True
    
    def place_conveyor(self, conveyor: Conveyor) -> bool:
        """
        Place a conveyor on the map.
        
        Args:
            conveyor: Conveyor to place
            
        Returns:
            True if successfully placed, False if location is occupied
        """
        x, y = conveyor.position
        
        if self.is_occupied(x, y):
            return False
        
        self.grid[y, x] = 2  # Mark as conveyor
        self.conveyors[conveyor.conveyor_id] = conveyor
        return True
    
    def place_bridge(self, bridge: ConveyorBridge) -> bool:
        """
        Place a conveyor bridge on the map.
        
        Args:
            bridge: Bridge to place
            
        Returns:
            True if successfully placed, False if location is occupied
        """
        x, y = bridge.position
        
        if self.is_occupied(x, y):
            return False
        
        self.grid[y, x] = 3  # Mark as bridge
        self.bridges[bridge.bridge_id] = bridge
        return True
    
    def place_power_tower(self, tower: PowerTower) -> bool:
        """
        Place a power tower on the map.
        
        Args:
            tower: Tower to place
            
        Returns:
            True if successfully placed, False if location is occupied
        """
        x, y = tower.position
        
        if self.is_occupied(x, y):
            return False
        
        self.grid[y, x] = 4  # Mark as power tower
        self.power_towers[tower.tower_id] = tower
        return True
    
    def get_bounding_box(self) -> Tuple[int, int, int, int]:
        """
        Calculate the bounding box of all placed objects.
        
        Returns:
            (min_x, min_y, max_x, max_y) or (0, 0, 0, 0) if empty
        """
        occupied = np.argwhere(self.grid > 0)
        
        if len(occupied) == 0:
            return (0, 0, 0, 0)
        
        min_y, min_x = occupied.min(axis=0)
        max_y, max_x = occupied.max(axis=0)
        
        return (int(min_x), int(min_y), int(max_x), int(max_y))
    
    def get_area(self) -> int:
        """
        Calculate the area of the bounding box.
        
        Returns:
            Area in grid cells
        """
        min_x, min_y, max_x, max_y = self.get_bounding_box()
        
        if min_x == max_x == min_y == max_y == 0:
            return 0
        
        width = max_x - min_x + 1
        height = max_y - min_y + 1
        return width * height
    
    def verify_power_coverage(self) -> Tuple[bool, Set[tuple[int, int]]]:
        """
        Verify that all buildings are covered by power towers.
        
        Returns:
            (all_covered, uncovered_positions)
            - all_covered: True if all building cells are covered
            - uncovered_positions: Set of positions not covered by any tower
        """
        # Get all building positions
        building_positions = set()
        for building in self.buildings.values():
            building_positions.update(building.get_occupied_cells())
        
        # Get all covered positions
        covered_positions = set()
        for tower in self.power_towers.values():
            covered_positions.update(tower.get_covered_area())
        
        # Find uncovered building positions
        uncovered = building_positions - covered_positions
        
        return (len(uncovered) == 0, uncovered)
    
    def __repr__(self) -> str:
        area = self.get_area()
        return (f"FactoryMap(size={self.width}x{self.height}, "
                f"buildings={len(self.buildings)}, "
                f"conveyors={len(self.conveyors)}, "
                f"towers={len(self.power_towers)}, "
                f"used_area={area})")
