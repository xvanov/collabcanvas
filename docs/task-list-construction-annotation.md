# Construction Annotation Tool - Task List & PRs

## **Overview**

This document breaks down the Construction Plan Annotation Tool implementation into 4 focused Pull Requests, delivered over a 2-week sprint. Each PR builds incrementally on the previous one, focusing on core functionality for a powerful yet streamlined MVP.

**Testing Strategy**: Automated tests + manual testing in Chrome/Firefox, always build, lint and tests (:ci tests) at end of each PR. 

---

## **PR-1: Document Upload & Scale Foundation**
**Goal**: Enable basic plan upload and scale reference system

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

## **PR-2: Core Annotation Tools**
**Goal**: Implement polyline and polygon tools for measurements

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
- [ ] Draw polylines along walls
- [ ] Verify length calculations
- [ ] Draw polygons around rooms
- [ ] Verify area calculations
- [ ] Test undo/redo for both tools
- [ ] Verify measurement display
- [ ] Test in Chrome and Firefox

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

## **Success Criteria**

### **MVP Success Criteria**
- [ ] Upload and scale system works accurately
- [ ] Polyline and polygon tools function correctly
- [ ] Layer color system works with inheritance
- [ ] AI generates useful material calculations
- [ ] CSV export works for material lists
- [ ] All features work in Chrome and Firefox
- [ ] Performance is smooth with large plans

### **Quality Gates**
- [ ] All user stories have acceptance criteria met
- [ ] 95%+ measurement accuracy
- [ ] AI calculations are reliable
- [ ] All tests passing in Chrome and Firefox
- [ ] Documentation complete