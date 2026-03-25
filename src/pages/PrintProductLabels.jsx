import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Search, Settings2 } from "lucide-react";
import api from "@/utils/api";
import { generateLabelsPDF } from "@/utils/generateLabelPdf";
import { Button } from "@/components/UI/button";
import { Input } from "@/components/UI/input";
import { Checkbox } from "@/components/UI/checkbox";
import { Label } from "@/components/UI/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/UI/collapsible";
import { DataTable } from "@/components/DataTable";
import Loader from "@/components/Loader";

const columns = [
  { accessorKey: "sku", header: "SKU", cell: ({ getValue }) => getValue() ?? "—" },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ getValue }) => {
      const v = getValue();
      return (
        <span className="block max-w-[200px] truncate" title={v}>
          {v ?? "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "asin",
    header: "ASIN",
    cell: ({ getValue }) => getValue() ?? "—",
    meta: { label: "ASIN" },
  },
];

const LABELS_PER_PAGE_OPTIONS = [1, 2, 4, 6, 8];
const MARGIN_OPTIONS = [
  { value: 5, label: "Narrow (5 mm)" },
  { value: 8, label: "Medium (8 mm)" },
  { value: 12, label: "Wide (12 mm)" },
];

export default function PrintProductLabels() {
  const [searchTerm, setSearchTerm] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [printOptionsOpen, setPrintOptionsOpen] = useState(false);

  const [labelsPerPage, setLabelsPerPage] = useState(2);
  const [orientation, setOrientation] = useState("p");
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includeQR, setIncludeQR] = useState(true);
  const [marginMm, setMarginMm] = useState(8);

  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ["products-print-labels"],
    queryFn: async () => {
      const res = await api.get("/products/getall");
      const data = res.data?.products ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const products = productsData ?? [];

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase().trim();
    return products.filter(
      (p) =>
        (p.sku && String(p.sku).toLowerCase().includes(term)) ||
        (p.title && String(p.title).toLowerCase().includes(term)) ||
        (p.asin && String(p.asin).toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  const clearSelection = () => setRowSelection({});

  const handleDownloadPDF = async () => {
    if (selectedProducts.length === 0) return;
    if (!includeBarcode && !includeQR) return;
    setIsGenerating(true);
    try {
      await generateLabelsPDF(selectedProducts, {
        labelsPerPage,
        orientation: orientation === "l" ? "l" : "p",
        includeBarcode,
        includeQR,
        marginMm,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Print product labels</h1>
        <p className="text-muted-foreground mt-1">
          Select products and download a PDF with barcode and QR code per label.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Products</CardTitle>
          <CardDescription>
            Search and select products to include in the label PDF. Each label includes barcode (SKU) and QR code (product link).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Collapsible open={printOptionsOpen} onOpenChange={setPrintOptionsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Print options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 p-4 rounded-lg border bg-muted/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Items per page</Label>
                  <Select
                    value={String(labelsPerPage)}
                    onValueChange={(v) => setLabelsPerPage(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LABELS_PER_PAGE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} label{n > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select
                    value={orientation}
                    onValueChange={(v) => setOrientation(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="p">Portrait</SelectItem>
                      <SelectItem value="l">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Margin</Label>
                  <Select
                    value={String(marginMm)}
                    onValueChange={(v) => setMarginMm(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MARGIN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>What to print</Label>
                  <div className="flex flex-col gap-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={includeBarcode}
                        onCheckedChange={(v) => setIncludeBarcode(!!v)}
                      />
                      <span className="text-sm">Barcode</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={includeQR}
                        onCheckedChange={(v) => setIncludeQR(!!v)}
                      />
                      <span className="text-sm">QR code</span>
                    </label>
                    {!includeBarcode && !includeQR && (
                      <p className="text-xs text-amber-600">
                        Select at least one (barcode or QR code).
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU, title, or ASIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear selection
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                disabled={
                  selectedProducts.length === 0 ||
                  isGenerating ||
                  (!includeBarcode && !includeQR)
                }
              >
                <Printer className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating…" : "Download PDF"}
                {selectedProducts.length > 0 && ` (${selectedProducts.length})`}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4"><Loader /></div>
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load products.</p>
          ) : (
            <DataTable
              columns={columns}
              data={filteredProducts}
              enableSelection={true}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onSelectionChange={setSelectedProducts}
              getRowId={(row) => row._id}
              addPagination={true}
              pageSize={15}
              containerClassName="max-h-[60vh]"
              enableHeaderContextMenu={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
