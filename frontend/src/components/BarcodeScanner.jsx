import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function BarcodeScanner({ onScan, onClose }) {
  const containerId = "barcode-scanner-region";
  const scannerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" }, // prefer rear camera on phones
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          onScan(decodedText);
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
  }, [onScan]);

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <div className="row" style={{ marginBottom: 8 }}>
          <strong>Scan Barcode</strong>
          <button className="secondary" onClick={onClose}>Close</button>
        </div>
        {error && <div className="error">{error}</div>}
        <div id={containerId} style={{ width: "100%" }}></div>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          Point your camera at a product's barcode sticker.
        </p>
      </div>
    </div>
  );
}
