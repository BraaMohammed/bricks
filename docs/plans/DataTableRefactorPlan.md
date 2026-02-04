# DataTable Component Refactoring Plan

## Current State
The `DataTable.tsx` component is currently **580+ lines** long, making it difficult to maintain, test, and understand. It handles multiple responsibilities including data display, sorting, formula execution, CSV upload, column management, and cell details viewing.

## Refactoring Goals
1. Break down the monolithic component into smaller, focused components
2. Extract business logic into custom hooks
3. Improve testability and maintainability
4. Keep each component/hook under 150 lines
5. Maintain all existing functionality

---

## Proposed Component Structure

### 1. **TableToolbar Component** (~30-40 lines)
**Location:** `src/components/DataTable/TableToolbar.tsx`

**Responsibilities:**
- Render top toolbar with action buttons
- Upload CSV button
- Add Column button
- Future toolbar actions

**Props:**
```typescript
interface TableToolbarProps {
  onUploadCSV: () => void;
  onAddColumn: () => void;
}
```

---

### 2. **TableHeader Component** (~80-100 lines)
**Location:** `src/components/DataTable/TableHeader.tsx`

**Responsibilities:**
- Render individual table header cell
- Sort functionality with chevron indicators
- Formula badge indicator
- Column action buttons (Settings, Execute, Remove)
- Remove column confirmation dialog

**Props:**
```typescript
interface TableHeaderProps {
  header: string;
  hasFormula: boolean;
  isExecuting: boolean;
  isSorted: boolean;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  onEditFormula: (column: string) => void;
  onExecuteFormula: (column: string) => void;
  onRemoveColumn: (column: string) => void;
}
```

---

### 3. **TableCell Component** (~40-50 lines)
**Location:** `src/components/DataTable/TableCell.tsx`

**Responsibilities:**
- Render individual table cell
- Display cell content with truncation
- Cell action buttons (Play, View)
- Loading states for cell execution
- Click handler for viewing full content

**Props:**
```typescript
interface TableCellProps {
  value: string;
  rowIndex: number;
  columnName: string;
  hasFormula: boolean;
  isExecuting: boolean;
  onExecuteCell: (rowIndex: number, column: string) => void;
  onViewCell: (rowIndex: number, column: string, content: string) => void;
}
```

---

### 4. **CellDetailsSheet Component** (~120-150 lines)
**Location:** `src/components/DataTable/CellDetailsSheet.tsx`

**Responsibilities:**
- Display detailed cell information
- Show cell content with formatting
- Display cell statistics (length, type)
- Show associated formula if exists
- Copy and execute actions

**Props:**
```typescript
interface CellDetailsSheetProps {
  selectedCell: {
    row: number;
    column: string;
    content: string;
  } | null;
  formula: string | null;
  onClose: () => void;
  onEditFormula: (column: string) => void;
  onExecuteCell: (row: number, column: string) => void;
}
```

---

### 5. **AddColumnDialog Component** (~50-60 lines)
**Location:** `src/components/DataTable/AddColumnDialog.tsx`

**Responsibilities:**
- Dialog for adding new columns
- Input validation
- Handle enter key submission
- Success/error handling

**Props:**
```typescript
interface AddColumnDialogProps {
  open: boolean;
  existingHeaders: string[];
  onClose: () => void;
  onAddColumn: (columnName: string) => void;
}
```

---

## Custom Hooks

### 1. **useTableSort Hook** (~20-30 lines)
**Location:** `src/hooks/useTableSort.ts`

**Responsibilities:**
- Manage sort state (column, direction)
- Compute sorted rows
- Handle sort column changes

**Returns:**
```typescript
{
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  sortedRows: Record<string, string>[];
  handleSort: (column: string) => void;
}
```

---

### 2. **useFormulaExecution Hook** (~100-120 lines)
**Location:** `src/hooks/useFormulaExecution.ts`

**Responsibilities:**
- Manage execution state (column, cells)
- Execute formula on entire column
- Execute formula on single cell
- Handle errors and success notifications
- Parallel execution with timeout handling

**Returns:**
```typescript
{
  executingColumn: string | null;
  executingCells: Set<string>;
  executeFormula: (column: string) => Promise<void>;
  executeCellFormula: (rowIndex: number, column: string) => Promise<void>;
}
```

---

### 3. **useCSVUpload Hook** (~80-100 lines)
**Location:** `src/hooks/useCSVUpload.ts`

**Responsibilities:**
- Auto-save current table to localStorage before upload (unique feature for DataTable)
- Process CSV file with PapaParse
- Validate CSV structure
- Update store with new data
- Handle upload errors
- Create programmatic file input (for inline button upload)

**Returns:**
```typescript
{
  handleCSVUpload: () => void;
  isUploading: boolean;
}
```

**Note:** This is separate from the existing `CSVUploader` component which provides a drag-and-drop interface. The DataTable needs inline CSV upload with auto-save functionality to preserve data before loading new files.

---

### 4. **useColumnManagement Hook** (~40-50 lines)
**Location:** `src/hooks/useColumnManagement.ts`

**Responsibilities:**
- Manage add column dialog state
- Validate new column names
- Add column and trigger formula editor
- Remove column with confirmation
- Handle success/error notifications

**Returns:**
```typescript
{
  showAddColumnDialog: boolean;
  setShowAddColumnDialog: (show: boolean) => void;
  columnToRemove: string | null;
  setColumnToRemove: (column: string | null) => void;
  handleAddColumn: (columnName: string) => void;
  handleRemoveColumn: (columnName: string) => void;
}
```

---

## Refactored DataTable Structure

**Location:** `src/components/DataTable.tsx` (~150-200 lines)

**Responsibilities:**
- Orchestrate all sub-components
- Pass data from store to components
- Coordinate hooks
- Render table structure

```typescript
export const DataTable = ({ onEditFormula }: DataTableProps) => {
  // Store access
  const { headers, rows, getFormula, ... } = useDataStore();
  
  // Custom hooks
  const { sortColumn, sortDirection, sortedRows, handleSort } = useTableSort(rows);
  const { executingColumn, executingCells, executeFormula, executeCellFormula } = useFormulaExecution();
  const { handleCSVUpload } = useCSVUpload();
  const { 
    showAddColumnDialog, 
    setShowAddColumnDialog,
    handleAddColumn, 
    handleRemoveColumn 
  } = useColumnManagement(headers, onEditFormula);
  
  // Cell details state
  const [selectedCell, setSelectedCell] = useState<...>(null);
  
  // Render
  return (
    <Card>
      <TableToolbar 
        onUploadCSV={handleCSVUpload}
        onAddColumn={() => setShowAddColumnDialog(true)}
      />
      
      <table>
        <thead>
          {headers.map(header => (
            <TableHeader
              key={header}
              header={header}
              hasFormula={!!getFormula(header)}
              isExecuting={executingColumn === header}
              isSorted={sortColumn === header}
              sortDirection={sortDirection}
              onSort={handleSort}
              onEditFormula={onEditFormula}
              onExecuteFormula={executeFormula}
              onRemoveColumn={handleRemoveColumn}
            />
          ))}
        </thead>
        <tbody>
          {sortedRows.map((row, idx) => (
            <tr key={idx}>
              {headers.map(header => (
                <TableCell
                  key={header}
                  value={row[header]}
                  rowIndex={idx}
                  columnName={header}
                  hasFormula={!!getFormula(header)}
                  isExecuting={executingCells.has(`${idx}-${header}`)}
                  onExecuteCell={executeCellFormula}
                  onViewCell={setSelectedCell}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      <AddColumnDialog
        open={showAddColumnDialog}
        existingHeaders={headers}
        onClose={() => setShowAddColumnDialog(false)}
        onAddColumn={handleAddColumn}
      />
      
      <CellDetailsSheet
        selectedCell={selectedCell}
        formula={selectedCell ? getFormula(selectedCell.column) : null}
        onClose={() => setSelectedCell(null)}
        onEditFormula={onEditFormula}
        onExecuteCell={executeCellFormula}
      />
    </Card>
  );
};
```

---

## File Structure After Refactoring

```
src/
├── components/
│   ├── DataTable.tsx (150-200 lines) ⭐ Main orchestrator
│   ├── DataTable/
│   │   ├── TableToolbar.tsx (30-40 lines)
│   │   ├── TableHeader.tsx (80-100 lines)
│   │   ├── TableCell.tsx (40-50 lines)
│   │   ├── CellDetailsSheet.tsx (120-150 lines)
│   │   └── AddColumnDialog.tsx (50-60 lines)
│   └── ... (other components)
├── hooks/
│   ├── useTableSort.ts (20-30 lines)
│   ├── useFormulaExecution.ts (100-120 lines)
│   ├── useCSVUpload.ts (80-100 lines)
│   ├── useColumnManagement.ts (40-50 lines)
│   └── ... (other hooks)
```

---

## Implementation Steps

### Phase 1: Extract Custom Hooks

#### Step 1.1: Create useTableSort Hook
- [x] Create `src/hooks/useTableSort.ts` file
- [x] Extract `sortColumn` and `sortDirection` state
- [x] Extract `sortedRows` memoized computation
- [x] Extract `handleSort` function
- [x] Export proper TypeScript interface

#### Step 1.2: Create useFormulaExecution Hook
- [x] Create `src/hooks/useFormulaExecution.ts` file
- [x] Extract `executingColumn` state
- [x] Extract `executingCells` state
- [x] Extract `executeFormula` function (parallel execution logic)
- [x] Extract `executeCellFormula` function
- [x] Include proper error handling and toast notifications
- [x] Export proper TypeScript interface

#### Step 1.3: Create useCSVUpload Hook
- [x] Create `src/hooks/useCSVUpload.ts` file
- [x] Extract `autoSaveCurrentTable` function
- [x] Extract `processCSVFile` function
- [x] Extract `handleCSVUpload` function
- [x] Include PapaParse integration
- [x] Include proper error handling
- [x] Export proper TypeScript interface

#### Step 1.4: Create useColumnManagement Hook
- [x] Create `src/hooks/useColumnManagement.ts` file
- [x] Extract `showAddColumnDialog` state
- [x] Extract `newColumnName` state
- [x] Extract `columnToRemove` state
- [x] Extract `handleAddColumn` function
- [x] Extract `handleRemoveColumn` function
- [x] Include validation logic
- [x] Export proper TypeScript interface

#### Step 1.5: Test Hooks
- [ ] Test `useTableSort` with sample data
- [ ] Test `useFormulaExecution` with mock formulas
- [ ] Test `useCSVUpload` with sample CSV
- [ ] Test `useColumnManagement` with operations

---

### Phase 2: Extract UI Components

#### Step 2.1: Create TableToolbar Component
- [x] Create `src/components/DataTable/TableToolbar.tsx` file
- [x] Extract toolbar header section
- [x] Add Upload CSV button
- [x] Add Add Column button
- [x] Define and export props interface

#### Step 2.2: Create TableHeader Component
- [x] Create `src/components/DataTable/TableHeader.tsx` file
- [x] Extract `<th>` rendering logic
- [x] Add sort button with chevron icons
- [x] Add formula badge indicator
- [x] Add settings button
- [x] Add execute button with loading state
- [x] Add remove button with AlertDialog
- [x] Define and export props interface

#### Step 2.3: Create TableCell Component
- [x] Create `src/components/DataTable/TableCell.tsx` file
- [x] Extract `<td>` rendering logic
- [x] Add cell content display with truncation
- [x] Add execute button for cells with formulas
- [x] Add view/eye button
- [x] Add loading state handling
- [x] Define and export props interface

#### Step 2.4: Create CellDetailsSheet Component
- [x] Create `src/components/DataTable/CellDetailsSheet.tsx` file
- [x] Extract Sheet component for cell details
- [x] Add cell information display (row, column)
- [x] Add content viewer with formatting
- [x] Add content statistics (length, type)
- [x] Add formula information section
- [x] Add copy and execute actions
- [x] Define and export props interface

#### Step 2.5: Create AddColumnDialog Component
- [x] Create `src/components/DataTable/AddColumnDialog.tsx` file
- [x] Extract Dialog component for adding columns
- [x] Add input field with validation
- [x] Add enter key handling
- [x] Add cancel/submit buttons
- [x] Define and export props interface

---

### Phase 3: Refactor Main Component

#### Step 3.1: Integrate Custom Hooks
- [x] Import all custom hooks into `DataTable.tsx`
- [x] Replace sorting logic with `useTableSort`
- [x] Replace formula execution logic with `useFormulaExecution`
- [x] Replace CSV upload logic with `useCSVUpload`
- [x] Replace column management logic with `useColumnManagement`

#### Step 3.2: Integrate UI Components
- [x] Import all sub-components into `DataTable.tsx`
- [x] Replace toolbar section with `<TableToolbar />`
- [x] Replace `<th>` elements with `<TableHeader />`
- [x] Replace `<td>` elements with `<TableCell />`
- [x] Replace Sheet with `<CellDetailsSheet />`
- [x] Replace Dialog with `<AddColumnDialog />`

#### Step 3.3: Clean Up Main Component
- [x] Remove all extracted logic from `DataTable.tsx`
- [x] Remove all extracted state declarations
- [x] Remove all extracted functions
- [x] Clean up imports (remove unused)
- [x] Verify final file is ~150-200 lines
- [x] Add comments for clarity

---

### Phase 4: Testing & Validation

#### Step 4.1: Functionality Testing
- [ ] Test CSV upload with sample files
- [ ] Test adding new columns
- [ ] Test removing columns
- [ ] Test sorting on all columns
- [ ] Test formula execution (column-wide)
- [ ] Test formula execution (single cell)
- [ ] Test cell details viewer
- [ ] Test all error cases

#### Step 4.2: Regression Testing
- [ ] Verify no existing features are broken
- [ ] Check all toast notifications work
- [ ] Verify loading states display correctly
- [ ] Test with large datasets (performance)
- [ ] Test with empty data states

#### Step 4.3: Code Quality
- [ ] Run linter on all new files
- [ ] Fix any TypeScript errors
- [ ] Ensure consistent code style
- [ ] Add JSDoc comments where needed

#### Step 4.4: Documentation
- [ ] Update this plan with completion status
- [ ] Add inline code comments
- [ ] Update README if needed

---

## Benefits

### Maintainability
- Each component has a single, clear responsibility
- Easier to locate and fix bugs
- Simpler to understand codebase

### Testability
- Hooks can be tested independently with `@testing-library/react-hooks`
- Components can be tested with isolated props
- Easier to mock dependencies

### Reusability
- Hooks can be reused in other components
- Sub-components can be composed differently
- Easier to create variations

### Developer Experience
- Shorter files are easier to navigate
- Clear separation of concerns
- Better IDE performance with smaller files

---

## Breaking Changes
None - this is a pure refactoring with no API changes.

---

## Timeline Estimate
- Phase 1 (Hooks): 3-4 hours
- Phase 2 (Components): 3-4 hours
- Phase 3 (Main refactor): 2-3 hours
- Phase 4 (Testing): 2-3 hours
- **Total: 10-14 hours**

---

## Notes
- Maintain all existing functionality
- Keep the same prop interface for DataTable
- No changes to the data store
- Preserve all toast notifications and error handling
- Keep all accessibility features
