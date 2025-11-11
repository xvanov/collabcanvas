# CollabCanvas - Product Requirements Document

**Author:** xvanov
**Date:** 2025-01-27
**Version:** 1.0

---

## Executive Summary

CollabCanvas is evolving from an MVP construction plan annotation tool into a comprehensive construction takeoff and estimation platform. The platform enables residential remodeling contractors to generate accurate, real-time material estimates (BOMs) and pricing directly from construction plans and scope of work documents. The north star is **estimation accuracy** - critical for project profitability and competitive bidding.

The platform combines plan upload, layer-based annotation, AI-powered BOM generation, and real-time supplier pricing integration to transform a 4-8 hour manual process into a 30-minute automated workflow. This directly addresses contractors' pain points: inaccurate estimates leading to lost profits or lost bids, time-consuming manual takeoff processes, and friction in price discovery across multiple suppliers.

### What Makes This Special

**The Magic of CollabCanvas:**

1. **Real-Time Supplier Pricing Integration**: Not theoretical estimates - actual prices from major suppliers (Home Depot, Lowe's, Amazon, Wayfair) integrated directly into the workflow. This is the "wow" moment when contractors see real prices appear automatically instead of spending hours researching manually.

2. **Multi-Supplier Cost Optimization**: After generating an initial estimate, the system automatically compares prices across multiple suppliers and optimizes material costs by selecting the best price for each item. This delivers immediate value - contractors can save 5-15% on material costs with a single click.

3. **AI-Native Workflow**: Natural language interaction makes the tool accessible to contractors who aren't tech-savvy. The "add a red circle" moment becomes "generate BOM for all walls" - contractors can describe what they need in plain language and get accurate results.

4. **Accuracy-First Design**: Built-in validation loop ensures estimates improve over time. The system learns from completed projects, comparing estimates vs. actual costs to continuously refine accuracy. This transforms estimation from guesswork into a data-driven process.

5. **Construction Project Bidding Engine** (Phase 3): Comprehensive bidding system that adds labor hours calculation and bid customization to MVP's CPM - not just material estimates. Contractors can customize crew size, pay rates, and margins to generate accurate, competitive bids in minutes instead of hours.

**The Core Excitement**: Contractors will love this tool because it transforms their most time-consuming, error-prone task (estimation) into a fast, accurate, profitable process. The moment they see real prices populate automatically and realize they can generate a complete bid in 30 minutes instead of 8 hours - that's when they'll say "wow."

---

## Project Classification

**Technical Type:** Web Application (Single-Page Application)
**Domain:** Construction/Remodeling (General Complexity)
**Complexity:** Medium

**Project Classification Details:**

CollabCanvas is a specialized web application built as a React-based SPA with Firebase backend. The platform serves residential remodeling contractors, combining real-time collaboration, AI-powered material estimation, and supplier price integration into a unified workflow.

**Technical Characteristics:**
- **Platform**: Web application (Chrome, Firefox, Safari, Edge)
- **Architecture**: Component-based SPA with Firebase BaaS
- **Primary Interface**: Browser-based canvas with annotation tools
- **Real-time Features**: Collaborative editing, live presence, cursor tracking
- **AI Integration**: Natural language BOM generation via OpenAI API
- **External APIs**: Supplier pricing APIs (Home Depot, Lowe's, Amazon, Wayfair)

**Domain Context:**

The construction/remodeling domain has standard requirements:
- No specialized regulatory compliance (unlike healthcare, fintech, or aerospace)
- Standard security practices for user data and authentication
- Performance requirements driven by user experience (60 FPS canvas rendering)
- Integration requirements with supplier APIs and pricing services
- Accessibility considerations for broad contractor audience

**Complexity Assessment:**

- **Technical Complexity**: Medium - Requires real-time collaboration, AI integration, canvas rendering optimization, and multiple external API integrations
- **Domain Complexity**: Low-Medium - Construction estimation is well-understood domain, but requires understanding of materials, measurements, and contractor workflows
- **Integration Complexity**: Medium - Multiple supplier APIs, Firebase services, AI services
- **Performance Complexity**: Medium-High - Canvas performance critical, especially cross-browser consistency (Firefox performance issues identified)

---

## Success Criteria

Success for CollabCanvas means contractors can generate accurate, competitive bids that win projects without sacrificing profit margins. The platform delivers measurable value through time savings, cost optimization, and estimation accuracy.

### Primary Success Metrics

**1. Estimation Accuracy**
- **Target**: Average estimate accuracy within ±5% of actual costs
- **Measurement**: Compare estimates vs. actual costs for completed projects
- **Timeline**: Measure after 50+ completed projects with actual cost data
- **Why It Matters**: Accuracy is the north star - inaccurate estimates lead to lost profits or lost bids. Success means contractors trust the platform's estimates enough to use them for real bidding decisions.

**2. Time Savings**
- **Target**: Reduce estimation time by 75% (from 4-8 hours to 1-2 hours)
- **Measurement**: User-reported time per estimate (before/after survey)
- **Why It Matters**: Time savings is the immediate value contractors experience. If the tool doesn't save significant time, adoption will be low.

**3. Cost Optimization Impact**
- **Target**: Users save 5-15% on material costs through multi-supplier optimization
- **Measurement**: Compare optimized vs. original estimates, track actual savings
- **Why It Matters**: Cost optimization delivers immediate ROI - contractors see direct financial benefit from using the platform.

**4. User Adoption & Retention**
- **Target**: 100 active contractors using the platform within 6 months
- **Measurement**: Monthly active users (MAU) with at least 1 estimate generated
- **Retention Target**: 60%+ retention rate (users who generate estimates in month N+1 after first use)
- **Why It Matters**: Adoption validates product-market fit. Retention indicates ongoing value.

### Key Performance Indicators

**Estimate Generation Rate**
- **Definition**: Number of estimates generated per active user per month
- **Target**: 5+ estimates per user per month
- **Rationale**: Indicates tool is being used for real projects, not just testing

**Price Integration Success Rate**
- **Definition**: Percentage of BOM items with successfully fetched prices
- **Target**: 90%+ success rate
- **Rationale**: Core value proposition requires reliable pricing. If prices don't load, the tool loses its primary differentiator.

**Estimate Accuracy Variance**
- **Definition**: Standard deviation of (estimate - actual) / actual × 100%
- **Target**: < 5% standard deviation
- **Rationale**: Consistency is as important as average accuracy. Contractors need predictable results.

**AI Chat Success Rate**
- **Definition**: Percentage of AI chat interactions that generate usable BOMs without major revisions
- **Target**: 80%+ success rate
- **Rationale**: AI workflow must be reliable for adoption. If contractors have to heavily edit every BOM, the tool loses its time-saving advantage.

**Revenue Impact for Users**
- **Definition**: Users report increased bid win rate or improved profit margins
- **Target**: Positive impact reported by 70%+ of users after 3 months
- **Measurement**: User survey after 3 months of use
- **Rationale**: Ultimate validation - contractors must see business impact to continue using the tool.

### Business Objectives

**For Individual Contractors:**
- Win more bids through faster turnaround and competitive pricing
- Improve profit margins through accurate estimation and cost optimization
- Reduce estimation time from 4-8 hours to 1-2 hours per project
- Save 5-15% on material costs through automated price comparison

**For the Platform:**
- Establish product-market fit in residential remodeling contractor market
- Build a foundation for future expansion (commercial construction, specialty trades)
- Create a data asset (estimate vs. actual data) that improves accuracy over time
- Demonstrate clear ROI that justifies subscription pricing model

**Success Means Users Experience**: The moment when a contractor generates a complete, accurate bid in 30 minutes instead of 8 hours, sees real prices populate automatically, optimizes costs across suppliers with one click, and wins a project with confidence in their estimate. That's when CollabCanvas has succeeded.

---

## Product Scope

The scope is organized into three phases: MVP (must-have for production launch), Growth (post-MVP enhancements), and Vision (future capabilities). The MVP focuses on fixing critical bugs, establishing core workflow, and building project management infrastructure. Growth features expand supplier integration and add advanced tools. Vision features introduce comprehensive bidding engine and AI automation.

### MVP - Minimum Viable Product

**Critical Bug Fixes** (Must-Have Before Launch)
1. **Plan Deletion**: Reliable deletion of plans that doesn't reappear on reload
2. **Scale Deletion**: Reliable deletion of scale measurements that doesn't reappear on reload
3. **Home Depot Price Integration**: Make price fetching actually work (90%+ success rate)
4. **AI Shape Creation**: Fix commands like "add a red circle" that currently return errors - critical for testing and bulk object creation
5. **Canvas Performance**: Fix Firefox performance degradation, ensure consistent 60 FPS with 100+ objects across all browsers

**Core Features** (Must-Have for Production Launch)

1. **Plan Management**
   - Upload construction plans (PNG, JPG, PDF)
   - Set scale reference with real-world measurements
   - Reliable deletion of plans and scale
   - Store plans persistently in Firebase Storage

2. **Layer-Based Annotation**
   - Create named layers (Walls, Floors, Roofing, etc.)
   - Draw polylines for wall measurements
   - Draw polygons for area measurements (rooms, floors)
   - View layer totals (total wall length, total area per layer)
   - Organize annotations by project section

3. **AI-Powered BOM & Critical Path Generation**
   - **No "Generate" button** - AI chat handles generation through conversation
   - AI chat available in all views (Scope, Time, Space, Money)
   - Context-aware: AI knows which view it's open in
   - User talks to AI: "Generate BOM and Critical Path for this project"
   - AI guides user through pre-flight checks with clarifying questions
   - AI validates all required information before generating
   - AI refuses to generate if information incomplete
   - Generate material lists from annotations
   - **Generate Critical Path (CPM)**: Full CPM generation with calculations (simple calcs) - task dependencies and durations
   - Understand scope of work context
   - AI asks user to choose materials when material choice is unclear
   - Support common residential remodeling materials:
     - Drywall, paint, flooring (LVP, carpet, tile)
     - Cabinets, countertops, fixtures
     - Plumbing, electrical materials
     - Insulation, roofing materials

4. **Real-Time Price Integration**
   - Fetch prices automatically when BOM is generated
   - Display unit prices, total prices per line item
   - Show price source links for verification
   - Cache prices to reduce API calls
   - **Price fetch failure handling**: Show "Price unavailable" with manual entry option
   - **BOM completion blocking**: Block BOM completion until all prices are completed (either fetched or manually entered)
   - **Target**: 90%+ success rate for common materials

5. **Estimate Display & Export**
   - View complete BOM with quantities, unit prices, totals
   - Group materials by category (Walls, Floors, etc.)
   - **Single BOM for MVP** (easy to modify, see changes immediately)
   - **Margin calculation**: Estimate includes profit margin calculation
     - Material costs (from BOM with prices)
     - Labor costs (from CPM task durations with basic labor rates in MVP)
     - Margin calculation (user-configurable margin percentage)
   - **Two estimate views**:
     - **Customer View**: Shows material + labor totals + included margin (margin incorporated into labor line item)
       - Clean, professional view for client presentation
       - Margin is included in labor costs, not shown separately
     - **Contractor View**: Shows labor, materials costs, and margin separate
       - Margin shown in dollars (profit amount)
       - Margin shown in time/slack (buffer time added to ensure realistic estimate)
       - Detailed breakdown for contractor's internal use
   - Export estimate as PDF (can export customer view or contractor view)
   - Include project details, date, contractor info

6. **Basic Estimate-to-Actual Tracking** (Voluntary)
   - Input actual costs per material line item in Money view (voluntary - user chooses to track or not)
   - Compare estimate vs. actual side-by-side
   - Calculate variance percentage
   - **Status auto-calculation**: When marking "Completed Profitable" or "Completed Unprofitable", system auto-calculates profit/loss based on actual costs vs. estimate
   - If no cost tracking provided: Status becomes "Completed - Unknown"

7. **User Authentication & Data Persistence**
   - Google OAuth sign-in
   - Save projects, estimates, annotations to Firebase
   - Multi-user collaboration

8. **Project Management System** ⚠️ **CRITICAL - IMMEDIATE PRIORITY AFTER BUG FIXES**
   - **Multi-Project Support**: Users can create, manage, and access multiple projects
   - **Home Page = Project Dashboard**: Single unified view showing all user's projects
   - **Project Creation**: Create new projects with name, description, and initial setup
   - **Project Deletion**: Delete projects (with confirmation)
   - **Project Status Tracking**: 
     - Estimating (default - project just created)
     - Bid Ready (Money estimate complete - BOM with prices; Time estimate less important but can exist)
     - Bid Lost (user marks project as lost bid)
     - Executing (currently working on project)
     - Completed Profitable (project finished, made money - auto-calculated if cost tracking provided)
     - Completed Unprofitable (project finished, lost money - auto-calculated if cost tracking provided)
     - Completed - Unknown (project finished, no cost tracking provided)
   - **Status transition rules**: User manually changes status (no automatic transitions)
   - **Automatic status calculation**: Only when marking "Completed Profitable" or "Completed Unprofitable"
   - **Project Sharing**: 
     - Generate shareable invite links
     - Invite users as Editors (can modify) or Viewers (read-only)
     - Access control: users only see projects they own or are invited to
   - **Project Organization**: Search, filter, and organize projects by status, date, name
   - **Four-View Navigation**: Select project → enter project → see four-view navigation (Scope | Time | Space | Money)

9. **Four-View Navigation Structure**
   - Top navigation bar with four tabs: **Scope | Time | Space | Money**
   - **Scope View**: Scope of work CSV upload and display (2 columns: scope, description)
     - First view populated - users upload scope of work CSV here first
     - Scope content displayed and used by AI for BOM/Critical Path generation
   - **Space View**: Canvas/annotation (existing functionality - preserve)
   - **Money View**: Estimates/BOM with exact Home Depot prices
   - **Time View**: Critical Path visualization
     - Empty state placeholder: Blank page with "CPM to be implemented" (before CPM is generated)
     - MVP: Full CPM generation with calculations (simple calcs)
     - Once generated: CPM graph visualization with task dependencies and durations
   - Clear tab switching between views
   - **View indicators**: Tabs show indicators when new content is generated (e.g., BOM ready in Money, Critical Path ready in Time)
   - Indicators disappear when user clicks on that tab to view the content
   - Deep linking support (URLs support direct links to projects/views)
   - Real-time collaboration across views (like Google Sheets tabs):
     - See presence indicators showing who's in each view
     - See which users are on which tab/view
     - Changes sync across all views in real-time

10. **Performance Optimization** ⚠️ **CRITICAL FIX NEEDED**
   - Canvas performance maintains 60 FPS with 100+ objects on all major browsers (Chrome, Firefox, Safari, Edge)
   - Optimize rendering pipeline to handle 100+ objects without performance degradation
   - Implement object culling, viewport optimization, and efficient update strategies
   - Cross-browser performance testing and optimization

**MVP Success Criteria:**
- ✅ All critical bugs fixed
- ✅ User can upload scope CSV, plan, set scale, annotate, generate BOM and Critical Path, get prices in < 30 minutes
- ✅ BOM includes accurate quantities based on annotations
- ✅ Critical Path (CPM) generated with task dependencies and durations
- ✅ Prices are real-time from Home Depot API (90%+ success rate)
- ✅ Project management system allows users to create, manage, and share multiple projects
- ✅ Four-view navigation (Scope | Time | Space | Money) functional
- ✅ Canvas performance maintains 60 FPS with 100+ objects across all browsers
- ✅ 5+ contractors test the workflow end-to-end with 80%+ reporting significant time savings

### Growth Features (Post-MVP)

**Phase 2: Advanced Annotation Tools & Multi-Floor Support**

1. **Counter Tool**
   - New annotation tool (dot marker) for counting instances of items
   - Click to place counter dots (e.g., sinks, toilets, outlets, fixtures)
   - Automatic counting and display of totals per layer
   - Useful for fixture counts, electrical outlets, plumbing fixtures

2. **Multi-Floor Projects**
   - Add multiple floor plans to a single project
   - Switch between floors while maintaining separate annotations per floor
   - Aggregate BOMs across all floors for complete project estimate
   - Floor-specific layers and measurements

**Phase 3: Construction Project Bidding Engine**

1. **Comprehensive Bidding System** (Builds on MVP CPM)
   - **Enhanced CPM Integration**: Integrate labor hours with existing CPM visualization
   - **Labor Hours Calculation**: Estimates labor hours required for each task based on:
     - Industry standard labor rates
     - Task complexity and scope
     - Material installation requirements
   - **Critical Path Chart Enhancements**: Enhanced CPM graph with labor hours displayed
     - Visualizes dependencies AND time AND labor simultaneously
     - Interactive visualization with zoom/pan
   - **Cost Estimation**: Calculates total project cost:
     - Material costs (from BOM)
     - Labor costs (hours × rates)
     - Overhead and profit margins
     - Contingency factors
   - **User Customization**: Contractors can adjust bid parameters:
     - Crew size per task/phase
     - Crew pay rates (hourly rates for different roles)
     - Company overhead and profit margin percentages
     - Real-time bid recalculation as parameters change
   - **Bid Generation**: Produces professional bid document with:
     - Detailed cost breakdown
     - Labor schedule
     - Material list
     - Project timeline
     - Terms and conditions

**Phase 4: Multi-Supplier Cost Optimization & Advanced Features**

1. **Multi-Supplier Cost Optimization**
   - After initial estimate generation, automatically compare prices across multiple suppliers
   - Query all supplier APIs simultaneously (Home Depot, Lowe's, Amazon, Wayfair, contractor supply stores)
   - Find best price for each material automatically
   - Show savings breakdown per line item and total project
   - Allow contractor to review and selectively accept optimizations
   - Support supplier preferences (e.g., "prefer local suppliers for delivery")

2. **Additional Supplier Integrations**
   - Lowe's API integration
   - Amazon API integration
   - Wayfair API integration
   - Contractor supply store APIs

3. **Price Comparison Dashboard**
   - Side-by-side comparison of all suppliers
   - Material availability checking across suppliers
   - Automatic re-pricing when prices change
   - Supplier preference settings (favorite suppliers, delivery options)

**Phase 5: Machine Learning Enhancement & Historical Project Database**

1. **Machine Learning Enhancement**
   - Model trained on estimate vs. actual data from completed projects
   - Learns from historical accuracy to improve future estimates
   - Pattern recognition for common estimation errors
   - Predictive accuracy scoring for new bids
   - Integration with Bidding Engine to improve labor hour estimates
   - Historical project data ingestion (6 projects available for training, require manual ingestion)

2. **Historical Project Database**
   - Reference estimates from similar completed projects
   - Material waste factor calculations based on project type
   - Project similarity matching for accurate estimates
   - Historical accuracy trends and insights

### Vision Features (Future)

**Phase 6: AI-Powered Annotation & Workflow Automation**

1. **AI Annotation Assistant**
   - High-level commands for automatic plan annotation
   - "Measure all walls" - AI automatically traces walls using polyline tool
   - "Measure all floors" - AI automatically outlines floor areas using polygon tool
   - "Count all sinks" - AI identifies and counts fixtures using counter tool
   - Natural language commands to automate repetitive annotation tasks
   - Reduces manual annotation time by 50-70%

2. **Advanced Collaboration**
   - Client portal for estimate approval
   - Team collaboration features (assign estimators, reviewers)

3. **Integration Expansion**
   - Integration with accounting software (QuickBooks, etc.)
   - Mobile app for field measurements

**Phase 7: Market Expansion**

1. Commercial construction support
2. Specialty trades (electrical, plumbing, HVAC) specific tools
3. API for third-party integrations

### Out of Scope for MVP

1. **Multi-Supplier Cost Optimization**: Start with Home Depot only; multi-supplier price comparison in Phase 4
2. **Counter Tool**: Manual counting only for MVP; counter tool annotation in Phase 2
3. **Multi-Floor Projects**: Single floor per project for MVP; multi-floor support in Phase 2
4. **Bidding Engine Labor & Customization**: MVP includes full CPM generation; labor hours calculation and bid customization (crew size, pay rates, margins) in Phase 3
5. **ML-Based Accuracy Enhancement**: Basic tracking only; machine learning enhancements and historical project database in Phase 5
6. **AI Annotation Assistant**: Manual annotation only for MVP; AI-powered automatic annotation in Phase 6
7. **Multi-Scenario Support**: Single BOM for MVP; scenario saving and management after Phase 4 (Epic 4.5)
7. **Advanced Reporting**: Basic variance tracking only, detailed analytics later
8. **Mobile App**: Web-only for MVP, mobile responsive design
9. **Client Portal**: No client-facing features in MVP
10. **Invoice Generation**: Estimate only, not invoicing
11. **Material Availability Checking**: Price only, not stock availability
12. **Integration with Accounting Software**: Manual export only

---

## Web Application Specific Requirements

CollabCanvas is a single-page web application (SPA) built with React 19 and TypeScript. The platform requires specific web application capabilities to deliver the construction estimation workflow.

### Browser Support Requirements

**Primary Browsers** (Full Support Required):
- Chrome (latest 2 versions)
- Firefox (latest 2 versions) ⚠️ **Performance issues identified - critical fix needed**
- Safari (latest 2 versions)
- Edge (latest 2 versions)

**Performance Requirements:**
- Consistent 60 FPS canvas rendering across all browsers
- < 100ms shape sync latency
- < 50ms cursor update latency
- Handle 100+ canvas objects without performance degradation

**Cross-Browser Consistency:**
- Canvas rendering must behave identically across browsers
- Firefox performance degradation with many objects must be fixed
- Implement browser-specific optimizations if needed

### Responsive Design Requirements

**Desktop-First Design:**
- Primary interface optimized for desktop/laptop screens (1920x1080 and above)
- Canvas tools and annotation interface designed for mouse/trackpad interaction
- Full feature set available on desktop

**Tablet Support:**
- Responsive layout for tablet screens (768px - 1024px)
- Touch-friendly controls for annotation tools
- Canvas interaction optimized for touch input
- All core features accessible on tablets

**Mobile Support:**
- Basic viewing and project management on mobile (320px - 767px)
- Responsive navigation and project dashboard
- Canvas viewing (read-only) on mobile
- Full annotation tools may be limited on small screens

### SPA Architecture Requirements

**Single-Page Application:**
- All UI rendered client-side, no server-side rendering
- React Router for client-side navigation
- Fast page transitions without full reloads
- State persistence across navigation

**Component Architecture:**
- React component hierarchy organized by functionality
- Reusable components for common UI patterns
- Separation of concerns: UI components, business logic, data services

**State Management:**
- Zustand store for centralized application state
- Real-time sync with Firebase for collaborative state
- Optimistic UI updates for better perceived performance

### Real-Time Collaboration Requirements

**Presence System:**
- Live user presence indicators
- Real-time cursor tracking
- Active user count display
- User identification (name, avatar)

**Conflict Prevention:**
- Shape locking mechanism to prevent simultaneous edits
- Visual indicators for locked shapes
- Automatic lock release after inactivity
- Conflict resolution for edge cases

**Data Synchronization:**
- Firestore for persistent shape data
- Realtime Database for ephemeral data (presence, cursors, locks)
- < 100ms sync latency for shape updates
- Offline support with sync on reconnect

### Canvas Rendering Requirements

**Konva.js Integration:**
- High-performance 2D canvas rendering
- React integration via react-konva
- Support for complex shapes (polylines, polygons, images)
- Layer-based rendering for organization

**Performance Optimization:**
- Object culling (only render visible objects)
- Viewport optimization (only update visible area)
- Efficient update strategies (batch updates, debounce)
- Memory management for large projects

**Rendering Features:**
- Pan and zoom functionality
- Background image support (construction plans)
- Shape selection and manipulation
- Measurement display overlays
- Layer visibility toggles

### Offline Capability

**Basic Offline Support:**
- Plan annotation works offline
- Local state persistence
- Sync on reconnect
- Conflict resolution for offline changes

**Offline Limitations:**
- Price fetching requires online connection
- AI BOM generation requires online connection
- Real-time collaboration requires online connection

### SEO and Accessibility

**SEO Considerations:**
- SPA with client-side routing (limited SEO)
- Meta tags for social sharing
- Sitemap for project pages (if public)
- Focus on authenticated user experience (SEO not primary concern)

**Accessibility Requirements:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Focus management for modal dialogs
- Color contrast compliance
- Accessible form controls

### Progressive Web App (PWA) Considerations

**Future PWA Support** (Not in MVP):
- Service worker for offline caching
- App manifest for installability
- Push notifications for project updates
- Background sync for price updates

---

## User Experience Principles

CollabCanvas has a user interface focused on the canvas-based annotation workflow. The UX should feel professional yet approachable, emphasizing speed and accuracy.

### Visual Personality

**Design Philosophy:**
- **Professional but Approachable**: Construction contractors need tools that feel serious but aren't intimidating
- **Clean and Uncluttered**: Focus on the canvas - minimize UI chrome that distracts from annotation work
- **Fast and Responsive**: Every interaction should feel instant - contractors are used to fast tools
- **Clear Visual Hierarchy**: Important actions (AI chat for BOM generation, view navigation) should be prominent

**Visual Style:**
- **Color Palette**: Professional blues and grays with accent colors for actions
- **Typography**: Clear, readable fonts optimized for screen reading
- **Spacing**: Generous whitespace to reduce cognitive load
- **Icons**: Simple, recognizable icons for tools and actions

**The Magic Moment in UI:**
When prices populate automatically in the BOM - this should be visually delightful. Consider subtle animations, clear price indicators, and immediate visual feedback that shows the system is working.

### Key Interaction Patterns

**1. Canvas Annotation Flow**
- **Tool Selection**: Clear visual indication of active tool (polyline, polygon, etc.)
- **Drawing Interaction**: Click-to-place points with visual feedback
- **Measurement Display**: Real-time measurement updates as user draws
- **Layer Management**: Easy layer creation, naming, and organization
- **Undo/Redo**: Essential for annotation work - must be fast and reliable

**2. BOM & Critical Path Generation Flow**
- **AI Chat Interface**: No "Generate" button - AI chat handles generation through conversation
- **Context-Aware AI**: AI knows which view it's open in, can perform actions in current view
- **Pre-Flight Guidance**: AI guides user through pre-flight checks with clarifying questions
- **Progress Indicators**: Show when AI is processing, fetching prices
- **Parallel Generation**: Generate both BOM and Critical Path simultaneously
- **Results Display**: Clear BOM table with quantities, prices, totals in Money view
- **Critical Path Display**: CPM graph visualization in Time view
- **View Indicators**: Tabs show indicators when content is generated
- **Edit Capability**: Easy inline editing of generated BOM items
- **Export Action**: Prominent export button with format options

**3. Project Management Flow**
- **Dashboard View**: Clear project cards with status indicators
- **Project Creation**: Simple form with name and description
- **Project Navigation**: Quick access to recent projects
- **Status Updates**: Easy status change with visual confirmation

**4. Cost Optimization Flow** (Phase 4)
- **Optimize Button**: Clear call-to-action to start optimization
- **Progress Display**: Show which suppliers are being queried
- **Results Comparison**: Side-by-side original vs. optimized prices
- **Savings Highlight**: Prominent display of total savings
- **Selective Acceptance**: Easy accept/reject for individual optimizations

### Critical User Flows

**Flow 1: New Project Estimation** (Primary Flow)
1. User logs in → sees home page (project dashboard)
2. Clicks "New Project" → enters project name
3. Enters project → sees four-view navigation (Scope | Time | Space | Money)
4. **Scope View**: Uploads scope of work CSV (2 columns: scope, description)
5. **Space View**: Uploads construction plan → plan appears on canvas
6. **Space View**: Sets scale reference → draws reference line, enters measurement
7. **Space View**: Creates layers → names layers (Walls, Floors, etc.)
8. **Space View**: Annotates plan → draws polylines/polygons on appropriate layers
9. **AI Chat** (any view): User talks to AI: "Generate BOM and Critical Path for this project"
   - AI guides through pre-flight checks
   - AI validates all required information
   - AI asks clarifying questions if needed
10. **Parallel Generation**: System generates both BOM and Critical Path simultaneously
11. **Money View**: Prices populate → sees real-time prices from Home Depot (or manual entry if fetch fails)
12. **Time View**: Reviews Critical Path graph with task dependencies
13. **Money View**: Reviews BOM → sees materials with quantities and prices
14. Exports estimate → downloads PDF

**Flow 2: Cost Optimization** (Phase 4)
1. User has generated BOM with initial prices in Money view
2. System automatically queries multiple suppliers (Home Depot, Lowe's, Amazon, Wayfair, contractor supply stores)
3. Results show optimized prices with savings highlighted
4. User reviews and selectively accepts optimizations
5. BOM updates with optimized prices
6. User exports optimized estimate

**Flow 3: Project Status Tracking**
1. User completes estimate (BOM and Critical Path generated)
2. **Home Page**: Changes project status to "Bid Ready" (manual change)
3. **Home Page**: If bid lost, changes status to "Bid Lost"
4. **Home Page**: As project starts, changes status to "Executing"
5. **Money View**: (Voluntary) Inputs actual costs as materials are purchased
6. System compares estimate vs. actual
7. **Home Page**: At completion, marks project "Completed Profitable" or "Completed Unprofitable"
   - System auto-calculates profit/loss based on actual costs vs. estimate
   - If no cost tracking provided: Status becomes "Completed - Unknown"

### UX Principles That Enhance the Magic

**1. Speed is Everything**
- Every action should feel instant
- Loading states should be minimal and informative
- Optimistic UI updates where possible
- The 30-minute workflow promise requires fast, efficient interactions

**2. Accuracy is Visible**
- Show measurement calculations clearly
- Display price sources and timestamps
- Highlight variance between estimate and actual
- Make accuracy improvements obvious over time

**3. Real Prices Create Trust**
- Show price source links prominently
- Display price fetch timestamps
- Indicate when prices are cached vs. fresh
- Make it clear these are real supplier prices, not estimates

**4. AI Should Feel Natural**
- Chat interface should feel conversational
- Show examples of good prompts
- Provide feedback on what AI understood
- Make it easy to refine and regenerate BOMs

**5. Cost Optimization Should Feel Magical**
- One-click optimization
- Clear visualization of savings
- Easy comparison of suppliers
- Immediate financial impact visible

### Error Handling and Edge Cases

**Graceful Degradation:**
- If price fetch fails, show manual entry option
- If AI generation fails, provide clear error message and retry option
- If canvas performance degrades, warn user and suggest reducing objects
- If offline, clearly indicate offline mode and limitations

**User Guidance:**
- Tooltips for complex features
- Inline help for first-time users
- Clear error messages with actionable next steps
- Progress indicators for long-running operations

**Accessibility:**
- Keyboard shortcuts for power users
- Screen reader announcements for dynamic content
- Focus management for modals and dialogs
- High contrast mode support

---

## Functional Requirements

Functional requirements are organized by capability area, focusing on what the system must do to deliver value to contractors. Each requirement connects to user value and includes acceptance criteria.

### FR-1: Plan Management [MVP]

**FR-1.1: Plan Upload** [MVP]
- **Description**: Users must be able to upload construction plans (PNG, JPG, PDF) to projects
- **User Value**: Foundation for annotation workflow - contractors need to work with their actual plans
- **Acceptance Criteria**:
  - Support PNG, JPG, PDF formats
  - Upload size limit: 50MB per file
  - Plan displays as canvas background image
  - Plan persists across sessions
  - Plan can be deleted reliably (doesn't reappear on reload)
- **Domain Constraints**: None
- **Magic Connection**: Enables the entire annotation workflow - without plans, there's no product

**FR-1.2: Scale Reference** [MVP]
- **Description**: Users must be able to set scale reference for accurate measurements
- **User Value**: Accurate measurements require scale calibration - critical for BOM accuracy
- **Acceptance Criteria**:
  - Draw reference line on plan
  - Enter real-world measurement for reference line
  - Scale applies to all measurements
  - Scale can be deleted reliably (doesn't reappear on reload)
  - Scale persists across sessions
- **Domain Constraints**: Must support common units (feet, inches, meters)
- **Magic Connection**: Scale accuracy directly impacts estimation accuracy - the north star metric

### FR-2: Layer-Based Annotation [MVP]

**FR-2.1: Layer Creation and Management** [MVP]
- **Description**: Users must be able to create named layers and organize annotations
- **User Value**: Organizes complex projects - contractors work with multiple material types
- **Acceptance Criteria**:
  - Create new layers with custom names
  - Rename layers
  - Delete layers (with confirmation)
  - Toggle layer visibility
  - Reorder layers
  - Layer totals display (total length for polylines, total area for polygons)
- **Domain Constraints**: None
- **Magic Connection**: Layer organization enables AI to generate accurate BOMs by material category

**FR-2.2: Polyline Tool (Wall Measurements)** [MVP]
- **Description**: Users must be able to draw polylines to measure wall lengths
- **User Value**: Primary tool for measuring linear materials (drywall, trim, etc.)
- **Acceptance Criteria**:
  - Click-to-place points to create polyline
  - Real-time length calculation displayed
  - Length updates as user draws
  - Polyline assigned to selected layer
  - Polyline can be selected, moved, deleted
  - Total length per layer displayed
- **Domain Constraints**: Must respect scale reference for accurate measurements
- **Magic Connection**: Wall measurements feed directly into BOM generation for linear materials

**FR-2.3: Polygon Tool (Area Measurements)** [MVP]
- **Description**: Users must be able to draw polygons to measure room/floor areas
- **User Value**: Primary tool for measuring area-based materials (flooring, paint, etc.)
- **Acceptance Criteria**:
  - Click-to-place points to create polygon
  - Real-time area calculation displayed
  - Area updates as user draws
  - Polygon assigned to selected layer
  - Polygon can be selected, moved, deleted
  - Total area per layer displayed
- **Domain Constraints**: Must respect scale reference for accurate measurements
- **Magic Connection**: Area measurements feed directly into BOM generation for area-based materials

### FR-3: AI-Powered BOM Generation [MVP]

**FR-3.1: Natural Language BOM Generation** [MVP]
- **Description**: Users must be able to generate material lists using natural language chat
- **User Value**: Makes tool accessible - contractors describe what they need in plain language
- **Acceptance Criteria**:
  - Chat interface accepts natural language input
  - AI analyzes annotations and scope of work
  - Generates material list with quantities
  - Quantities calculated from annotations (lengths, areas)
  - Materials grouped by category
  - BOM can be regenerated with different prompts
  - BOM can be edited manually after generation
- **Domain Constraints**: Must understand construction terminology and materials
- **Magic Connection**: This is the AI-native workflow that makes the tool special - natural language interaction

**FR-3.2: Scope of Work Integration** [MVP]
- **Description**: System must incorporate scope of work documents into BOM generation
- **User Value**: Comprehensive estimates require both measurements and scope details
- **Acceptance Criteria**:
  - Upload scope of work document (text or PDF)
  - AI analyzes scope alongside annotations
  - BOM includes materials from both annotations and scope
  - Scope context influences material selection
- **Domain Constraints**: Must parse common SOW formats
- **Magic Connection**: Combining measurements + scope creates comprehensive estimates

**FR-3.3: Material Category Support** [MVP]
- **Description**: System must support common residential remodeling materials
- **User Value**: Contractors work with standard materials - tool must understand them
- **Acceptance Criteria**:
  - Support drywall, paint, flooring (LVP, carpet, tile)
  - Support cabinets, countertops, fixtures
  - Support plumbing, electrical materials
  - Support insulation, roofing materials
  - Material quantities calculated correctly (linear feet, square feet, counts)
- **Domain Constraints**: Must understand material units and waste factors
- **Magic Connection**: Accurate material recognition enables accurate pricing

### FR-4: Real-Time Price Integration [MVP]

**FR-4.1: Automatic Price Fetching** [MVP]
- **Description**: System must automatically fetch prices when BOM is generated
- **User Value**: Real-time prices eliminate manual price research - core differentiator
- **Acceptance Criteria**:
  - Prices fetched automatically for each BOM item
  - Price fetch success rate: 90%+ for common materials
  - Unit prices displayed per material
  - Total prices calculated (quantity × unit price)
  - Price source links provided for verification
  - Price fetch timestamps displayed
- **Domain Constraints**: Dependent on supplier API availability and reliability
- **Magic Connection**: This is THE "wow" moment - real prices appearing automatically

**FR-4.2: Price Caching** [MVP]
- **Description**: System must cache prices to reduce API calls and improve performance
- **User Value**: Faster BOM generation, reduced API costs
- **Acceptance Criteria**:
  - Prices cached for 24 hours
  - Cache hit reduces fetch time
  - Cache miss triggers fresh fetch
  - Cache invalidation on user request
  - Cache size management
- **Domain Constraints**: Must balance freshness vs. performance
- **Magic Connection**: Caching enables fast, responsive price display

**FR-4.3: Price Error Handling** [MVP]
- **Description**: System must handle price fetch failures gracefully
- **User Value**: Tool remains usable even when APIs fail
- **Acceptance Criteria**:
  - Failed price fetches show "Price unavailable" indicator
  - Manual price entry option provided
  - Retry mechanism for failed fetches
  - Error messages are clear and actionable
  - Partial price success doesn't block workflow
- **Domain Constraints**: Must handle API rate limits, network failures, invalid SKUs
- **Magic Connection**: Graceful degradation maintains user trust when APIs fail

### FR-5: Estimate Display and Export [MVP]

**FR-5.1: BOM Display** [MVP]
- **Description**: System must display complete BOM with quantities, prices, and totals
- **User Value**: Contractors need clear view of estimate breakdown
- **Acceptance Criteria**:
  - BOM table shows: material name, quantity, unit, unit price, total price
  - Materials grouped by category (Walls, Floors, etc.)
  - Grand total displayed
  - BOM can be sorted and filtered
  - BOM can be edited inline
- **Domain Constraints**: None
- **Magic Connection**: Clear display makes accuracy visible and builds trust

**FR-5.2: Estimate Export** [MVP]
- **Description**: System must export estimates as PDF
- **User Value**: Contractors need professional documents for client presentation
- **Acceptance Criteria**:
  - Export as PDF format
  - Include project details (name, date, contractor info)
  - Include complete BOM with prices
  - Professional formatting suitable for client presentation
  - PDF can be downloaded or shared
- **Domain Constraints**: None
- **Magic Connection**: Export enables contractors to use estimates in their workflow

### FR-6: Estimate-to-Actual Tracking [MVP]

**FR-6.1: Actual Cost Input** [MVP]
- **Description**: Users must be able to input actual costs as projects progress
- **User Value**: Enables accuracy validation - core to improving estimates over time
- **Acceptance Criteria**:
  - Input actual cost per material line item
  - Actual costs can be entered incrementally
  - Actual costs persist across sessions
  - Actual costs can be edited
- **Domain Constraints**: None
- **Magic Connection**: Actual cost tracking enables the accuracy validation loop

**FR-6.2: Estimate vs. Actual Comparison** [MVP]
- **Description**: System must compare estimates vs. actual costs and calculate variance
- **User Value**: Shows accuracy and identifies improvement opportunities
- **Acceptance Criteria**:
  - Side-by-side comparison view (estimate vs. actual)
  - Variance percentage calculated per line item
  - Total variance calculated
  - Variance highlighted (over/under estimate)
  - Historical accuracy trends displayed
- **Domain Constraints**: None
- **Magic Connection**: Comparison makes accuracy improvements visible over time

**FR-6.3: Project Status Tracking** [MVP]
- **Description**: Users must be able to track project status through lifecycle
- **User Value**: Organizes workflow and enables accuracy tracking at completion
- **Acceptance Criteria**:
  - Status options: Estimating (default), Bid Ready, Bid Lost, Executing, Completed Profitable, Completed Unprofitable, Completed - Unknown
  - Status can be updated manually at any time on home page (no automatic transitions)
  - Status change triggers accuracy calculation only when marking "Completed Profitable" or "Completed Unprofitable"
  - If no cost tracking provided when completing: Status becomes "Completed - Unknown"
  - Status filters available in project dashboard
- **Domain Constraints**: None
- **Magic Connection**: Status tracking enables completion-based accuracy validation

### FR-7: Project Management System [MVP]

**FR-7.1: Multi-Project Support** [MVP]
- **Description**: Users must be able to create, manage, and access multiple projects
- **User Value**: Contractors work on multiple projects simultaneously - need organization
- **Acceptance Criteria**:
  - Create new projects with name and description
  - List all user's projects in dashboard
  - Open project to access canvas and estimates
  - Delete projects (with confirmation)
  - Projects persist across sessions
- **Domain Constraints**: None
- **Magic Connection**: Multi-project support enables real-world contractor workflow

**FR-7.2: Project Dashboard** [MVP]
- **Description**: Users must have dashboard view of all projects with search and filter
- **User Value**: Quick access to projects and organization
- **Acceptance Criteria**:
  - Project cards show: name, status, last modified date
  - Search projects by name
  - Filter projects by status
  - Sort projects by date, name, status
  - Quick actions: open, delete, duplicate
- **Domain Constraints**: None
- **Magic Connection**: Dashboard makes multi-project workflow efficient

**FR-7.3: Project Sharing** [MVP]
- **Description**: Users must be able to share projects with other users
- **User Value**: Enables team collaboration and client review
- **Acceptance Criteria**:
  - Generate shareable invite links
  - Invite users as Editors (can modify) or Viewers (read-only)
  - Access control: users only see projects they own or are invited to
  - Revoke access
  - Permission changes apply immediately
- **Domain Constraints**: Must respect Firebase security rules
- **Magic Connection**: Sharing enables collaborative estimation workflows

### FR-8: User Authentication and Data Persistence [MVP]

**FR-8.1: Google OAuth Sign-In** [MVP]
- **Description**: Users must be able to sign in with Google account
- **User Value**: Simple, secure authentication without account management
- **Acceptance Criteria**:
  - Google Sign-In button on login page
  - OAuth flow completes successfully
  - User session persists across browser sessions
  - Sign out functionality
  - User profile (name, email, avatar) displayed
- **Domain Constraints**: Must comply with Google OAuth requirements
- **Magic Connection**: Simple authentication removes friction from getting started

**FR-8.2: Data Persistence** [MVP]
- **Description**: All user data must persist across sessions
- **User Value**: Contractors need reliable data storage - can't lose work
- **Acceptance Criteria**:
  - Projects saved to Firebase automatically
  - Annotations saved in real-time
  - Estimates saved when generated
  - Data loads correctly on session start
  - Data syncs across devices for same user
- **Domain Constraints**: Must respect Firebase quotas and limits
- **Magic Connection**: Reliable persistence builds trust and enables real project work

### FR-9: Real-Time Collaboration [MVP]

**FR-9.1: Live Presence** [MVP]
- **Description**: Users must see who else is viewing/editing the project
- **User Value**: Enables team collaboration - know who's working on what
- **Acceptance Criteria**:
  - Active user count displayed
  - User avatars/names shown
  - Presence updates in real-time (< 1 second latency)
  - Presence clears when user leaves
- **Domain Constraints**: Must handle presence cleanup on disconnect
- **Magic Connection**: Presence enables collaborative estimation workflows

**FR-9.2: Cursor Tracking** [MVP]
- **Description**: Users must see other users' cursors in real-time
- **User Value**: Visual feedback for collaboration
- **Acceptance Criteria**:
  - Cursor position updates in real-time (< 50ms latency)
  - Cursor shows user name/avatar
  - Cursor clears when user stops moving
  - Multiple cursors supported simultaneously
- **Domain Constraints**: Must optimize for low latency
- **Magic Connection**: Cursor tracking makes collaboration feel natural

**FR-9.3: Shape Locking** [MVP]
- **Description**: System must prevent simultaneous edits to same shape
- **User Value**: Prevents conflicts and data loss
- **Acceptance Criteria**:
  - Shape locks when user selects it
  - Locked shape shows visual indicator
  - Other users cannot edit locked shape
  - Lock releases automatically after inactivity (30 seconds)
  - Lock releases when user deselects shape
- **Domain Constraints**: Must handle edge cases (user disconnect, browser crash)
- **Magic Connection**: Conflict prevention enables smooth collaboration

---

## Non-Functional Requirements

Non-functional requirements focus on how the system performs, not what it does. Only requirements that matter for THIS product are included.

### NFR-1: Performance Requirements

**NFR-1.1: Canvas Rendering Performance**
- **Why It Matters**: Canvas performance directly impacts user experience - contractors need smooth, responsive annotation
- **Requirement**: Maintain 60 FPS canvas rendering with 100+ objects across all browsers (Chrome, Firefox, Safari, Edge)
- **Measurement**: FPS monitoring during annotation with 100+ objects
- **Current Issue**: Firefox performance degrades as objects increase - critical fix needed
- **Domain-Driven**: Construction projects can have many annotations - performance must scale

**NFR-1.2: Shape Sync Latency**
- **Why It Matters**: Real-time collaboration requires fast sync for natural feel
- **Requirement**: < 100ms latency for shape updates across users
- **Measurement**: Time from shape change to visibility on other users' screens
- **Domain-Driven**: Collaborative workflows require low latency

**NFR-1.3: Cursor Update Latency**
- **Why It Matters**: Cursor tracking must feel instant for natural collaboration
- **Requirement**: < 50ms latency for cursor position updates
- **Measurement**: Time from cursor move to visibility on other users' screens
- **Domain-Driven**: Presence features require ultra-low latency

**NFR-1.4: BOM Generation Performance**
- **Why It Matters**: Contractors expect fast results - part of time savings promise
- **Requirement**: < 30 seconds for typical project BOM generation
- **Measurement**: Time from AI prompt to complete BOM display
- **Domain-Driven**: Time savings is core value proposition

**NFR-1.5: Price Fetch Performance**
- **Why It Matters**: Price fetching shouldn't block workflow
- **Requirement**: < 5 seconds per material (with caching)
- **Measurement**: Time from BOM generation to all prices displayed
- **Domain-Driven**: Multiple API calls require optimization

### NFR-2: Security Requirements

**NFR-2.1: User Authentication Security**
- **Why It Matters**: User data and projects must be protected
- **Requirement**: Secure Google OAuth implementation with proper token handling
- **Measurement**: Security audit, penetration testing
- **Domain-Driven**: Construction estimates contain sensitive business data

**NFR-2.2: Data Access Control**
- **Why It Matters**: Users must only access their own projects or projects they're invited to
- **Requirement**: Firebase security rules enforce project-level access control
- **Measurement**: Security rules testing, access control verification
- **Domain-Driven**: Multi-user collaboration requires strict access control

**NFR-2.3: API Key Security**
- **Why It Matters**: Supplier API keys must be protected
- **Requirement**: API keys stored securely in Firebase Functions (not exposed to client)
- **Measurement**: Code review, security audit
- **Domain-Driven**: External API integrations require secure key management

### NFR-3: Scalability Requirements

**NFR-3.1: User Scalability**
- **Why It Matters**: Platform must support growth to 100+ active contractors
- **Requirement**: Support 100+ concurrent users without performance degradation
- **Measurement**: Load testing with simulated users
- **Domain-Driven**: Business growth target requires scalability

**NFR-3.2: Project Scalability**
- **Why It Matters**: Contractors may have many projects - system must handle large datasets
- **Requirement**: Support 1000+ projects per user without performance issues
- **Measurement**: Database query performance testing
- **Domain-Driven**: Real-world usage patterns require project scalability

**NFR-3.3: Canvas Object Scalability**
- **Why It Matters**: Large projects may have many annotations
- **Requirement**: Handle 200+ canvas objects per project without performance degradation
- **Measurement**: Performance testing with large object counts
- **Domain-Driven**: Complex projects require many annotations

### NFR-4: Reliability Requirements

**NFR-4.1: Price Integration Reliability**
- **Why It Matters**: Core value proposition requires reliable pricing
- **Requirement**: 90%+ success rate for price fetching (with graceful degradation)
- **Measurement**: Monitor price fetch success rate, track failures
- **Domain-Driven**: Price integration is primary differentiator

**NFR-4.2: Data Persistence Reliability**
- **Why It Matters**: Contractors can't lose work - data loss is unacceptable
- **Requirement**: 99.9% data persistence reliability (Firebase SLA)
- **Measurement**: Monitor Firebase service health, track data loss incidents
- **Domain-Driven**: Business-critical data requires high reliability

**NFR-4.3: Offline Capability**
- **Why It Matters**: Contractors may work in areas with poor connectivity
- **Requirement**: Basic offline support for annotation (with sync on reconnect)
- **Measurement**: Offline testing, sync verification
- **Domain-Driven**: Field work may have connectivity issues

### NFR-5: Accessibility Requirements

**NFR-5.1: WCAG Compliance**
- **Why It Matters**: Broad contractor audience includes users with disabilities
- **Requirement**: WCAG 2.1 Level AA compliance
- **Measurement**: Accessibility audit, screen reader testing
- **Domain-Driven**: Inclusive design expands addressable market

**NFR-5.2: Keyboard Navigation**
- **Why It Matters**: Power users and accessibility require keyboard support
- **Requirement**: All features accessible via keyboard navigation
- **Measurement**: Keyboard navigation testing
- **Domain-Driven**: Professional tools require keyboard shortcuts

**NFR-5.3: Screen Reader Support**
- **Why It Matters**: Visual impairments require screen reader compatibility
- **Requirement**: Screen reader announcements for dynamic content, proper ARIA labels
- **Measurement**: Screen reader testing (NVDA, JAWS, VoiceOver)
- **Domain-Driven**: Accessibility compliance requires screen reader support

### NFR-6: Browser Compatibility Requirements

**NFR-6.1: Cross-Browser Consistency**
- **Why It Matters**: Contractors use different browsers - must work consistently
- **Requirement**: Identical functionality and performance across Chrome, Firefox, Safari, Edge
- **Measurement**: Cross-browser testing, performance comparison
- **Domain-Driven**: Browser diversity requires consistent experience

**NFR-6.2: Firefox Performance Fix**
- **Why It Matters**: Current Firefox performance issues block production launch
- **Requirement**: Firefox performance matches Chrome performance (60 FPS with 100+ objects)
- **Measurement**: Firefox-specific performance testing
- **Domain-Driven**: Critical bug fix required for MVP launch

---

## Implementation Planning

### Epic Breakdown Required

The functional and non-functional requirements documented above must be decomposed into implementable epics and bite-sized stories. This breakdown enables:

1. **Development Planning**: Stories sized appropriately for sprint planning (200k context limit consideration)
2. **Priority Sequencing**: Critical bug fixes and MVP features prioritized first
3. **Dependency Management**: Understanding which features depend on others
4. **Progress Tracking**: Clear milestones for MVP launch

**Next Step:** Run `workflow create-epics-and-stories` to create the implementation breakdown from this PRD.

### Project Track

**BMad Method Track** - This PRD follows the comprehensive planning approach suitable for Level 2-4 projects requiring detailed requirements documentation before implementation.

---

## PRD Summary

### Vision Alignment

CollabCanvas transforms construction estimation from a 4-8 hour manual process into a 30-minute automated workflow. The platform's north star is **estimation accuracy** - enabling contractors to generate accurate, competitive bids that win projects without sacrificing profit margins.

### What Makes This Special

**The Magic of CollabCanvas:**

1. **Real-Time Supplier Pricing Integration**: Actual prices from major suppliers appear automatically - the "wow" moment when contractors see real prices instead of spending hours researching manually.

2. **Multi-Supplier Cost Optimization** (Phase 4): Automatic optimization compares prices across suppliers and saves 5-15% on material costs automatically.

3. **AI-Native Workflow**: Natural language interaction makes the tool accessible - contractors describe what they need in plain language and get accurate results.

4. **Accuracy-First Design**: Built-in validation loop ensures estimates improve over time through estimate vs. actual tracking.

5. **Construction Project Bidding Engine** (Phase 3): Comprehensive bidding system that adds labor hours calculation and bid customization to MVP's CPM - not just material estimates.

### Project Classification

- **Technical Type**: Web Application (Single-Page Application)
- **Domain**: Construction/Remodeling (General Complexity)
- **Complexity**: Medium

### Success Criteria

**Primary Metrics:**
- Estimation accuracy: ±5% of actual costs
- Time savings: 75% reduction (4-8 hours → 1-2 hours)
- Cost optimization: 5-15% material cost savings
- User adoption: 100 active contractors within 6 months

### Scope Summary

**MVP (Must-Have for Production Launch):**
- Critical bug fixes (plan deletion, scale deletion, Home Depot pricing, AI shape creation, Firefox performance)
- Four-view navigation (Scope | Time | Space | Money)
- Scope view with CSV upload (2 columns: scope, description)
- Core workflow (plan upload, annotation, BOM & Critical Path generation via AI chat, price integration, export)
- Full CPM generation with calculations (simple calcs)
- Project management system (multi-project support, home page dashboard, sharing, status tracking)
- Estimate-to-actual tracking (voluntary)

**Growth Features (Post-MVP):**
- Phase 2: Counter tool, multi-floor support
- Phase 3: Construction Project Bidding Engine (labor hours, bid customization - builds on MVP CPM)
- Phase 4: Multi-supplier cost optimization, additional supplier integrations
- Phase 4.5: Multi-scenario support (save project states as scenarios)

**Vision Features (Future):**
- Phase 5: Machine Learning Enhancement & Historical Project Database
- Phase 6: AI-powered annotation automation
- Phase 7: Market expansion (commercial construction, specialty trades)

### Requirements Summary

**Functional Requirements**: 9 capability areas, 25+ detailed requirements
- Plan Management (FR-1)
- Layer-Based Annotation (FR-2)
- AI-Powered BOM Generation (FR-3)
- Real-Time Price Integration (FR-4)
- Estimate Display and Export (FR-5)
- Estimate-to-Actual Tracking (FR-6)
- Project Management System (FR-7)
- User Authentication and Data Persistence (FR-8)
- Real-Time Collaboration (FR-9)

**Non-Functional Requirements**: 6 categories, 15+ specific requirements
- Performance (canvas rendering, sync latency, BOM generation, price fetching)
- Security (authentication, access control, API key security)
- Scalability (users, projects, canvas objects)
- Reliability (price integration, data persistence, offline capability)
- Accessibility (WCAG compliance, keyboard navigation, screen reader support)
- Browser Compatibility (cross-browser consistency, Firefox performance fix)

### Key Differentiators

1. **Real-Time Supplier Pricing**: Not theoretical estimates - actual prices from major suppliers
2. **Multi-Supplier Cost Optimization**: Automatic price comparison and optimization
3. **AI-Native Workflow**: Natural language interaction for accessibility
4. **Accuracy-First Design**: Built-in validation loop for continuous improvement
5. **Residential Remodeling Focus**: Specialized for this market segment

### Critical Success Factors

1. **Bug Fixes Complete**: All critical bugs must be fixed before MVP launch
2. **Price Integration Reliability**: 90%+ success rate for price fetching
3. **Performance Consistency**: 60 FPS canvas rendering across all browsers
4. **User Testing Validation**: 5+ contractors test workflow end-to-end
5. **Project Management Infrastructure**: Multi-project support enables real-world workflow

---

## References

- **Product Brief**: docs/product-brief-collabcanvas-2025-01-27.md
- **Architecture Documentation**: docs/architecture.md
- **Technology Stack**: docs/technology-stack.md
- **API Contracts**: docs/api-contracts.md

---

## Next Steps

1. **Epic & Story Breakdown** (Required)
   - Run: `workflow create-epics-and-stories` to decompose requirements into implementable stories
   - Break down functional requirements into epics and user stories
   - Prioritize critical bug fixes and MVP features
   - Identify dependencies between features

2. **UX Design** (If UI exists - Yes, this project has UI)
   - Run: `workflow create-ux-design` for detailed user experience design
   - Design canvas annotation interface
   - Design BOM generation and display interface
   - Design project dashboard and management interface

3. **Architecture** (Recommended)
   - Run: `workflow create-architecture` for technical architecture decisions
   - Design Firebase data structure for projects, annotations, estimates
   - Design API integration architecture for supplier pricing
   - Design performance optimization strategy for canvas rendering

4. **Technical Specification** (For Level 0-1 projects - Not applicable here)
   - This project uses PRD workflow (Level 2-4), not tech-spec workflow

---

**The magic of CollabCanvas** - transforming estimation from a 4-8 hour manual process into a 30-minute automated workflow with real-time pricing and AI-powered BOM generation - is woven throughout this PRD and will guide all subsequent work.

**Created through collaborative discovery between xvanov and AI facilitator.**

**Date**: 2025-01-27
**Version**: 1.0

