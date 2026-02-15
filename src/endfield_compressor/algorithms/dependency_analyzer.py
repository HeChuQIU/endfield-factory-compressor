"""
Dependency analysis module for production chains.

This module analyzes production recipes to build dependency graphs
and determine the order in which buildings should be placed.
"""

import networkx as nx
from typing import Dict, List, Set, Tuple
from ..core.recipe import Recipe
from ..core.building import Building, BuildingType


class DependencyGraph:
    """
    Represents the dependency relationships between production steps.
    
    Attributes:
        graph: NetworkX DiGraph representing dependencies
        recipes: Dict of recipe_id -> Recipe
        layers: List of building sets, ordered by dependency level
    """
    
    def __init__(self):
        self.graph = nx.DiGraph()
        self.recipes: Dict[str, Recipe] = {}
        self.layers: List[Set[str]] = []
        self.flow_rates: Dict[str, float] = {}  # item_type -> flow rate
    
    def add_recipe(self, recipe: Recipe, building_count: int = 1):
        """
        Add a recipe to the dependency graph.
        
        Args:
            recipe: Recipe to add
            building_count: Number of buildings using this recipe
        """
        self.recipes[recipe.recipe_id] = recipe
        
        # Add node for this recipe
        if not self.graph.has_node(recipe.recipe_id):
            self.graph.add_node(
                recipe.recipe_id,
                recipe=recipe,
                building_count=building_count,
                layer=-1  # Will be set by topological sort
            )
        
        # Add edges for input dependencies
        for input_item in recipe.inputs.keys():
            # Find recipes that produce this input
            producer_recipes = self._find_producers(input_item)
            
            for producer_id in producer_recipes:
                # Edge from producer to consumer
                self.graph.add_edge(
                    producer_id,
                    recipe.recipe_id,
                    item_type=input_item
                )
    
    def _find_producers(self, item_type: str) -> List[str]:
        """Find all recipes that produce the given item type."""
        producers = []
        for recipe_id, recipe in self.recipes.items():
            if item_type in recipe.outputs:
                producers.append(recipe_id)
        return producers
    
    def calculate_layers(self) -> List[Set[str]]:
        """
        Perform topological sort to determine building layers.
        
        Returns:
            List of sets, where each set contains recipe IDs at that layer
        """
        # Get topological order
        try:
            topo_order = list(nx.topological_sort(self.graph))
        except nx.NetworkXError:
            raise ValueError("Dependency graph has cycles - cannot determine layer order")
        
        # Calculate layer for each node
        layers_dict: Dict[int, Set[str]] = {}
        
        for node in topo_order:
            # Layer is 1 + max(predecessor layers), or 0 if no predecessors
            predecessors = list(self.graph.predecessors(node))
            
            if not predecessors:
                layer = 0
            else:
                pred_layers = [self.graph.nodes[p].get('layer', 0) for p in predecessors]
                layer = max(pred_layers) + 1
            
            self.graph.nodes[node]['layer'] = layer
            
            if layer not in layers_dict:
                layers_dict[layer] = set()
            layers_dict[layer].add(node)
        
        # Convert to ordered list
        max_layer = max(layers_dict.keys()) if layers_dict else 0
        self.layers = [layers_dict.get(i, set()) for i in range(max_layer + 1)]
        
        return self.layers
    
    def calculate_flow_rates(self, target_output: str, target_rate: float) -> Dict[str, float]:
        """
        Calculate required flow rates for all intermediate items.
        
        Args:
            target_output: Final product item type
            target_rate: Desired production rate (items per second)
            
        Returns:
            Dict of item_type -> required flow rate
        """
        flow_rates = {target_output: target_rate}
        
        # Work backwards from output through the dependency graph
        # Use reverse topological order
        topo_order = list(nx.topological_sort(self.graph))
        
        for recipe_id in reversed(topo_order):
            recipe = self.recipes[recipe_id]
            
            # Check if any output of this recipe is needed
            output_demand = 0.0
            for output_item, output_qty in recipe.outputs.items():
                if output_item in flow_rates:
                    # Calculate how much we need to produce
                    needed = flow_rates[output_item]
                    output_per_second = output_qty / recipe.production_time
                    
                    # Update output demand
                    output_demand = max(output_demand, needed / output_per_second)
            
            if output_demand > 0:
                # Calculate input requirements based on this production rate
                for input_item, input_qty in recipe.inputs.items():
                    input_per_second = input_qty / recipe.production_time
                    required_rate = input_per_second * output_demand
                    
                    # Add to flow rates (or increase if already present)
                    if input_item in flow_rates:
                        flow_rates[input_item] += required_rate
                    else:
                        flow_rates[input_item] = required_rate
        
        self.flow_rates = flow_rates
        return flow_rates
    
    def get_layer_summary(self) -> str:
        """Get a human-readable summary of the dependency layers."""
        if not self.layers:
            self.calculate_layers()
        
        summary = "Dependency Layers:\n"
        for i, layer in enumerate(self.layers):
            summary += f"\nLayer {i}:\n"
            for recipe_id in layer:
                recipe = self.recipes[recipe_id]
                count = self.graph.nodes[recipe_id].get('building_count', 1)
                summary += f"  - {recipe.name} x{count} (ID: {recipe_id})\n"
        
        return summary
    
    def __repr__(self) -> str:
        return (f"DependencyGraph(recipes={len(self.recipes)}, "
                f"layers={len(self.layers)}, "
                f"nodes={self.graph.number_of_nodes()}, "
                f"edges={self.graph.number_of_edges()})")
