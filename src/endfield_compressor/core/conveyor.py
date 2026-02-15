"""
Conveyor belt and bridge classes for item transportation.
"""

from dataclasses import dataclass
from .port import Direction


@dataclass
class Conveyor:
    """
    A conveyor belt segment (1x1 tile).
    
    Attributes:
        conveyor_id: Unique identifier
        position: (x, y) position on the map
        input_direction: Direction from which items enter
        output_direction: Direction to which items exit
        item_type: Type of item being transported
    """
    conveyor_id: str
    position: tuple[int, int]
    input_direction: Direction
    output_direction: Direction
    item_type: str
    
    def __post_init__(self):
        """Validate that input and output directions are different."""
        if self.input_direction == self.output_direction:
            raise ValueError(
                f"Conveyor input and output directions must be different: "
                f"both are {self.input_direction.value}"
            )
    
    def __repr__(self) -> str:
        return (f"Conveyor({self.conveyor_id}, pos={self.position}, "
                f"{self.input_direction.value}->{self.output_direction.value}, "
                f"item={self.item_type})")
    
    def can_connect_from(self, direction: Direction) -> bool:
        """Check if items can enter from the given direction."""
        return direction == self.input_direction
    
    def can_connect_to(self, direction: Direction) -> bool:
        """Check if items can exit in the given direction."""
        return direction == self.output_direction


@dataclass
class ConveyorBridge:
    """
    A conveyor bridge that allows two belts to cross without mixing items.
    
    The bridge has two separate item flows that cross at this position:
    - Primary flow: Continues straight through
    - Secondary flow: Goes under/over the primary flow
    
    Attributes:
        bridge_id: Unique identifier
        position: (x, y) position on the map
        primary_direction: Direction of the main item flow (e.g., NORTH->SOUTH)
        secondary_direction: Direction of the crossing item flow (e.g., EAST->WEST)
    """
    bridge_id: str
    position: tuple[int, int]
    primary_direction: Direction  # Main through direction
    secondary_direction: Direction  # Crossing direction
    
    def __post_init__(self):
        """Validate that primary and secondary directions are perpendicular."""
        primary_horizontal = self.primary_direction.is_horizontal()
        secondary_horizontal = self.secondary_direction.is_horizontal()
        
        if primary_horizontal == secondary_horizontal:
            raise ValueError(
                f"Bridge directions must be perpendicular: "
                f"primary={self.primary_direction.value}, "
                f"secondary={self.secondary_direction.value}"
            )
    
    def __repr__(self) -> str:
        return (f"ConveyorBridge({self.bridge_id}, pos={self.position}, "
                f"primary={self.primary_direction.value}, "
                f"secondary={self.secondary_direction.value})")
    
    def allows_flow(self, from_dir: Direction, to_dir: Direction) -> bool:
        """
        Check if the bridge allows item flow from from_dir to to_dir.
        
        Args:
            from_dir: Direction items are coming from
            to_dir: Direction items are going to
            
        Returns:
            True if this flow is allowed through the bridge
        """
        # Check if this is the primary flow
        if from_dir == self.primary_direction and to_dir == self.primary_direction.opposite():
            return True
        
        # Check if this is the secondary flow
        if from_dir == self.secondary_direction and to_dir == self.secondary_direction.opposite():
            return True
        
        return False
