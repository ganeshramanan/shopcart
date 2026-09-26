import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import api from "../api";

function BarcodeLabel({ product }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && product.barcode) {
      JsBarcode(svgRef.current, product.barcode, {
        format: "CODE128",
        width: 1.4,
        height: 40,
        fontSize: 11,
        margin: 4,
        displayValue: true,
      });
    }
  }, [product.barcode]);

  if (!product.barcode) return null;

  return (
    <div className="barcode-label">
      <div className="barcode-label-name">{product.name}</div>
      <svg ref={svgRef}></svg>
      <div className="barcode-label-price">₹{product.price} / {product.unit_type}</div>
    </div>
  );
}

export default function PrintLabels({ products, businessId, onRefresh }) {
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState("");
  const [backfilling, setBackfilling] = useState(false);

  const toggle = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const selectAll = () => {
    const all = {};
    filtered.forEach((p) => { all[p.id] = true; });
    setSelected(all);
  };

  const clearAll = () => setSelected({});

  const missingCount = products.filter((p) => !p.barcode).length;

  const backfillBarcodes = async () => {
    setBackfilling(true);
    try {
      await api.post(`/products/backfill-barcodes?business_id=${businessId}`);
      if (onRefresh) await onRefresh();
    } finally {
      setBackfilling(false);
    }
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const selectedProducts = products.filter((p) => selected[p.id]);

  return (
    <div>
      <div className="no-print">
        <p className="dashboard-subtitle">
          Select the products you want to print sticker labels for, then click Print.
          Each label shows a scannable barcode + product name + price — cut and stick
          on the item (works for loose/bulk items too, not just packaged goods).
        </p>

        {missingCount > 0 && (
          <div className="card row" style={{ background: "#fef3c7" }}>
            <span>{missingCount} product(s) don't have a barcode yet (added before this feature).</span>
            <button onClick={backfillBarcodes} disabled={backfilling}>
              {backfilling ? "Assigning..." : "Assign Barcodes"}
            </button>
          </div>
        )}

        <input
          className="catalog-search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <button className="secondary" onClick={selectAll}>Select All ({filtered.length})</button>
          <button className="secondary" onClick={clearAll}>Clear</button>
          <button onClick={() => window.print()} disabled={selectedProducts.length === 0}>
            Print {selectedProducts.length} Label{selectedProducts.length !== 1 ? "s" : ""}
          </button>
        </div>

        <div className="label-select-grid">
          {filtered.map((p) => (
            <label key={p.id} className="label-select-item">
              <input type="checkbox" checked={!!selected[p.id]} onChange={() => toggle(p.id)} />
              <span>{p.name}</span>
              {!p.barcode && <span className="badge" style={{ background: "#fee2e2", color: "#dc2626" }}>No barcode</span>}
            </label>
          ))}
        </div>
      </div>

      {selectedProducts.length > 0 && (
        <div className="label-sheet">
          <h3 className="no-print" style={{ marginTop: 20 }}>Preview ({selectedProducts.length} labels)</h3>
          {selectedProducts.map((p) => <BarcodeLabel key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
