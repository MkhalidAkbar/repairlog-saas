(() => {
    "use strict";

    const SERVICE_UUIDS = [
        "000018f0-0000-1000-8000-00805f9b34fb",
        "0000ffe0-0000-1000-8000-00805f9b34fb",
        "0000ff00-0000-1000-8000-00805f9b34fb",
        "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2"
    ];
    let printerDevice = null;
    let printerCharacteristic = null;
    let pendingReceiptId = null;

    const getReport = id => (typeof reports !== "undefined" ? reports : []).find(report => String(report.id) === String(id));
    const isMobile = () => matchMedia("(max-width: 860px)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    const supportsBluetoothPrint = () => !!navigator.bluetooth && !(typeof isIPhoneDevice === "function" && isIPhoneDevice());

    function setPrinterStatus(message, connected = false) {
        const status = document.getElementById("thermalPrinterStatus");
        const button = document.getElementById("thermalPrinterBtn");
        if (status) status.textContent = message;
        if (button) button.textContent = connected ? "Tersambung" : "Hubungkan";
    }

    function syncPrinterSettings() {
        const row = document.getElementById("thermalPrinterSetRow");
        if (!row) return;
        const printEnabled = typeof FEATURES === "undefined" || FEATURES.print !== false;
        row.style.display = supportsBluetoothPrint() && printEnabled ? "" : "none";
        if (printerDevice?.gatt?.connected && printerCharacteristic) {
            setPrinterStatus(`${printerDevice.name || "Printer thermal"} siap mencetak.`, true);
        }
    }

    async function writableCharacteristic(device) {
        const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
        for (const uuid of SERVICE_UUIDS) {
            try {
                const service = await server.getPrimaryService(uuid);
                const characteristics = await service.getCharacteristics();
                const writable = characteristics.find(item => item.properties.writeWithoutResponse || item.properties.write || item.properties.writeWithResponse);
                if (writable) return writable;
            } catch (error) {}
        }
        throw new Error("Layanan cetak BLE tidak ditemukan. Pastikan printer memakai mode BLE ESC/POS.");
    }

    async function connectPrinter(askUser = true) {
        if (!supportsBluetoothPrint()) throw new Error("Browser ini belum mendukung koneksi printer Bluetooth langsung.");
        if (printerDevice?.gatt?.connected && printerCharacteristic) return printerCharacteristic;
        if (!printerDevice && !askUser && navigator.bluetooth.getDevices) {
            const known = await navigator.bluetooth.getDevices();
            printerDevice = known.find(device => device.gatt && Array.isArray(device.uuids) && device.uuids.some(uuid => SERVICE_UUIDS.includes(String(uuid).toLowerCase()))) || null;
        }
        if (!printerDevice) {
            printerDevice = await navigator.bluetooth.requestDevice({
                filters: SERVICE_UUIDS.map(service => ({ services: [ service ] })),
                optionalServices: SERVICE_UUIDS
            });
            printerDevice.addEventListener("gattserverdisconnected", () => {
                printerCharacteristic = null;
                setPrinterStatus("Printer terputus. Ketuk Hubungkan untuk menyambungkan ulang.");
            });
        }
        printerCharacteristic = await writableCharacteristic(printerDevice);
        setPrinterStatus(`${printerDevice.name || "Printer thermal"} siap mencetak.`, true);
        return printerCharacteristic;
    }

    async function pairThermalPrinterV343() {
        const button = document.getElementById("thermalPrinterBtn");
        if (button) button.disabled = true;
        setPrinterStatus("Mencari printer thermal BLE yang kompatibel…");
        try {
            await connectPrinter(true);
            if (typeof toast === "function") toast("Printer thermal tersambung.", "success");
        } catch (error) {
            if (error?.name !== "NotFoundError") {
                setPrinterStatus(error.message || "Printer gagal disambungkan.");
                if (typeof toast === "function") toast(error.message || "Printer gagal disambungkan.", "error");
            } else {
                setPrinterStatus("Pemilihan printer dibatalkan.");
            }
        } finally {
            if (button) button.disabled = false;
        }
    }

    function receiptLines(report) {
        const lines = [];
        const items = (Array.isArray(report.cost_items) ? report.cost_items : []).filter(item => item.label && !item.returned);
        items.forEach(item => {
            const qty = Number(item.qty) || 1;
            const unit = Number(item.price) || 0;
            lines.push({
                label: item.label,
                qty,
                unit,
                total: qty * unit
            });
        });
        const partTotal = lines.reduce((sum, line) => sum + line.total, 0);
        const total = Number(report.fee) || partTotal;
        const serviceTotal = Math.max(0, total - partTotal);
        if (report.tasks || serviceTotal || !lines.length) lines.unshift({
            label: report.tasks ? `Service (${report.tasks})` : "Service",
            qty: 1,
            unit: serviceTotal || total,
            total: serviceTotal || total
        });
        return lines;
    }

    function renderReceipt(report) {
        const lines = receiptLines(report);
        const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
        const total = Number(report.fee) || subtotal;
        const method = typeof payMetaStr === "function" ? payMetaStr(report) : "";
        const logo = BRAND.logoUrl ? `<img src="${esc(BRAND.logoUrl)}" alt="logo">` : `<div class="pickup-receipt-logo">${esc(BRAND.logo || "🛠️")}</div>`;
        const rows = lines.map(line => `<div class="pickup-receipt-item"><div>${esc(line.label)}</div><div>${line.qty} × ${rp(line.unit)}</div><strong>${rp(line.total)}</strong></div>`).join("");
        const printArea = document.getElementById("printArea");
        if (!printArea) return;
        printArea.innerHTML = `<article class="pickup-receipt-v342">${logo}<h1>${esc(BRAND.name || "RepairLog")}</h1><p class="pickup-receipt-address">${esc(BRAND.tagline || "Service & Sparepart")}</p><div class="pickup-receipt-rule"></div><div class="pickup-receipt-meta"><span>No. tiket</span><strong>${esc(report.ticket_no || "-")}</strong><span>Tanggal ambil</span><strong>${fmtDate(report.date_out || (new Date).toISOString())}</strong><span>Customer</span><strong>${esc(report.customer || "-")}</strong><span>Perangkat</span><strong>${esc(report.device || "-")}</strong><span>Kasir / Teknisi</span><strong>${esc(typeof techName === "function" ? techName(report.assigned_to) : "-")}</strong></div><div class="pickup-receipt-rule"></div>${rows}<div class="pickup-receipt-rule"></div><div class="pickup-receipt-total"><span>Sub total</span><strong>${rp(subtotal)}</strong><span>Total</span><strong>${rp(total)}</strong>${method ? `<span>Bayar (${esc(method)})</span><strong>${rp(total)}</strong>` : ""}<span>Status</span><strong>${esc(report.payment_status || "Belum")}</strong></div><div class="pickup-receipt-rule"></div><h2>TERIMA KASIH</h2><p class="pickup-receipt-note">Struk ini menjadi bukti bahwa customer sudah mengambil barang. Mohon lakukan pengecekan sebelum meninggalkan toko. Barang yang sudah diambil tidak dapat dikembalikan atau diuangkan kembali.</p><p class="pickup-receipt-time">Dicetak ${(new Date).toLocaleString("id-ID")}</p></article>`;
    }

    function ascii(value) {
        return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
    }

    function fit(value, width) {
        const text = ascii(value);
        return text.length > width ? `${text.slice(0, Math.max(1, width - 1))}~` : text;
    }

    function pair(left, right, width = 42) {
        const r = fit(right, Math.floor(width * .48));
        const l = fit(left, Math.max(1, width - r.length - 1));
        return l + " ".repeat(Math.max(1, width - l.length - r.length)) + r;
    }

    function receiptEscPos(report) {
        const width = 42;
        const items = receiptLines(report);
        const total = Number(report.fee) || items.reduce((sum, item) => sum + item.total, 0);
        const divider = "-".repeat(width);
        const text = [];
        text.push(ascii(BRAND.name || "RepairLog"));
        if (BRAND.tagline) text.push(ascii(BRAND.tagline));
        text.push(divider);
        text.push(pair("No. tiket", report.ticket_no || "-", width));
        text.push(pair("Tanggal ambil", fmtDate(report.date_out || (new Date).toISOString()), width));
        text.push(pair("Customer", report.customer || "-", width));
        text.push(pair("Perangkat", report.device || "-", width));
        text.push(divider);
        items.forEach(item => {
            text.push(fit(item.label, width));
            text.push(pair(`${item.qty} x ${rp(item.unit)}`, rp(item.total), width));
        });
        text.push(divider);
        text.push(pair("TOTAL", rp(total), width));
        text.push(pair("Status", report.payment_status || "Belum", width));
        text.push(divider);
        text.push("TERIMA KASIH");
        text.push("Simpan struk ini sebagai bukti pengambilan barang.");
        const encoder = new TextEncoder;
        const chunks = [
            new Uint8Array([ 27, 64, 27, 97, 1, 27, 69, 1 ]),
            encoder.encode(text.slice(0, 2).join("\n") + "\n"),
            new Uint8Array([ 27, 69, 0, 27, 97, 0 ]),
            encoder.encode(text.slice(2, -3).join("\n") + "\n"),
            new Uint8Array([ 27, 97, 1, 27, 69, 1 ]),
            encoder.encode(text.slice(-3).join("\n") + "\n\n\n"),
            new Uint8Array([ 27, 69, 0, 29, 86, 66, 0 ])
        ];
        const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const output = new Uint8Array(size);
        let offset = 0;
        chunks.forEach(chunk => {
            output.set(chunk, offset);
            offset += chunk.length;
        });
        return output;
    }

    async function writePrinter(bytes) {
        const characteristic = await connectPrinter(true);
        for (let offset = 0; offset < bytes.length; offset += 20) {
            const chunk = bytes.slice(offset, offset + 20);
            if (typeof characteristic.writeValueWithoutResponse === "function") {
                await characteristic.writeValueWithoutResponse(chunk);
            } else if (typeof characteristic.writeValueWithResponse === "function") {
                await characteristic.writeValueWithResponse(chunk);
            } else {
                await characteristic.writeValue(chunk);
            }
            await new Promise(resolve => setTimeout(resolve, 5));
        }
    }

    function ensurePrintModal() {
        if (document.getElementById("receiptPrintModal")) return;
        document.body.insertAdjacentHTML("beforeend", '<div id="receiptPrintModal" class="modal-bg" role="dialog" aria-modal="true" aria-labelledby="receiptPrintTitle" onclick="if(event.target===this)closeModal(\'receiptPrintModal\')"><div class="modal" style="max-width:520px"><div class="row"><div><span class="dashboard-kicker">Resi pengambilan</span><h2 id="receiptPrintTitle" style="margin:3px 0">Pilih cara mencetak</h2></div><button class="btn small secondary" type="button" onclick="closeModal(\'receiptPrintModal\')">×</button></div><p id="receiptPrintHint" class="muted" style="margin-top:8px;line-height:1.5"></p><div class="receipt-print-options"><button id="receiptBluetoothOption" class="receipt-print-option primary" type="button" onclick="printReceiptBluetoothV343()"><strong>🖨️ Printer Bluetooth</strong><small>Cetak langsung ke printer thermal BLE ESC/POS.</small></button><button class="receipt-print-option" type="button" onclick="printReceiptSystemV343()"><strong>📄 Dialog cetak</strong><small>Gunakan dialog cetak bawaan ponsel, AirPrint, atau simpan PDF.</small></button></div></div></div>');
    }

    function openReceiptPrintOptions(id) {
        const report = getReport(id);
        if (!report || !(report.stage === "Diambil" || /diambil/i.test(report.status || ""))) {
            return typeof toast === "function" && toast("Cetak resi tersedia setelah tiket masuk papan Diambil.", "error");
        }
        pendingReceiptId = id;
        renderReceipt(report);
        ensurePrintModal();
        const bluetooth = document.getElementById("receiptBluetoothOption");
        const hint = document.getElementById("receiptPrintHint");
        if (bluetooth) bluetooth.style.display = supportsBluetoothPrint() ? "grid" : "none";
        if (hint) hint.textContent = supportsBluetoothPrint() ? "Untuk cetak langsung, nyalakan printer dan pilih Printer Bluetooth. Koneksi pertama akan meminta izin perangkat." : "Browser ini tidak membuka printer Bluetooth langsung. Gunakan Dialog cetak; pada iPhone pilih printer AirPrint yang tersedia.";
        openModal("receiptPrintModal");
    }

    function printReceiptSystemV343() {
        const report = getReport(pendingReceiptId);
        if (!report) return;
        renderReceipt(report);
        closeModal("receiptPrintModal");
        document.body.classList.add("printing-pickup-receipt-v342");
        window.addEventListener("afterprint", () => document.body.classList.remove("printing-pickup-receipt-v342"), {
            once: true
        });
        document.getElementById("printArea")?.getBoundingClientRect();
        window.print();
    }

    async function printReceiptBluetoothV343() {
        const report = getReport(pendingReceiptId);
        const button = document.getElementById("receiptBluetoothOption");
        if (!report || !button) return;
        button.disabled = true;
        try {
            await writePrinter(receiptEscPos(report));
            closeModal("receiptPrintModal");
            if (typeof toast === "function") toast("Resi berhasil dikirim ke printer thermal.", "success");
        } catch (error) {
            if (error?.name !== "NotFoundError" && typeof toast === "function") toast(error.message || "Gagal mencetak ke printer Bluetooth.", "error");
        } finally {
            button.disabled = false;
        }
    }

    const previousOpenSettings = window.openSettings;
    if (previousOpenSettings) window.openSettings = function openSettingsV343() {
        const result = previousOpenSettings();
        syncPrinterSettings();
        return result;
    };

    [ "setCrmV34", "setFinanceV34", "setHealthV34", "setFinanceKindV34" ].forEach(name => {
        const original = window[name];
        if (!original) return;
        window[name] = function scrollableTabsV343(...args) {
            const result = original.apply(this, args);
            requestAnimationFrame(() => {
                const root = name.includes("Crm") ? document.getElementById("crmTabs") : name.includes("Finance") ? document.getElementById("finTabs") : document.querySelector("#tab-health .rl-tabs");
                root?.querySelector("button.active")?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center"
                });
            });
            return result;
        };
    });

    window.pairThermalPrinterV343 = pairThermalPrinterV343;
    window.printReceiptSystemV343 = printReceiptSystemV343;
    window.printReceiptBluetoothV343 = printReceiptBluetoothV343;
    window.printPickupReceiptV342 = id => {
        if (isMobile()) return openReceiptPrintOptions(id);
        pendingReceiptId = id;
        return printReceiptSystemV343();
    };

    ensurePrintModal();
    syncPrinterSettings();
    if (typeof applyBiometricUi === "function") applyBiometricUi();
})();
