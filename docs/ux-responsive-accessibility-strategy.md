# CollabCanvas Responsive Design & Accessibility Strategy

## Responsive Design Strategy

### Breakpoint System

**Mobile:** 320px - 767px
- Single column layout
- Stacked navigation (hamburger menu or bottom tabs)
- Touch-optimized controls (minimum 44x44px touch targets)
- Canvas viewing only (read-only, no annotation tools)
- Simplified BOM table (horizontal scroll if needed)
- Critical Path graph: Simplified view or list view

**Tablet:** 768px - 1024px
- Two-column layout where appropriate
- Top navigation (Time/Space/Money tabs)
- Touch-friendly canvas tools
- Full BOM table with horizontal scroll
- Critical Path graph: Medium detail

**Desktop:** 1025px+
- Full multi-column layouts
- Top navigation with all features
- Mouse/trackpad optimized canvas tools
- Full BOM table, no scrolling needed
- Critical Path graph: Full detail, zoom/pan

### Layout Adaptations

**Top Navigation (Time/Space/Money):**
- Desktop: Horizontal tabs, full labels
- Tablet: Horizontal tabs, full labels
- Mobile: Bottom navigation bar with icons + labels, OR hamburger menu

**Canvas Tools:**
- Desktop: Horizontal toolbar, hover tooltips
- Tablet: Horizontal toolbar, touch-friendly buttons
- Mobile: Bottom toolbar, large touch targets, canvas read-only

**BOM Table:**
- Desktop: Full table, all columns visible
- Tablet: Full table, horizontal scroll if needed
- Mobile: Card-based layout OR horizontal scroll table

**Critical Path Graph:**
- Desktop: Full graph, zoom/pan enabled
- Tablet: Medium detail, touch gestures for zoom/pan
- Mobile: List view OR simplified graph

**Modals/Dialogs:**
- Desktop: Centered modal, max 800px width
- Tablet: Centered modal, max 90% width
- Mobile: Full-screen modal

### Touch Target Sizes

**Minimum:** 44x44px (iOS/Android standard)
- All interactive elements meet this minimum
- Spacing between touch targets: 8px minimum
- Canvas tools: 48x48px for easier touch

### Content Adaptation

**Typography Scaling:**
- Desktop: Base 16px, headings scale normally
- Tablet: Base 16px, headings scale normally
- Mobile: Base 16px (no scaling - maintain readability)

**Spacing:**
- Desktop: Generous spacing (24px, 32px)
- Tablet: Moderate spacing (16px, 24px)
- Mobile: Compact but comfortable (12px, 16px)

**Information Density:**
- Desktop: Can show more information at once
- Tablet: Moderate information density
- Mobile: Essential information only, progressive disclosure

---

## Accessibility Strategy

### WCAG Compliance Target

**Level:** WCAG 2.1 Level AA (Recommended Standard)

**Rationale:**
- Required for government/education/public sites
- Best practice for professional software
- Ensures broad accessibility
- Legal compliance in many jurisdictions

### Key Accessibility Requirements

#### 1. Color Contrast

**Text Contrast:**
- Normal text: 4.5:1 contrast ratio minimum
- Large text (18pt+): 3:1 contrast ratio minimum
- Modern Neutral theme colors meet these requirements:
  - Primary text (#0f172a) on white: 16.5:1 ✓
  - Muted text (#64748b) on white: 4.6:1 ✓

**Interactive Elements:**
- Buttons, links: 3:1 contrast ratio minimum
- Focus indicators: 3:1 contrast ratio minimum

**Status Indicators:**
- Don't rely on color alone
- Use icons + color (e.g., ✓ green checkmark, not just green)
- Example: Success = green checkmark icon + green color

#### 2. Keyboard Navigation

**Full Keyboard Access:**
- All interactive elements accessible via keyboard
- Tab order follows visual order
- Focus indicators visible (2px solid outline, #0f172a)

**Keyboard Shortcuts:**
- Canvas tools: Number keys (1=polyline, 2=polygon, etc.)
- Navigation: Cmd/Ctrl+K for search
- Modals: Escape to close
- Forms: Enter to submit, Escape to cancel

**Focus Management:**
- Focus trap in modals
- Return focus to trigger after modal closes
- Auto-focus first element in modals
- Skip links for main content (if needed)

#### 3. Screen Reader Support

**ARIA Labels:**
- All interactive elements have meaningful labels
- Icons have aria-label (e.g., "Generate BOM" not just icon)
- Buttons have descriptive text or aria-label

**ARIA Roles:**
- Navigation: role="navigation"
- Main content: role="main"
- Tables: role="table" with headers
- Modals: role="dialog"
- Graphs: role="img" with aria-label describing graph

**Live Regions:**
- Dynamic content updates announced
- BOM generation progress: aria-live="polite"
- Error messages: aria-live="assertive"
- Success messages: aria-live="polite"

**Semantic HTML:**
- Use proper HTML elements (button, not div)
- Headings hierarchy (h1 → h2 → h3)
- Lists use ul/ol, not divs
- Forms use proper form elements

#### 4. Focus Indicators

**Visible Focus:**
- 2px solid outline, #0f172a color
- High contrast (16.5:1)
- Visible on all interactive elements
- Consistent across all components

**Focus Styles:**
```css
:focus {
  outline: 2px solid #0f172a;
  outline-offset: 2px;
}
```

#### 5. Form Accessibility

**Label Associations:**
- All inputs have associated labels
- Use `<label for="input-id">` or wrap input in label
- Required fields marked with asterisk + aria-required="true"

**Error Identification:**
- Error messages associated with inputs via aria-describedby
- Error summary at top of form (if multiple errors)
- Clear, actionable error messages

**Help Text:**
- Associated with inputs via aria-describedby
- Available to screen readers

#### 6. Image Accessibility

**Alt Text:**
- All meaningful images have alt text
- Decorative images: alt="" (empty)
- Canvas/plan images: Descriptive alt text
- Icons: aria-label instead of alt (if icon-only)

**Example:**
- Construction plan: alt="Kitchen remodel floor plan, 12x15 feet"
- Decorative icon: aria-label="Generate BOM" (no alt needed)

#### 7. Table Accessibility

**Table Headers:**
- Use `<th>` for headers
- Scope attribute (scope="col" or scope="row")
- BOM table: Headers for Material, Quantity, Unit, Price, Total

**Table Captions:**
- Use `<caption>` for table titles
- Example: `<caption>Bill of Materials - Kitchen Remodel</caption>`

#### 8. Dynamic Content

**Loading States:**
- Announce loading to screen readers
- aria-busy="true" on loading containers
- Progress announcements for long operations

**Content Updates:**
- Use aria-live regions for dynamic updates
- BOM generation: "Generating BOM, please wait"
- Price updates: "Prices updated"

#### 9. Canvas Accessibility

**Canvas Challenges:**
- Canvas elements are not natively accessible
- Need alternative representation

**Solutions:**
- Keyboard-accessible annotation tools (toolbar buttons)
- Text alternative for canvas content
- Measurement data available in accessible format (table/list)
- Screen reader: "Canvas with 12 annotations: 3 polylines, 9 polygons"

**Canvas Tools:**
- All tools accessible via keyboard
- Tool selection announced: "Polyline tool selected"
- Measurement updates announced: "Current measurement: 12 feet"

#### 10. Critical Path Graph Accessibility

**Graph Challenges:**
- Visual graph not accessible to screen readers
- Need text alternative

**Solutions:**
- Text list view available (toggle)
- Screen reader: "Critical Path: Demo (2 days) → Framing (5 days) → Plumbing (3 days)"
- Task details accessible via keyboard
- Export CSV for full data access

---

## Testing Strategy

### Automated Testing

**Tools:**
- **Lighthouse:** Accessibility audit (target: 90+ score)
- **axe DevTools:** Automated accessibility testing
- **WAVE:** Web accessibility evaluation

**What to Test:**
- Color contrast ratios
- Keyboard navigation
- ARIA labels and roles
- Form labels and errors
- Image alt text
- Table headers

### Manual Testing

**Keyboard-Only Navigation:**
- Navigate entire app using only keyboard
- Tab through all interactive elements
- Use Enter/Space to activate
- Escape to close modals
- Verify focus indicators visible

**Screen Reader Testing:**
- **NVDA** (Windows, free)
- **JAWS** (Windows, paid)
- **VoiceOver** (macOS/iOS, built-in)

**What to Test:**
- All content announced correctly
- Navigation makes sense
- Forms are usable
- Dynamic content updates announced
- Error messages clear and actionable

### User Testing

**Involve Users with Disabilities:**
- Test with keyboard-only users
- Test with screen reader users
- Test with users with motor disabilities
- Gather feedback on accessibility barriers

---

## Accessibility Checklist

### Color & Contrast
- [ ] All text meets contrast requirements (4.5:1 normal, 3:1 large)
- [ ] Interactive elements meet contrast requirements (3:1)
- [ ] Status indicators don't rely on color alone (icons + color)

### Keyboard Navigation
- [ ] All interactive elements accessible via keyboard
- [ ] Focus indicators visible (2px solid outline)
- [ ] Tab order follows visual order
- [ ] Keyboard shortcuts documented

### Screen Reader Support
- [ ] All interactive elements have ARIA labels
- [ ] ARIA roles used correctly
- [ ] Semantic HTML used (button, not div)
- [ ] Headings hierarchy correct (h1 → h2 → h3)
- [ ] Dynamic content updates announced (aria-live)

### Forms
- [ ] All inputs have associated labels
- [ ] Required fields marked (asterisk + aria-required)
- [ ] Error messages associated with inputs (aria-describedby)
- [ ] Help text accessible

### Images
- [ ] All meaningful images have alt text
- [ ] Decorative images have alt=""
- [ ] Icons have aria-label

### Tables
- [ ] Table headers use `<th>`
- [ ] Headers have scope attribute
- [ ] Table captions used when appropriate

### Dynamic Content
- [ ] Loading states announced
- [ ] Content updates announced (aria-live)
- [ ] Error messages clear and actionable

### Canvas & Graphs
- [ ] Canvas tools keyboard accessible
- [ ] Text alternatives for canvas content
- [ ] Critical Path graph has text alternative
- [ ] Measurement data accessible

---

## Responsive & Accessibility Summary

### Responsive Design
- **Breakpoints:** Mobile (320-767px), Tablet (768-1024px), Desktop (1025px+)
- **Adaptation:** Layout, navigation, touch targets adapt per breakpoint
- **Touch Targets:** Minimum 44x44px
- **Content:** Progressive disclosure on mobile, full information on desktop

### Accessibility
- **WCAG Level:** 2.1 Level AA
- **Key Requirements:** Color contrast, keyboard navigation, screen reader support, focus indicators
- **Testing:** Automated (Lighthouse, axe) + Manual (keyboard, screen readers)
- **Canvas Challenges:** Addressed with keyboard-accessible tools and text alternatives

---

_This responsive and accessibility strategy ensures CollabCanvas works for all users, on all devices, with all abilities. Simple, stoic, down-to-earth - accessible by design._





