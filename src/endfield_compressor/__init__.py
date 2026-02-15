"""
Endfield Factory Compressor - 明日方舟：终末地 基建布局优化器

A tool to optimize the layout of factory automation blueprints in Arknights: Endfield
by minimizing the map area occupied while maintaining production efficiency.
"""

__version__ = "0.1.0"
__author__ = "Endfield Factory Compressor Team"

from .core.building import Building, BuildingType
from .core.conveyor import Conveyor, ConveyorBridge
from .core.power_tower import PowerTower
from .core.factory_map import FactoryMap
from .core.port import Port, Direction
from .core.recipe import Recipe

__all__ = [
    "Building",
    "BuildingType",
    "Conveyor",
    "ConveyorBridge",
    "PowerTower",
    "FactoryMap",
    "Port",
    "Direction",
    "Recipe",
]
