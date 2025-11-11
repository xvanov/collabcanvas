# Product Brief: CollabCanvas - Construction Takeoff & Estimation Platform

**Date:** 2025-01-27
**Author:** xvanov
**Context:** Business Venture - Production-Ready Enhancement

---

## Executive Summary

CollabCanvas is evolving from an MVP construction plan annotation tool into a comprehensive construction takeoff and estimation platform. The core vision is to enable residential remodeling contractors to generate accurate, real-time material estimates (BOMs) and pricing directly from construction plans and scope of work documents. The platform's north star is **estimation accuracy** - critical for project profitability and competitive bidding. The current MVP enables plan upload, layer-based annotation, and AI-powered BOM generation, but requires critical fixes and enhancements to become production-ready.

---

## Core Vision

### Problem Statement

Residential remodeling contractors face significant challenges in generating accurate material estimates:

1. **Manual Takeoff Process**: Contractors currently measure plans manually, calculate material quantities by hand, and spend hours researching prices across multiple suppliers. This process is error-prone, time-consuming, and doesn't scale.

2. **Estimation Accuracy Crisis**: Inaccurate estimates directly impact business outcomes:
   - **Under-estimation** → Projects become unprofitable, eating into margins
   - **Over-estimation** → Lost bids, inability to compete effectively
   - **No Validation Loop** → No systematic way to compare estimates vs. actual costs to improve accuracy over time

3. **Price Discovery Friction**: Real-time pricing from major suppliers (Home Depot, Lowe's, Amazon, Wayfair) requires manual lookup, multiple browser tabs, and doesn't integrate with the estimation workflow. Comparing prices across suppliers to find the best deal is extremely time-consuming. Prices change frequently, making cached estimates stale quickly.

4. **Scope-to-Estimate Gap**: Contractors receive scope of work documents (like the provided SOW example) and construction plans separately. There's no unified system that combines these inputs to generate comprehensive estimates automatically.

5. **Current MVP Limitations**: 
   - Critical bugs prevent reliable deletion of plans and scale measurements
   - Home Depot price integration exists but doesn't work reliably
   - **AI shape creation broken**: Commands like "add a red circle" return errors instead of creating shapes, preventing testing with many objects
   - **Performance degradation**: Canvas performance drops significantly as more objects are added, especially on Firefox. Chrome performs well, but cross-browser performance consistency is critical for production use.
   - **Single canvas limitation**: Currently only supports a single canvas/board per user. Need proper multi-project app structure with project dashboard, creation, deletion, status tracking, and sharing.
   - No workflow for tracking actual costs vs. estimates
   - No validation mechanism to improve accuracy over time

### Problem Impact

**For Individual Contractors:**
- **Time Cost**: 4-8 hours per project spent on manual takeoff and pricing research (including 1-2 hours comparing prices across suppliers)
- **Financial Risk**: 10-20% estimation error rate leads to either lost profits or lost bids
- **Missed Savings**: Without systematic price comparison, contractors often miss opportunities to save 5-15% on material costs
- **Competitive Disadvantage**: Slower bid turnaround time vs. competitors with better tools

**For the Industry:**
- Residential remodeling is a $450B+ market in the US
- Small to medium contractors (target market) lack enterprise-grade estimation tools
- Existing solutions are either too expensive, too complex, or don't integrate pricing

### Why Existing Solutions Fall Short

1. **Enterprise Software** (Procore, PlanGrid): Designed for large commercial projects, too expensive ($200-500/user/month), overkill for residential remodeling
2. **Manual Tools** (Excel, paper plans): No automation, no real-time pricing, error-prone
3. **Generic Estimation Software**: Not construction-specific, don't understand construction plans or materials
4. **AI Tools**: Don't integrate with actual supplier pricing APIs, generate theoretical estimates without real-world validation

### Proposed Solution

**CollabCanvas - Construction Takeoff & Estimation Platform**

A specialized web application that combines:
- **Plan Upload & Annotation**: Upload construction plans (PNG/JPG), set scale, measure walls/floors/rooms with layer-based organization
- **AI-Powered BOM Generation**: Natural language chat interface to generate material lists from annotations
- **Real-Time Price Integration**: Automatic price fetching from Home Depot, Lowe's, and other suppliers
- **Estimate-to-Actual Tracking**: Input actual costs and time as projects progress, compare against estimates
- **Accuracy Validation Loop**: Learn from completed projects to improve future estimates

**Core Workflow:**
1. Contractor logs in and sees home page (project dashboard) with all projects
2. Creates a new project (or selects existing project from dashboard)
3. Enters project → sees four-view navigation: **Scope | Time | Space | Money**
4. **Scope View**: Uploads scope of work CSV (2 columns: scope, description) - first step
5. **Space View**: Uploads construction plan (PNG/JPG/PDF) and sets scale reference
6. **Space View**: Creates layers and annotates walls, floors, rooms using layer-based tools
7. **AI Chat** (available in all views): Contractor talks to AI: "Generate BOM and Critical Path for this project"
   - AI guides through pre-flight checks with clarifying questions
   - AI validates all required information (scale, layers, annotations)
   - AI asks for material choices when unclear
   - AI refuses to generate if information incomplete
8. **Parallel Generation**: System generates both BOM and Critical Path simultaneously
   - BOM with materials and quantities
   - Critical Path (CPM) with task dependencies and durations
9. **Money View**: System automatically fetches real-time prices from Home Depot (90%+ success rate)
   - Shows "Price unavailable" with manual entry option if fetch fails
   - Blocks BOM completion until all prices are entered (fetched or manual)
10. **Time View**: Displays Critical Path graph visualization
11. **Money View**: Displays BOM with exact Home Depot prices, quantities, totals
12. **Phase 3: Bidding Engine** (when available):
    - Adds labor hours calculation to existing CPM
    - Adds bid customization (crew size, pay rates, margins)
    - Calculates total project cost (materials + labor + overhead + profit)
    - Generates professional bid document
13. **Phase 4: Cost Optimization** (when available): After initial estimate, automatically compare prices across multiple suppliers (Home Depot, Lowe's, Amazon, Wayfair, contractor supply stores) and optimize material costs
14. Updates project status on home page (Estimating → Bid Ready → Bid Lost → Executing → Completed Profitable/Unprofitable/Unknown)
15. As project progresses (voluntary), contractor inputs actual costs in Money view
16. System compares estimate vs. actual, identifies accuracy gaps
17. When marking "Completed Profitable" or "Completed Unprofitable", system auto-calculates profit/loss based on actual costs vs. estimate

### Key Differentiators

1. **Real-Time Supplier Pricing**: Not theoretical estimates - actual prices from major suppliers integrated directly into the workflow
2. **Multi-Supplier Cost Optimization** (Phase 4): After generating an initial estimate, automatically compare prices across multiple suppliers (Home Depot, Lowe's, Amazon, Wayfair, contractor supply stores) and optimize material costs by selecting the best price for each item
3. **Construction Project Bidding Engine** (Phase 3): Comprehensive bidding system that adds labor hours calculation and bid customization to MVP's CPM - not just material estimates. Contractors can customize crew size, pay rates, and margins to generate accurate, competitive bids.
4. **AI-Native Workflow**: Natural language interaction makes the tool accessible to contractors who aren't tech-savvy - no "Generate" button, AI chat handles everything through conversation
5. **Accuracy-First Design**: Built-in validation loop ensures estimates improve over time, not just generate numbers
6. **Residential Remodeling Focus**: Specialized for this market segment, not trying to be everything to everyone
7. **Cost-Effective**: Designed for small-medium contractors, not enterprise pricing

---

## Target Users

### Primary Users

**Residential Remodeling Contractors** (Solo operators to teams of 5-20)

**Profile:**
- Own or work for small to medium residential remodeling companies
- Handle 5-50 projects per year
- Projects range from $10K bathroom remodels to $200K whole-home renovations
- Currently use manual methods (paper plans, Excel, calculator) or basic software

**Current Workflow Pain Points:**
- Spend 4-8 hours per project on manual takeoff
- Research prices across multiple suppliers manually
- No systematic way to track estimate accuracy
- Lose bids due to slow turnaround or inaccurate pricing
- Lose profits due to underestimation errors

**What They Value Most:**
- **Accuracy**: Estimates that win bids without losing profits
- **Cost Optimization**: Ability to find the best prices across suppliers automatically, maximizing profit margins
- **Real Prices**: Actual supplier pricing, not theoretical costs
- **Simplicity**: Tools that don't require extensive training
- **Validation**: Ability to learn from past projects
- **Speed**: Generate estimates in minutes, not hours

**Technical Comfort Level:**
- Moderate - comfortable with smartphones, basic software
- Not developers or power users
- Prefer simple, intuitive interfaces over feature-rich complexity

### Secondary Users

**Project Managers / Estimators** (Larger remodeling companies)
- Dedicated role for estimation
- Need to generate multiple estimates quickly
- Require detailed breakdowns for client presentations
- May need to compare estimates across different suppliers

### User Journey

**Scenario: Kitchen Remodel Estimate**

1. **Input Phase** (5 minutes)
   - Contractor receives kitchen remodel plans from architect
   - Logs in → sees home page with project dashboard
   - Creates new project → enters four-view navigation (Scope | Time | Space | Money)
   - **Scope View**: Uploads scope of work CSV (2 columns: scope, description)
   - **Space View**: Uploads plan PDF/image to CollabCanvas

2. **Setup Phase** (2 minutes)
   - **Space View**: Sets scale reference: "This line represents 10 feet"
   - **Space View**: Creates layers: "Walls", "Flooring", "Cabinets", "Countertops"

3. **Annotation Phase** (10-15 minutes)
   - **Space View**: Draws wall polylines on "Walls" layer
   - **Space View**: Draws room polygons on "Flooring" layer
   - **Space View**: Measures cabinet areas on "Cabinets" layer

4. **BOM & Critical Path Generation Phase** (2-3 minutes)
   - **AI Chat** (available in any view): Contractor talks to AI: "Generate BOM and Critical Path for this kitchen remodel"
   - AI guides through pre-flight checks: "I see you have scale, layers, and annotations. Ready to generate!"
   - AI asks clarifying questions if material choices unclear: "For flooring, do you want LVP, tile, or carpet?"
   - AI validates all required information before generating
   - **Parallel Generation**: System generates both BOM and Critical Path simultaneously
   - Money and Time tabs show indicators that content is ready

5. **Initial Pricing Phase** (Automatic, 30 seconds)
   - **Money View**: System automatically fetches prices from Home Depot for each material
   - Shows "Price unavailable" with manual entry option if fetch fails
   - Blocks BOM completion until all prices are entered (fetched or manual)
   - Updates BOM with unit prices and totals
   - Shows price source links for verification

6. **Review Results Phase** (2 minutes)
   - **Money View**: Contractor reviews BOM with exact Home Depot prices
   - **Time View**: Contractor reviews Critical Path graph with task dependencies
   - Can modify BOM easily (single BOM for MVP, changes reflect immediately)
   - Exports estimate PDF for client presentation

7. **Bidding Engine Phase** (Phase 3, when available, 5-10 minutes)
   - **Time View**: Enhanced CPM with labor hours calculation
   - Contractor adjusts bid parameters:
     - Crew size per task/phase
     - Crew pay rates (hourly rates for different roles)
     - Company overhead and profit margin percentages
   - System recalculates bid in real-time as parameters change
   - Calculates total project cost: materials + labor + overhead + profit
   - Generates professional bid document with cost breakdown, schedule, and timeline

8. **Cost Optimization Phase** (Phase 4, when available, 1-2 minutes)
   - **Money View**: System automatically queries multiple suppliers: Home Depot, Lowe's, Amazon, Wayfair, contractor supply stores (via APIs)
   - For each material, system finds the best price across all suppliers
   - Updates BOM with optimized prices, showing:
     - Original price and supplier
     - Optimized price and supplier
     - Savings per line item
     - Total project savings
   - Contractor can review and accept/reject individual optimizations
   - Example: "Drywall 4x8 sheet: Home Depot $12.50 → Lowe's $11.99 (save $0.51 per sheet)"

9. **Project Tracking Phase** (Ongoing, voluntary)
   - **Home Page**: Contractor updates project status manually (Estimating → Bid Ready → Executing → Completed)
   - **Money View**: As project progresses (voluntary), contractor inputs actual costs
   - System tracks estimate vs. actual variance
   - When marking "Completed Profitable" or "Completed Unprofitable", system auto-calculates profit/loss
   - If no cost tracking provided, status becomes "Completed - Unknown"
   - At project completion, accuracy metrics are recorded

**Total Time: ~27 minutes** (vs. 4-8 hours manually)
**With Bidding Engine (Phase 3): ~35-40 minutes** (vs. 8-12 hours manually including labor estimation and scheduling)
**With Cost Optimization (Phase 4): ~37-42 minutes** (vs. 6-10 hours manually including price comparison)

---

## Success Metrics

### Business Objectives

1. **User Adoption**
   - **Target**: 100 active contractors using the platform within 6 months
   - **Measurement**: Monthly active users (MAU) with at least 1 estimate generated

2. **Estimation Accuracy**
   - **Target**: Average estimate accuracy within ±5% of actual costs
   - **Measurement**: Compare estimates vs. actual costs for completed projects
   - **Timeline**: Measure after 50+ completed projects with actual cost data

3. **Time Savings**
   - **Target**: Reduce estimation time by 75% (from 4-8 hours to 1-2 hours)
   - **Measurement**: User-reported time per estimate (before/after survey)

4. **Revenue Impact for Users**
   - **Target**: Users report increased bid win rate or improved profit margins
   - **Measurement**: User survey after 3 months of use

### Key Performance Indicators

1. **Estimate Generation Rate**
   - **Definition**: Number of estimates generated per active user per month
   - **Target**: 5+ estimates per user per month
   - **Rationale**: Indicates tool is being used for real projects, not just testing

2. **Price Integration Success Rate**
   - **Definition**: Percentage of BOM items with successfully fetched prices
   - **Target**: 90%+ success rate
   - **Rationale**: Core value proposition requires reliable pricing

3. **Estimate Accuracy Variance**
   - **Definition**: Standard deviation of (estimate - actual) / actual × 100%
   - **Target**: < 5% standard deviation
   - **Rationale**: Consistency is as important as average accuracy

4. **User Retention**
   - **Definition**: Percentage of users who generate estimates in month N+1 after first use
   - **Target**: 60%+ retention rate
   - **Rationale**: Indicates users find ongoing value

5. **AI Chat Success Rate**
   - **Definition**: Percentage of AI chat interactions that generate usable BOMs without major revisions
   - **Target**: 80%+ success rate
   - **Rationale**: AI workflow must be reliable for adoption

---

## MVP Scope

### Core Features (Must-Have for Production Launch)

1. **Plan Management**
   - Upload construction plans (PNG, JPG, PDF)
   - Set scale reference with real-world measurements
   - **FIX**: Reliable deletion of plans and scale (currently buggy)
   - Store plans persistently in Firebase Storage

2. **Layer-Based Annotation**
   - Create named layers (Walls, Floors, Roofing, etc.)
   - Draw polylines for wall measurements
   - Draw polygons for area measurements (rooms, floors)
   - View layer totals (total wall length, total area per layer)
   - Organize annotations by project section
   - **Note**: Counter tool and multi-floor support planned for Phase 2.5

3. **Four-View Navigation Structure**
   - Top navigation bar with four tabs: **Scope | Time | Space | Money**
   - **Scope View**: Scope of work CSV upload and display (2 columns: scope, description)
   - **Space View**: Canvas/annotation (existing functionality - preserve)
   - **Money View**: Estimates/BOM with exact Home Depot prices
   - **Time View**: Critical Path visualization (full CPM with calculations in MVP)
   - Real-time collaboration across views (like Google Sheets tabs)
   - View indicators show when content is generated

4. **AI-Powered BOM & Critical Path Generation**
   - **No "Generate" button** - AI chat handles generation through conversation
   - AI chat available in all views (Scope, Time, Space, Money)
   - Context-aware: AI knows which view it's open in
   - User talks to AI: "Generate BOM and Critical Path for this project"
   - AI guides user through pre-flight checks with clarifying questions
   - AI validates all required information before generating
   - AI refuses to generate if information incomplete
   - Generate material lists from annotations
   - Generate Critical Path (CPM) with task dependencies and durations
   - Understand scope of work context
   - **FIX**: AI shape creation commands (e.g., "add a red circle") currently return errors - must be fixed to enable testing and bulk object creation
   - Support common residential remodeling materials:
     - Drywall, paint, flooring (LVP, carpet, tile)
     - Cabinets, countertops, fixtures
     - Plumbing, electrical materials
     - Insulation, roofing materials

5. **Real-Time Price Integration** ⚠️ **CRITICAL FIX NEEDED**
   - **FIX**: Make Home Depot price integration actually work (90%+ success rate)
   - Fetch prices automatically when BOM is generated
   - Display unit prices, total prices per line item
   - Show price source links for verification
   - Cache prices to reduce API calls
   - **Price fetch failure handling**: Show "Price unavailable" with manual entry option
   - **BOM generation blocking**: Block BOM completion until all prices are completed (either fetched or manually entered)

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
   - Google OAuth sign-in (already working)
   - Save projects, estimates, annotations to Firebase
   - Multi-user collaboration (already working)

8. **Project Management System** ⚠️ **CRITICAL - IMMEDIATE PRIORITY AFTER BUG FIXES**
   - **Multi-Project Support**: Users can create, manage, and access multiple projects
   - **Project Dashboard**: List view of all user's projects with search and filter capabilities
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
   - **Project Sharing**: 
     - Generate shareable invite links
     - Invite users as Editors (can modify) or Viewers (read-only)
     - Access control: users only see projects they own or are invited to
   - **Project Organization**: Search, filter, and organize projects by status, date, name

9. **Performance Optimization** ⚠️ **CRITICAL FIX NEEDED**
   - **FIX**: Canvas performance degrades as more objects are added, especially on Firefox
   - Ensure consistent 60 FPS performance across all browsers (Chrome, Firefox, Safari, Edge)
   - Optimize rendering pipeline to handle 100+ objects without performance degradation
   - Implement object culling, viewport optimization, and efficient update strategies
   - Cross-browser performance testing and optimization

### Out of Scope for MVP

1. **Multi-Supplier Cost Optimization**: Start with Home Depot only; multi-supplier price comparison and cost optimization in Phase 4
2. **Counter Tool**: Manual counting only for MVP; counter tool annotation in Phase 2
3. **Multi-Floor Projects**: Single floor per project for MVP; multi-floor support in Phase 2
4. **Bidding Engine Labor & Customization**: MVP includes full CPM generation; labor hours calculation and bid customization (crew size, pay rates, margins) in Phase 3
5. **ML-Based Accuracy Enhancement**: Basic tracking only; machine learning enhancements and historical project database in Phase 5 (6 historical projects available but require manual ingestion)
6. **AI Annotation Assistant**: Manual annotation only for MVP; AI-powered automatic annotation in Phase 6
7. **Advanced Reporting**: Basic variance tracking only, detailed analytics later
8. **Mobile App**: Web-only for MVP, mobile responsive design
9. **Client Portal**: No client-facing features in MVP
10. **Invoice Generation**: Estimate only, not invoicing
11. **Material Availability Checking**: Price only, not stock availability
12. **Integration with Accounting Software**: Manual export only

### MVP Success Criteria

1. **Bug Fixes Complete**
   - ✅ Plan deletion works reliably (doesn't reappear on reload)
   - ✅ Scale deletion works reliably (doesn't reappear on reload)
   - ✅ Home Depot price integration works for 90%+ of common materials
   - ✅ AI shape creation commands work correctly (e.g., "add a red circle" creates shapes instead of returning errors)
   - ✅ Canvas performance maintains 60 FPS with 100+ objects on all major browsers (Chrome, Firefox, Safari, Edge)

2. **Core Workflow Functional**
   - ✅ User can upload plan, set scale, annotate, generate BOM, get prices in < 30 minutes
   - ✅ BOM includes accurate quantities based on annotations
   - ✅ Prices are real-time from Home Depot API
   - ✅ Project management system allows users to create, manage, and share multiple projects
   - ✅ Project status tracking works correctly (Estimating → Bid Ready → Executing → Completed Profitable/Unprofitable/Unknown)

3. **Estimate Accuracy Baseline**
   - ✅ System can generate estimates for sample projects
   - ✅ Estimates are within reasonable range (±15% for MVP, target ±5% post-MVP)

4. **User Testing**
   - ✅ 5+ contractors test the workflow end-to-end
   - ✅ 80%+ report the tool saves them significant time
   - ✅ No critical bugs or workflow blockers

### Future Vision Features

**Phase 2: Advanced Annotation Tools & Multi-Floor Support**
- **Counter Tool**: New annotation tool (dot marker) for counting instances of items
  - Click to place counter dots (e.g., sinks, toilets, outlets, fixtures)
  - Automatic counting and display of totals per layer
  - Useful for fixture counts, electrical outlets, plumbing fixtures
- **Multi-Floor Projects**: Support for multiple floor plans per project
  - Add multiple floor plans to a single project
  - Switch between floors while maintaining separate annotations per floor
  - Aggregate BOMs across all floors for complete project estimate
  - Floor-specific layers and measurements

**Phase 4: Multi-Supplier Cost Optimization & Advanced Features**
- **Multi-Supplier Cost Optimization**: After initial estimate generation, automatically compare prices across multiple suppliers (Home Depot, Lowe's, Amazon, Wayfair, contractor supply stores) and optimize material costs
  - Query all supplier APIs simultaneously
  - Find best price for each material automatically
  - Show savings breakdown per line item and total project
  - Allow contractor to review and selectively accept optimizations
  - Support supplier preferences (e.g., "prefer local suppliers for delivery")
- Lowe's, Menards, Amazon, Wayfair, contractor supply store integrations
- Price comparison dashboard showing all suppliers side-by-side
- Material availability checking across suppliers
- Automatic re-pricing when prices change
- Supplier preference settings (favorite suppliers, delivery options)

**Phase 3: Construction Project Bidding Engine**
- **Comprehensive Bidding System**: Full-featured engine that transforms measurements and scope of work into complete, accurate bids
  - **Input Processing**: Takes measurements (from annotations) and scope of work document as inputs
  - **BOM Calculation**: Automatically calculates complete Bill of Materials with quantities and pricing
  - **Labor Hours Calculation**: Estimates labor hours required for each task based on:
    - Historical project data (6 projects available for training, require manual ingestion)
    - Industry standard labor rates
    - Task complexity and scope
    - Material installation requirements
  - **Critical Path Chart**: Creates project schedule with critical path analysis
    - Identifies task dependencies
    - Calculates project duration
    - Highlights critical path tasks that could delay project
    - Visual timeline/Gantt chart representation
  - **Cost Estimation**: Calculates total project cost only after all calculations complete:
    - Material costs (from BOM)
    - Labor costs (hours × rates)
    - Overhead and profit margins
    - Contingency factors
  - **User Customization**: Contractors can adjust bid parameters:
    - **Crew Size**: Specify number of workers per task/phase
    - **Crew Pay Rates**: Set hourly rates for different crew members/roles
    - **Company Pay Rate**: Set company overhead and profit margin percentages
    - Real-time bid recalculation as parameters change
  - **Bid Generation**: Produces professional bid document with:
    - Detailed cost breakdown
    - Labor schedule
    - Material list
    - Project timeline
    - Terms and conditions
- **Machine Learning Enhancement**: 
  - Model trained on estimate vs. actual data from completed projects
  - Learns from historical accuracy to improve future estimates
  - Pattern recognition for common estimation errors
  - Predictive accuracy scoring for new bids
- **Historical Project Database**: Reference estimates from similar completed projects
- **Material Waste Factor Calculations**: Automatic waste factor adjustments based on project type

**Phase 6: AI-Powered Annotation & Workflow Automation**
- **AI Annotation Assistant**: High-level commands for automatic plan annotation
  - "Measure all walls" - AI automatically traces walls using polyline tool
  - "Measure all floors" - AI automatically outlines floor areas using polygon tool
  - "Count all sinks" - AI identifies and counts fixtures using counter tool
  - Natural language commands to automate repetitive annotation tasks
  - Reduces manual annotation time by 50-70%
- Client portal for estimate approval
- Team collaboration features (assign estimators, reviewers)
- Integration with accounting software (QuickBooks, etc.)
- Mobile app for field measurements

**Phase 7: Market Expansion**
- Commercial construction support
- Specialty trades (electrical, plumbing, HVAC) specific tools
- API for third-party integrations

---

## Technical Preferences

### Current Technology Stack (Maintain)

- **Frontend**: React 19, TypeScript, Vite
- **Canvas**: Konva, react-konva
- **State**: Zustand
- **Backend**: Firebase (Auth, Firestore, RTDB, Functions, Storage)
- **Styling**: Tailwind CSS

### Platform Requirements

- **Primary**: Web application (Chrome, Firefox, Safari, Edge)
- **Responsive**: Mobile-friendly for field use (tablets, phones)
- **Offline Support**: Basic offline capability for plan annotation (already implemented)

### Performance Requirements

- **Estimate Generation**: < 30 seconds for typical project
- **Price Fetching**: < 5 seconds per material (with caching)
- **Plan Upload**: < 10 seconds for typical plan image
- **Canvas Performance**: Maintain 60 FPS during annotation with 100+ objects across all browsers (Chrome, Firefox, Safari, Edge)
  - **Current Issue**: Performance degrades on Firefox as objects increase
  - **Target**: Consistent performance regardless of object count or browser

### Integration Requirements

**Critical Integrations:**
1. **Home Depot API** (via SerpAPI currently) - **MUST FIX**
2. **Firebase Services** (already integrated)

**Future Integrations:**
1. Lowe's API (Phase 4)
2. Amazon API (Phase 4)
3. Wayfair API (Phase 4)
4. Contractor supply store APIs (Phase 4)
5. Material supplier APIs
6. Accounting software APIs (Phase 6)

---

## Risks and Assumptions

### Key Risks

1. **Price API Reliability**
   - **Risk**: Home Depot/SerpAPI may change or restrict access
   - **Impact**: Core value proposition breaks
   - **Mitigation**: 
     - Implement multiple price source fallbacks
     - Consider direct Home Depot API if available
     - Build manual price entry fallback

2. **Estimation Accuracy**
   - **Risk**: AI-generated BOMs may be inaccurate for complex projects
   - **Impact**: Users lose trust, tool becomes unreliable
   - **Mitigation**:
     - Extensive testing with real projects
     - Clear user expectations about accuracy
     - Easy manual editing of generated BOMs
     - Validation loop to improve over time

3. **Market Adoption**
   - **Risk**: Contractors may prefer existing manual methods
   - **Impact**: Low user adoption, business doesn't scale
   - **Mitigation**:
     - Focus on clear time savings demonstration
     - Free trial period
     - Strong onboarding and support

4. **Performance Issues**
   - **Risk**: Cross-browser performance inconsistencies, especially Firefox degradation with many objects
   - **Impact**: Poor user experience, tool unusable for large projects, browser-specific issues
   - **Mitigation**:
     - Prioritize performance optimization early in MVP phase
     - Implement browser-specific optimizations if needed
     - Performance testing across all target browsers
     - Object rendering optimization (culling, batching, viewport optimization)

5. **Technical Debt**
   - **Risk**: Current bugs indicate potential underlying issues
   - **Impact**: More bugs emerge, development slows
   - **Mitigation**:
     - Fix current bugs properly (root cause analysis)
     - Add comprehensive testing
     - Code review and refactoring

### Critical Assumptions

1. **User Behavior**: Contractors will adopt digital tools if they save significant time
2. **Price Data**: Home Depot/Lowe's pricing APIs will remain accessible
3. **AI Capability**: Current AI (GPT) can generate accurate BOMs from annotations + scope
4. **Market Size**: Sufficient number of residential remodeling contractors need this tool
5. **Accuracy Target**: ±5% accuracy is achievable with validation loop

### Open Questions Needing Research

1. **Direct Home Depot API Access**: Is there an official API, or must we use SerpAPI?
2. **Material Database**: Should we build a comprehensive material database, or rely on AI generation?
3. **Pricing Model**: Subscription? Per-estimate? Freemium?
4. **Regulatory**: Any compliance requirements for construction estimation software?

---

## Timeline Constraints

### Immediate Priorities (Next 2-4 Weeks)

1. **Bug Fixes** (Week 1-2)
   - Fix plan deletion bug
   - Fix scale deletion bug
   - Fix Home Depot price integration
   - Fix AI shape creation commands (e.g., "add a red circle") - currently returns errors, blocking performance testing with many objects

2. **Project Management System** (Week 2-4) ⚠️ **CRITICAL - IMMEDIATE PRIORITY AFTER BUG FIXES**
   - Build project dashboard with list view
   - Implement project creation, deletion, and search
   - Add project status tracking (Estimating, Bid Ready, Bid Lost, Executing, Completed Profitable, Completed Unprofitable, Completed - Unknown)
   - Implement project sharing with invite links (Editor/Viewer roles)
   - Access control: users only see their own projects or projects they're invited to
   - Project organization and filtering capabilities

3. **Performance Optimization** (Week 1-3) ⚠️ **HIGH PRIORITY**
   - Investigate and fix Firefox performance degradation
   - Optimize canvas rendering for 100+ objects
   - Implement cross-browser performance testing
   - Ensure consistent 60 FPS across all browsers

4. **Price Integration Enhancement** (Week 3-4)
   - Ensure reliable price fetching
   - Add error handling and retry logic
   - Implement price caching strategy

5. **Estimate-to-Actual Tracking** (Week 4-5)
   - Build UI for actual cost input
   - Implement variance calculation
   - Basic reporting view

### MVP Launch Target

**Target Date**: 6-8 weeks from now

**Milestones:**
- Week 1-2: Critical bug fixes + performance optimization (Firefox)
- Week 2-4: Project management system (dashboard, multi-project support, sharing)
- Week 3-4: Price integration + estimate tracking
- Week 5-6: User testing and refinement
- Week 7-8: Production deployment and launch

**Note**: Project management system is critical infrastructure that must be built immediately after bug fixes to enable proper multi-project workflow. Performance optimization runs in parallel.

---

## Supporting Materials

### Provided Context

1. **Current MVP Documentation**
   - Project overview, architecture, API contracts
   - Technology stack documentation
   - Existing feature set

2. **Sample Scope of Work**
   - Clearview Pl Durham project SOW
   - Example of typical input document
   - Shows complexity and detail level expected

3. **Current Codebase**
   - React/TypeScript frontend
   - Firebase backend
   - Existing BOM generation functionality
   - Home Depot integration (non-functional)

### Research Needed

1. **Home Depot API Options**: Direct API vs. SerpAPI vs. web scraping
2. **Competitive Analysis**: Detailed review of existing estimation tools
3. **User Interviews**: 5-10 contractor interviews to validate assumptions
4. **Material Database**: Research available construction material databases/APIs

---

_This Product Brief captures the vision and requirements for CollabCanvas evolution into a production-ready construction takeoff and estimation platform._

_It was created through collaborative discovery and reflects the unique needs of this business venture project._

_Next: Use the PRD workflow to create detailed product requirements from this brief._

