function openSupplierForm(id) {
    ensureInventorySuiteUi();
    const supplier = SUPPLIERS.find(item => String(item.id) === String(id));
    $("sf_id").value = supplier?.id || "";
    $("sf_name").value = supplier?.name || "";
    $("sf_contact").value = supplier?.contact_person || "";
    $("sf_phone").value = supplier?.phone || "";
    $("sf_email").value = supplier?.email || "";
    $("sf_address").value = supplier?.address || "";
    $("sf_notes").value = supplier?.notes || "";
    $("supplierFormTitle").textContent = supplier ? "Edit Supplier" : "Tambah Supplier";
    openModal("supplierModal");
}

async function saveSupplier() {
    const name = $("sf_name").value.trim();
    if (!name) {
        toast("Nama supplier wajib diisi.", "error");
        return;
    }
    const payload = {
        store_id: STORE_ID,
        name: name,
        contact_person: $("sf_contact").value.trim() || null,
        phone: $("sf_phone").value.trim() || null,
        email: $("sf_email").value.trim() || null,
        address: $("sf_address").value.trim() || null,
        notes: $("sf_notes").value.trim() || null,
        active: true,
        created_by: ME.user_id || null,
        updated_at: (new Date).toISOString()
    };
    const id = $("sf_id").value;
    const result = id ? await db.from("suppliers").update(payload).eq("id", id) : await db.from("suppliers").insert(payload);
    if (result.error) {
        toast("Gagal menyimpan supplier: " + result.error.message, "error");
        return;
    }
    closeModal("supplierModal");
    await loadBusinessSuiteData();
    renderStock();
    toast("Supplier tersimpan.", "success");
}

function makePurchaseOrderNo() {
    const date = (new Date).toISOString().slice(2, 10).replace(/-/g, "");
    return `PO-${date}-${String(PURCHASE_ORDERS.length + 1).padStart(3, "0")}`;
}

function openPurchaseOrderForm(id, supplierId) {
    ensureInventorySuiteUi();
    populateSupplierOptions();
    const order = PURCHASE_ORDERS.find(item => String(item.id) === String(id));
    $("po_id").value = order?.id || "";
    $("po_no").value = order?.order_no || makePurchaseOrderNo();
    $("po_supplier").value = order?.supplier_id || supplierId || "";
    $("po_date").value = order?.order_date || (new Date).toISOString().slice(0, 10);
    $("po_expected").value = order?.expected_at || "";
    $("po_notes").value = order?.notes || "";
    PO_ITEMS_STATE = Array.isArray(order?.items) ? order.items.map(item => ({
        ...item
    })) : [ {
        part_id: "",
        name: "",
        qty: 1,
        unit_cost: 0
    } ];
    $("poFormTitle").textContent = order ? `Purchase Order ${order.order_no}` : "Buat Purchase Order";
    renderPurchaseOrderItems();
    openModal("purchaseOrderModal");
}

function addPurchaseOrderItem() {
    PO_ITEMS_STATE.push({
        part_id: "",
        name: "",
        qty: 1,
        unit_cost: 0
    });
    renderPurchaseOrderItems();
}

function removePurchaseOrderItem(index) {
    PO_ITEMS_STATE.splice(index, 1);
    if (!PO_ITEMS_STATE.length) addPurchaseOrderItem(); else renderPurchaseOrderItems();
}

function updatePurchaseOrderItem(index, key, value) {
    const item = PO_ITEMS_STATE[index];
    if (!item) return;
    item[key] = [ "qty", "unit_cost" ].includes(key) ? Number(value) || 0 : value;
    if (key === "part_id") {
        const part = PARTS.find(candidate => String(candidate.id) === String(value));
        item.name = part?.name || "";
        if (!item.unit_cost) item.unit_cost = Number(part?.cost_price) || 0;
        renderPurchaseOrderItems();
    } else {
        renderPurchaseOrderTotal();
    }
}

function renderPurchaseOrderItems() {
    const root = $("poItems");
    if (!root) return;
    const options = PARTS.map(part => `<option value="${part.id}">${esc(part.name)}</option>`).join("");
    root.innerHTML = PO_ITEMS_STATE.map((item, index) => {
        const selectedOptions = '<option value="">Pilih sparepart</option>' + options.replace(`value="${item.part_id}"`, `value="${item.part_id}" selected`);
        return `<div class="po-item-row"><select onchange="updatePurchaseOrderItem(${index},'part_id',this.value)">${selectedOptions}</select><input type="number" min="1" value="${Number(item.qty) || 1}" aria-label="Jumlah" onchange="updatePurchaseOrderItem(${index},'qty',this.value)"><input type="number" min="0" value="${Number(item.unit_cost) || 0}" aria-label="Harga beli" onchange="updatePurchaseOrderItem(${index},'unit_cost',this.value)"><strong>${rp((Number(item.qty) || 0) * (Number(item.unit_cost) || 0))}</strong><button class="btn small secondary" type="button" onclick="removePurchaseOrderItem(${index})">×</button></div>`;
    }).join("");
    renderPurchaseOrderTotal();
}

function renderPurchaseOrderTotal() {
    const total = PO_ITEMS_STATE.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unit_cost) || 0), 0);
    if ($("poTotal")) $("poTotal").innerHTML = `<span>Total PO</span><strong>${rp(total)}</strong>`;
}

async function savePurchaseOrder(status) {
    const supplierId = $("po_supplier").value;
    const items = PO_ITEMS_STATE.filter(item => item.part_id && (Number(item.qty) || 0) > 0);
    if (!supplierId || !items.length) {
        toast("Supplier dan minimal satu item wajib diisi.", "error");
        return;
    }
    const total = items.reduce((sum, item) => sum + Number(item.qty) * Number(item.unit_cost || 0), 0);
    const payload = {
        store_id: STORE_ID,
        order_no: $("po_no").value.trim() || makePurchaseOrderNo(),
        supplier_id: supplierId,
        status: status || "draft",
        order_date: $("po_date").value,
        expected_at: $("po_expected").value || null,
        items: items,
        total_amount: total,
        notes: $("po_notes").value.trim() || null,
        created_by: ME.user_id || null,
        updated_at: (new Date).toISOString()
    };
    const id = $("po_id").value;
    const result = id ? await db.from("purchase_orders").update(payload).eq("id", id) : await db.from("purchase_orders").insert(payload);
    if (result.error) {
        toast("Gagal menyimpan PO: " + result.error.message, "error");
        return;
    }
    closeModal("purchaseOrderModal");
    await loadBusinessSuiteData();
    setStockSuiteView("orders");
    toast(status === "ordered" ? "Purchase order dibuat." : "Draft PO tersimpan.", "success");
}

function receivePurchaseOrder(id) {
    const order = PURCHASE_ORDERS.find(item => String(item.id) === String(id));
    if (!order) return;
    showMini("Terima purchase order", `Tambahkan seluruh item ${order.order_no} ke stok?`, [ {
        label: "Batal",
        cls: "secondary",
        fn: null
    }, {
        label: "Terima semua",
        fn: async () => {
            try {
                for (const item of order.items || []) {
                    await applyStockMovement({
                        partId: item.part_id,
                        delta: Number(item.qty) || 0,
                        type: "po_receipt",
                        supplierId: order.supplier_id,
                        purchaseOrderId: order.id,
                        unitCost: Number(item.unit_cost) || 0,
                        referenceNo: order.order_no,
                        note: "Penerimaan purchase order"
                    });
                }
                await db.from("purchase_orders").update({
                    status: "received",
                    received_at: (new Date).toISOString(),
                    updated_at: (new Date).toISOString()
                }).eq("id", id);
                await loadParts();
                await loadBusinessSuiteData();
                renderStock();
                toast("Purchase order diterima dan stok diperbarui.", "success");
            } catch (error) {
                toast("Gagal menerima PO: " + (error.message || error), "error");
            }
        }
    } ]);
}

function openStockMovementForm(partId, type) {
    ensureInventorySuiteUi();
    $("sm_part").innerHTML = '<option value="">Pilih sparepart</option>' + PARTS.map(part => `<option value="${part.id}">${esc(part.name)} • stok ${Number(part.stock) || 0}</option>`).join("");
    $("sm_part").value = partId || "";
    $("sm_type").value = type || "incoming";
    $("sm_qty").value = "";
    $("sm_cost").value = "";
    $("sm_supplier").value = "";
    $("sm_reference").value = "";
    $("sm_note").value = "";
    updateStockMovementHint();
    openModal("stockMovementModal");
}

function updateStockMovementHint() {
    const type = $("sm_type")?.value;
    if ($("sm_qty_label")) $("sm_qty_label").textContent = type === "adjustment" ? "Stok fisik baru" : "Jumlah";
    if ($("sm_hint")) $("sm_hint").textContent = type === "adjustment" ? "Masukkan jumlah stok fisik hasil perhitungan, bukan selisihnya." : type === "return" ? "Jumlah akan dikurangi dari stok dan dicatat sebagai retur." : "Perubahan akan masuk ke ledger stok.";
}

let stockMovementSaving = false;

async function saveStockMovement() {
    if (stockMovementSaving) return;
    const part = PARTS.find(item => String(item.id) === String($("sm_part").value));
    const type = $("sm_type").value;
    const input = Number($("sm_qty").value);
    if (!part || input < 0 || !input && type !== "adjustment") {
        toast("Sparepart dan jumlah wajib valid.", "error");
        return;
    }
    let delta = input;
    if ([ "outgoing", "return" ].includes(type)) delta = -input;
    if (type === "adjustment") delta = input - (Number(part.stock) || 0);
    if (!delta) {
        toast("Tidak ada perubahan stok.", "error");
        return;
    }
    if (typeof confirmStockReduction === "function" && !await confirmStockReduction(part, delta, type)) return;
    stockMovementSaving = true;
    try {
        await applyStockMovement({
            partId: part.id,
            delta: delta,
            type: type,
            supplierId: $("sm_supplier").value || null,
            unitCost: parseRupiah($("sm_cost").value) || null,
            referenceNo: $("sm_reference").value.trim() || null,
            note: $("sm_note").value.trim() || null
        });
        closeModal("stockMovementModal");
        await loadParts();
        await loadBusinessSuiteData();
        renderStock();
        toast("Pergerakan stok tersimpan.", "success");
    } catch (error) {
        toast("Gagal mengubah stok: " + (error.message || error), "error");
    } finally {
        stockMovementSaving = false;
    }
}

ensureInventorySuiteUi();
