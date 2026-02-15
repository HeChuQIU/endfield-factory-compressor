"""
Direction and Port classes for building connections.
"""

from enum import Enum
from typing import Optional
from dataclasses import dataclass


class Direction(Enum):
    """Cardinal directions for ports and conveyors."""
    NORTH = "north"  # 北
    SOUTH = "south"  # 南
    EAST = "east"    # 东
    WEST = "west"    # 西
    
    def opposite(self) -> "Direction":
        """Get the opposite direction."""
        opposites = {
            Direction.NORTH: Direction.SOUTH,
            Direction.SOUTH: Direction.NORTH,
            Direction.EAST: Direction.WEST,
            Direction.WEST: Direction.EAST,
        }
        return opposites[self]
    
    def is_horizontal(self) -> bool:
        """Check if direction is horizontal (east/west)."""
        return self in (Direction.EAST, Direction.WEST)
    
    def is_vertical(self) -> bool:
        """Check if direction is vertical (north/south)."""
        return self in (Direction.NORTH, Direction.SOUTH)


@dataclass
class Port:
    """
    A port on a building for input or output.
    
    Attributes:
        building_id: ID of the building this port belongs to
        port_index: Index of this port on the building (0-based)
        direction: Direction this port faces
        position: Absolute (x, y) position on the map
        item_type: Type of item this port handles
        is_input: True if this is an input port, False for output
    """
    building_id: str
    port_index: int
    direction: Direction
    position: tuple[int, int]
    item_type: str
    is_input: bool
    
    def __repr__(self) -> str:
        port_type = "Input" if self.is_input else "Output"
        return (f"Port({port_type}, building={self.building_id}, "
                f"index={self.port_index}, dir={self.direction.value}, "
                f"pos={self.position}, item={self.item_type})")
    
    def can_connect_to(self, other: "Port") -> bool:
        """
        Check if this port can directly connect to another port.
        
        Rules:
        - Must be different buildings
        - Output must connect to Input
        - Item types must match
        - Positions must be adjacent in the correct direction
        """
        if self.building_id == other.building_id:
            return False
        
        if self.is_input == other.is_input:
            return False
        
        if self.item_type != other.item_type:
            return False
        
        # Check if positions are adjacent in the correct direction
        dx = other.position[0] - self.position[0]
        dy = other.position[1] - self.position[1]
        
        # Manhattan distance must be 1
        if abs(dx) + abs(dy) != 1:
            return False
        
        # Direction must align
        if dx == 1 and self.direction != Direction.EAST:
            return False
        if dx == -1 and self.direction != Direction.WEST:
            return False
        if dy == 1 and self.direction != Direction.SOUTH:
            return False
        if dy == -1 and self.direction != Direction.NORTH:
            return False
        
        return True
