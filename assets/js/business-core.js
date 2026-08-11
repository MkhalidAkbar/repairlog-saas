let SUPPLIERS = [];

let PURCHASE_ORDERS = [];

let STOCK_MOVEMENTS = [];

let WARRANTY_CLAIMS = [];

let BUSINESS_SCHEMA_READY = null;

function businessSchemaMissing(error) {
    const message = String(error && (error.message || error.details || error.hint) || error || "");
    return error && [ "42P01", "42703", "PGRST204", "PGRST205" ].includes(error.code) || /does not exist|not found|schema cache|original_report_id|warranty_claims|purchase_orders|stock_movements|suppliers/i.test(message);
}

function businessMigrationNotice() {
    return `<div class="business-migration-note"><strong>Migrasi v3.3.0 diperlukan</strong><span>Jalankan <code>supabase/migrations/20260811_priority_10_11_12.sql</code> untuk menyimpan garansi terhubung, supplier, purchase order, dan ledger stok.</span></div>`;
}

function supplierName(id) {
    return SUPPLIERS.find(supplier => String(supplier.id) === String(id))?.name || "-";
}

function populateSupplierOptions() {
    const options = '<option value="">Tanpa supplier</option>' + SUPPLIERS.filter(supplier => supplier.active !== false).map(supplier => `<option value="${supplier.id}">${esc(supplier.name)}</option>`).join("");
    [ "pf_supplier", "sm_supplier", "po_supplier" ].forEach(id => {
        const element = $(id);
        if (!element) return;
        const value = element.value;
        element.innerHTML = options;
        if ([ ...element.options ].some(option => option.value === value)) element.value = value;
    });
}

async function loadBusinessSuiteData() {
    if (!db) return;
    const configs = [ [ "suppliers", "name", true ], [ "purchase_orders", "created_at", false ], [ "stock_movements", "created_at", false ], [ "warranty_claims", "created_at", false ] ];
    const targets = [ SUPPLIERS, PURCHASE_ORDERS, STOCK_MOVEMENTS, WARRANTY_CLAIMS ];
    let missing = false;
    for (let index = 0; index < configs.length; index += 1) {
        const [table, order, ascending] = configs[index];
        try {
            const result = await db.from(table).select("*").eq("store_id", STORE_ID).order(order, {
                ascending: ascending
            });
            if (result.error) {
                if (businessSchemaMissing(result.error)) missing = true;
            } else {
                targets[index].splice(0, targets[index].length, ...result.data || []);
            }
        } catch (error) {
            if (businessSchemaMissing(error)) missing = true;
        }
    }
    try {
        const links = await db.from("reports").select("id,original_report_id,warranty_claim_id,claim_sequence,stock_finalized_at").eq("store_id", STORE_ID);
        if (links.error) {
            if (businessSchemaMissing(links.error)) missing = true;
        } else if (links.data) {
            const byId = new Map(links.data.map(row => [ String(row.id), row ]));
            reports = reports.map(report => ({
                ...report,
                ...byId.get(String(report.id)) || {}
            }));
        }
    } catch (error) {
        if (businessSchemaMissing(error)) missing = true;
    }
    BUSINESS_SCHEMA_READY = !missing;
    populateSupplierOptions();
}
