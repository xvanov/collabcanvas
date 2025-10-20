# Construction Annotation Tool - Task List & PRs

## **Overview**

This document breaks down the Construction Plan Annotation Tool implementation into 4 focused Pull Requests, delivered over a 2-week sprint. Each PR builds incrementally on the previous one, focusing on core functionality for a powerful yet streamlined MVP.

**Testing Strategy**: Automated tests + manual testing in Chrome/Firefox, always build, lint and tests (:ci tests) at end of each PR. 

---

## **PR-1: Document Upload & Scale Foundation** ✅ COMPLETE
**Goal**: Enable basic plan upload and scale reference system  
**Status**: ✅ Completed - All features implemented and tested

### **Features**
- Basic image file upload (PNG, JPG)
- Canvas background display with aspect ratio preservation
- Scale tool with reference line creation
- Unit selection (feet, inches, meters)
- Scale calculation and display

### **Files Modified/Created**
```
src/components/
├── FileUpload.tsx (NEW)
├── ScaleTool.tsx (NEW)
├── ScaleIndicator.tsx (NEW)
├── UnitSelector.tsx (NEW)
├── Canvas.tsx (MODIFIED - background support)
└── Toolbar.tsx (MODIFIED - add scale tool)

src/services/
├── fileUploadService.ts (NEW)
└── scaleService.ts (NEW)

src/store/
└── canvasStore.ts (MODIFIED - add scale state)

src/types/
└── types.ts (MODIFIED - add scale types)
```

### **Automated Testing Strategy**

#### **Unit Tests**
```typescript
// FileUpload.test.tsx
describe('FileUpload Component', () => {
  test('accepts PNG, JPG files')
  test('displays error for unsupported file types')
  test('maintains aspect ratio on canvas background')
})

// ScaleTool.test.tsx
describe('Scale Tool', () => {
  test('creates reference line on click-drag')
  test('calculates scale ratio correctly')
  test('validates reasonable scale ranges')
  test('applies scale to canvas measurements')
})

// UnitSelector.test.tsx
describe('Unit Selector', () => {
  test('displays unit options (feet, inches, meters)')
  test('applies selected unit to scale calculations')
  test('converts between different units')
})

// scaleService.test.ts
describe('Scale Service', () => {
  test('converts pixels to real-world units')
  test('handles different unit types')
  test('validates scale input ranges')
})
```

#### **Integration Tests**
```typescript
// fileUpload.integration.test.ts
describe('File Upload Integration', () => {
  test('uploads file and displays as canvas background')
  test('maintains file state on page refresh')
})

// scale.integration.test.ts
describe('Scale Integration', () => {
  test('scale applies to new annotation tools')
  test('scale persists across user sessions')
  test('scale indicator updates correctly')
})
```

### **Manual Testing Checklist**
- [ ] Upload PNG and JPG files
- [ ] Verify aspect ratio preservation
- [ ] Test scale tool with known measurements
- [ ] Verify scale accuracy with ruler
- [ ] Test unit selection (feet, inches, meters)
- [ ] Verify scale persistence across browser refresh
- [ ] Test in Chrome and Firefox

## **PR-2: Core Annotation Tools** ✅ COMPLETE
**Goal**: Implement polyline and polygon tools for measurements  
**Status**: ✅ Completed - All features implemented, tested, and optimized  
**Tests**: 461/461 passing | Performance: 60 FPS maintained

### **Features**
- Polyline tool for wall measurements
- Polygon tool for room areas
- Real-time length/area calculations
- Basic measurement display

### **Files Modified/Created**
```
src/components/
├── PolylineTool.tsx (NEW)
├── PolygonTool.tsx (NEW)
├── MeasurementDisplay.tsx (NEW)
├── Canvas.tsx (MODIFIED - new tools)
└── Toolbar.tsx (MODIFIED - add tools)

src/services/
├── measurementService.ts (NEW)
└── shapeService.ts (NEW)

src/types/
└── types.ts (MODIFIED - add shape types)
```

### **Automated Testing Strategy**

#### **Unit Tests**
```typescript
// PolylineTool.test.tsx
describe('Polyline Tool', () => {
  test('creates polyline with click-to-click drawing')
  test('calculates total length correctly')
  test('displays length in real-world units')
  test('supports undo last point')
})

// PolygonTool.test.tsx
describe('Polygon Tool', () => {
  test('creates polygon with click-to-click drawing')
  test('calculates area correctly')
  test('displays area in square feet')
  test('closes polygon with double-click')
})

// measurementService.test.ts
describe('Measurement Service', () => {
  test('calculates polyline length accurately')
  test('calculates polygon area correctly')
  test('converts measurements to different units')
  test('handles edge cases')
})
```

#### **Integration Tests**
```typescript
// annotation.integration.test.ts
describe('Annotation Tools Integration', () => {
  test('tools work with established scale')
  test('measurements persist across sessions')
  test('undo/redo works for both tools')
})
```

### **Manual Testing Checklist**
- [x] Draw polylines along walls
- [x] Verify length calculations
- [x] Draw polygons around rooms
- [x] Verify area calculations
- [x] Test undo/redo for both tools
- [x] Verify measurement display
- [x] Test in Chrome and Firefox

### **✅ Completion Summary**

**Delivered Features:**
- ✅ Polyline tool with real-time length measurements
- ✅ Polygon tool with real-time area calculations
- ✅ Measurement labels (polyline: near end, polygon: centered)
- ✅ Layer panel shows individual measurements + totals
- ✅ Shapes persist to Firestore and sync across users
- ✅ Performance optimized (60 FPS maintained)
- ✅ Keyboard shortcuts (Escape, Enter, double-click)
- ✅ Snap-to-close for polygons
- ✅ Visual hints during drawing

**New Files Created (10):**
- `src/services/measurementService.ts` + tests (38 tests)
- `src/services/shapeService.ts` + tests (27 tests)
- `src/components/PolylineTool.tsx` + tests (11 tests)
- `src/components/PolygonTool.tsx` + tests (16 tests)
- `src/components/MeasurementDisplay.tsx` + tests (12 tests)
- `src/components/annotation.integration.test.ts` (15 tests)

**Files Modified (8):**
- `src/components/Canvas.tsx` - Drawing tool integration
- `src/components/Shape.tsx` - Polyline/polygon rendering
- `src/components/Toolbar.tsx` - Tool buttons
- `src/components/LayersPanel.tsx` - Measurements + totals
- `src/components/ScaleLine.tsx` - Performance optimization
- `src/components/SnapIndicators.tsx` - Memoization
- `src/pages/Board.tsx` - Tool activation
- `firestore.rules` - Allow new shape types

**Bug Fixes:**
- Fixed Konva layer nesting error
- Fixed Firestore permission issues
- Fixed coordinate offset problems
- Fixed measurement label positioning
- Fixed FPS regression (20→60 FPS)

**Test Results:**
- Total Tests: 461 passing
- New Tests: 104 added for annotation features
- Coverage: Services 100%, Components 85%+
- Performance: 60 FPS maintained

**See:** `docs/PR-2-CORE-ANNOTATION-TOOLS.md` for detailed documentation

## **PR-3: Enhanced Layer System**
**Goal**: Implement color-coded layers with shape inheritance

### **Features**
- Layer creation with name and color
- Shape color inheritance from layer
- Layer color modification (affects all shapes)
- Layer visibility controls

### **Files Modified/Created**
```
src/components/
├── LayerPanel.tsx (MODIFIED)
├── LayerColorPicker.tsx (NEW)
└── LayerList.tsx (MODIFIED)

src/services/
└── layerService.ts (MODIFIED)

src/store/
└── layerStore.ts (MODIFIED)
```

### **Automated Testing Strategy**

#### **Unit Tests**
```typescript
// LayerPanel.test.tsx
describe('Layer Panel', () => {
  test('creates layer with name and color')
  test('modifies layer color')
  test('updates all shapes when color changes')
  test('toggles layer visibility')
})

// layerService.test.ts
describe('Layer Service', () => {
  test('manages layer colors')
  test('handles shape color inheritance')
  test('persists layer settings')
})
```

#### **Integration Tests**
```typescript
// layer.integration.test.ts
describe('Layer Integration', () => {
  test('shapes inherit layer colors')
  test('color changes affect all shapes')
  test('visibility controls work')
})
```

### **Manual Testing Checklist**
- [ ] Create layers with different colors
- [ ] Verify shape color inheritance
- [ ] Test layer color modification
- [ ] Verify all shapes update with color change
- [ ] Test layer visibility
- [ ] Test in Chrome and Firefox

## **PR-4: Wall Material Estimation**
**Goal**: Implement smart wall material estimation with framing and surface calculations

### **Features**
- Wall framing material estimation (lumber/metal)
- Surface material calculations (drywall/paint)
- Area material calculations (tile, hardwood, epoxy)
- Automatic fastener determination
- Basic material comparisons
- CSV export
- Focuses only on quantities not prices.

### **Files Modified/Created**
```
src/components/
├── MaterialPanel/
│   ├── index.tsx (NEW)
│   ├── EstimateDisplay.tsx (NEW)
│   ├── DialogueBox.tsx (NEW)
│   └── styles.module.css (NEW)
├── AICommandInput/
│   ├── index.tsx (MODIFIED)
│   ├── SuggestionList.tsx (NEW)
│   └── styles.module.css (NEW)
├── ComparisonView/
│   ├── index.tsx (NEW)
│   ├── DiffDisplay.tsx (NEW)
│   └── styles.module.css (NEW)
└── ErrorBoundary.tsx (NEW)

src/services/
├── materialService.ts (NEW)
├── calculators/
│   ├── wallCalculator.ts (NEW)
│   └── floorCalculator.ts (NEW)
├── aiDialogueService.ts (NEW)
├── errorHandlingService.ts (NEW)
└── aiService.ts (MODIFIED)

src/data/
├── materials.ts (NEW)
├── defaultAssumptions.ts (NEW)
└── errorMessages.ts (NEW)

src/types/
├── wallTypes.ts (NEW)
├── floorTypes.ts (NEW)
├── dialogueTypes.ts (NEW)
└── errorTypes.ts (NEW)

src/context/
├── materialDialogueContext.ts (NEW)
└── errorContext.ts (NEW)

src/hooks/
├── useMaterialDialogue.ts (NEW)
├── useErrorHandling.ts (NEW)
└── useShapeSelection.ts (NEW)
```

### **Example Dialogue Flow**
```typescript
// dialogueTypes.ts
interface DialogueState {
  currentRequest: MaterialRequest;
  assumptions: MaterialAssumptions;
  history: DialogueHistory;
  preferences: UserPreferences;
}

interface MaterialAssumptions {
  framing: {
    spacing: number;      // Default: 16
    type: string;        // Default: 'lumber'
  };
  surface: {
    type: string;        // Default: 'drywall'
    thickness: string;   // Default: '1/2"'
  };
  finish: {
    coats: number;      // Default: 2
    includePrimer: boolean; // Default: true
  };
}

// aiDialogueService.ts
class AIDialogueService {
  async processRequest(request: string, state: DialogueState) {
    // 1. Parse request and identify missing information
    const parsed = await this.parseRequest(request);
    const missing = this.identifyMissingInfo(parsed);

    // 2. Handle incomplete information
    if (missing.length > 0) {
      return {
        type: 'clarification',
        questions: this.generateQuestions(missing),
        assumptions: this.makeAssumptions(missing, state.preferences)
      };
    }

    // 3. Generate estimate with assumptions
    const estimate = await this.generateEstimate(parsed, state.assumptions);
    
    return {
      type: 'estimate',
      result: estimate,
      assumptions: this.getUsedAssumptions(estimate),
      possibleRefinements: this.suggestRefinements(estimate)
    };
  }

  async handleRefinement(refinement: string, state: DialogueState) {
    // 1. Identify what's being changed
    const change = await this.parseRefinement(refinement);
    
    // 2. Update only the changed aspects
    const updatedRequest = {
      ...state.currentRequest,
      ...change
    };

    // 3. Generate new estimate showing changes
    const newEstimate = await this.generateEstimate(updatedRequest);
    const diff = this.calculateDiff(state.currentRequest, updatedRequest);
    
    return {
      estimate: newEstimate,
      changes: diff,
      assumptions: this.getUsedAssumptions(newEstimate)
    };
  }
}
```

### **UI Flow & Interactions**

#### **Chat Tool Integration**
```typescript
// Toolbar.tsx
const Toolbar: React.FC = () => {
  const [showChat, setShowChat] = useState(false);
  const { conversation } = useChatState();

  return (
    <div className={styles.toolbar}>
      {/* Other tools */}
      <ToolButton
        icon="chat"
        active={showChat}
        onClick={() => setShowChat(!showChat)}
        tooltip="AI Material Estimation"
      />
      
      {/* Chat window */}
      {showChat && (
        <ChatWindow
          onClose={() => setShowChat(false)}
          conversation={conversation}
        />
      )}
    </div>
  );
};

// ChatWindow.tsx
const ChatWindow: React.FC<ChatProps> = ({ onClose, conversation }) => {
  const { layers } = useLayerContext();
  const { scale } = useScaleContext();
  
  return (
    <div className={styles.chatWindow}>
      <div className={styles.header}>
        <h3>Material Estimation</h3>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className={styles.messages}>
        {conversation.messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      <div className={styles.input}>
        <input
          placeholder="Ask about materials..."
          onKeyPress={handleEnter}
        />
      </div>
    </div>
  );
};
```

#### **Layer-Based Context**
```typescript
// aiService.ts
class AIService {
  async processQuery(query: string, context: AIContext) {
    const { layers, scale } = context;
    
    // Get measurements from layers
    const measurements = this.getMeasurementsFromLayers(layers);
    
    // Check if we have enough info
    if (!this.hasRequiredInfo(query, measurements)) {
      return {
        type: 'clarification',
        message: this.generateClarificationRequest(query, measurements)
      };
    }
    
    // Generate estimate and BOM
    const estimate = await this.generateEstimate(query, measurements, scale);
    const bom = this.generateBOM(estimate);
    
    return {
      type: 'estimate',
      message: this.formatEstimateResponse(estimate),
      bom: bom,
      csvData: this.generateCSV(bom)
    };
  }

  private getMeasurementsFromLayers(layers: Layer[]) {
    return layers.map(layer => ({
      name: layer.name,
      type: this.inferTypeFromName(layer.name), // 'wall', 'floor', etc.
      measurements: layer.shapes.map(shape => ({
        type: shape.type,
        length: shape.type === 'polyline' ? shape.length : null,
        area: shape.type === 'polygon' ? shape.area : null
      }))
    }));
  }

  private inferTypeFromName(name: string): string {
    // Infer type from layer name (e.g., "Walls", "Floor", etc.)
    return name.toLowerCase().includes('wall') ? 'wall' 
         : name.toLowerCase().includes('floor') ? 'floor'
         : 'unknown';
  }
}
```

#### **Example Chat Flow**
```typescript
// Example 1: Direct estimate
User: "Calculate materials for walls"
AI: "Based on the 'Walls' layer, I found 4 walls totaling 80 linear feet.
     I'll calculate materials assuming standard construction:
     - Lumber framing (16" OC)
     - 1/2" drywall
     - 2 coats of paint

     Estimated materials:
     - 2x4 Studs: 65 pieces
     - 2x4 Plates: 160 linear feet
     - Drywall: 20 sheets (4'x8')
     - Paint: 4 gallons

     I've generated a detailed BOM as CSV. Would you like to adjust any specifications?"

// Example 2: Missing information
User: "Calculate flooring materials"
AI: "I don't see a layer specifically for floors. Could you either:
     1. Create a layer named 'Floor' and draw the areas
     2. Specify which layer contains the floor areas
     3. Provide the floor measurements directly"

// Example 3: Scale issue
User: "Calculate materials for metal framing"
AI: "Warning: The scale isn't set for this drawing. Please:
     1. Use the scale tool to set a reference measurement
     2. Then ask me again for the calculation

     This ensures accurate material estimates."
```

#### **Error Handling**
```typescript
// errorTypes.ts
interface MaterialError {
  type: 'ai' | 'calculation' | 'validation';
  message: string;
  retryable: boolean;
  context?: any;
}

// errorHandlingService.ts
class ErrorHandlingService {
  handleError(error: MaterialError) {
    switch (error.type) {
      case 'ai':
        // AI service failed
        return {
          message: 'Unable to process request. Try rephrasing or use manual input.',
          action: 'retry',
          fallback: showManualInputForm
        };
      
      case 'calculation':
        // Invalid measurements or calculations
        return {
          message: 'Invalid measurements. Please check dimensions.',
          action: 'check',
          fallback: null
        };
      
      case 'validation':
        // Invalid user input
        return {
          message: error.message,
          action: 'edit',
          fallback: null
        };
    }
  }
}
```

#### **Example Interactions**
```typescript
// Example 1: Initial request with missing info
User: "Calculate materials for this wall"
AI: "I'll help you estimate materials. I'll assume:
     - Lumber framing at 16" on center
     - 1/2" drywall
     - 2 coats of paint with primer
     Would you like me to calculate with these assumptions?
     You can also specify different requirements."

// Example 2: Clarification needed
User: "Calculate materials for metal framing"
AI: "I'll calculate for metal framing. A few questions:
     1. What spacing would you like? (16" or 24" on center)
     2. What type of wall surface? (drywall, FRP)
     3. Are there any doors or windows for trim?"

// Example 3: Iterative refinement
User: "Make it 24 inch spacing instead"
AI: "I'll recalculate with 24" spacing. Changes:
     - Studs: 10 → 7 pieces
     - Screws: 40 → 28 pieces
     All other materials remain the same.
     Would you like to adjust anything else?"

// Example 4: Error handling
AI Service Error:
"Unable to process request. You can:
 1. Try rephrasing your request
 2. Use the manual input form below
 3. Start a new calculation"

Calculation Error:
"Invalid wall height (0 ft). Please:
 1. Check the measurement
 2. Ensure wall is properly drawn
 3. Try selecting the wall again"
```

### **Example Material Data**
```typescript
// materials.ts
export const MATERIALS = {
  walls: {
    framing: {
      lumber: {
        spacing: [16, 24], // Common spacings
        materials: {
          studs: {
            type: '2x4',
            calculation: (length, spacing) => 
              Math.ceil(length * 12 / spacing) + 3 // +3 for ends
          },
          plates: {
            type: '2x4',
            calculation: (length) => length * 2 * 1.1 // Top/bottom + waste
          },
          nails: {
            type: '16d common',
            calculation: (studCount) => studCount * 4 // 4 nails per stud
          }
        }
      },
      metal: {
        spacing: [16, 24],
        materials: {
          studs: {
            type: '3-5/8" metal stud',
            calculation: (length, spacing) => 
              Math.ceil(length * 12 / spacing) + 3
          },
          tracks: {
            type: '3-5/8" metal track',
            calculation: (length) => length * 2 * 1.1
          },
          screws: {
            type: '#8 self-drilling',
            calculation: (studCount) => studCount * 4
          }
        }
      }
    },
    surfaces: {
      drywall: {
        types: ['1/2"', '5/8"'],
        calculation: (area) => Math.ceil(area / 32 * 1.1), // 4x8 sheets + waste
        fasteners: {
          lumber: '1-5/8" drywall screws',
          metal: '1-1/4" drywall screws'
        }
      },
      frp: {
        types: ['0.090"', '0.120"'],
        panelSize: { width: 4, height: 8 }, // feet
        calculation: (area) => Math.ceil(area / 32 * 1.1),
        fasteners: {
          type: 'FRP rivets',
          calculation: (panelCount) => panelCount * 24 // 24 rivets per panel
        },
        adhesive: {
          coverage: 100, // sq ft per gallon
          calculation: (area) => Math.ceil(area / 100 * 1.1)
        }
      }
    },
    finish: {
      paint: {
        primer: {
          coverage: 350, // sq ft per gallon
          calculation: (area) => Math.ceil(area / 350 * 1.1)
        },
        paint: {
          coverage: 400,
          calculation: (area, coats = 2) => 
            Math.ceil((area * coats) / 400 * 1.1)
        }
      }
    },
    trim: {
      calculation: (params: { length: number, doors: number, windows: number }) => {
        const baseboards = Math.ceil(params.length * 1.1) // 10% waste
        const doorTrim = Math.ceil(params.doors * 17 * 1.1) // 17 linear feet per door
        const windowTrim = Math.ceil(params.windows * 15 * 1.1) // 15 linear feet per window
        return {
          baseboards,
          doorTrim,
          windowTrim,
          total: baseboards + doorTrim + windowTrim
        }
      }
    }
  },
  floors: {
    epoxy: {
      preparation: {
        cleaner: {
          coverage: 200, // sq ft per gallon
          calculation: (area) => Math.ceil(area / 200 * 1.1)
        },
        etching: {
          coverage: 150,
          calculation: (area) => Math.ceil(area / 150 * 1.1)
        }
      },
      coating: {
        primer: {
          coverage: 300,
          calculation: (area) => Math.ceil(area / 300 * 1.1)
        },
        baseCoat: {
          coverage: 200,
          calculation: (area) => Math.ceil(area / 200 * 1.1)
        },
        topCoat: {
          coverage: 250,
          calculation: (area) => Math.ceil(area / 250 * 1.1)
        }
      }
    },
    carpet: {
      types: ['Commercial', 'Residential'],
      rollWidth: 12, // feet
      calculation: (area) => {
        const rolls = Math.ceil(area / (12 * 12) * 1.1) // 12' wide rolls in 12' lengths
        return {
          rolls,
          padding: Math.ceil(area * 1.1), // sq ft with waste
          tackStrips: Math.ceil(Math.sqrt(area) * 4 * 1.1) // Perimeter + waste
        }
      }
    },
    hardwood: {
      types: ['Solid 3/4"', 'Engineered 1/2"'],
      boxCoverage: 20, // sq ft per box
      calculation: (area) => {
        const boxes = Math.ceil(area / 20 * 1.1)
        return {
          boxes,
          underlayment: Math.ceil(area * 1.1),
          nails: Math.ceil(area * 2.5) // 2.5 nails per sq ft
        }
      }
    },
    tile: {
      types: ['Ceramic', 'Porcelain'],
      sizes: ['12x12', '18x18', '24x24'],
      calculation: (area, size) => {
        const tileArea = size === '12x12' ? 1 : size === '18x18' ? 2.25 : 4 // sq ft
        const tiles = Math.ceil(area / tileArea * 1.1)
        return {
          tiles,
          thinset: Math.ceil(area / 50 * 1.1), // 50 sq ft per bag
          grout: Math.ceil(area / 75 * 1.1) // 75 sq ft per bag
        }
      }
    }
  }
}
```

### **Automated Testing Strategy**

#### **Unit Tests**
```typescript
// wallCalculator.test.ts
describe('Wall Calculator', () => {
  test('calculates lumber framing materials')
  test('calculates metal framing materials')
  test('determines correct fasteners')
  test('handles different spacings')
})

// floorCalculator.test.ts
describe('Floor Calculator', () => {
  test('calculates epoxy preparation materials')
  test('calculates coating materials')
  test('handles multiple coats')
  test('applies waste factors')
})

// materialService.test.ts
describe('Material Service', () => {
  test('processes wall specifications')
  test('processes floor specifications')
  test('generates accurate quantities')
  test('provides material comparisons')
  test('exports to CSV format')
})

// aiDialogueService.test.ts
describe('AI Dialogue Service', () => {
  test('identifies missing information')
  test('generates appropriate questions')
  test('makes reasonable assumptions')
  test('maintains dialogue context')
  test('handles specification updates')
  test('calculates material differences')
  test('remembers user preferences')
  test('suggests relevant refinements')
})

// aiService.test.ts
describe('AI Service', () => {
  test('understands natural language requirements')
  test('processes iterative refinements')
  test('maintains calculation accuracy')
  test('provides helpful suggestions')
})
```

#### **Integration Tests**
```typescript
// material.integration.test.ts
describe('Material Integration', () => {
  test('complete lumber wall calculation')
  test('complete metal wall calculation')
  test('complete epoxy floor calculation')
  test('surface material calculations')
  test('system comparisons')
})
```

### **Manual Testing Checklist**
- [ ] Test wall framing calculations:
  - Lumber at 16" spacing
  - Lumber at 24" spacing
  - Metal at 16" spacing
  - Metal at 24" spacing
- [ ] Verify wall surface calculations:
  - Drywall quantities
  - Paint quantities
  - Fastener quantities
- [ ] Test floor coating calculations:
  - Preparation materials
  - Primer quantities
  - Base coat quantities
  - Top coat quantities
- [ ] Test material comparisons:
  - Lumber vs metal walls
  - Different spacings
  - Floor coating options
- [ ] Verify CSV exports
- [ ] Test in Chrome and Firefox

## **PR-5: Home Depot Pricing Integration** 
**Goal**: Add pricing and product links to BOM using Home Depot API
**Status**: 🔄 Ready for Implementation

### **Features**
- Home Depot product search integration via SerpAPI
- Automatic price lookup for BOM items
- Product links for easy ordering
- Total cost calculation
- API rate limiting (250 free searches)
- Manual testing only (no API tests)

### **Files Modified/Created**
```
src/services/
├── homeDepotService.ts (NEW)
├── pricingService.ts (NEW)
└── serpApiService.ts (NEW)

src/components/
├── MaterialPanel/
│   ├── PricingDisplay.tsx (NEW)
│   └── ProductLink.tsx (NEW)

src/types/
└── pricingTypes.ts (NEW)

.env (MODIFIED - add SERP_API_KEY)
```

### **API Integration Details**

#### **SerpAPI Home Depot Integration**
```typescript
// serpApiService.ts
interface SerpApiResponse {
  organic_results: Array<{
    title: string;
    link: string;
    price: {
      raw: string;
      extracted: number;
    };
    thumbnail: string;
    snippet: string;
  }>;
  search_information: {
    total_results: number;
  };
}

class SerpApiService {
  private readonly API_KEY: string;
  private readonly BASE_URL = 'https://serpapi.com/search.json';
  private searchCount = 0;
  private readonly MAX_SEARCHES = 250;

  constructor() {
    this.API_KEY = process.env.SERP_API_KEY || '';
    if (!this.API_KEY) {
      throw new Error('SERP_API_KEY not found in environment variables');
    }
  }

  async searchHomeDepot(query: string): Promise<SerpApiResponse> {
    if (this.searchCount >= this.MAX_SEARCHES) {
      throw new Error('API search limit reached (250 searches)');
    }

    const params = new URLSearchParams({
      engine: 'home_depot',
      q: query,
      api_key: this.API_KEY
    });

    const response = await fetch(`${this.BASE_URL}?${params}`);
    const data = await response.json();
    
    this.searchCount++;
    return data;
  }

  getRemainingSearches(): number {
    return this.MAX_SEARCHES - this.searchCount;
  }
}
```

#### **Pricing Service Integration**
```typescript
// pricingService.ts
interface MaterialPricing {
  materialName: string;
  quantity: number;
  unit: string;
  homeDepotPrice?: number;
  productLink?: string;
  productTitle?: string;
  thumbnail?: string;
  totalCost?: number;
  searchQuery: string;
}

class PricingService {
  private serpApi: SerpApiService;

  constructor() {
    this.serpApi = new SerpApiService();
  }

  async getMaterialPricing(material: MaterialSpec): Promise<MaterialPricing> {
    const searchQuery = this.buildSearchQuery(material);
    
    try {
      const results = await this.serpApi.searchHomeDepot(searchQuery);
      const bestMatch = this.findBestMatch(results.organic_results, material);
      
      return {
        materialName: material.name,
        quantity: material.quantity,
        unit: material.unit,
        homeDepotPrice: bestMatch?.price?.extracted,
        productLink: bestMatch?.link,
        productTitle: bestMatch?.title,
        thumbnail: bestMatch?.thumbnail,
        totalCost: bestMatch?.price?.extracted ? 
          bestMatch.price.extracted * material.quantity : undefined,
        searchQuery
      };
    } catch (error) {
      console.warn(`Failed to get pricing for ${material.name}:`, error);
      return {
        materialName: material.name,
        quantity: material.quantity,
        unit: material.unit,
        searchQuery
      };
    }
  }

  private buildSearchQuery(material: MaterialSpec): string {
    // Build optimized search queries for Home Depot
    const baseQuery = material.name.toLowerCase();
    
    // Add common Home Depot keywords
    const keywords = ['home depot', 'construction', 'building'];
    return `${baseQuery} ${keywords.join(' ')}`;
  }

  private findBestMatch(results: any[], material: MaterialSpec): any {
    // Find the best matching product based on name similarity
    if (!results || results.length === 0) return null;
    
    // Simple matching - could be enhanced with fuzzy matching
    const materialName = material.name.toLowerCase();
    return results.find(result => 
      result.title.toLowerCase().includes(materialName) ||
      materialName.includes(result.title.toLowerCase().split(' ')[0])
    ) || results[0]; // Fallback to first result
  }

  async getBomPricing(bom: MaterialSpec[]): Promise<MaterialPricing[]> {
    const pricingPromises = bom.map(material => 
      this.getMaterialPricing(material)
    );
    
    return Promise.all(pricingPromises);
  }

  getTotalCost(pricing: MaterialPricing[]): number {
    return pricing.reduce((total, item) => {
      return total + (item.totalCost || 0);
    }, 0);
  }
}
```

### **UI Components**

#### **Enhanced Material Panel**
```typescript
// MaterialPanel/PricingDisplay.tsx
interface PricingDisplayProps {
  pricing: MaterialPricing[];
  totalCost: number;
  remainingSearches: number;
}

const PricingDisplay: React.FC<PricingDisplayProps> = ({ 
  pricing, 
  totalCost, 
  remainingSearches 
}) => {
  return (
    <div className={styles.pricingDisplay}>
      <div className={styles.header}>
        <h3>Material Pricing (Home Depot)</h3>
        <div className={styles.apiStatus}>
          <span className={styles.searchCount}>
            {remainingSearches} searches remaining
          </span>
        </div>
      </div>
      
      <div className={styles.pricingTable}>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total Cost</th>
              <th>Product Link</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((item, index) => (
              <tr key={index}>
                <td>{item.materialName}</td>
                <td>{item.quantity} {item.unit}</td>
                <td>
                  {item.homeDepotPrice ? 
                    `$${item.homeDepotPrice.toFixed(2)}` : 
                    'Price not found'
                  }
                </td>
                <td>
                  {item.totalCost ? 
                    `$${item.totalCost.toFixed(2)}` : 
                    'N/A'
                  }
                </td>
                <td>
                  {item.productLink ? (
                    <ProductLink 
                      url={item.productLink}
                      title={item.productTitle}
                      thumbnail={item.thumbnail}
                    />
                  ) : (
                    'No product found'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className={styles.totalSection}>
        <div className={styles.totalCost}>
          <strong>Total Estimated Cost: ${totalCost.toFixed(2)}</strong>
        </div>
        <div className={styles.disclaimer}>
          <small>
            Prices are estimates from Home Depot. Actual prices may vary.
            {remainingSearches < 50 && (
              <span className={styles.warning}>
                ⚠️ Low API searches remaining ({remainingSearches})
              </span>
            )}
          </small>
        </div>
      </div>
    </div>
  );
};
```

#### **Product Link Component**
```typescript
// MaterialPanel/ProductLink.tsx
interface ProductLinkProps {
  url: string;
  title?: string;
  thumbnail?: string;
}

const ProductLink: React.FC<ProductLinkProps> = ({ url, title, thumbnail }) => {
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={styles.productLink}
    >
      {thumbnail && (
        <img 
          src={thumbnail} 
          alt={title || 'Product image'} 
          className={styles.thumbnail}
        />
      )}
      <span className={styles.linkText}>
        {title ? title.substring(0, 50) + '...' : 'View Product'}
      </span>
    </a>
  );
};
```

### **Environment Setup Documentation**

#### **Setup Instructions**
```markdown
# Home Depot Pricing Integration Setup

## Prerequisites
- SerpAPI account with Home Depot API access
- 250 free searches available (or paid plan)

## Setup Steps

### 1. Get SerpAPI Key
1. Sign up at https://serpapi.com/
2. Navigate to your dashboard
3. Copy your API key

### 2. Configure Environment
Add to your `.env` file:
```bash
SERP_API_KEY=your_api_key_here
```

### 3. Test API Connection
```bash
# Test with a simple search
curl "https://serpapi.com/search.json?engine=home_depot&q=2x4+lumber&api_key=YOUR_API_KEY"
```

### 4. Usage in Application
The pricing service will automatically:
- Search Home Depot for each BOM item
- Extract prices and product links
- Calculate total costs
- Track remaining API searches

## API Limits & Considerations
- **Free Plan**: 250 searches per month
- **Rate Limiting**: Built-in to prevent exceeding limits
- **Error Handling**: Graceful fallback when API fails
- **Manual Testing**: No automated tests to preserve API quota

## Troubleshooting
- **API Key Issues**: Verify key is correctly set in .env
- **Search Limits**: Check remaining searches in UI
- **No Results**: Some materials may not have exact matches
- **Price Accuracy**: Prices are estimates, verify before ordering
```

### **Manual Testing Checklist**
- [ ] Set up SerpAPI key in .env file
- [ ] Test API connection with simple search
- [ ] Generate BOM with common materials (2x4 lumber, drywall, paint)
- [ ] Verify pricing data appears in Material Panel
- [ ] Check product links open correctly
- [ ] Verify total cost calculation
- [ ] Test with materials that may not have exact matches
- [ ] Check API search counter decreases correctly
- [ ] Test error handling when API limit reached
- [ ] Verify pricing display in Chrome and Firefox

### **Implementation Notes**
- **No Automated Tests**: To preserve API quota, only manual testing
- **Rate Limiting**: Built-in protection against exceeding 250 searches
- **Error Handling**: Graceful fallback when pricing unavailable
- **Search Optimization**: Optimized queries for better Home Depot matches
- **UI Integration**: Seamless integration with existing Material Panel

## **Success Criteria**

### **MVP Success Criteria**
- [ ] Upload and scale system works accurately
- [ ] Polyline and polygon tools function correctly
- [ ] Layer color system works with inheritance
- [ ] AI generates useful material calculations
- [ ] CSV export works for material lists
- [ ] Home Depot pricing integration works
- [ ] Product links and total costs display correctly
- [ ] All features work in Chrome and Firefox
- [ ] Performance is smooth with large plans

### **Quality Gates**
- [ ] All user stories have acceptance criteria met
- [ ] 95%+ measurement accuracy
- [ ] AI calculations are reliable
- [ ] Pricing integration works with common materials
- [ ] All tests passing in Chrome and Firefox
- [ ] Documentation complete