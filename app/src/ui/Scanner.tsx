// Camera scanning is only on the web for now (BarcodeDetector); in the native app staff type the code.
export function Scanner(_: { onCode: (code: string) => void; label: string; kind?: 'qr' | 'barcode'; start?: boolean }) { return null; }
