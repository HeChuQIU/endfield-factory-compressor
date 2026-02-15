"""
Power tower class for electricity coverage.
"""

from dataclasses import dataclass
from typing import Set


@dataclass
class PowerTower:
    """
    An electrical power tower that provides power to buildings within range.
    
    Attributes:
        tower_id: Unique identifier
        position: (x, y) position on the map
        coverage_radius: Radius of coverage (Manhattan distance)
    """
    tower_id: str
    position: tuple[int, int]
    coverage_radius: int = 5  # Default coverage radius
    
    def __repr__(self) -> str:
        return (f"PowerTower({self.tower_id}, pos={self.position}, "
                f"radius={self.coverage_radius})")
    
    def covers_position(self, position: tuple[int, int]) -> bool:
        """
        Check if this tower covers the given position.
        
        Uses Manhattan distance (|dx| + |dy|) for coverage calculation.
        
        Args:
            position: (x, y) position to check
            
        Returns:
            True if the position is within coverage range
        """
        dx = abs(position[0] - self.position[0])
        dy = abs(position[1] - self.position[1])
        distance = dx + dy
        
        return distance <= self.coverage_radius
    
    def get_covered_area(self) -> Set[tuple[int, int]]:
        """
        Get all positions covered by this tower.
        
        Returns:
            Set of (x, y) positions within coverage range
        """
        covered = set()
        x, y = self.position
        
        # Iterate through diamond shape based on Manhattan distance
        for dx in range(-self.coverage_radius, self.coverage_radius + 1):
            remaining = self.coverage_radius - abs(dx)
            for dy in range(-remaining, remaining + 1):
                covered.add((x + dx, y + dy))
        
        return covered
    
    def get_coverage_score(self, positions: Set[tuple[int, int]]) -> int:
        """
        Calculate how many of the given positions this tower covers.
        
        Args:
            positions: Set of positions to check coverage for
            
        Returns:
            Number of positions covered by this tower
        """
        covered_area = self.get_covered_area()
        return len(positions & covered_area)
