# Frontend Conveyor Visualization Implementation

## Problem

前端没能正确可视化传送带 (The frontend cannot correctly visualize conveyor belts)

The GridCanvas component was not rendering the conveyor belt tiles (`ConveyorSegment[]`) returned by the SAT solver. While material flow connections between buildings were displayed, the actual 1×1 conveyor and bridge tiles on the grid were invisible.

## Solution

### Visualization Added

#### 1. Regular Conveyor Belts (传送带)

**Visual Style:**
- **Color**: Yellow/amber (`#fbbf24`)
- **Background**: Semi-transparent fill
- **Border**: Solid line (1.5px)
- **Arrow**: Directional arrow showing flow direction
- **Position**: 1×1 grid tile

**Arrow Directions:**
- `up` (↑): Arrow points upward
- `down` (↓): Arrow points downward
- `left` (←): Arrow points left
- `right` (→): Arrow points right

#### 2. Conveyor Bridges (传送带桥)

**Visual Style:**
- **Color**: Cyan (`#06b6d4`)
- **Background**: Semi-transparent fill
- **Border**: Dashed line (2px) - distinguishes from regular belts
- **Cross Pattern**: Diagonal lines showing crossing capability
- **Arrow**: Directional arrow showing primary flow
- **Position**: 1×1 grid tile

**Bridge Features:**
- Dashed border indicates special crossing function
- Cross pattern (×) shows that two flows can cross without mixing
- Directional arrow shows one of the perpendicular flows

### Implementation Details

#### New Functions

```typescript
// Draw directional arrow on conveyor
function drawConveyorArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'up' | 'right' | 'down' | 'left',
  cellSize: number,
  color: string,
)

// Draw a single conveyor or bridge tile
function drawConveyorTile(
  ctx: CanvasRenderingContext2D,
  conveyor: ConveyorSegment,
  cellSize: number,
  padding: number,
)
```

#### Rendering Order

The conveyors are rendered in the correct layer order:

1. **Background** (dark blue)
2. **Grid dots** (subtle dots at intersections)
3. **Grid border** (dashed outline)
4. **Conveyor tiles** ← NEW! (with arrows and patterns)
5. **Material flow lines** (bezier curves between buildings)
6. **Buildings** (machines on top)
7. **Coordinate labels** (x/y axis)

This ensures conveyors appear under buildings but above the grid.

### UI Enhancements

#### Info Display (Top Bar)

Added conveyor statistics:
```
[10×10] 6 建筑 12 传送带 + 2 桥 150ms [∨ 输入 ∧ 输出]
```

Shows:
- Number of regular conveyor belts
- Number of bridges (if any)

#### Legend (Bottom)

Added legend items for conveyors:

**Regular Conveyors:**
- 🟨 Amber square icon
- "传送带 ×12" (Conveyor Belts ×12)

**Bridges:**
- 🟦 Cyan square with dashed border
- "传送带桥 ×2" (Conveyor Bridges ×2)

### Visual Design Rationale

**Color Choices:**
- **Yellow/Amber**: Traditional conveyor belt color (industrial machinery)
- **Cyan**: Distinct from yellow, indicates special crossing function
- **Semi-transparent**: Allows grid visibility underneath

**Pattern Choices:**
- **Solid border**: Regular conveyors are standard tiles
- **Dashed border**: Bridges are special crossing tiles
- **Cross pattern**: Visual indicator of crossing capability

**Arrow Design:**
- Clear directional indicator
- Large enough to see at default zoom
- Filled triangle for solid appearance
- Matches output direction of conveyor

### Code Structure

**Constants:**
```typescript
const CONVEYOR_COLOR = '#fbbf24' // Yellow/amber for belts
const BRIDGE_COLOR = '#06b6d4'   // Cyan for bridges
```

**Rendering Logic:**
```typescript
// In GridCanvas render effect:
const { conveyors } = solution
if (conveyors && conveyors.length > 0) {
  for (const conveyor of conveyors) {
    drawConveyorTile(ctx, conveyor, CELL_SIZE, PADDING)
  }
}
```

**Statistics Calculation:**
```typescript
const conveyorStats = solution?.status === 'sat' && solution.conveyors
  ? {
      total: solution.conveyors.length,
      bridges: solution.conveyors.filter(c => c.isBridge).length,
      belts: solution.conveyors.filter(c => !c.isBridge).length,
    }
  : null
```

## Example Visualization

### Before (Missing Conveyors)
```
[Grid with only buildings visible]
- Buildings shown as colored rectangles
- Material flow lines as curves
- No conveyor tiles visible
- Unable to see actual belt layout
```

### After (With Conveyors)
```
[Complete factory visualization]
- Buildings as colored rectangles
- Yellow conveyor tiles with arrows showing flow
- Cyan bridge tiles with cross patterns
- Material flow lines connecting everything
- Clear view of complete layout including belts
```

## Benefits

1. **Complete Visualization**: Users can now see the entire factory layout including conveyor placement
2. **Direction Clarity**: Arrows show belt flow direction at a glance
3. **Bridge Identification**: Special styling makes bridges easy to identify
4. **Layout Validation**: Can verify that belts connect properly between machines
5. **Statistics**: Conveyor counts provide layout metrics

## Testing

The visualization works with:
- ✅ Regular conveyor belts with all 4 directions (up/down/left/right)
- ✅ Conveyor bridges with cross patterns
- ✅ Mixed layouts with both types
- ✅ Various grid sizes (tested with steel block example)
- ✅ Legend and statistics display

## Future Enhancements

Possible improvements:
- Hover tooltips showing conveyor details
- Color-code conveyors by material type
- Animation of items flowing through belts
- Zoom/pan controls for large layouts
- Click to highlight conveyor paths
