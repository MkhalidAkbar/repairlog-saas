// ====== PRIORITY 11 CORE: UI, RESERVATIONS & STOCK VIEWS ======
let STOCK_SUITE_VIEW = "parts";
let PO_ITEMS_STATE = [];

function ensureInventorySuiteUi() {
  const stockTab = $("tab-stock");
  if (stockTab && !$("stockSuiteNav")) {
    const heading = stockTab.querySelector(":scope > .row");
    const title = heading?.querySelector("h2");
    if (title) title.textContent = "📦 Stok, Supplier & Purchase Order";
    heading?.insertAdjacentHTML(
      "beforeend",
      '<button class="btn small secondary" type="button" onclick="openSupplierForm()">+ Supplier</button><button class="btn small secondary" type="button" onclick="openPurchaseOrderForm()">+ Purchase Order</button><button class="btn small secondary" type="button" onclick="openStockMovementForm()">± Pergerakan Stok</button>',
    );
    const toolbar = stockTab.querySelector(":scope > .toolbar");
    toolbar?.insertAdjacentHTML(
      "beforebegin",
      '<div id="stockSuiteNav" class="suite-tabs"><button type="button" data-stock-view="parts" onclick="setStockSuiteView(\'parts\')">Sparepart</button><button type="button" data-stock-view="suppliers" onclick="setStockSuiteView(\'suppliers\')">Supplier</button><button type="button" data-stock-view="orders" onclick="setStockSuiteView(\'orders\')">Purchase Order</button><button type="button" data-stock-view="movements" onclick="setStockSuiteView(\'movements\')">Riwayat Stok</button></div>',
    );
  }
  const partModal = document.querySelector("#partModal .modal");
  if (partModal && !$("partBusinessFields")) {
    const stockRow = $("pf_stock")?.closest(".frow");
    const fields = document.createElement("div");
    fields.id = "partBusinessFields";
    fields.innerHTML = `<div class="frow"><div><label>Supplier utama</label><select id="pf_supplier"></select></div><div><label>SKU / Kode</label><input id="pf_sku" placeholder="cth: LCD-14-SLIM"></div></div><label>Lokasi penyimpanan</label><input id="pf_location" placeholder="cth: Rak A2">`;
    if (stockRow) partModal.insertBefore(fields, stockRow);
  }
  if (!$("supplierModal"))
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-bg" id="supplierModal"><div class="modal business-form-modal"><h2 id="supplierFormTitle">Tambah Supplier</h2><input type="hidden" id="sf_id"><label>Nama supplier *</label><input id="sf_name" placeholder="Nama perusahaan atau toko"><div class="frow"><div><label>Kontak person</label><input id="sf_contact" placeholder="Nama kontak"></div><div><label>WhatsApp</label><input id="sf_phone" placeholder="08xxxxxxxxxx"></div></div><label>Email</label><input id="sf_email" type="email" placeholder="supplier@example.com"><label>Alamat</label><textarea id="sf_address" rows="2"></textarea><label>Catatan</label><textarea id="sf_notes" rows="2"></textarea><div class="actions"><button class="btn secondary" type="button" onclick="closeModal('supplierModal')">Batal</button><button class="btn" type="button" onclick="saveSupplier()">Simpan Supplier</button></div></div></div>`,
    );
  if (!$("purchaseOrderModal"))
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-bg" id="purchaseOrderModal"><div class="modal business-form-modal po-modal"><h2 id="poFormTitle">Purchase Order</h2><input type="hidden" id="po_id"><div class="frow"><div><label>Nomor PO</label><input id="po_no" placeholder="Otomatis"></div><div><label>Supplier *</label><select id="po_supplier"></select></div></div><div class="frow"><div><label>Tanggal pesan</label><input id="po_date" type="date"></div><div><label>Estimasi tiba</label><input id="po_expected" type="date"></div></div><div class="row po-items-heading"><div><strong>Item purchase order</strong><span class="muted">Harga beli dan jumlah pesanan</span></div><button class="btn small secondary" type="button" onclick="addPurchaseOrderItem()">+ Item</button></div><div id="poItems"></div><div id="poTotal" class="po-total"></div><label>Catatan</label><textarea id="po_notes" rows="2"></textarea><div class="actions"><button class="btn secondary" type="button" onclick="closeModal('purchaseOrderModal')">Batal</button><button class="btn secondary" type="button" onclick="savePurchaseOrder('draft')">Simpan Draft</button><button class="btn" type="button" onclick="savePurchaseOrder('ordered')">Simpan & Pesan</button></div></div></div>`,
    );
  if (!$("stockMovementModal"))
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-bg" id="stockMovementModal"><div class="modal business-form-modal"><h2>Pergerakan Stok</h2><label>Sparepart *</label><select id="sm_part"></select><div class="frow"><div><label>Jenis</label><select id="sm_type" onchange="updateStockMovementHint()"><option value="incoming">Stok masuk</option><option value="outgoing">Stok keluar</option><option value="adjustment">Penyesuaian</option><option value="return">Retur ke supplier</option></select></div><div><label id="sm_qty_label">Jumlah</label><input id="sm_qty" type="number" min="1" placeholder="1"></div></div><div id="sm_hint" class="muted business-field-hint"></div><div class="frow"><div><label>Harga beli per unit</label><input id="sm_cost" inputmode="numeric" oninput="fmtRupiahInput(this)" placeholder="0"></div><div><label>Supplier</label><select id="sm_supplier"></select></div></div><label>Referensi</label><input id="sm_reference" placeholder="Nomor nota / dokumen"><label>Catatan</label><textarea id="sm_note" rows="2"></textarea><div class="actions"><button class="btn secondary" type="button" onclick="closeModal('stockMovementModal')">Batal</button><button class="btn" type="button" onclick="saveStockMovement()">Simpan Pergerakan</button></div></div></div>`,
    );
  populateSupplierOptions();
}

function partReservationMap() {
  const reserved = new Map();
  reports.forEach((report) => {
    if (
      (typeof isFinalized === "function" && isFinalized(report)) ||
      /batal|gagal/i.test(`${report.status || ""} ${report.stage || ""}`)
    )
      return;
    (Array.isArray(report.cost_items) ? report.cost_items : []).forEach(
      (item) => {
        if (!item.partId || item.consumed || item.reserved === false) return;
        const key = String(item.partId);
        reserved.set(key, (reserved.get(key) || 0) + (Number(item.qty) || 1));
      },
    );
  });
  return reserved;
}
function partReservedQty(partId) {
  return partReservationMap().get(String(partId)) || 0;
}
function partAvailableQty(part) {
  return Math.max(0, (Number(part?.stock) || 0) - partReservedQty(part?.id));
}

async function applyStockMovement({
  partId,
  delta,
  type,
  reportId = null,
  supplierId = null,
  purchaseOrderId = null,
  unitCost = null,
  referenceNo = null,
  note = null,
}) {
  if (!db) throw new Error("Supabase belum dikonfigurasi.");
  const part = PARTS.find((item) => String(item.id) === String(partId));
  if (!part) throw new Error("Sparepart tidak ditemukan.");
  let rpcResult = null;
  try {
    rpcResult = await db.rpc("rl_apply_stock_movement", {
      p_store_id: STORE_ID,
      p_part_id: partId,
      p_delta: Number(delta),
      p_movement_type: type,
      p_report_id: reportId,
      p_supplier_id: supplierId,
      p_purchase_order_id: purchaseOrderId,
      p_unit_cost: unitCost,
      p_reference_no: referenceNo,
      p_note: note,
    });
  } catch (error) {}
  if (rpcResult && !rpcResult.error) {
    const result = rpcResult.data || {};
    part.stock = Number(result.stock_after ?? part.stock);
    return result;
  }
  if (rpcResult?.error && !businessSchemaMissing(rpcResult.error))
    throw rpcResult.error;
  const before = Number(part.stock) || 0;
  const after = before + Number(delta);
  if (after < 0) throw new Error(`Stok ${part.name} tidak mencukupi.`);
  const update = { stock: after, updated_at: new Date().toISOString() };
  if (Number(delta) > 0 && unitCost != null) {
    update.cost_price = Number(unitCost) || 0;
    update.last_purchase_price = Number(unitCost) || 0;
    update.last_restocked_at = new Date().toISOString();
  }
  const partResult = await db.from("parts").update(update).eq("id", partId);
  if (partResult.error) throw partResult.error;
  part.stock = after;
  try {
    await db.from("stock_movements").insert({
      store_id: STORE_ID,
      part_id: partId,
      report_id: reportId,
      supplier_id: supplierId,
      purchase_order_id: purchaseOrderId,
      movement_type: type,
      quantity: Math.abs(Number(delta)),
      delta: Number(delta),
      stock_before: before,
      stock_after: after,
      unit_cost: unitCost,
      reference_no: referenceNo,
      note,
      created_by: ME.user_id || null,
    });
  } catch (error) {}
  return { stock_before: before, stock_after: after };
}

async function finalizeReservedPartsForReport(reportId) {
  const report = reports.find((item) => String(item.id) === String(reportId));
  if (!report || report.stock_finalized_at) return true;
  const items = (Array.isArray(report.cost_items) ? report.cost_items : []).map(
    (item) => ({ ...item }),
  );
  const pending = items.filter(
    (item) => item.partId && !item.consumed && item.reserved !== false,
  );
  for (const item of pending) {
    const part = PARTS.find(
      (candidate) => String(candidate.id) === String(item.partId),
    );
    if (!part || Number(part.stock) < (Number(item.qty) || 1)) {
      toast(`Stok ${item.label || "sparepart"} tidak mencukupi.`, "error");
      return false;
    }
  }
  try {
    for (const item of pending) {
      await applyStockMovement({
        partId: item.partId,
        delta: -(Number(item.qty) || 1),
        type: "reservation_use",
        reportId,
        unitCost: Number(item.amount) || null,
        referenceNo: report.ticket_no || null,
        note: `Pemakaian untuk tiket ${report.ticket_no || report.id}`,
      });
      item.consumed = true;
      item.reserved = false;
    }
    const finalizedAt = new Date().toISOString();
    let result = await db
      .from("reports")
      .update({ cost_items: items, stock_finalized_at: finalizedAt })
      .eq("id", reportId);
    if (result.error && businessSchemaMissing(result.error))
      result = await db
        .from("reports")
        .update({ cost_items: items })
        .eq("id", reportId);
    if (result.error) throw result.error;
    report.cost_items = items;
    report.stock_finalized_at = finalizedAt;
    return true;
  } catch (error) {
    toast("Gagal menyelesaikan stok: " + (error.message || error), "error");
    return false;
  }
}

async function releaseReservedPartsForReport(reportId) {
  const report = reports.find((item) => String(item.id) === String(reportId));
  if (!report) return;
  const items = (Array.isArray(report.cost_items) ? report.cost_items : []).map(
    (item) =>
      item.partId && !item.consumed
        ? { ...item, reserved: false, released: true }
        : item,
  );
  try {
    await db.from("reports").update({ cost_items: items }).eq("id", reportId);
    report.cost_items = items;
  } catch (error) {}
}

function partBusinessPayload() {
  if (BUSINESS_SCHEMA_READY === false) return {};
  return {
    supplier_id: $("pf_supplier")?.value || null,
    sku: $("pf_sku")?.value.trim() || null,
    storage_location: $("pf_location")?.value.trim() || null,
  };
}
function populatePartBusinessFields(part) {
  ensureInventorySuiteUi();
  populateSupplierOptions();
  if ($("pf_supplier")) $("pf_supplier").value = part?.supplier_id || "";
  if ($("pf_sku")) $("pf_sku").value = part?.sku || "";
  if ($("pf_location")) $("pf_location").value = part?.storage_location || "";
}
function setStockSuiteView(view) {
  STOCK_SUITE_VIEW = view || "parts";
  renderStock();
}
function stockOverviewHtml() {
  const reserved = PARTS.reduce(
    (sum, part) => sum + partReservedQty(part.id),
    0,
  );
  const low = PARTS.filter(
    (part) => partAvailableQty(part) <= Number(part.min_stock || 0),
  ).length;
  const value = PARTS.reduce(
    (sum, part) =>
      sum + (Number(part.stock) || 0) * (Number(part.cost_price) || 0),
    0,
  );
  return `<div class="business-stat-grid"><div><span>Jenis sparepart</span><strong>${PARTS.length}</strong></div><div><span>Unit dicadangkan</span><strong>${reserved}</strong></div><div><span>Perlu restock</span><strong>${low}</strong></div><div><span>Nilai stok</span><strong>${rpShort(value)}</strong></div></div>`;
}

function renderAdvancedStock() {
  ensureInventorySuiteUi();
  const box = $("stockBox");
  if (!box) return;
  document
    .querySelectorAll("#stockSuiteNav button")
    .forEach((button) =>
      button.classList.toggle(
        "active",
        button.dataset.stockView === STOCK_SUITE_VIEW,
      ),
    );
  const toolbar = $("stockDevFilter")?.closest(".toolbar");
  if (toolbar)
    toolbar.style.display = STOCK_SUITE_VIEW === "parts" ? "" : "none";
  if (BUSINESS_SCHEMA_READY === false) {
    box.innerHTML =
      businessMigrationNotice() +
      stockOverviewHtml() +
      renderAdvancedPartsTable();
    return;
  }
  let content = "";
  if (STOCK_SUITE_VIEW === "parts") content = renderAdvancedPartsTable();
  if (STOCK_SUITE_VIEW === "suppliers") content = renderSupplierTable();
  if (STOCK_SUITE_VIEW === "orders") content = renderPurchaseOrderTable();
  if (STOCK_SUITE_VIEW === "movements") content = renderStockMovementTable();
  box.innerHTML = stockOverviewHtml() + content;
}

function renderAdvancedPartsTable() {
  ensureDevFilter("stockDevFilter");
  const list = stockFilteredParts();
  const rows = list.length
    ? list
        .map((part) => {
          const reserved = partReservedQty(part.id),
            available = partAvailableQty(part);
          const low = available <= Number(part.min_stock || 0);
          return `<tr><td><strong>${esc(part.name)}</strong><small>${esc(part.sku || part.category || "Tanpa SKU")}</small></td><td>${esc(part.device_type || "Umum")}</td><td>${esc(supplierName(part.supplier_id))}</td><td>${Number(part.stock) || 0}</td><td>${reserved}</td><td class="${low ? "stock-low" : ""}">${available}${low ? " • restock" : ""}</td><td>${rp(part.cost_price || 0)}</td><td>${esc(part.storage_location || "-")}</td><td><div class="table-actions"><button class="btn small secondary" onclick="openStockMovementForm('${part.id}')">± Stok</button><button class="btn small secondary" onclick="openPartForm('${part.id}')">Edit</button></div></td></tr>`;
        })
        .join("")
    : '<tr><td colspan="9"><div class="business-empty">Belum ada sparepart.</div></td></tr>';
  return `<div class="business-table-wrap"><table class="ftbl business-table"><thead><tr><th>Sparepart</th><th>Perangkat</th><th>Supplier</th><th>Fisik</th><th>Reservasi</th><th>Tersedia</th><th>Harga beli</th><th>Lokasi</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderSupplierTable() {
  const rows = SUPPLIERS.length
    ? SUPPLIERS.map(
        (supplier) =>
          `<tr><td><strong>${esc(supplier.name)}</strong><small>${supplier.active === false ? "Nonaktif" : "Aktif"}</small></td><td>${esc(supplier.contact_person || "-")}</td><td>${esc(supplier.phone || supplier.email || "-")}</td><td>${PARTS.filter((part) => String(part.supplier_id) === String(supplier.id)).length}</td><td>${PURCHASE_ORDERS.filter((order) => String(order.supplier_id) === String(supplier.id)).length}</td><td><div class="table-actions"><button class="btn small secondary" onclick="openSupplierForm('${supplier.id}')">Edit</button><button class="btn small secondary" onclick="openPurchaseOrderForm(null,'${supplier.id}')">Buat PO</button></div></td></tr>`,
      ).join("")
    : '<tr><td colspan="6"><div class="business-empty">Belum ada supplier.</div></td></tr>';
  return `<div class="business-table-wrap"><table class="ftbl business-table"><thead><tr><th>Supplier</th><th>Kontak</th><th>Telepon / email</th><th>Sparepart</th><th>PO</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function poStatusLabel(status) {
  return (
    {
      draft: "Draft",
      ordered: "Dipesan",
      partial: "Sebagian",
      received: "Diterima",
      cancelled: "Dibatalkan",
    }[status] || status
  );
}
function renderPurchaseOrderTable() {
  const rows = PURCHASE_ORDERS.length
    ? PURCHASE_ORDERS.map((order) => {
        const receive = ["ordered", "partial"].includes(order.status)
          ? `<button class="btn small" onclick="receivePurchaseOrder('${order.id}')">Terima barang</button>`
          : "";
        return `<tr><td><strong>${esc(order.order_no)}</strong><small>${fmtDate(order.order_date)}</small></td><td>${esc(supplierName(order.supplier_id))}</td><td>${Array.isArray(order.items) ? order.items.length : 0} item</td><td>${rp(order.total_amount || 0)}</td><td><span class="po-status po-${esc(order.status)}">${esc(poStatusLabel(order.status))}</span></td><td>${order.expected_at ? fmtDate(order.expected_at) : "-"}</td><td><div class="table-actions"><button class="btn small secondary" onclick="openPurchaseOrderForm('${order.id}')">Detail</button>${receive}</div></td></tr>`;
      }).join("")
    : '<tr><td colspan="7"><div class="business-empty">Belum ada purchase order.</div></td></tr>';
  return `<div class="business-table-wrap"><table class="ftbl business-table"><thead><tr><th>Nomor PO</th><th>Supplier</th><th>Item</th><th>Total</th><th>Status</th><th>Estimasi</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function movementTypeLabel(type) {
  return (
    {
      incoming: "Stok masuk",
      outgoing: "Stok keluar",
      reservation_use: "Dipakai tiket",
      adjustment: "Penyesuaian",
      po_receipt: "Penerimaan PO",
      return: "Retur",
    }[type] || type
  );
}
function renderStockMovementTable() {
  const rows = STOCK_MOVEMENTS.length
    ? STOCK_MOVEMENTS.slice(0, 120)
        .map((movement) => {
          const part = PARTS.find(
            (item) => String(item.id) === String(movement.part_id),
          );
          const report = reports.find(
            (item) => String(item.id) === String(movement.report_id),
          );
          return `<tr><td>${new Date(movement.created_at).toLocaleString("id-ID")}</td><td><strong>${esc(part?.name || "Sparepart")}</strong><small>${esc(movement.reference_no || report?.ticket_no || "-")}</small></td><td>${esc(movementTypeLabel(movement.movement_type))}</td><td class="${Number(movement.delta) > 0 ? "stock-in" : "stock-out"}">${Number(movement.delta) > 0 ? "+" : ""}${movement.delta}</td><td>${movement.stock_before} → ${movement.stock_after}</td><td>${esc(movement.note || "-")}</td></tr>`;
        })
        .join("")
    : '<tr><td colspan="6"><div class="business-empty">Belum ada pergerakan stok.</div></td></tr>';
  return `<div class="business-table-wrap"><table class="ftbl business-table"><thead><tr><th>Waktu</th><th>Sparepart</th><th>Jenis</th><th>Delta</th><th>Stok</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

ensureInventorySuiteUi();
