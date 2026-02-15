"""
Recipe class for production formulas.
"""

from dataclasses import dataclass
from typing import Dict


@dataclass
class Recipe:
    """
    A production recipe that defines inputs, outputs, and production rates.
    
    Attributes:
        recipe_id: Unique identifier for this recipe
        name: Human-readable name (e.g., "钢块")
        inputs: Dict of item_type -> quantity per cycle
        outputs: Dict of item_type -> quantity per cycle
        production_time: Time per production cycle in seconds
        machine_type: Type of machine that can use this recipe
    """
    recipe_id: str
    name: str
    inputs: Dict[str, float]  # item_type -> quantity
    outputs: Dict[str, float]  # item_type -> quantity
    production_time: float  # seconds
    machine_type: str
    
    def __repr__(self) -> str:
        input_str = ", ".join(f"{q}x{item}" for item, q in self.inputs.items())
        output_str = ", ".join(f"{q}x{item}" for item, q in self.outputs.items())
        return f"Recipe({self.name}: [{input_str}] -> [{output_str}])"
    
    def get_throughput_multiplier(self, target_output: str, target_rate: float) -> float:
        """
        Calculate how many machines are needed to produce target_rate of target_output.
        
        Args:
            target_output: The output item type
            target_rate: Desired production rate (items per second)
            
        Returns:
            Number of machines needed (may be fractional)
        """
        if target_output not in self.outputs:
            raise ValueError(f"Recipe does not produce {target_output}")
        
        output_per_cycle = self.outputs[target_output]
        output_per_second = output_per_cycle / self.production_time
        
        return target_rate / output_per_second
