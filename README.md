# Endfield Factory Compressor

A tool to optimize the layout of factory automation blueprints in *Arknights: Endfield* by minimizing the map area occupied while maintaining production efficiency.

## Overview

In Endfield, the "Infrastructure" (基建) system involves building automated production pipelines. Given a target product, the required buildings are fixed. The optimization challenge is to minimize the floor space used, which primarily involves optimizing connections between power towers and buildings.

## Project Goals

- Automate the optimization process for factory layouts
- Find the smallest possible blueprints for given target products
- Minimize power tower and building connection overhead

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/HeChuQIU/endfield-factory-compressor.git
cd endfield-factory-compressor

# Install dependencies
pip install -r requirements.txt

# Or install as a package
pip install -e .
```

### Run Examples

```bash
# Run basic tests
python tests/test_basic.py

# Run steel production example
python examples/steel_production_example.py
```

## Current Status

### ✅ Implemented

- **Core Data Structures**
  - Building types (Refinery, Grinder, Crusher, Shaper, Filler)
  - Port and Direction system
  - Recipe system
  - Conveyor belts and bridges
  - Power towers with coverage calculation
  - Factory map management

- **Basic Functionality**
  - Building placement with collision detection
  - Grid occupancy tracking
  - Bounding box and area calculation
  - Power coverage verification

### 🚧 In Progress

- Layout optimization algorithms
- Conveyor belt path planning
- Dependency analysis

### 📋 Planned

- Complete implementation of Plan A (Hierarchical Layout Algorithm)
- Automatic building placement optimization
- Power tower optimization
- Visualization tools
- Full test cases with real production lines

## Documentation

- [Implementation Plan](IMPLEMENTATION_PLAN.md) - Detailed design and implementation strategy
- [Source Code README](src/README.md) - API documentation and usage guide
- [Premium Buckwheat Capsule Example](examples/premium-buckwheat-capsule.md) - Complete production line requirements

## Project Structure

```
endfield-factory-compressor/
├── src/endfield_compressor/    # Source code
│   ├── core/                   # Core data structures
│   ├── algorithms/             # Optimization algorithms (planned)
│   └── utils/                  # Utility functions
├── tests/                      # Test files
├── examples/                   # Example code and documentation
├── IMPLEMENTATION_PLAN.md      # Detailed implementation plan
└── README.md                   # This file
```

## Contributing

Contributions are welcome! Please see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the roadmap and development guidelines.

## License

MIT License - see LICENSE file for details
