import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

// Validates an EAN-13/UPC-A check digit. Real retail barcodes are
// mathematically self-checking — if the computed check digit doesn't match
// the last digit, the scan was misread (bad angle/glare/motion), not a
// real code. Catching this lets us silently keep scanning instead of
// handing back a garbage number that then fails every lookup.
function isValidEanChecksum(code) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return true; // not EAN-shaped — skip check (e.g. internal/Code128 codes)
  const digits = code.split("").map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  digits.reverse().forEach((d, i) => {
    sum += d * (i % 2 === 0 ? 3 : 1);
  });
  const computed = (10 - (sum % 10)) % 10;
  return computed === checkDigit;
}

// requireConfirmation=false (default, used at POS/NewSale.jsx): fires
// onScan immediately on every valid read — speed matters there, staff are
// scanning dozens of times per sale.
// requireConfirmation=true (used for Add Product's one-time "Scan to Add"
// setup flow): shows the decoded number and waits for an explicit "Use
// This Code" tap before firing onScan — a misread here would silently
// save the wrong barcode onto a new product forever, so it's worth the
// extra second since it only happens once per product ever.
export default function BarcodeScanner({ onScan, onClose, requireConfirmation = false }) {
  const containerId = "barcode-scanner-region";
  const scannerRef = useRef(null);
  const [error, setError] = useState("");
  const [pendingCode, setPendingCode] = useState(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId, {
      // Restrict to real retail/product barcode formats — not QR codes —
      // so the scanner doesn't waste frames on irrelevant formats, which
      // also reduces misreads on glossy/curved packaging.
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
      ],
    });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" }, // prefer rear camera on phones
        // Setup scans get a bigger box + lower fps (prioritize a clean
        // read over speed, since it only happens once per product). POS
        // scans keep the original tighter/faster settings.
        requireConfirmation
          ? { fps: 6, qrbox: { width: 300, height: 180 } }
          : { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (!isValidEanChecksum(decodedText)) return; // likely misread — keep scanning silently
          if (requireConfirmation) {
            setPendingCode(decodedText);
          } else {
            onScan(decodedText);
          }
        },
        () => {
          // per-frame "no barcode found" — expected, ignore silently
        }
      )
      .catch((err) => {
        setError(
          "Could not access camera. Make sure you're on HTTPS and granted camera permission."
        );
        console.error(err);
      });

    return () => {
      scanner.stop().catch(() => {}).finally(() => scanner.clear());
    };
  }, [onScan, requireConfirmation]);

  const confirmScan = () => {
    if (pendingCode) onScan(pendingCode);
  };

  const retryScan = () => setPendingCode(null);

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <div className="row" style={{ marginBottom: 8 }}>
          <strong>Scan Barcode</strong>
          <button className="secondary" onClick={onClose}>Close</button>
        </div>
        {error && <div className="error">{error}</div>}
        <div id={containerId} style={{ width: "100%", display: pendingCode ? "none" : "block" }}></div>

        {pendingCode ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Scanned code:</p>
            <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1, margin: 0 }}>{pendingCode}</p>
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
              Check this matches the number printed under the barcode on the packet.
            </p>
            <div className="row" style={{ justifyContent: "center", gap: 10, marginTop: 14 }}>
              <button className="secondary" onClick={retryScan}>Rescan</button>
              <button onClick={confirmScan}>Use This Code</button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
            Point your camera at a product's barcode.{" "}
            {requireConfirmation
              ? "Hold steady, fill the box, avoid glare — curved/glossy packets scan best flattened slightly."
              : "Point your camera at a product's barcode sticker."}
          </p>
        )}
      </div>
    </div>
  );
}
