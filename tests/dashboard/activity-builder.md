### E2E Tests: Activity Builder

**Suite ID:** `ACTIVITY-BUILDER-E2E`
**Feature:** Teacher interface for building and previewing activities

---

## Test Case: `AB-E2E-001` - Update Settings & Status

**Priority:** `critical`

**Tags:**
- type → @e2e
- feature → @activity-builder

**Description/Objective:** Verify teacher can define activity global settings (name, description, logo) and publish it.

**Preconditions:**
- Existing Activity in draft state.
- Teacher logged in.

### Flow Steps:
1. Open "Configuración" panel.
2. Fill Title, Description, Duration, and Logo URL.
3. Save settings.
4. Click "Borrador" button to publish.

### Expected Result:
- Settings save notification appears.
- Header title updates to new title.
- Status button changes to "Publicado".

---

## Test Case: `AB-E2E-002` - Mission Builder (Phases & Steps)

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @activity-builder

**Description/Objective:** Verify the sidebar functionality for creating phases and steps.

**Preconditions:**
- Teacher logged in, inside activity builder.

### Flow Steps:
1. Click "Añadir Fase".
2. Enter phase name and submit.
3. Click "+" on the new phase to add "Teoría".
4. Enter step name and submit.

### Expected Result:
- Phase appears in sidebar.
- Step appears inside the phase in the sidebar.

---

## Test Case: `AB-E2E-003` - Resource Editor

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @activity-builder

**Description/Objective:** Verify adding files and links to a Resource step.

**Preconditions:**
- Activity has a "Recursos" step.

### Flow Steps:
1. Select "Recursos" step in sidebar.
2. Click "Añadir Enlace/Archivo".
3. Fill URL/File and Title.

### Expected Result:
- Resource item is added to the list and autosaved.

---

## Test Case: `AB-E2E-004` - Google Forms Quiz

**Priority:** `medium`

**Tags:**
- type → @e2e
- feature → @activity-builder

**Description/Objective:** Ensure Quiz editor supports switching to Google Forms.

**Preconditions:**
- Activity has a "Cuestionario" step.

### Flow Steps:
1. Select Quiz step.
2. Toggle switch to "Usar Google Form".
3. Enter valid Google Forms iframe URL.

### Expected Result:
- Built-in editor hides.
- Iframe preview displays the Google Form.

---

## Test Case: `AB-E2E-005` - Student Preview

**Priority:** `critical`

**Tags:**
- type → @e2e
- feature → @activity-builder

**Description/Objective:** Validate the IDE-like student preview renders the mission structure accurately.

**Preconditions:**
- Activity has at least one phase and one visible step.

### Flow Steps:
1. Click "Vista Alumno".
2. Observe layout and selected step.
3. Click "Siguiente Paso".

### Expected Result:
- Top bar displays "Vista Alumno" and activity logo.
- Left sidebar lists created steps with correct icons.
- Central viewer displays read-only content.
- Siguiente/Anterior navigation works and auto-selects steps.
