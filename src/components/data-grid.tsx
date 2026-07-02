"use client";

import { useCallback, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridReadyEvent, GridApi } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps<T> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  loading?: boolean;
  exportFileName?: string;
  height?: string;
}

export function DataGrid<T>({
  rowData,
  columnDefs,
  loading = false,
  exportFileName = "export",
  height = "500px",
}: DataGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null);
  const gridApiRef = useRef<GridApi<T> | null>(null);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      minWidth: 100,
    }),
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent<T>) => {
    gridApiRef.current = params.api;
  }, []);

  const onQuickFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    gridApiRef.current?.setGridOption("quickFilterText", e.target.value);
  }, []);

  const getExportData = useCallback(() => {
    const rows: Record<string, unknown>[] = [];
    gridApiRef.current?.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) rows.push(node.data as Record<string, unknown>);
    });
    return rows;
  }, []);

  const exportCSV = useCallback(() => {
    gridApiRef.current?.exportDataAsCsv({ fileName: `${exportFileName}.csv` });
  }, [exportFileName]);

  const exportExcel = useCallback(() => {
    const data = getExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${exportFileName}.xlsx`);
  }, [exportFileName, getExportData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search all columns..."
          onChange={onQuickFilterChange}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>
      <div className="ag-theme-quartz w-full rounded-lg border" style={{ height }}>
        <AgGridReact<T>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 25, 50, 100]}
          animateRows
          onGridReady={onGridReady}
          loading={loading}
          suppressCellFocus
        />
      </div>
    </div>
  );
}
