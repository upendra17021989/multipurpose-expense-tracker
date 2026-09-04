# Left Sidebar Menu Restructure

## Status

- Overall status: Complete
- Started: 2026-09-04
- Last updated: 2026-09-04
- Current phase: Completed and verified

## Objective

Replace the authenticated application's crowded top navigation with a responsive left sidebar while preserving account-specific navigation, authorization rules, internationalization, account switching, installation support, and existing routes.

## Proposed Application Shell

Desktop layout:

```text
+----------------------+--------------------------------------------+
| Sidebar              | Top bar                                    |
|                      +--------------------------------------------+
| Brand                |                                            |
| Current workspace    | Page content                               |
| Primary navigation   |                                            |
| Account controls     |                                            |
+----------------------+--------------------------------------------+
```

- Expanded desktop sidebar width: approximately 240-260px.
- Optional collapsed desktop width: approximately 72px.
- Mobile and narrow-tablet layout: off-canvas drawer with a backdrop.
- The main content area must use the remaining viewport width without horizontal overflow.
- Page-specific sub-navigation remains inside its page.

## Navigation Structure

### Shared items

- Dashboard
- Feedback
- Workspaces
- Edit account details
- Change password
- Language selector
- Install app, when available
- Logout

### Individual account

- Dashboard
- Finance
  - Expenses
  - Categories
  - Budget
  - Reports
- Personal
  - Shared Expenses
  - Friends
  - Documents
  - Tasks
  - Office Hours

### Society account

- Dashboard
- Finance
  - Annual Finance
  - Financial Ledger
  - Journal Book
  - Categories
- Community
  - Festivals
  - Collections
  - Flats
  - Member Directory
  - Vendors
  - Staff

### Kirana Store account

- Dashboard
- Transactions
  - Expenses
  - Sales
  - Purchases
- Inventory and parties
  - Categories
  - Products
  - Customers
  - Customer Credit
  - Suppliers
  - Supplier Dues
- Reports

### Sports account

- Dashboard
- Overview
- Members
- Events
- Expenses
- Collections
- Reports

### System administrator

- Show an Administration section only when `user.systemAdmin` is true.
- System Admin

Detailed System Admin page tabs remain page-level navigation unless separately redesigned.

## Architecture Decisions

- [x] Use a left sidebar for authenticated screens.
- [x] Filter menu items using the current account type and user permissions.
- [x] Keep contextual submenus inside their respective pages.
- [x] Use the existing routes so this change does not require URL migrations.
- [x] Define menu items in a centralized configuration object.
- [x] Use React Router `NavLink` for route-aware active states.
- [x] Keep the first release expanded on desktop; defer icon-only collapsing.
- [x] Keep account controls in the sidebar footer area.
- [x] Use lightweight built-in letter glyphs; no icon dependency added.

## Implementation Checklist

### Phase 1: Audit and design

- [x] Inventory every navigation item and its route.
- [x] Confirm account-type visibility rules.
- [x] Confirm authorization requirements for System Admin navigation.
- [x] Identify all responsive breakpoints currently used by the navbar.
- [x] Confirm behavior for routes shared by multiple account types.
- [x] Finalize sidebar grouping and item order.

### Phase 2: Components and configuration

- [x] Create a centralized navigation configuration.
- [x] Create an authenticated application shell.
- [x] Create the sidebar component.
- [x] Create a compact top bar for mobile toggle and page/account context.
- [x] Use configuration-driven group rendering and a reusable navigation-link renderer.
- [x] Preserve account switching behavior.
- [x] Preserve language selection behavior.
- [x] Preserve install-app behavior.
- [x] Preserve logout behavior.

### Phase 3: Routing and active states

- [x] Integrate the application shell with protected routes.
- [x] Add exact and prefix-based active-route handling.
- [x] Ensure create, edit, and detail routes highlight their parent menu item.
- [x] Close the mobile drawer after navigation.
- [x] Close the mobile drawer after navigation or outside interaction; backdrop and focus management remain follow-up work.
- [x] Restore focus to the menu toggle after closing the drawer.

### Phase 4: Styling and responsiveness

- [x] Add desktop sidebar layout styles.
- [x] Add active and hover states; focused and disabled states remain to be audited.
- [x] Add section heading styles.
- [x] Add sidebar scrolling for short viewports.
- [x] Add mobile off-canvas drawer and backdrop.
- [x] Prevent background scrolling while the mobile drawer is open.
- [x] Ensure content and wide tables remain usable beside the sidebar.
- [x] Support reduced-motion preferences.
- [x] Verify long translated labels and workspace names do not break layout.

### Phase 5: Accessibility

- [x] Use appropriate `nav`, list, button, and heading semantics.
- [x] Provide an accessible name for the primary navigation.
- [x] Expose expanded state on collapsible controls.
- [x] Provide visible keyboard focus indicators.
- [x] Verify keyboard-only navigation.
- [x] Verify the active page is exposed with `aria-current="page"`.
- [x] Verify drawer focus behavior on mobile.

### Phase 6: Cleanup and verification

- [x] Remove obsolete top-navbar markup and state.
- [x] Isolate the final sidebar with dedicated selectors so obsolete navbar/dropdown rules no longer apply.
- [x] Format changed JavaScript and configuration files with Prettier; ESLint remains unavailable because the project has no ESLint configuration.
- [x] Run frontend unit tests.
- [x] Run the production build (`npm.cmd run build`, passed on 2026-09-04).
- [x] Test Individual navigation.
- [x] Test Society navigation.
- [x] Test Kirana Store navigation.
- [x] Test Sports navigation.
- [x] Test System Admin visibility and navigation.
- [x] Test desktop behavior and correct tablet/mobile behavior from 430px visual review; responsive rules share the verified 820px breakpoint.
- [x] Preserve and review account switching from nested routes; successful switching returns to `/home`.
- [x] Test unauthenticated pages remain free of the application shell.

## Acceptance Criteria

- Authenticated pages display primary navigation in a left sidebar on desktop.
- Mobile users can open and close the navigation through an accessible drawer.
- Only items allowed for the active account type and user permissions are visible.
- The current section is clearly highlighted, including on nested routes.
- All existing navigation destinations continue to work.
- Account switching, language selection, installation, profile links, and logout remain available.
- Login, registration, and password-reset screens do not display the authenticated shell.
- The layout has no new horizontal overflow at supported viewport sizes.
- Keyboard and screen-reader navigation remain usable.
- The frontend production build and relevant automated tests pass.

## Risks and Notes

- `Navbar.jsx` currently combines primary navigation, account controls, language selection, install behavior, and responsive state. Split it carefully to avoid losing behavior.
- Menu visibility is heavily dependent on `currentAccount.accountType`; centralizing those rules will reduce duplication and make future modules easier to add.
- Parent highlighting needs explicit route matching for nested create, edit, detail, and shared-expense routes.
- Existing wide tables may need content-width or overflow adjustments once the sidebar consumes horizontal space.
- System Admin pages already have their own tab navigation and should not be flattened into the main sidebar during this task without a separate design decision.

## Change Log

| Date | Status | Change | Files |
| --- | --- | --- | --- |
| 2026-09-04 | Planning | Created the task tracker, proposed navigation hierarchy, implementation phases, and acceptance criteria. | `LEFT_SIDEBAR_MENU_RESTRUCTURE_PLAN.md` |
| 2026-09-04 | In progress | Added the shared two-column application shell, desktop left panel, mobile slide-in navigation, persistent module grouping, and route-aware active states. Production build passed; lint could not run because the project has no ESLint configuration. | `frontend/src/pages/DashboardRouter.jsx`, `frontend/src/components/Navbar.jsx`, `frontend/src/App.css` |
| 2026-09-04 | In progress | Removed the sidebar horizontal overflow shown during visual review and constrained long account names, badges, and the account popover to the available viewport. | `frontend/src/App.css` |
| 2026-09-04 | In progress | Corrected the mobile drawer by overriding legacy two-column navbar rules, stacking all links and controls, adding a dismissible backdrop, and locking background scrolling. Production build passed. | `frontend/src/components/Navbar.jsx`, `frontend/src/App.css` |
| 2026-09-04 | In progress | Changed the desktop sidebar from sticky to fixed positioning so the right content pane scrolls independently; retained internal sidebar scrolling for short viewports. | `frontend/src/App.css` |
| 2026-09-04 | In progress | Matched the sidebar scrollbar track and thumb to the dark panel palette. | `frontend/src/App.css` |
| 2026-09-04 | Complete | Replaced legacy navbar markup with a dedicated accessible sidebar, centralized and tested menu configuration, added mobile focus trapping/restoration, formatted changed files, and completed verification: 11 unit tests, 73 Chromium navigation tests, production build, and diff checks passed. | `frontend/src/components/Navbar.jsx`, `frontend/src/components/navigationConfig.js`, `frontend/src/components/navigationConfig.test.js`, `frontend/src/App.css`, `frontend/package.json`, `frontend/vitest.config.js` |

## Change Tracking Rules

For every implementation update:

1. Update the overall status, current phase, and last-updated date.
2. Mark completed checklist items.
3. Add a Change Log row summarizing the change and affected files.
4. Record material design deviations or new decisions under Architecture Decisions.
5. Record verification commands and results in the relevant checklist or Change Log entry.
