"""
Building class for factory machines.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional
from .port import Port, Direction
from .recipe import Recipe


class BuildingType(Enum):
    """Types of buildings in the factory."""
    REFINERY = "精炼炉"      # Refinery, 3x3
    GRINDER = "研磨机"        # Grinder, 3x6
    CRUSHER = "粉碎机"        # Crusher, 3x3
    SHAPER = "塑形机"         # Shaper, 3x3
    FILLER = "灌装机"         # Filler, 3x6
    
    def get_size(self) -> tuple[int, int]:
        """Get (width, length) for this building type."""
        # All buildings are 3 wide
        # Most are 3 long, but Grinder and Filler are 6 long
        if self in (BuildingType.GRINDER, BuildingType.FILLER):
            return (3, 6)
        else:
            return (3, 3)
    
    def get_port_count(self) -> int:
        """Get number of input/output ports (same for both)."""
        _, length = self.get_size()
        return length  # Number of ports equals the length


@dataclass
class Building:
    """
    A production building in the factory.
    
    Attributes:
        building_id: Unique identifier
        building_type: Type of building
        position: (x, y) position of the building's origin (top-left corner)
        recipe: Production recipe this building uses
        orientation: Direction the building faces (affects port positions)
        inputs: List of input ports
        outputs: List of output ports
    """
    building_id: str
    building_type: BuildingType
    position: tuple[int, int]
    recipe: Recipe
    orientation: Direction = Direction.EAST  # Default facing east
    inputs: List[Port] = field(default_factory=list)
    outputs: List[Port] = field(default_factory=list)
    
    def __post_init__(self):
        """Initialize ports after the building is created."""
        if not self.inputs or not self.outputs:
            self._initialize_ports()
    
    def _initialize_ports(self):
        """Create input and output ports based on building type and orientation."""
        width, length = self.building_type.get_size()
        port_count = self.building_type.get_port_count()
        
        x, y = self.position
        
        # Determine which sides have ports based on orientation
        # Assume ports are on the long sides of the building
        if self.orientation in (Direction.EAST, Direction.WEST):
            # Building is horizontal (length along x-axis)
            # Input ports on north side, output ports on south side
            for i in range(port_count):
                # Input port positions (north side)
                input_pos = (x + i, y)
                input_port = Port(
                    building_id=self.building_id,
                    port_index=i,
                    direction=Direction.NORTH,
                    position=input_pos,
                    item_type="",  # Will be set based on recipe
                    is_input=True
                )
                self.inputs.append(input_port)
                
                # Output port positions (south side)
                output_pos = (x + i, y + width - 1)
                output_port = Port(
                    building_id=self.building_id,
                    port_index=i,
                    direction=Direction.SOUTH,
                    position=output_pos,
                    item_type="",  # Will be set based on recipe
                    is_input=False
                )
                self.outputs.append(output_port)
        else:
            # Building is vertical (length along y-axis)
            # Input ports on west side, output ports on east side
            for i in range(port_count):
                # Input port positions (west side)
                input_pos = (x, y + i)
                input_port = Port(
                    building_id=self.building_id,
                    port_index=i,
                    direction=Direction.WEST,
                    position=input_pos,
                    item_type="",
                    is_input=True
                )
                self.inputs.append(input_port)
                
                # Output port positions (east side)
                output_pos = (x + width - 1, y + i)
                output_port = Port(
                    building_id=self.building_id,
                    port_index=i,
                    direction=Direction.EAST,
                    position=output_pos,
                    item_type="",
                    is_input=False
                )
                self.outputs.append(output_port)
    
    def get_size(self) -> tuple[int, int]:
        """Get the (width, height) of this building in grid cells."""
        width, length = self.building_type.get_size()
        # Swap if vertical orientation
        if self.orientation in (Direction.NORTH, Direction.SOUTH):
            return (length, width)
        return (width, length)
    
    def get_occupied_cells(self) -> List[tuple[int, int]]:
        """Get all grid cells occupied by this building."""
        width, height = self.get_size()
        x, y = self.position
        
        cells = []
        for dx in range(width):
            for dy in range(height):
                cells.append((x + dx, y + dy))
        
        return cells
    
    def __repr__(self) -> str:
        return (f"Building({self.building_id}, type={self.building_type.value}, "
                f"pos={self.position}, size={self.get_size()}, "
                f"recipe={self.recipe.name})")
