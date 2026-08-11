(() => {
    const CATEGORY_DEFAULTS = [ "SSD", "HDD", "RAM", "Caddy", "Baterai", "Keyboard", "Layar / LCD", "Charger", "Kipas", "Kabel / Flex", "Port / Konektor", "IC / Chipset", "Lainnya" ];
    const isCanceledV342 = report => /batal|cancel|gagal/i.test(`${report?.status || ""} ${report?.stage || ""}`);
    const partCategoryV342 = part => String(part?.category || "Tanpa kategori").trim() || "Tanpa kategori";
    const categoriesV342 = () => [ ...new Set(CATEGORY_DEFAULTS.concat((PARTS || []).map(partCategoryV342).filter(Boolean))) ].sort((a, b) => a.localeCompare(b, "id"));
    async function movementExistsV342(reportId, partId, type, referenceNo) {
        try {
            const result = await db.from("stock_movements").select("id").eq("store_id", STORE_ID).eq("report_id", reportId).eq("part_id", partId).eq("movement_type", type).eq("reference_no", referenceNo).limit(1);
            return !result.error && Array.isArray(result.data) && result.data.length > 0;
        } catch (_) {
            return false;
        }
    }
    async function saveReportItemsV342(report, items) {
        const result = await db.from("reports").update({
            cost_items: items,
            updated_at: (new Date).toISOString()
        }).eq("id", report.id);
        if (result.error) throw result.error;
        report.cost_items = items;
    }
    async function refreshStockSuiteV342() {
        try {
            if (typeof loadBusinessSuiteData === "function") await loadBusinessSuiteData();
        } catch (_) {}
        try {
            if ($("tab-stock")?.style.display !== "none" && typeof renderStock === "function") renderStock();
        } catch (_) {}
    }
    async function consumePartsForReportImmediate(reportId) {
        const report = reports.find(item => String(item.id) === String(reportId));
        if (!report || isCanceledV342(report)) return true;
        const items = (Array.isArray(report.cost_items) ? report.cost_items : []).map(item => ({ ...item }));
        const pending = items.map((item, index) => ({ item, index })).filter(entry => entry.item.partId && !entry.item.consumed && (Number(entry.item.qty) || 0) > 0);
        if (!pending.length) return true;
        let deducted = 0;
        try {
            for (const entry of pending) {
                const item = entry.item;
                const qty = Number(item.qty) || 1;
                const cycle = Number(item.stock_cycle) || 1;
                const token = `USE:${report.ticket_no || report.id}:${entry.index}:${cycle}`;
                const exists = await movementExistsV342(report.id, item.partId, "reservation_use", token);
                if (!exists) {
                    const part = PARTS.find(candidate => String(candidate.id) === String(item.partId));
                    if (!part || Number(part.stock) < qty) throw new Error(`Stok ${item.label || part?.name || "sparepart"} tidak mencukupi.`);
                    await applyStockMovement({
                        partId: item.partId,
                        delta: -qty,
                        type: "reservation_use",
                        reportId: report.id,
                        unitCost: Number(item.amount) || null,
                        referenceNo: token,
                        note: `Dipakai tiket ${report.ticket_no || report.id} • ${item.label || "sparepart"}`
                    });
                }
                item.consumed = true;
                item.reserved = false;
                item.released = false;
                item.returned = false;
                item.stock_cycle = cycle;
                await saveReportItemsV342(report, items);
                deducted += qty;
            }
            await refreshStockSuiteV342();
            if (deducted) toast(`${deducted} unit sparepart dipotong dan ditautkan ke tiket ${report.ticket_no || ""}.`, "success");
            return true;
        } catch (error) {
            toast("Stok belum dapat dipotong: " + (error.message || error), "error");
            return false;
        }
    }
    async function releasePartsForCanceledReportV342(reportId) {
        const report = reports.find(item => String(item.id) === String(reportId));
        if (!report) return false;
        const items = (Array.isArray(report.cost_items) ? report.cost_items : []).map(item => ({ ...item }));
        let restored = 0;
        try {
            for (let index = 0; index < items.length; index += 1) {
                const item = items[index];
                if (!item.partId) continue;
                if (item.consumed && !item.returned) {
                    const qty = Number(item.qty) || 1;
                    const cycle = Number(item.stock_cycle) || 1;
                    const token = `RETURN:${report.ticket_no || report.id}:${index}:${cycle}`;
                    const exists = await movementExistsV342(report.id, item.partId, "cancellation_return", token);
                    if (!exists) await applyStockMovement({
                        partId: item.partId,
                        delta: qty,
                        type: "cancellation_return",
                        reportId: report.id,
                        unitCost: Number(item.amount) || null,
                        referenceNo: token,
                        note: `Dikembalikan karena tiket ${report.ticket_no || report.id} dibatalkan`
                    });
                    item.consumed = false;
                    item.reserved = false;
                    item.released = true;
                    item.returned = true;
                    item.stock_cycle = cycle + 1;
                    await saveReportItemsV342(report, items);
                    restored += qty;
                } else if (!item.consumed && !item.released) {
                    item.reserved = false;
                    item.released = true;
                    item.returned = true;
                    item.stock_cycle = (Number(item.stock_cycle) || 1) + 1;
                }
            }
            await saveReportItemsV342(report, items);
            await refreshStockSuiteV342();
            if (restored) toast(`${restored} unit sparepart dikembalikan ke stok karena tiket dibatalkan.`, "success");
            return true;
        } catch (error) {
            toast("Gagal mengembalikan stok pembatalan: " + (error.message || error), "error");
            return false;
        }
    }
    window.consumePartsForReportImmediate = consumePartsForReportImmediate;
    window.releaseReservedPartsForReport = releasePartsForCanceledReportV342;
    window.finalizeReservedPartsForReport = consumePartsForReportImmediate;
    function activeTicketUsesV342(partId) {
        return reports.filter(report => !isCanceledV342(report) && (Array.isArray(report.cost_items) ? report.cost_items : []).some(item => String(item.partId) === String(partId) && item.consumed && !item.returned));
    }
    function usedUnitsV342(partId) {
        return reports.reduce((total, report) => {
            if (isCanceledV342(report)) return total;
            return total + (Array.isArray(report.cost_items) ? report.cost_items : []).filter(item => String(item.partId) === String(partId) && item.consumed && !item.returned).reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
        }, 0);
    }
    function updateCategoryOptionsV342() {
        const select = $("stockCategoryFilterV342");
        if (select) {
            const current = select.value;
            select.innerHTML = '<option value="">Semua jenis sparepart</option>' + categoriesV342().map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join("");
            if ([ ...select.options ].some(option => option.value === current)) select.value = current;
        }
        const datalist = $("partCategoryOptionsV342");
        if (datalist) datalist.innerHTML = categoriesV342().map(category => `<option value="${esc(category)}"></option>`).join("");
    }
    function ensurePartCategoryUiV342() {
        const input = $("pf_cat");
        if (!input) return;
        const label = input.previousElementSibling;
        if (label?.tagName === "LABEL") label.textContent = "Jenis sparepart (kategori)";
        input.placeholder = "Pilih atau tulis jenis baru, mis. SSD / Caddy";
        input.setAttribute("list", "partCategoryOptionsV342");
        if (!$("partCategoryOptionsV342")) document.body.insertAdjacentHTML("beforeend", '<datalist id="partCategoryOptionsV342"></datalist>');
        let chips = $("partCategoryChipsV342");
        if (!chips) {
            chips = document.createElement("div");
            chips.id = "partCategoryChipsV342";
            chips.className = "part-category-chips";
            input.insertAdjacentElement("afterend", chips);
        }
        chips.innerHTML = CATEGORY_DEFAULTS.slice(0, 8).map(category => `<button type="button" onclick="setPartCategoryV342('${category.replace(/'/g, "\\'")}')">${esc(category)}</button>`).join("");
        updateCategoryOptionsV342();
    }
    function setPartCategoryV342(category) {
        if ($("pf_cat")) $("pf_cat").value = category;
    }
    window.setPartCategoryV342 = setPartCategoryV342;
    function ensureStockFilterUiV342() {
        if (typeof ensureInventorySuiteUi === "function") ensureInventorySuiteUi();
        const stockTab = $("tab-stock");
        let toolbar = $("stockFilterBarV342") || stockTab?.querySelector(":scope > .toolbar");
        if (!toolbar) return;
        if (toolbar.id !== "stockFilterBarV342") {
            toolbar.id = "stockFilterBarV342";
            toolbar.className = "stock-filterbar";
            toolbar.innerHTML = `<div class="stock-search-field"><span>⌕</span><input id="stockSearchV342" placeholder="Cari nama, SKU, kategori, atau lokasi…" oninput="renderStock()"></div><select id="stockCategoryFilterV342" onchange="renderStock()"></select>${FEATURES.multiDevice ? '<select id="stockDevFilter" onchange="renderStock()"><option value="">Semua perangkat</option></select>' : ""}<label class="stock-low-toggle"><input id="stockLowOnlyV342" type="checkbox" onchange="renderStock()"> Hanya stok menipis</label><button class="btn small secondary" type="button" onclick="resetStockFiltersV342()">Reset</button>`;
        }
        if (FEATURES.multiDevice && $("stockDevFilter") && typeof ensureDevFilter === "function") ensureDevFilter("stockDevFilter");
        updateCategoryOptionsV342();
        ensurePartCategoryUiV342();
    }
    function resetStockFiltersV342() {
        if ($("stockSearchV342")) $("stockSearchV342").value = "";
        if ($("stockCategoryFilterV342")) $("stockCategoryFilterV342").value = "";
        if ($("stockDevFilter")) $("stockDevFilter").value = "";
        if ($("stockLowOnlyV342")) $("stockLowOnlyV342").checked = false;
        renderStock();
    }
    window.resetStockFiltersV342 = resetStockFiltersV342;
    function stockFilteredPartsV342() {
        const query = String($("stockSearchV342")?.value || "").trim().toLowerCase();
        const category = $("stockCategoryFilterV342")?.value || "";
        const device = FEATURES.multiDevice ? $("stockDevFilter")?.value || "" : "";
        const lowOnly = !!$("stockLowOnlyV342")?.checked;
        return PARTS.filter(part => {
            if (category && partCategoryV342(part) !== category) return false;
            if (device && ![ device, "Umum" ].includes(part.device_type || "Umum")) return false;
            if (lowOnly && Number(part.stock) > Number(part.min_stock || 0)) return false;
            if (query) {
                const haystack = `${part.name || ""} ${part.sku || ""} ${part.category || ""} ${part.storage_location || ""}`.toLowerCase();
                if (!haystack.includes(query)) return false;
            }
            return true;
        });
    }
    window.stockFilteredParts = stockFilteredPartsV342;
    function stockOverviewHtmlV342() {
        const totalUnits = PARTS.reduce((sum, part) => sum + (Number(part.stock) || 0), 0);
        const low = PARTS.filter(part => Number(part.stock) <= Number(part.min_stock || 0)).length;
        const value = PARTS.reduce((sum, part) => sum + (Number(part.stock) || 0) * (Number(part.cost_price) || 0), 0);
        const activeUse = PARTS.reduce((sum, part) => sum + usedUnitsV342(part.id), 0);
        return `<div class="stock-hero-v342"><div><span class="dashboard-kicker">Inventori terhubung tiket</span><h3>Ringkasan Stok</h3><p>Stok dipotong saat sparepart disimpan pada tiket proses dan kembali otomatis saat tiket dibatalkan.</p></div><div class="stock-health-v342 ${low ? "needs" : "good"}">${low ? `${low} jenis perlu restock` : "Stok dalam kondisi baik"}</div></div><div class="stock-metrics-v342"><article><span>Jenis sparepart</span><strong>${PARTS.length}</strong><small>${new Set(PARTS.map(partCategoryV342)).size} kategori</small></article><article><span>Total unit tersedia</span><strong>${totalUnits}</strong><small>Sudah dikurangi pemakaian tiket</small></article><article class="used"><span>Dipakai tiket aktif</span><strong>${activeUse}</strong><small>Dapat dilacak per tiket</small></article><article class="${low ? "low" : ""}"><span>Stok menipis</span><strong>${low}</strong><small>Berdasarkan stok minimum</small></article><article><span>Nilai stok</span><strong>${rpShort(value)}</strong><small title="${rp(value)}">Berdasarkan harga beli</small></article></div>`;
    }
    function categorySummaryHtmlV342() {
        const counts = new Map;
        PARTS.forEach(part => counts.set(partCategoryV342(part), (counts.get(partCategoryV342(part)) || 0) + 1));
        return `<div class="stock-category-strip">${[ ...counts.entries() ].sort((a, b) => b[1] - a[1]).map(([category, count]) => `<button type="button" onclick="setStockCategoryV342('${category.replace(/'/g, "\\'")}')"><span>${esc(category)}</span><strong>${count}</strong></button>`).join("")}</div>`;
    }
    function setStockCategoryV342(category) {
        if ($("stockCategoryFilterV342")) $("stockCategoryFilterV342").value = category;
        renderStock();
    }
    window.setStockCategoryV342 = setStockCategoryV342;
    function renderAdvancedPartsTableV342() {
        const list = stockFilteredPartsV342();
        const deviceHead = FEATURES.multiDevice ? "<th>Perangkat</th>" : "";
        const rows = list.length ? list.map(part => {
            const stock = Number(part.stock) || 0;
            const low = stock <= Number(part.min_stock || 0);
            const tickets = activeTicketUsesV342(part.id);
            const ticketHtml = tickets.length ? `<div class="stock-ticket-links">${tickets.slice(0, 3).map(report => `<button type="button" onclick="openDetail('${report.id}')">${esc(report.ticket_no || report.device || "Tiket")}</button>`).join("")}${tickets.length > 3 ? `<span>+${tickets.length - 3}</span>` : ""}</div>` : '<span class="muted">Belum dipakai</span>';
            return `<tr><td><div class="stock-part-name"><span class="stock-category-icon">${esc(partCategoryV342(part).slice(0, 2).toUpperCase())}</span><div><strong>${esc(part.name)}</strong><small>${esc(part.sku || "Tanpa SKU")} • ${esc(partCategoryV342(part))}</small></div></div></td>${FEATURES.multiDevice ? `<td>${esc(part.device_type || "Umum")}</td>` : ""}<td><div class="stock-count ${low ? "low" : ""}"><strong>${stock}</strong><small>minimum ${Number(part.min_stock) || 0}</small></div></td><td>${rp(part.cost_price || 0)}<small>Jual ${rp(part.sell_price || 0)}</small></td><td>${esc(part.storage_location || "-")}</td><td>${ticketHtml}</td><td><div class="table-actions"><button class="btn small" onclick="openStockMovementForm('${part.id}','incoming')">+ Stok</button><button class="btn small secondary" onclick="openPartForm('${part.id}')">Edit</button></div></td></tr>`;
        }).join("") : `<tr><td colspan="${FEATURES.multiDevice ? 7 : 6}"><div class="business-empty"><strong>Sparepart tidak ditemukan</strong><span>Ubah pencarian atau filter jenis sparepart.</span></div></td></tr>`;
        return `<section class="stock-table-panel-v342"><div class="stock-table-head-v342"><div><h3>Daftar sparepart</h3><p>${list.length} dari ${PARTS.length} jenis tampil</p></div><button class="btn" type="button" onclick="openPartForm()">+ Tambah Sparepart</button></div><div class="business-table-wrap"><table class="ftbl business-table stock-table-v342"><thead><tr><th>Sparepart</th>${deviceHead}<th>Stok</th><th>Harga</th><th>Lokasi</th><th>Dipakai tiket</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    }
    function movementLabelV342(type) {
        return {
            incoming: "Stok masuk",
            outgoing: "Stok keluar",
            reservation_use: "Dipakai tiket",
            cancellation_return: "Kembali dari pembatalan",
            adjustment: "Penyesuaian",
            po_receipt: "Penerimaan PO",
            return: "Retur"
        }[type] || type;
    }
    function renderStockMovementTableV342() {
        const rows = STOCK_MOVEMENTS.length ? STOCK_MOVEMENTS.slice(0, 160).map(movement => {
            const part = PARTS.find(item => String(item.id) === String(movement.part_id));
            const report = reports.find(item => String(item.id) === String(movement.report_id));
            const ticket = report ? `<button class="stock-ticket-link" type="button" onclick="openDetail('${report.id}')"><strong>${esc(report.ticket_no || "Tiket")}</strong><small>${esc(report.device || "")}</small></button>` : '<span class="muted">Manual</span>';
            return `<tr><td>${new Date(movement.created_at).toLocaleString("id-ID")}</td><td><strong>${esc(part?.name || "Sparepart")}</strong><small>${esc(partCategoryV342(part))}</small></td><td>${ticket}</td><td><span class="movement-badge ${Number(movement.delta) > 0 ? "in" : "out"}">${esc(movementLabelV342(movement.movement_type))}</span></td><td class="${Number(movement.delta) > 0 ? "stock-in" : "stock-out"}"><strong>${Number(movement.delta) > 0 ? "+" : ""}${movement.delta}</strong></td><td>${movement.stock_before} → ${movement.stock_after}</td><td>${esc(movement.note || "-")}</td></tr>`;
        }).join("") : '<tr><td colspan="7"><div class="business-empty">Belum ada pergerakan stok.</div></td></tr>';
        return `<section class="stock-table-panel-v342"><div class="stock-table-head-v342"><div><h3>Riwayat stok</h3><p>Setiap pemakaian menampilkan tiket yang mengambil sparepart.</p></div><button class="btn" type="button" onclick="openStockMovementForm()">± Pergerakan Stok</button></div><div class="business-table-wrap"><table class="ftbl business-table stock-movement-table-v342"><thead><tr><th>Waktu</th><th>Sparepart</th><th>Tiket</th><th>Jenis</th><th>Jumlah</th><th>Stok</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    }
    window.renderStockMovementTable = renderStockMovementTableV342;
    function renderAdvancedStockV342() {
        ensureStockFilterUiV342();
        const box = $("stockBox");
        if (!box) return;
        document.querySelectorAll("#stockSuiteNav button").forEach(button => button.classList.toggle("active", button.dataset.stockView === STOCK_SUITE_VIEW));
        const toolbar = $("stockFilterBarV342");
        if (toolbar) toolbar.style.display = STOCK_SUITE_VIEW === "parts" ? "" : "none";
        let content = "";
        if (STOCK_SUITE_VIEW === "parts") content = categorySummaryHtmlV342() + renderAdvancedPartsTableV342();
        if (STOCK_SUITE_VIEW === "suppliers") content = renderSupplierTable();
        if (STOCK_SUITE_VIEW === "orders") content = renderPurchaseOrderTable();
        if (STOCK_SUITE_VIEW === "movements") content = renderStockMovementTableV342();
        if (BUSINESS_SCHEMA_READY === false) content = businessMigrationNotice() + content;
        box.innerHTML = stockOverviewHtmlV342() + content;
    }
    window.renderAdvancedStock = renderAdvancedStockV342;
    function ensureMovementCategoryV342() {
        const select = $("sm_part");
        if (!select || $("sm_category_v342")) return;
        const label = select.previousElementSibling;
        const wrap = document.createElement("div");
        wrap.className = "stock-movement-category-v342";
        wrap.innerHTML = '<label>Filter jenis sparepart</label><select id="sm_category_v342" onchange="filterStockMovementPartsV342()"></select>';
        select.parentNode.insertBefore(wrap, label || select);
    }
    function filterStockMovementPartsV342(selectedId) {
        const select = $("sm_part");
        const categorySelect = $("sm_category_v342");
        if (!select || !categorySelect) return;
        const current = selectedId || select.value;
        const category = categorySelect.value;
        const list = PARTS.filter(part => !category || partCategoryV342(part) === category);
        select.innerHTML = '<option value="">Pilih sparepart</option>' + list.map(part => `<option value="${part.id}">${esc(part.name)} • ${esc(partCategoryV342(part))} • stok ${Number(part.stock) || 0}</option>`).join("");
        if ([ ...select.options ].some(option => String(option.value) === String(current))) select.value = current;
    }
    window.filterStockMovementPartsV342 = filterStockMovementPartsV342;
    const originalOpenPartFormV342 = window.openPartForm;
    if (originalOpenPartFormV342) window.openPartForm = function(id) {
        const result = originalOpenPartFormV342(id);
        ensurePartCategoryUiV342();
        return result;
    };
    const originalOpenMovementV342 = window.openStockMovementForm;
    if (originalOpenMovementV342) window.openStockMovementForm = function(partId, type) {
        ensureMovementCategoryV342();
        const result = originalOpenMovementV342(partId, type);
        const categorySelect = $("sm_category_v342");
        if (categorySelect) {
            const currentPart = PARTS.find(part => String(part.id) === String(partId));
            const currentCategory = currentPart ? partCategoryV342(currentPart) : "";
            categorySelect.innerHTML = '<option value="">Semua jenis sparepart</option>' + categoriesV342().map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join("");
            categorySelect.value = currentCategory;
            filterStockMovementPartsV342(partId);
        }
        return result;
    };
    function ensureCancelModalV342() {
        if ($("cancelDirectV342")) return;
        document.body.insertAdjacentHTML("beforeend", `<div id="cancelDirectV342" class="modal-bg" onclick="if(event.target===this)closeModal('cancelDirectV342')"><div class="modal cancel-direct-modal-v342"><div class="row"><div><span class="dashboard-kicker">Pindahkan ke papan Batal</span><h2 style="margin:4px 0">Alasan pembatalan</h2></div><button class="btn small secondary" onclick="closeModal('cancelDirectV342')">×</button></div><input id="cancelDirectIdV342" type="hidden"><p class="muted" id="cancelDirectTicketV342"></p><label>Alasan pembatalan *</label><textarea id="cxReason" rows="4" placeholder="Contoh: sparepart tidak tersedia atau kerusakan tidak dapat diperbaiki"></textarea><label>Biaya pemeriksaan jika ada</label><input id="cxFee" inputmode="numeric" placeholder="0" oninput="this.value=fmtThousand(this.value)"><div class="cancel-stock-note-v342">Sparepart yang sudah dipotong akan otomatis dikembalikan ke stok.</div><div class="actions"><button class="btn secondary" onclick="closeModal('cancelDirectV342')">Kembali</button><button id="saveCancelDirectV342" class="btn danger" onclick="saveDirectCancelV342()">Simpan & pindahkan ke Batal</button></div></div></div>`);
    }
    function openCancelDirectV342(id) {
        ensureCancelModalV342();
        const report = reports.find(item => String(item.id) === String(id));
        $("cancelDirectIdV342").value = id;
        $("cancelDirectTicketV342").textContent = `${report?.ticket_no || "Tiket"} • ${report?.device || ""}`;
        $("cxReason").value = report?.cancel_reason || "";
        $("cxFee").value = report?.cancel_fee ? fmtThousand(report.cancel_fee) : "";
        openModal("cancelDirectV342");
        setTimeout(() => $("cxReason")?.focus(), 80);
    }
    async function saveDirectCancelV342() {
        const id = $("cancelDirectIdV342")?.value;
        if (!id || !$("cxReason")?.value.trim()) return toast("Alasan pembatalan wajib diisi.", "error");
        const button = $("saveCancelDirectV342");
        if (button?.disabled) return;
        if (button) {
            button.disabled = true;
            button.textContent = "Menyimpan…";
        }
        try {
            await saveCancelReason(id);
            const report = reports.find(item => String(item.id) === String(id));
            if (report && isCanceledV342(report)) closeModal("cancelDirectV342");
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Simpan & pindahkan ke Batal";
            }
        }
    }
    window.openCancel = openCancelDirectV342;
    window.openCancelDirectV342 = openCancelDirectV342;
    window.saveDirectCancelV342 = saveDirectCancelV342;
    const originalSetStageV342 = window.setStage;
    if (originalSetStageV342) window.setStage = function(id, stage) {
        const report = reports.find(item => String(item.id) === String(id));
        if (stage === "Batal" && !isCanceledV342(report)) return openCancelDirectV342(id);
        return originalSetStageV342(id, stage);
    };
    function pickupReceiptAllowedV342(report) {
        return report && (report.stage === "Diambil" || /diambil/i.test(report.status || ""));
    }
    function receiptLinesV342(report) {
        const lines = [];
        const items = (Array.isArray(report.cost_items) ? report.cost_items : []).filter(item => item.label && !item.returned);
        items.forEach(item => {
            const qty = Number(item.qty) || 1;
            const unit = Number(item.price) || 0;
            lines.push({ label: item.label, qty, unit, total: qty * unit });
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
    function printPickupReceiptV342(id) {
        const report = reports.find(item => String(item.id) === String(id));
        if (!pickupReceiptAllowedV342(report)) return toast("Cetak resi tersedia setelah tiket masuk papan Diambil.", "error");
        const lines = receiptLinesV342(report);
        const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
        const total = Number(report.fee) || subtotal;
        const method = typeof payMetaStr === "function" ? payMetaStr(report) : "";
        const logo = BRAND.logoUrl ? `<img src="${esc(BRAND.logoUrl)}" alt="logo">` : `<div class="pickup-receipt-logo">${esc(BRAND.logo || "🛠️")}</div>`;
        const rows = lines.map(line => `<div class="pickup-receipt-item"><div>${esc(line.label)}</div><div>${line.qty} × ${rp(line.unit)}</div><strong>${rp(line.total)}</strong></div>`).join("");
        $("printArea").innerHTML = `<article class="pickup-receipt-v342">${logo}<h1>${esc(BRAND.name || "RepairLog")}</h1><p class="pickup-receipt-address">${esc(BRAND.tagline || "Service & Sparepart")}</p><div class="pickup-receipt-rule"></div><div class="pickup-receipt-meta"><span>No. tiket</span><strong>${esc(report.ticket_no || "-")}</strong><span>Tanggal ambil</span><strong>${fmtDate(report.date_out || (new Date).toISOString())}</strong><span>Customer</span><strong>${esc(report.customer || "-")}</strong><span>Perangkat</span><strong>${esc(report.device || "-")}</strong><span>Kasir / Teknisi</span><strong>${esc(typeof techName === "function" ? techName(report.assigned_to) : "-")}</strong></div><div class="pickup-receipt-rule"></div>${rows}<div class="pickup-receipt-rule"></div><div class="pickup-receipt-total"><span>Sub total</span><strong>${rp(subtotal)}</strong><span>Total</span><strong>${rp(total)}</strong>${method ? `<span>Bayar (${esc(method)})</span><strong>${rp(total)}</strong>` : ""}<span>Status</span><strong>${esc(report.payment_status || "Belum")}</strong></div><div class="pickup-receipt-rule"></div><h2>TERIMA KASIH</h2><p class="pickup-receipt-note">Struk ini menjadi bukti bahwa customer sudah mengambil barang. Mohon lakukan pengecekan sebelum meninggalkan toko. Barang yang sudah diambil tidak dapat dikembalikan atau diuangkan kembali.</p><p class="pickup-receipt-time">Dicetak ${(new Date).toLocaleString("id-ID")}</p></article>`;
        document.body.classList.add("printing-pickup-receipt-v342");
        window.addEventListener("afterprint", () => document.body.classList.remove("printing-pickup-receipt-v342"), { once: true });
        setTimeout(() => window.print(), 80);
    }
    window.printPickupReceiptV342 = printPickupReceiptV342;
    const originalBoardCardV342 = window.boardCard;
    if (originalBoardCardV342) window.boardCard = function(report) {
        const unread = unreadMap[report.id] ? `<span class="notif-dot" style="position:static;display:inline-flex">${unreadMap[report.id] > 9 ? "9+" : unreadMap[report.id]}</span>` : "";
        const receipt = pickupReceiptAllowedV342(report) && FEATURES.print ? `<button class="pickup-card-action-v342" type="button" onclick="event.stopPropagation();printPickupReceiptV342('${report.id}')">🧾 Cetak resi</button>` : "";
        return `<div class="bcard" draggable="true" ondragstart="boardDragStart(event,'${report.id}')" onclick="openDetail('${report.id}')" style="position:relative">${statusBadge(report)}<div class="row"><b style="font-size:13px">${esc(report.device)}</b>${ageBadge(report)}</div><div class="muted" style="font-size:11px">${esc(report.customer || "-")} • L${report.level}${isWarranty(report) ? ' • <b style="color:#8b5cf6">🛡️ Garansi</b>' : ""}</div><div class="row" style="margin-top:6px">${techBadge(report.assigned_to)}${unread}</div>${receipt}</div>`;
    };
    function addPickupReceiptButtonV342(id) {
        const report = reports.find(item => String(item.id) === String(id));
        const content = $("detailContent");
        if (!content) return;
        content.querySelector(".ticket-danger")?.remove();
        if (!pickupReceiptAllowedV342(report) || !FEATURES.print || $("detailPickupReceiptV342")) return;
        const actions = [ ...content.querySelectorAll(":scope > .actions") ].pop() || [ ...content.querySelectorAll(".actions") ].pop();
        if (actions) actions.insertAdjacentHTML("afterbegin", `<button id="detailPickupReceiptV342" class="btn small pickup-receipt-button-v342" onclick="printPickupReceiptV342('${id}')">🧾 Cetak Resi</button>`);
    }
    const originalOpenDetailV342 = window.openDetail;
    if (originalOpenDetailV342) window.openDetail = function(id) {
        const result = originalOpenDetailV342(id);
        setTimeout(() => addPickupReceiptButtonV342(id), 30);
        return result;
    };
    function cleanLegacyPanelsV342() {
        const finance = $("tab-finance");
        if (finance && $("financeV34")) [ ...finance.children ].forEach(child => {
            const keep = child.matches(".rl-head,#financeKindSwitch,#finTabs,#financeV34") || child.matches(".row") && !!child.querySelector("select[onchange*='setFinanceRangeV34']");
            if (!keep) child.remove();
        });
        const customer = $("tab-cust");
        if (customer && $("crmV34")) [ ...customer.children ].forEach(child => {
            if (!child.matches(".rl-head,#crmTabs,#crmV34")) child.remove();
        });
    }
    const originalShowTabV342 = window.showTab;
    if (originalShowTabV342) window.showTab = function(tab) {
        const result = originalShowTabV342(tab);
        setTimeout(() => {
            cleanLegacyPanelsV342();
            if (tab === "stock") renderStock();
        }, 0);
        return result;
    };
    ensurePartCategoryUiV342();
    ensureCancelModalV342();
    cleanLegacyPanelsV342();
    setTimeout(cleanLegacyPanelsV342, 600);
})();
