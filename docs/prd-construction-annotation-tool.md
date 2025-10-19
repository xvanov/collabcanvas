# Construction Plan Annotation Tool - Product Requirements Document (PRD)

## **Executive Summary**

Transform CollabCanvas into a focused construction annotation tool with AI-powered material estimation. Enable contractors to upload plans, measure with simple tools, and get intelligent material estimates. This streamlined MVP focuses on core functionality with maximum impact.

**Goal**: 5-minute annotation → comprehensive wall material estimates
**Timeline**: 2 weeks MVP
**Risk Level**: Low (simplified scope, leverages existing foundation)

---

## **1. Problem & Goals**

### **Problem**
- Contractors spend hours manually measuring plans and calculating materials
- Current tools are either too complex (CAD) or too simple (basic image viewers)
- Material estimation errors cost time and money
- Team collaboration on plans is fragmented

### **Goals**
- **Primary**: Enable 5-minute annotation for 80% of material estimates
- **Secondary**: Real-time team collaboration on construction plans
- **Tertiary**: AI-powered material calculations with minimal manual input
- **Success Metrics**: 
  - 80% reduction in material takeoff time
  - 90%+ accuracy in material estimates
  - 5+ concurrent users without performance degradation

---

## **2. User Stories**

### **Epic 1: Document Upload & Scale Establishment**

#### **US-1.1: Upload Construction Plans**
**As a** contractor  
**I want to** upload image files of construction plans  
**So that** I can annotate them digitally  

**Acceptance Criteria**:
- [ ] Upload PNG, JPG files
- [ ] Display uploaded file as canvas background
- [ ] Maintain aspect ratio and center on canvas

#### **US-1.2: Establish Scale Reference**
**As a** contractor  
**I want to** set the scale of the plan using a known dimension  
**So that** all measurements are accurate  

**Acceptance Criteria**:
- [ ] Scale tool in Tools dropdown
- [ ] Click-drag to create reference line
- [ ] Input known real-world distance
- [ ] Select unit type (feet, inches, meters)
- [ ] Auto-calculate scale ratio
- [ ] Display scale indicator on canvas
- [ ] Apply scale to new annotations

### **Epic 2: Annotation Tools**

#### **US-2.1: Multi-Line Tool for Wall Measurements**
**As a** contractor  
**I want to** draw connected lines along walls  
**So that** I can measure wall lengths accurately  

**Acceptance Criteria**:
- [ ] Click-to-click line drawing (polyline)
- [ ] Display running length in real-world units
- [ ] Show total length for each polyline
- [ ] Support multiple polylines per layer
- [ ] Undo last point with Escape key

#### **US-2.2: Area Tool for Room Measurements**
**As a** contractor  
**I want to** draw polygons around rooms  
**So that** I can calculate room areas  

**Acceptance Criteria**:
- [ ] Click-to-click polygon creation
- [ ] Display area in real-world units (sq ft)
- [ ] Semi-transparent fill with layer color
- [ ] Support multiple polygons per layer
- [ ] Close polygon with double-click or right-click
- [ ] Show area label on polygon

### **Epic 3: Layer System**

#### **US-3.1: Basic Layer Management**
**As a** contractor  
**I want to** create and modify layers with colors  
**So that** I can organize my annotations  

**Acceptance Criteria**:
- [ ] Create new layers with name and color
- [ ] Edit layer name and color after creation
- [ ] All shapes in layer inherit layer color
- [ ] Layer color updates affect all existing shapes
- [ ] Show/hide layers individually
- [ ] Delete layers (with confirmation)

### **Epic 4: AI Material Estimation**

#### **US-4.1: Layer-Based Material Estimation**
**As a** contractor  
**I want to** get material estimates based on my layer organization  
**So that** I can quickly calculate materials for my drawings  

**Acceptance Criteria**:
- [ ] Access AI tool from toolbar dropdown
- [ ] Chat interface appears/disappears with tool selection
- [ ] AI understands layer context:
  - Uses layer names to identify walls/floors
  - Reads measurements from appropriate shapes
  - Validates scale before calculations
- [ ] AI provides immediate estimates when possible:
  - Shows assumptions clearly
  - Generates detailed BOM
  - Provides CSV export
  - Shows total quantities
- [ ] AI handles missing information:
  - Requests layer creation if needed
  - Asks for scale if missing
  - Suggests naming conventions
  - Guides user through requirements
- [ ] Conversation persists between tool toggles
- [ ] Support material specifications:
  - Framing type and spacing
  - Surface materials
  - Finishes and coatings
  - Custom requirements

#### **US-4.2: Floor System Estimation**
**As a** contractor  
**I want to** calculate floor material quantities  
**So that** I can estimate complete flooring systems  

**Acceptance Criteria**:
- [ ] Select floor area (polygon) and specify flooring type
- [ ] Support multiple flooring systems:
  - Epoxy coating with preparation and layers
  - Carpet with padding and tack strips
  - Hardwood with underlayment and fasteners
  - Tile with thinset and grout
- [ ] Calculate quantities considering:
  - Material coverage rates
  - Standard waste factors
  - Required accessories
  - Installation materials
- [ ] Support system-specific options:
  - Tile sizes and patterns
  - Hardwood types (solid vs engineered)
  - Carpet grades (commercial vs residential)
- [ ] Provide installation tips based on system choice

#### **US-4.3: Material System Comparisons**
**As a** contractor  
**I want to** compare different material systems  
**So that** I can choose the best approach  

**Acceptance Criteria**:
- [ ] Compare wall systems (lumber vs metal)
- [ ] Compare floor coating options
- [ ] Show material quantities for each option
- [ ] Export comparison to CSV
- [ ] Provide basic pros/cons for choices

### **Epic 5: Measurement Display & Export**

#### **US-5.1: Basic Measurement Display**
**As a** contractor  
**I want to** see measurements for my annotations  
**So that** I can verify my calculations  

**Acceptance Criteria**:
- [ ] Display length for polylines
- [ ] Display area for polygons
- [ ] Real-time updates as annotations change
- [ ] Clear, readable measurement labels

#### **US-5.2: Material List Export**
**As a** contractor  
**I want to** export my material calculations  
**So that** I can use them for ordering  

**Acceptance Criteria**:
- [ ] Export material lists to CSV
- [ ] Include quantities and units
- [ ] Organized, readable format
- [ ] Use existing canvas export for plan sharing

---

## **3. Technical Considerations**

### **Current Stack Analysis**

#### **Strengths to Leverage**
- **Konva.js**: Perfect for polyline/polygon drawing
- **Layer System**: Already implemented, needs color enhancement
- **AI Integration**: Existing OpenAI integration can be extended
- **Export System**: Already supports PNG export
- **State Management**: Zustand store handles complex state well

#### **Components to Extend**
- **Canvas.tsx**: Add polyline/polygon tools
- **Toolbar.tsx**: Add scale tool
- **Shape.tsx**: Add polyline/polygon support
- **LayersPanel.tsx**: Add color modification
- **AI Service**: Add construction material calculations

#### **New Components Needed**
- **FileUpload.tsx**: Basic image upload
- **ScaleTool.tsx**: Reference line creation
- **PolylineTool.tsx**: Wall measurement tool
- **PolygonTool.tsx**: Room area tool
- **MaterialPanel.tsx**: Material calculations display

### **Data Structure Extensions**

#### **New Shape Types**
```typescript
export type ShapeType = 'rect' | 'circle' | 'text' | 'line' | 'polyline' | 'polygon' | 'arrow-text';

export interface PolylineShape extends Shape {
  type: 'polyline';
  points: { x: number; y: number }[];
  totalLength: number;
  unit: string;
  layerId: string;
}

export interface PolygonShape extends Shape {
  type: 'polygon';
  points: { x: number; y: number }[];
  area: number;
  unit: string;
  layerId: string;
}

export interface ArrowTextShape extends Shape {
  type: 'arrow-text';
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  text: string;
  layerId: string;
}
```

#### **Canvas Scale State**
```typescript
interface CanvasScale {
  referenceLength: number; // pixels
  realLength: number; // feet/inches/meters
  scaleRatio: number; // realLength / referenceLength
  unit: 'feet' | 'inches' | 'meters';
  isLocked: boolean; // prevents race conditions
}
```

#### **Material Database**
```typescript
interface MaterialSpec {
  name: string;
  unit: 'sqft' | 'linear' | 'each' | 'gallon';
  coverage: number;
  wasteFactor: number;
  codeRequirements?: {
    spacing: number;
    minPerRoom: number;
  };
}
```

---

## **4. Implementation Strategy**

### **Week 1: Core Features**
**Goal**: Basic infrastructure and annotation tools

#### **Tasks**:
1. **File Upload & Scale** (2 days)
   - Basic image upload
   - Scale tool implementation
   - Scale calculation and display

2. **Annotation Tools** (2 days)
   - Polyline tool for walls
   - Polygon tool for rooms
   - Basic measurement display

3. **Layer System** (1 day)
   - Layer color management
   - Shape color inheritance
   - Layer visibility controls

**Risk**: Scale accuracy and measurement precision
**Mitigation**: Thorough testing with known measurements

### **Week 2: AI Integration & Polish**
**Goal**: AI material estimation and final polish

#### **Tasks**:
1. **AI Material Estimation** (3 days)
   - Wall material calculations
   - Comprehensive material lists
   - CSV export functionality

2. **Testing & Polish** (2 days)
   - Chrome/Firefox testing
   - Performance optimization
   - Bug fixes
   - Documentation

**Risk**: AI response quality and calculation accuracy
**Mitigation**: Focus on one comprehensive use case (walls)

---

## **5. Potential Pitfalls & Mitigation**

### **Technical Pitfalls**

#### **Pitfall 1: Image Rendering Performance**
**Risk**: Large image files cause performance issues
**Mitigation**: 
- Compress images before upload
- Implement progressive loading
- Add file size limits
- Optimize canvas rendering

#### **Pitfall 2: Complex Polygon Performance**
**Risk**: Many polygon points slow down rendering
**Mitigation**:
- Limit polygon complexity (max 50 points)
- Optimize Konva.js rendering
- Use simplified shapes for display
- Implement level-of-detail rendering

#### **Pitfall 3: Scale Accuracy Issues**
**Risk**: Scale calculations introduce measurement errors
**Mitigation**:
- Validate scale input (reasonable ranges)
- Show scale verification tools
- Allow manual scale adjustment
- Display scale confidence indicators

### **User Experience Pitfalls**

#### **Pitfall 4: Annotation Complexity**
**Risk**: Too many tools overwhelm users
**Mitigation**:
- Progressive disclosure of tools
- Context-sensitive toolbars
- Guided tutorials
- Default tool selections

#### **Pitfall 5: AI Accuracy Expectations**
**Risk**: Users expect perfect AI calculations
**Mitigation**:
- Clear accuracy disclaimers
- Show calculation breakdowns
- Allow manual overrides
- Provide confidence indicators

### **Business Pitfalls**

#### **Pitfall 6: Feature Creep**
**Risk**: Adding too many features delays MVP
**Mitigation**:
- Strict feature prioritization
- MVP scope definition
- Regular scope reviews
- User feedback integration

#### **Pitfall 7: Performance Degradation**
**Risk**: New features break existing performance
**Mitigation**:
- Performance regression testing
- Gradual feature rollout
- Performance monitoring
- Optimization sprints

---

## **6. Testing Strategy**

### **Unit Tests**
- **Shape Calculations**: Length, area, scale conversions
- **AI Commands**: Material calculation accuracy
- **File Upload**: Format validation, error handling
- **Scale Tool**: Reference line calculations

### **Integration Tests**
- **Multi-user Sync**: Annotations sync across users
- **Export Functionality**: Measurement overlays work
- **AI Integration**: Commands execute correctly
- **Performance**: 60 FPS maintained with new tools

### **User Acceptance Tests**
- **Contractor Workflow**: Complete material takeoff process
- **Collaboration**: Multiple users annotating simultaneously
- **Accuracy**: Measurements match manual calculations
- **Performance**: Smooth operation with large plans

### **Performance Tests**
- **Large Files**: 50MB+ image handling
- **Many Annotations**: 100+ polylines/polygons
- **Concurrent Users**: 5+ users without degradation
- **Export Quality**: High-resolution output

---

## **7. Success Metrics**

### **Technical Metrics**
- **Performance**: Maintain 60 FPS with new tools
- **Accuracy**: 95%+ measurement accuracy
- **Reliability**: <1% error rate in calculations
- **Scalability**: Support 5+ concurrent users

### **User Experience Metrics**
- **Annotation Time**: 5 minutes for basic material takeoff
- **Accuracy**: 90%+ material estimate accuracy
- **Adoption**: 80% of users complete full workflow
- **Satisfaction**: 4.5+ star rating

### **Business Metrics**
- **Time Savings**: 80% reduction in takeoff time
- **Error Reduction**: 50% fewer material calculation errors
- **User Retention**: 70% weekly active users
- **Feature Usage**: 60% of users use AI commands

---

## **8. Risk Assessment**

### **High Risk**
- **Image Rendering**: Complex implementation, performance impact
- **AI Accuracy**: User expectations vs. reality
- **Performance**: New tools affecting existing performance

### **Medium Risk**
- **Scale Accuracy**: Measurement precision issues
- **User Adoption**: Learning curve for new tools
- **Integration**: New features breaking existing functionality

### **Low Risk**
- **File Upload**: Well-understood technology
- **Layer Colors**: Simple UI enhancement
- **Export Enhancement**: Building on existing system

---

## **9. Dependencies & Assumptions**

### **Dependencies**
- **File Upload Service**: Need server-side image processing
- **AI Service**: Existing OpenAI integration
- **Konva.js**: Current canvas rendering library
- **Firebase**: Existing backend infrastructure

### **Assumptions**
- **User Behavior**: Contractors will adopt digital tools
- **File Formats**: Image files (PNG, JPG) are sufficient
- **Scale Accuracy**: Users can provide accurate reference measurements
- **AI Capability**: OpenAI can handle construction-specific queries

---

## **10. Post-MVP Roadmap**

### **Phase 2 Features**
- **Advanced AI**: Code compliance checking
- **Mobile App**: On-site annotation
- **CAD Integration**: Import DWG files
- **Cost Estimation**: Material pricing integration

### **Phase 3 Features**
- **3D Visualization**: 3D plan viewing
- **Project Management**: Timeline integration
- **Supplier Integration**: Direct material ordering
- **Compliance Checking**: Building code validation

---

## **11. AI Material Estimation Details**

### **Material Database Structure**
```typescript
const CONSTRUCTION_MATERIALS = {
  // Framing Materials
  '2x4-stud': {
    name: '2x4 Stud',
    unit: 'linear',
    coverage: 1, // 1 linear foot per unit
    wasteFactor: 0.15,
    codeRequirements: { spacing: 16 } // inches on center
  },
  '2x4-plate': {
    name: '2x4 Plate',
    unit: 'linear',
    coverage: 1,
    wasteFactor: 0.10
  },
  
  // Drywall Materials
  'drywall-sheet': {
    name: 'Drywall Sheet',
    unit: 'sqft',
    coverage: 32, // 4x8 sheet
    wasteFactor: 0.10
  },
  'drywall-mud': {
    name: 'Joint Compound',
    unit: 'gallon',
    coverage: 200, // sqft per gallon
    wasteFactor: 0.05
  },
  
  // Paint Materials
  'paint-gallon': {
    name: 'Paint',
    unit: 'gallon',
    coverage: 400, // sqft per gallon
    wasteFactor: 0.05
  },
  'primer-gallon': {
    name: 'Primer',
    unit: 'gallon',
    coverage: 300,
    wasteFactor: 0.05
  },
  
  // Electrical Materials
  'romex-12-2': {
    name: '12-2 Romex',
    unit: 'linear',
    coverage: 1,
    wasteFactor: 0.10
  },
  'electrical-outlet': {
    name: 'Electrical Outlet',
    unit: 'each',
    coverage: 1,
    codeRequirements: { spacing: 144, minPerRoom: 1 } // 12 feet
  }
};
```

### **AI Command Examples**

#### **Room-Based Calculations**
```typescript
// "How much drywall for this room?"
// Input: Polygon area = 200 sq ft
// Calculation: 200 sq ft ÷ 32 sq ft/sheet × 1.10 waste = 6.875 sheets
// Output: "You need 7 sheets of drywall (6.875 rounded up)"

// "How much paint for this room?"
// Input: Polygon area = 200 sq ft
// Calculation: 200 sq ft ÷ 400 sq ft/gallon × 1.05 waste = 0.525 gallons
// Output: "You need 1 gallon of paint (0.525 rounded up)"
```

#### **Wall-Based Calculations**
```typescript
// "How much lumber for this wall?"
// Input: Polyline length = 12 feet
// Calculation: 12 ft ÷ 1.33 ft spacing × 1.15 waste = 10.4 studs
// Output: "You need 11 studs for this wall (10.4 rounded up)"

// "Calculate electrical wire for this wall?"
// Input: Polyline length = 12 feet
// Calculation: 12 ft × 1.10 waste = 13.2 linear feet
// Output: "You need 13.2 linear feet of 12-2 Romex"
```

#### **Trade-Specific Commands**
```typescript
// "Framing materials for this project"
// Input: All polylines in 'framing' layer
// Calculation: Sum all wall lengths, calculate studs, plates, headers
// Output: Complete lumber list with quantities

// "Electrical materials for this project"
// Input: All polylines in 'electrical' layer + room polygons
// Calculation: Wire lengths + outlet counts based on room areas
// Output: Complete electrical material list
```

### **AI Implementation Strategy**

#### **Phase 1: Basic Calculations (Week 3)**
- Room area → drywall, paint, flooring
- Wall length → lumber, electrical wire
- Simple material database (10-15 materials)

#### **Phase 2: Advanced Calculations (Week 4)**
- Trade-specific material lists
- Waste factor calculations
- Code compliance reminders
- Shopping list generation

#### **Phase 3: Smart Features (Post-MVP)**
- Material cost estimation
- Supplier recommendations
- Labor hour estimates
- Project timeline integration

---

## **12. Implementation Checklist**

### **Week 1: Core Infrastructure**
- [ ] Create FileUpload component
- [ ] Implement image upload
- [ ] Add scale tool to toolbar
- [ ] Create scale calculation logic
- [ ] Update Shape types in types.ts
- [ ] Add scale state to canvas store
- [ ] Update Firestore schema for new shapes
- [ ] Test file upload with various formats
- [ ] Test scale calculation accuracy

### **Week 2: Annotation Tools**
- [ ] Create PolylineTool component
- [ ] Implement click-to-click line drawing
- [ ] Add length calculation and display
- [ ] Create PolygonTool component
- [ ] Implement click-to-click polygon creation
- [ ] Add area calculation and display
- [ ] Create ArrowTextTool component
- [ ] Implement arrow with text functionality
- [ ] Add snap-to-point functionality
- [ ] Test all tools with real construction plans

### **Week 3: Enhanced Layers & AI**
- [ ] Add color selection to layer creation
- [ ] Implement trade-specific layer templates
- [ ] Create material database
- [ ] Implement basic AI material calculations
- [ ] Add construction-specific AI commands
- [ ] Test AI accuracy with sample plans
- [ ] Implement layer color inheritance
- [ ] Add trade-specific default colors

### **Week 4: Measurement Display & Export**
- [ ] Create MeasurementPanel component
- [ ] Implement running totals display
- [ ] Add real-time measurement updates
- [ ] Enhance export with measurement overlays
- [ ] Implement CSV export for measurements
- [ ] Add print-optimized export options
- [ ] Test export quality and performance
- [ ] Polish UI and fix bugs

### **Testing & Quality Assurance**
- [ ] Unit tests for all new components
- [ ] Integration tests for multi-user sync
- [ ] Performance tests with large files
- [ ] User acceptance tests with contractors
- [ ] Accuracy tests for measurements
- [ ] AI calculation accuracy tests
- [ ] Export quality tests
- [ ] Cross-browser compatibility tests

---

## **13. Success Criteria**

### **MVP Success Criteria**
- [ ] Upload construction plans (image files)
- [ ] Establish scale with reference line
- [ ] Draw polylines for wall measurements
- [ ] Draw polygons for room areas
- [ ] Add arrows with text annotations
- [ ] Color-coded layers by trade
- [ ] AI material estimation for rooms and walls
- [ ] Running totals display
- [ ] Export annotated plans
- [ ] Maintain 60 FPS performance
- [ ] Support 5+ concurrent users

### **Quality Gates**
- [ ] All user stories have acceptance criteria met
- [ ] 95%+ measurement accuracy
- [ ] <1% error rate in AI calculations
- [ ] Performance maintained with new features
- [ ] All tests passing
- [ ] User feedback incorporated
- [ ] Documentation complete

---

*This document will be updated as implementation progresses and requirements evolve.*
