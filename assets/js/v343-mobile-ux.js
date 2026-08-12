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
    let pendingReceiptDocumentV346 = null;

    const getReport = id => (typeof reports !== "undefined" ? reports : []).find(report => String(report.id) === String(id));
    const isMobile = () => matchMedia("(max-width: 860px)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    const supportsBluetoothPrint = () => !!navigator.bluetooth && !(typeof isIPhoneDevice === "function" && isIPhoneDevice());

    const PRINTER_MEMORY_KEY_V345 = "repairlog_thermal_printer_v345";
    const PRINTER_PROFILE_KEY_V346 = "repairlog_thermal_profile_v346";
    const boundPrinterDevicesV345 = new WeakSet;
    let restorePrinterPromiseV345 = null;

    function printerMemoryV345() {
        try {
            const value = JSON.parse(localStorage.getItem(PRINTER_MEMORY_KEY_V345) || "null");
            return value && value.id ? value : null;
        } catch (error) {
            return null;
        }
    }

    function rememberPrinterV345(device) {
        if (!device?.id) return;
        try {
            localStorage.setItem(PRINTER_MEMORY_KEY_V345, JSON.stringify({
                id: String(device.id),
                name: device.name || "Printer thermal",
                savedAt: (new Date).toISOString()
            }));
        } catch (error) {}
    }

    function deviceHasSupportedServiceV345(device) {
        return Array.from(device?.uuids || []).some(uuid => SERVICE_UUIDS.includes(String(uuid).toLowerCase()));
    }

    async function permittedPrinterV345() {
        if (!navigator.bluetooth?.getDevices) return null;
        const known = await navigator.bluetooth.getDevices();
        const saved = printerMemoryV345();
        if (saved) {
            const stored = known.find(device => device?.gatt && String(device.id) === String(saved.id));
            if (stored) return stored;
        }
        return known.find(device => device?.gatt && deviceHasSupportedServiceV345(device)) || null;
    }

    function bindPrinterDeviceV345(device) {
        if (!device || boundPrinterDevicesV345.has(device)) return;
        boundPrinterDevicesV345.add(device);
        device.addEventListener?.("gattserverdisconnected", () => {
            printerCharacteristic = null;
            const saved = printerMemoryV345();
            setPrinterStatus(`${device.name || saved?.name || "Printer thermal"} tersimpan. Nyalakan Bluetooth lalu sambungkan ulang.`, false, true);
        });
    }

    async function restorePrinterV345() {
        if (!supportsBluetoothPrint()) return null;
        if (printerDevice?.gatt?.connected && printerCharacteristic) return printerCharacteristic;
        if (restorePrinterPromiseV345) return restorePrinterPromiseV345;
        restorePrinterPromiseV345 = (async () => {
            const saved = printerMemoryV345();
            try {
                const known = await permittedPrinterV345();
                if (!known) {
                    if (saved) setPrinterStatus(`${saved.name || "Printer thermal"} tersimpan. Ketuk Sambungkan jika izin browser perlu dipulihkan.`, false, true);
                    return null;
                }
                printerDevice = known;
                bindPrinterDeviceV345(printerDevice);
                printerCharacteristic = await writableCharacteristic(printerDevice);
                rememberPrinterV345(printerDevice);
                setPrinterStatus(`${printerDevice.name || "Printer thermal"} tersambung otomatis dan siap mencetak.`, true, true);
                return printerCharacteristic;
            } catch (error) {
                if (saved) setPrinterStatus(`${saved.name || "Printer thermal"} tetap tersimpan. Pastikan Bluetooth dan printer menyala.`, false, true);
                return null;
            } finally {
                restorePrinterPromiseV345 = null;
            }
        })();
        return restorePrinterPromiseV345;
    }

    function setPrinterStatus(message, connected = false, remembered = false) {
        const status = document.getElementById("thermalPrinterStatus");
        const button = document.getElementById("thermalPrinterBtn");
        const memory = printerMemoryV345();
        if (status) status.textContent = message;
        if (button) button.textContent = connected ? "Tersambung" : remembered || memory ? "Sambungkan" : "Hubungkan";
        const modalStatus = document.getElementById("receiptPrinterMemoryV345");
        if (modalStatus) {
            const name = printerDevice?.name || memory?.name;
            modalStatus.classList.toggle("is-saved", !!name);
            modalStatus.textContent = connected ? `✓ ${name || "Printer thermal"} tersambung dan akan digunakan.` : name ? `Printer tersimpan: ${name}. Aplikasi akan menyambungkannya kembali otomatis.` : "Belum ada printer tersimpan pada browser ini.";
        }
    }

    function syncPrinterSettings() {
        const row = document.getElementById("thermalPrinterSetRow");
        const printEnabled = typeof FEATURES === "undefined" || FEATURES.print !== false;
        if (row) row.style.display = supportsBluetoothPrint() && printEnabled ? "" : "none";
        syncPrinterProfileUiV346();
        if (!supportsBluetoothPrint() || !printEnabled) return;
        if (printerDevice?.gatt?.connected && printerCharacteristic) {
            setPrinterStatus(`${printerDevice.name || "Printer thermal"} siap mencetak.`, true, true);
            return;
        }
        const saved = printerMemoryV345();
        if (saved) {
            setPrinterStatus(`${saved.name || "Printer thermal"} tersimpan. Menyambungkan otomatis…`, false, true);
            restorePrinterV345();
        } else {
            setPrinterStatus("Belum ada printer thermal yang disimpan.");
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
        if (!printerDevice && restorePrinterPromiseV345) await restorePrinterPromiseV345;
        if (!printerDevice) {
            printerDevice = await permittedPrinterV345();
            if (printerDevice) bindPrinterDeviceV345(printerDevice);
        }
        if (!printerDevice) {
            if (!askUser) return null;
            printerDevice = await navigator.bluetooth.requestDevice({
                filters: SERVICE_UUIDS.map(service => ({ services: [ service ] })),
                optionalServices: SERVICE_UUIDS
            });
            bindPrinterDeviceV345(printerDevice);
        }
        printerCharacteristic = await writableCharacteristic(printerDevice);
        rememberPrinterV345(printerDevice);
        setPrinterStatus(`${printerDevice.name || "Printer thermal"} siap mencetak.`, true, true);
        return printerCharacteristic;
    }

    async function pairThermalPrinterV343() {
        const button = document.getElementById("thermalPrinterBtn");
        if (button) button.disabled = true;
        setPrinterStatus(printerMemoryV345() ? "Menyambungkan printer tersimpan…" : "Mencari printer thermal BLE yang kompatibel…", false, !!printerMemoryV345());
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
        return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
    }

    function printerProfileV346() {
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(PRINTER_PROFILE_KEY_V346) || "null");
        } catch (error) {}
        const paper = saved?.paper === "80" ? "80" : "58";
        const density = saved?.density === "compact" ? "compact" : "normal";
        const columns = paper === "80" ? density === "compact" ? 64 : 48 : density === "compact" ? 42 : 32;
        return {
            paper,
            density,
            columns,
            fontCode: density === "compact" ? 1 : 0,
            fontLabel: density === "compact" ? "Font B / rapat" : "Font A / normal",
            label: `${paper} mm • ${density === "compact" ? "Font B" : "Font A"} • ${columns} kolom`
        };
    }

    function storePrinterProfileV346(paper, density) {
        const safePaper = paper === "80" ? "80" : "58";
        const safeDensity = density === "compact" ? "compact" : "normal";
        try {
            localStorage.setItem(PRINTER_PROFILE_KEY_V346, JSON.stringify({ paper: safePaper, density: safeDensity }));
        } catch (error) {}
        syncPrinterProfileUiV346();
        const report = getReport(pendingReceiptId);
        if (report) updateReceiptPreviewV345(report);
        return printerProfileV346();
    }

    function profileControlValuesV346(source) {
        const ids = source === "preview" ? [ "receiptPaperV346", "receiptDensityV346" ] : source === "calibration" ? [ "calibrationPaperV346", "calibrationDensityV346" ] : [ "thermalPaperSizeV346", "thermalDensityV346" ];
        return {
            paper: document.getElementById(ids[0])?.value || printerProfileV346().paper,
            density: document.getElementById(ids[1])?.value || printerProfileV346().density
        };
    }

    function savePrinterProfileV346(source = "settings") {
        const value = profileControlValuesV346(source);
        const profile = storePrinterProfileV346(value.paper, value.density);
        if (typeof toast === "function") toast(`Profil printer ${profile.label} disimpan.`, "success");
    }

    function syncPrinterProfileUiV346() {
        const profile = printerProfileV346();
        [ "thermalPaperSizeV346", "receiptPaperV346", "calibrationPaperV346" ].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = profile.paper;
        });
        [ "thermalDensityV346", "receiptDensityV346", "calibrationDensityV346" ].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = profile.density;
        });
        const summary = document.getElementById("thermalProfileSummaryV346");
        if (summary) summary.textContent = `${profile.label}. Profil 58 mm / Font A direkomendasikan untuk printer pada foto contoh.`;
        const badge = document.getElementById("receiptProfileBadgeV346");
        if (badge) badge.textContent = profile.label;
        const calibration = document.getElementById("calibrationProfileSummaryV346");
        if (calibration) calibration.innerHTML = `<article><span>Kertas</span><strong>${profile.paper} mm</strong><small>Lebar fisik</small></article><article><span>Font</span><strong>${profile.density === "compact" ? "B" : "A"}</strong><small>${profile.density === "compact" ? "Karakter rapat" : "Karakter normal"}</small></article><article><span>Kolom</span><strong>${profile.columns}</strong><small>Karakter per baris</small></article>`;
    }

    function wrapTextV346(value, width) {
        const text = ascii(value);
        if (!text) return [ "" ];
        const lines = [];
        let current = "";
        text.split(" ").forEach(originalWord => {
            let word = originalWord;
            while (word.length > width) {
                if (current) {
                    lines.push(current);
                    current = "";
                }
                lines.push(word.slice(0, width));
                word = word.slice(width);
            }
            if (!word) return;
            if (!current) current = word;
            else if (current.length + 1 + word.length <= width) current += ` ${word}`;
            else {
                lines.push(current);
                current = word;
            }
        });
        if (current) lines.push(current);
        return lines.length ? lines : [ "" ];
    }

    function fitLineV346(value, width) {
        return ascii(value).slice(0, Math.max(0, width));
    }

    function centerLineV346(value, width) {
        const text = fitLineV346(value, width);
        return " ".repeat(Math.max(0, Math.floor((width - text.length) / 2))) + text;
    }

    function pairLinesV346(left, right, width) {
        const l = ascii(left);
        const r = ascii(right);
        if (!r) return wrapTextV346(l, width);
        if (l.length + r.length + 1 <= width) return [ l + " ".repeat(width - l.length - r.length) + r ];
        const result = wrapTextV346(l, width);
        wrapTextV346(r, width).forEach(part => result.push(" ".repeat(Math.max(0, width - part.length)) + part));
        return result;
    }

    function receiptTextDocumentV346(report, forcedProfile) {
        const profile = forcedProfile || printerProfileV346();
        const width = profile.columns;
        const divider = "-".repeat(width);
        const items = receiptLines(report);
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const total = Number(report.fee) || subtotal;
        const method = typeof payMetaStr === "function" ? ascii(payMetaStr(report)) : "";
        const lines = [];
        const addPair = (left, right) => lines.push(...pairLinesV346(left, right, width));
        lines.push(centerLineV346(String(BRAND.name || "RepairLog").toUpperCase(), width));
        if (BRAND.tagline) lines.push(centerLineV346(BRAND.tagline, width));
        lines.push(divider);
        addPair("No. tiket", report.ticket_no || "-");
        addPair("Tanggal ambil", fmtDate(report.date_out || (new Date).toISOString()));
        addPair("Customer", report.customer || "-");
        addPair("Perangkat", report.device || "-");
        addPair("Kasir / Teknisi", typeof techName === "function" ? techName(report.assigned_to) : "-");
        lines.push(divider);
        items.forEach(item => {
            lines.push(...wrapTextV346(item.label, width));
            addPair(`${item.qty} x ${rp(item.unit)}`, rp(item.total));
        });
        lines.push(divider);
        addPair("Sub total", rp(subtotal));
        addPair("TOTAL", rp(total));
        if (method) addPair(`Bayar (${method})`, rp(total));
        addPair("Status", report.payment_status || "Belum");
        lines.push(divider);
        lines.push(centerLineV346("TERIMA KASIH", width));
        wrapTextV346("Struk ini menjadi bukti bahwa customer sudah mengambil barang. Mohon lakukan pengecekan sebelum meninggalkan toko. Barang yang sudah diambil tidak dapat dikembalikan atau diuangkan kembali.", width).forEach(line => lines.push(centerLineV346(line, width)));
        lines.push("");
        lines.push(centerLineV346(`Dicetak ${(new Date).toLocaleString("id-ID")}`, width));
        return { profile, lines, reportId: report?.id ?? null };
    }

    function joinByteChunksV346(chunks) {
        const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const output = new Uint8Array(size);
        let offset = 0;
        chunks.forEach(chunk => {
            output.set(chunk, offset);
            offset += chunk.length;
        });
        return output;
    }

    function receiptEscPos(report) {
        const profile = printerProfileV346();
        const cached = pendingReceiptDocumentV346;
        const documentData = cached && String(cached.reportId) === String(report?.id) && cached.profile.paper === profile.paper && cached.profile.density === profile.density ? cached : receiptTextDocumentV346(report, profile);
        const encoder = new TextEncoder;
        return joinByteChunksV346([
            new Uint8Array([ 27, 64, 27, 116, 0, 27, 77, documentData.profile.fontCode, 29, 33, 0, 27, 50, 27, 97, 0, 27, 69, 0 ]),
            encoder.encode(documentData.lines.join("\n") + "\n\n\n"),
            new Uint8Array([ 29, 86, 66, 0 ])
        ]);
    }

    function calibrationLinesV346(profile) {
        const width = profile.columns;
        const digits = Array.from({ length: width }, (_, index) => String((index + 1) % 10)).join("");
        return [
            centerLineV346("KALIBRASI REPAIRLOG", width),
            centerLineV346(profile.label, width),
            "-".repeat(width),
            digits,
            "|" + "-".repeat(Math.max(0, width - 2)) + "|",
            ...wrapTextV346("Jika garis dan dua tanda | tetap dalam satu baris, profil ini sesuai.", width),
            ""
        ];
    }

    function calibrationEscPosV346(mode = "active") {
        const encoder = new TextEncoder;
        const active = printerProfileV346();
        const profiles = mode === "all" ? [
            { paper: "58", density: "normal", columns: 32, fontCode: 0, label: "58 mm - Font A - 32 kolom" },
            { paper: "58", density: "compact", columns: 42, fontCode: 1, label: "58 mm - Font B - 42 kolom" },
            { paper: "80", density: "normal", columns: 48, fontCode: 0, label: "80 mm - Font A - 48 kolom" },
            { paper: "80", density: "compact", columns: 64, fontCode: 1, label: "80 mm - Font B - 64 kolom" }
        ] : [ active ];
        const chunks = [ new Uint8Array([ 27, 64, 27, 116, 0, 29, 33, 0, 27, 50, 27, 97, 0 ]) ];
        profiles.forEach(profile => {
            chunks.push(new Uint8Array([ 27, 77, profile.fontCode ]));
            chunks.push(encoder.encode(calibrationLinesV346(profile).join("\n") + "\n"));
        });
        chunks.push(encoder.encode("\n\n"));
        chunks.push(new Uint8Array([ 29, 86, 66, 0 ]));
        return joinByteChunksV346(chunks);
    }

    function ensurePrinterCalibrationV346() {
        if (document.getElementById("printerCalibrationV346")) return;
        document.body.insertAdjacentHTML("beforeend", `<div id="printerCalibrationV346" class="modal-bg" role="dialog" aria-modal="true" aria-labelledby="printerCalibrationTitleV346" onclick="if(event.target===this)closeModal('printerCalibrationV346')"><div class="modal printer-calibration-modal-v346"><div class="row"><div><span class="dashboard-kicker">Penyesuaian ESC/POS</span><h2 id="printerCalibrationTitleV346" style="margin:3px 0">Kalibrasi Printer Thermal</h2></div><button class="btn small secondary" type="button" onclick="closeModal('printerCalibrationV346')" aria-label="Tutup">×</button></div><p class="muted" style="line-height:1.55">Pilih ukuran kertas dan font. Profil menentukan jumlah karakter yang boleh dicetak dalam satu baris.</p><div class="receipt-profile-controls-v346"><label>Lebar kertas<select id="calibrationPaperV346" onchange="savePrinterProfileV346('calibration')"><option value="58">58 mm</option><option value="80">80 mm</option></select></label><label>Kepadatan<select id="calibrationDensityV346" onchange="savePrinterProfileV346('calibration')"><option value="normal">Normal / Font A</option><option value="compact">Rapat / Font B</option></select></label></div><div id="calibrationProfileSummaryV346" class="calibration-profile-card-v346"></div><ol class="calibration-steps-v346"><li>Mulai dari <strong>58 mm / Font A / 32 kolom</strong> untuk printer pada foto.</li><li>Cetak tes profil aktif. Pastikan garis dengan dua tanda <strong>|</strong> tidak turun ke baris berikutnya.</li><li>Jika masih rapi dan ingin karakter lebih kecil, coba Font B. Gunakan “Semua Profil” untuk membandingkan.</li><li>Simpan profil yang paling lebar tetapi tetap satu baris.</li></ol><div class="calibration-actions-v346"><button class="btn" type="button" data-calibration-print onclick="printPrinterCalibrationV346('active')">🧾 Tes Profil Aktif</button><button class="btn secondary" type="button" data-calibration-print onclick="printPrinterCalibrationV346('all')">📏 Cetak Semua Profil</button></div><div id="printerCalibrationStatusV346" aria-live="polite"></div></div></div>`);
    }

    function openPrinterCalibrationV346() {
        ensurePrinterCalibrationV346();
        syncPrinterProfileUiV346();
        openModal("printerCalibrationV346");
    }

    async function printPrinterCalibrationV346(mode = "active") {
        const buttons = [ ...document.querySelectorAll("#printerCalibrationV346 [data-calibration-print]") ];
        const status = document.getElementById("printerCalibrationStatusV346");
        buttons.forEach(button => button.disabled = true);
        if (status) status.textContent = "Mengirim tes kalibrasi ke printer…";
        try {
            await writePrinter(calibrationEscPosV346(mode));
            if (status) status.textContent = mode === "all" ? "Semua profil tercetak. Pilih garis terlebar yang tidak turun baris." : "Tes profil aktif tercetak. Periksa kedua tanda | pada satu baris.";
            if (typeof toast === "function") toast("Tes kalibrasi berhasil dicetak.", "success");
        } catch (error) {
            if (status) status.textContent = error.message || "Kalibrasi gagal dicetak.";
            if (error?.name !== "NotFoundError" && typeof toast === "function") toast(error.message || "Kalibrasi gagal dicetak.", "error");
        } finally {
            buttons.forEach(button => button.disabled = false);
        }
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

    function updateReceiptPreviewV345(report) {
        const target = document.getElementById("receiptPrintPreviewV345");
        if (!target || !report) return;
        const documentData = receiptTextDocumentV346(report);
        pendingReceiptDocumentV346 = documentData;
        target.innerHTML = `<pre class="receipt-paper-v346" data-paper="${documentData.profile.paper}" data-density="${documentData.profile.density}">${esc(documentData.lines.join("\n"))}</pre>`;
        syncPrinterProfileUiV346();
    }

    function ensurePrintModal() {
        if (document.getElementById("receiptPrintModal")) return;
        document.body.insertAdjacentHTML("beforeend", `<div id="receiptPrintModal" class="modal-bg" role="dialog" aria-modal="true" aria-labelledby="receiptPrintTitle" onclick="if(event.target===this)closeModal('receiptPrintModal')"><div class="modal receipt-print-modal-v345"><div class="row"><div><span class="dashboard-kicker">Resi pengambilan</span><h2 id="receiptPrintTitle" style="margin:3px 0">Pratinjau sebelum mencetak</h2></div><button class="btn small secondary" type="button" onclick="closeModal('receiptPrintModal')" aria-label="Tutup">×</button></div><div class="receipt-preview-layout-v345"><section class="receipt-preview-panel-v345"><div class="receipt-preview-head-v345"><div><strong>Preview Bluetooth ESC/POS</strong><small>Baris ini sama dengan data teks yang dikirim ke printer.</small></div><span id="receiptProfileBadgeV346" class="receipt-profile-badge-v346"></span></div><div class="receipt-paper-stage-v345"><div id="receiptPrintPreviewV345"></div></div></section><aside class="receipt-choice-panel-v345"><div class="receipt-profile-controls-v346"><label>Lebar kertas<select id="receiptPaperV346" onchange="savePrinterProfileV346('preview')"><option value="58">58 mm</option><option value="80">80 mm</option></select></label><label>Kepadatan<select id="receiptDensityV346" onchange="savePrinterProfileV346('preview')"><option value="normal">Normal / Font A</option><option value="compact">Rapat / Font B</option></select></label></div><button class="btn small secondary receipt-calibration-trigger-v346" type="button" onclick="openPrinterCalibrationV346()">📏 Kalibrasi printer</button><p id="receiptPrintHint" class="muted" style="margin:0 0 10px;line-height:1.5"></p><div id="receiptPrinterMemoryV345" class="receipt-printer-memory-v345"></div><div class="receipt-print-options"><button id="receiptBluetoothOption" class="receipt-print-option primary" type="button" onclick="printReceiptBluetoothV343()"><strong>🖨️ Cetak ke Printer Bluetooth</strong><small>Cetak menggunakan profil ESC/POS yang terlihat pada preview.</small></button><button class="receipt-print-option" type="button" onclick="printReceiptSystemV343()"><strong>📄 Dialog cetak / PDF</strong><small>Gunakan AirPrint, printer sistem, atau simpan sebagai PDF.</small></button></div></aside></div></div></div>`);
    }

    function openReceiptPrintOptions(id) {
        const report = getReport(id);
        if (!report || !(report.stage === "Diambil" || /diambil/i.test(report.status || ""))) {
            return typeof toast === "function" && toast("Cetak resi tersedia setelah tiket masuk papan Diambil.", "error");
        }
        pendingReceiptId = id;
        ensurePrintModal();
        renderReceipt(report);
        updateReceiptPreviewV345(report);
        const bluetooth = document.getElementById("receiptBluetoothOption");
        const hint = document.getElementById("receiptPrintHint");
        const saved = printerMemoryV345();
        if (bluetooth) bluetooth.style.display = supportsBluetoothPrint() ? "grid" : "none";
        if (hint) hint.textContent = supportsBluetoothPrint() ? saved ? "Periksa pratinjau. Printer tersimpan akan disambungkan otomatis tanpa memilih ulang perangkat." : "Periksa pratinjau. Cetak Bluetooth pertama akan meminta Anda memilih printer yang kompatibel." : "Periksa pratinjau, lalu gunakan Dialog cetak. Pada iPhone pilih printer AirPrint yang tersedia.";
        syncPrinterSettings();
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
    window.openPrinterCalibrationV346 = openPrinterCalibrationV346;
    window.printPrinterCalibrationV346 = printPrinterCalibrationV346;
    window.savePrinterProfileV346 = savePrinterProfileV346;
    window.printerProfileV346 = printerProfileV346;
    window.receiptTextPreviewV346 = id => receiptTextDocumentV346(getReport(id));
    window.restoreThermalPrinterV345 = restorePrinterV345;
    window.thermalPrinterStateV345 = () => ({
        remembered: !!printerMemoryV345(),
        name: printerDevice?.name || printerMemoryV345()?.name || null,
        connected: !!printerDevice?.gatt?.connected,
        ready: !!printerCharacteristic
    });
    window.printPickupReceiptV342 = id => openReceiptPrintOptions(id);

    ensurePrintModal();
    syncPrinterSettings();
    if (typeof applyBiometricUi === "function") applyBiometricUi();
})();
