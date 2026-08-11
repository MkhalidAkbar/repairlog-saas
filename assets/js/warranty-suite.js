// ====== PRIORITY 10: LINKED WARRANTY CLAIMS ======
const legacyOpenClaimForm = window.openClaimForm;
const legacySaveClaim = window.saveClaim;

function ensureWarrantyClaimUi() {
  const modal = document.querySelector("#claimModal .modal");
  if (!modal || $("claimBusinessFields")) return;
  const actions = modal.querySelector(":scope > .actions");
  const fields = document.createElement("div");
  fields.id = "claimBusinessFields";
  fields.innerHTML = `<div id="claimContext" class="claim-context"></div><label>Penyebab klaim</label><select id="cl_cause"><option value="repeat_issue">Keluhan yang sama muncul kembali</option><option value="component_failure">Komponen pengganti bermasalah</option><option value="workmanship">Pengerjaan perlu dikoreksi</option><option value="new_issue">Keluhan baru terkait servis</option><option value="other">Lainnya</option></select><div class="frow"><div><label>Biaya internal klaim</label><input id="cl_internal_cost" inputmode="numeric" placeholder="0" oninput="fmtRupiahInput(this)"></div><div><label>Keputusan awal</label><select id="cl_decision"><option value="open">Perlu pemeriksaan</option><option value="approved">Disetujui</option></select></div></div><label>Rencana penanganan</label><textarea id="cl_resolution" rows="2" placeholder="Diagnosis ulang atau tindakan awal"></textarea>`;
  if (actions) modal.insertBefore(fields, actions);
}

function warrantyRootReport(report) {
  if (!report) return null;
  return report.original_report_id
    ? reports.find(
        (item) => String(item.id) === String(report.original_report_id),
      ) || report
    : report;
}

function warrantyRemainingDays(report) {
  const root = warrantyRootReport(report) || report;
  const days = Number(root?.warranty_days) || 0;
  if (!days) return 0;
  const start = new Date(
    root.date_out || root.qc_completed_at || root.updated_at || root.date_in,
  );
  if (Number.isNaN(start.getTime())) return days;
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - start.getTime()) / 86400000),
  );
  return Math.max(0, days - elapsed);
}

function warrantyClaimsFor(reportId) {
  return WARRANTY_CLAIMS.filter(
    (claim) => String(claim.source_report_id) === String(reportId),
  ).sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no));
}

function warrantyEligible(report) {
  if (!report) return false;
  const final =
    (typeof isFinalized === "function" && isFinalized(report)) ||
    /selesai|diambil/i.test(`${report.status || ""} ${report.stage || ""}`);
  return final && warrantyRemainingDays(report) > 0;
}

function warrantyCauseLabel(value) {
  return (
    {
      repeat_issue: "Keluhan berulang",
      component_failure: "Komponen bermasalah",
      workmanship: "Koreksi pengerjaan",
      new_issue: "Keluhan baru terkait servis",
      other: "Lainnya",
    }[value] ||
    value ||
    "Belum ditentukan"
  );
}

function warrantyDecisionLabel(value) {
  return (
    {
      open: "Perlu pemeriksaan",
      approved: "Disetujui",
      rejected: "Ditolak",
      resolved: "Selesai",
    }[value] ||
    value ||
    "Open"
  );
}

function openLinkedWarrantyClaim(id) {
  ensureWarrantyClaimUi();
  if (BUSINESS_SCHEMA_READY === false && legacyOpenClaimForm) {
    toast(
      "Migrasi v3.3.0 belum aktif; menggunakan pencatatan garansi lama.",
      "error",
    );
    legacyOpenClaimForm(id);
    return;
  }
  const report = reports.find((item) => String(item.id) === String(id));
  if (!report) return;
  const root = warrantyRootReport(report);
  const claims = warrantyClaimsFor(root.id);
  if (!warrantyEligible(root)) {
    toast("Masa garansi sudah berakhir atau servis belum selesai.", "error");
    return;
  }
  if (claims.length >= 3) {
    toast("Batas tiga klaim untuk tiket ini sudah tercapai.", "error");
    return;
  }
  $("cl_id").value = root.id;
  $("cl_n").value = claims.length + 1;
  $("cl_keluhan").value = "";
  $("cl_sparepart").value = "";
  $("cl_ket").value = "";
  $("cl_cause").value = "repeat_issue";
  $("cl_internal_cost").value = "";
  $("cl_decision").value = "open";
  $("cl_resolution").value = "";
  $("claimFormTitle").textContent = `Buat Klaim Garansi #${claims.length + 1}`;
  $("claimContext").innerHTML =
    `<strong>${esc(root.ticket_no || root.device)}</strong><span>Sisa garansi ${warrantyRemainingDays(root)} hari • tiket klaim baru akan dibuat dan ditautkan ke tiket ini.</span>`;
  const saveButton = document.querySelector(
    "#claimModal .actions .btn:not(.secondary)",
  );
  if (saveButton) saveButton.textContent = "Buat Tiket Klaim";
  openModal("claimModal");
}

async function nextWarrantyTicketNumber() {
  let max = 0;
  try {
    const result = await db
      .from("reports")
      .select("ticket_no")
      .eq("store_id", STORE_ID)
      .eq("job_type", "Garansi");
    (result.data || []).forEach((row) => {
      const match = String(row.ticket_no || "").match(/^\s*(\d+)/);
      if (match) max = Math.max(max, Number(match[1]) || 0);
    });
  } catch (error) {}
  const tail =
    typeof buildTicketTail === "function"
      ? buildTicketTail("Garansi")
      : "GARANSI";
  return `${String(max + 1).padStart(3, "0")}/${tail}`;
}

async function saveLinkedWarrantyClaim() {
  if (BUSINESS_SCHEMA_READY === false && legacySaveClaim) {
    await legacySaveClaim();
    return;
  }
  if (!db) {
    toast("Supabase belum dikonfigurasi.", "error");
    return;
  }
  const sourceId = $("cl_id").value;
  const source = reports.find((item) => String(item.id) === String(sourceId));
  const complaint = $("cl_keluhan").value.trim();
  if (!source || !complaint) {
    toast("Tiket asal dan keluhan wajib tersedia.", "error");
    return;
  }
  const sequence = Number($("cl_n").value) || 1;
  const remaining = warrantyRemainingDays(source);
  const now = new Date();
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const claimNo = `WG-${stamp}-${suffix}`;
  const component = $("cl_sparepart").value.trim();
  const internalCost = parseRupiah($("cl_internal_cost").value);
  const claimPayload = {
    store_id: STORE_ID,
    source_report_id: source.id,
    claim_no: claimNo,
    sequence_no: sequence,
    complaint,
    claimed_component: component,
    claim_cause: $("cl_cause").value,
    resolution_notes:
      $("cl_resolution").value.trim() || $("cl_ket").value.trim(),
    decision: $("cl_decision").value || "open",
    internal_cost: internalCost,
    remaining_warranty_days: remaining,
    created_by: ME.user_id || null,
    updated_at: now.toISOString(),
  };
  const claimResult = await db
    .from("warranty_claims")
    .insert(claimPayload)
    .select("id,claim_no")
    .single();
  if (claimResult.error) {
    if (businessSchemaMissing(claimResult.error)) BUSINESS_SCHEMA_READY = false;
    toast("Gagal membuat klaim: " + claimResult.error.message, "error");
    return;
  }
  const claimId = claimResult.data.id;
  const ticketNo = await nextWarrantyTicketNumber();
  const specs = { ...(source.device_specs || {}) };
  delete specs.claims;
  specs.warranty_source_ticket = source.ticket_no || "";
  specs.warranty_claim_no = claimNo;
  const reportPayload = {
    store_id: STORE_ID,
    ticket_no: ticketNo,
    job_type: "Garansi",
    original_report_id: source.id,
    warranty_claim_id: claimId,
    claim_sequence: sequence,
    device: source.device,
    device_type: source.device_type || "Laptop",
    device_specs: specs,
    brand: source.brand,
    customer: source.customer,
    customer_phone: source.customer_phone,
    date_in: now.toISOString().slice(0, 10),
    status: "Proses",
    stage: (typeof boardStages === "function" && boardStages()[0]) || "Antri",
    level: Number(source.level) || 1,
    tasks: "Diagnosis ulang klaim garansi",
    components: component ? [component] : [],
    assigned_to: null,
    before_notes: complaint,
    after_notes: "",
    before_media: [],
    after_media: [],
    fee: 0,
    cost: internalCost,
    cost_items: [],
    payment_status: "Lunas",
    dp_amount: 0,
    warranty_days: remaining,
    updated_at: now.toISOString(),
  };
  const reportResult = await db
    .from("reports")
    .insert(reportPayload)
    .select("id,ticket_no")
    .single();
  if (reportResult.error) {
    await db.from("warranty_claims").delete().eq("id", claimId);
    toast("Gagal membuat tiket klaim: " + reportResult.error.message, "error");
    return;
  }
  await db
    .from("warranty_claims")
    .update({
      claim_report_id: reportResult.data.id,
      updated_at: now.toISOString(),
    })
    .eq("id", claimId);

  const legacySpecs = { ...(source.device_specs || {}) };
  const legacyClaims = Array.isArray(legacySpecs.claims)
    ? legacySpecs.claims.slice()
    : [];
  legacyClaims.push({
    n: sequence,
    date: now.toISOString().slice(0, 10),
    keluhan: complaint,
    sparepart: component,
    keterangan: claimNo,
    report_id: reportResult.data.id,
  });
  legacySpecs.claims = legacyClaims;
  await db
    .from("reports")
    .update({ device_specs: legacySpecs })
    .eq("id", source.id);
  if (typeof logWorkflowActivity === "function") {
    await logWorkflowActivity(
      source.id,
      "warranty_claim",
      `Klaim ${claimNo} dibuat sebagai tiket ${reportResult.data.ticket_no}.`,
    );
    await logWorkflowActivity(
      reportResult.data.id,
      "warranty_claim",
      `Tiket klaim ditautkan ke ${source.ticket_no || source.id}.`,
    );
  }
  closeModal("claimModal");
  await loadAll();
  toast(
    `Tiket klaim ${reportResult.data.ticket_no} berhasil dibuat.`,
    "success",
  );
  openDetail(reportResult.data.id);
}

async function setWarrantyClaimDecision(claimId, decision) {
  if (!db) return;
  const update = {
    decision,
    updated_at: new Date().toISOString(),
    resolved_at: decision === "resolved" ? new Date().toISOString() : null,
  };
  const result = await db
    .from("warranty_claims")
    .update(update)
    .eq("id", claimId);
  if (result.error) {
    toast("Gagal memperbarui klaim: " + result.error.message, "error");
    return;
  }
  await loadAll();
  const claim = WARRANTY_CLAIMS.find(
    (item) => String(item.id) === String(claimId),
  );
  toast(`Klaim ditandai ${warrantyDecisionLabel(decision)}.`, "success");
  if (claim?.claim_report_id) openDetail(claim.claim_report_id);
}

function renderWarrantyLineage(reportId) {
  const report = reports.find((item) => String(item.id) === String(reportId));
  const detail = $("detailContent");
  if (!report || !detail) return;
  $("warrantyLineageCard")?.remove();
  const root = warrantyRootReport(report);
  const claims = warrantyClaimsFor(root.id);
  const currentClaim = WARRANTY_CLAIMS.find(
    (claim) => String(claim.claim_report_id) === String(report.id),
  );
  const eligible = warrantyEligible(root) && claims.length < 3;
  const legacyButton = $("detailClaimBtn");
  if (legacyButton) legacyButton.style.display = "none";
  if (!eligible && !claims.length && !report.original_report_id) return;
  const rows = claims.length
    ? claims
        .map((claim) => {
          const linked = reports.find(
            (item) => String(item.id) === String(claim.claim_report_id),
          );
          return `<button type="button" class="warranty-history-row" onclick="${linked ? `openDetail('${linked.id}')` : "void 0"}"><span><strong>${esc(claim.claim_no)}</strong><small>${esc(linked?.ticket_no || "Tiket belum tersedia")} • ${esc(warrantyCauseLabel(claim.claim_cause))}</small></span><span class="claim-status claim-${esc(claim.decision)}">${esc(warrantyDecisionLabel(claim.decision))}</span></button>`;
        })
        .join("")
    : '<div class="business-empty">Belum ada klaim garansi.</div>';
  const relation = report.original_report_id
    ? `<button class="btn small secondary" type="button" onclick="openDetail('${root.id}')">Buka tiket asli ${esc(root.ticket_no || "")}</button>`
    : "";
  const decisionActions = currentClaim
    ? `<div class="warranty-decision-actions"><button class="btn small secondary" type="button" onclick="setWarrantyClaimDecision('${currentClaim.id}','approved')">Setujui</button><button class="btn small secondary" type="button" onclick="setWarrantyClaimDecision('${currentClaim.id}','rejected')">Tolak</button><button class="btn small" type="button" onclick="setWarrantyClaimDecision('${currentClaim.id}','resolved')">Selesaikan klaim</button></div>`
    : "";
  const card = document.createElement("section");
  card.id = "warrantyLineageCard";
  card.className = "service-tool-card warranty-lineage-card";
  card.innerHTML = `<div class="service-tool-heading"><div><span class="service-tool-kicker">Garansi terhubung</span><h3>Riwayat klaim & tiket asal</h3></div><span class="warranty-days">${warrantyRemainingDays(root)} hari tersisa</span></div><div class="warranty-source"><span>Tiket asal</span><strong>${esc(root.ticket_no || root.device)}</strong><small>${esc(root.customer || "-")} • ${esc(root.device || "-")}</small></div><div class="warranty-history">${rows}</div><div class="service-tool-actions">${relation}${eligible ? `<button class="btn small" type="button" onclick="openClaimForm('${root.id}')">+ Buat tiket klaim</button>` : ""}</div>${decisionActions}`;
  detail.appendChild(card);
}

window.openClaimForm = openLinkedWarrantyClaim;
window.saveClaim = saveLinkedWarrantyClaim;
ensureWarrantyClaimUi();
