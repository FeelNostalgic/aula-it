### E2E Tests: Module Detail (Unidades Didácticas)

**Suite ID:** `MODULE-DETAIL`
**Feature:** Module detail page with units management, tabs navigation, and breadcrumb

---

## Test Case: `MODULE-DETAIL-E2E-001` - Navigation from dashboard to module detail

**Priority:** `critical`
**Tags:** @e2e, @module-detail

**Preconditions:**
- Teacher user exists with at least one module

### Flow Steps:
1. Login as teacher
2. Click on module card in dashboard
3. Verify URL matches `/dashboard/modules/[id]`
4. Verify breadcrumb shows module name

### Expected Result:
- URL contains module ID
- Breadcrumb displays `root / Inicio / [Module Name]`

---

## Test Case: `MODULE-DETAIL-E2E-002` - Create unit via dialog

**Priority:** `critical`
**Tags:** @e2e, @module-detail

**Preconditions:**
- Teacher user exists with a module

### Flow Steps:
1. Navigate to module detail
2. Click "AÑADIR UNIDAD DIDÁCTICA"
3. Fill name and description
4. Submit

### Expected Result:
- Unit appears in the list

---

## Test Case: `MODULE-DETAIL-E2E-003` - Tab switching

**Priority:** `high`
**Tags:** @e2e, @module-detail

**Preconditions:**
- Teacher user on module detail page

### Flow Steps:
1. Verify Dashboard tab is active
2. Click Alumnos tab → placeholder visible
3. Click Configuración tab → placeholder visible
4. Click Dashboard tab → units visible

### Expected Result:
- Active tab state updates correctly
- Tab content switches

---

## Test Case: `MODULE-DETAIL-E2E-004` - Breadcrumb back navigation

**Priority:** `high`
**Tags:** @e2e, @module-detail

### Flow Steps:
1. Navigate to module detail
2. Click "Inicio" in breadcrumb

### Expected Result:
- URL is `/dashboard`

---

## Test Case: `MODULE-DETAIL-E2E-005` - Empty state

**Priority:** `medium`
**Tags:** @e2e, @module-detail

**Preconditions:**
- Module exists with zero units

### Flow Steps:
1. Navigate to empty module detail

### Expected Result:
- "No hay unidades registradas" message visible
