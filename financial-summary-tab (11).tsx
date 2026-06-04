"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClaimCalculationResult } from "@/src/claim-calculation";
import type {
  BSIData,
  EyeType,
  HospitalBillBreakdownItem,
  LensTypeApproval,
  TariffBreakdownItem,
} from "@/src/types";
import { coerceClaimType, type ClaimType } from "@/lib/rules";

interface FinancialSummaryTabProps {
  fileName: string;
  claimCalculation?: ClaimCalculationResult | null;
  financialSummaryTotals: {
    hospitalBillAfterDiscount: number;
    hospitalBillBeforeDiscount: number;
    discount: number;
    insurerPayable: number;
  };
  finalInsurerPayable?: number | null;
  finalInsurerPayableNotes?: string | null;
  formatAmountValue: (amount?: number | null) => string;
  benefitAmount?: number | null;
  lensType?: string | null;
  lensTypePageNumber?: number | null;
  lensTypeApproved?: LensTypeApproval;
  eyeType?: EyeType | null;
  isAllInclusivePackage: boolean;
  tariffPageNumber?: number | null;
  tariffFileName?: string | null;
  tariffNotes?: string | null;
  tariffClarificationNote?: string | null;
  tariffExtractionItem?: TariffBreakdownItem[] | null;
  hospitalBillBreakdown?: HospitalBillBreakdownItem[] | null;
  hospitalBillPageNumber?: number | null;
  onHospitalAmountClick?: (pageNumber?: number | null) => void;
  onTariffAmountClick?: (pageNumber?: number | null, highlightText?: string, highlightName?: string, rowTopPct?: number, rowBottomPct?: number) => void;
  /** Passed from result-view — same claimId used by benefit-plan and patient-info tabs */
  claimId?: string;
  /** MemberPolicyID for previous claims lookup */
  memberPolicyId?: string;
  /** Called when benefit plan limit is extracted from DB alignment cappings */
  onBenefitPlanLimitExtracted?: (limit: number | null, note: string) => void;
  dbBenefitPlanLimit?: number | null;
  claimType?: string;
  /** Called when user edits claimed/tariff amounts so parent can use updated approved amount */
  onAmountsChange?: (claimedAmount: number | null, tariffAmount: number | null, approvedAmount: number | null) => void;
  /** Called when user clicks Benefit extraction section — opens Benefit Plan tab on right */
  onBenefitExtractionClick?: () => void;
  /** Current diagnosis text — used to filter benefit extraction points */
  diagnosis?: string | null;
}

export function FinancialSummaryTab({
  claimCalculation,
  financialSummaryTotals,
  finalInsurerPayable,
  finalInsurerPayableNotes,
  onBenefitPlanLimitExtracted,
  dbBenefitPlanLimit,
  formatAmountValue,
  benefitAmount,
  lensType,
  lensTypePageNumber,
  lensTypeApproved,
  isAllInclusivePackage,
  tariffFileName,
  tariffNotes,
  tariffClarificationNote,
  tariffExtractionItem,
  hospitalBillBreakdown,
  hospitalBillPageNumber,
  onHospitalAmountClick,
  tariffPageNumber,
  onTariffAmountClick,
  claimId,
  memberPolicyId,
  onAmountsChange,
  onBenefitExtractionClick,
  diagnosis,
  claimType = "cataract",
}: FinancialSummaryTabProps) {

  // Safely coerce claimType — handles undefined/null/wrong types/unknown disease names.
  // Falls back to "other" for invalid input, but caller defaults to "cataract" for backward compat.
  const claimTypeSafe: ClaimType = coerceClaimType(claimType);

  // ── BSI state — fetched client-side via /api/bsi (runs on localhost:3000) ──
  const [bsiData, setBsiData] = useState<BSIData | null>(null);
  const [bsiError, setBsiError] = useState<string | null>(null);
  const [bsiLoading, setBsiLoading] = useState(false);
  const [alignmentCappings, setAlignmentCappings] = useState<string[]>([]);

  const loadBsi = useCallback(async () => {
    const trimmed = claimId?.trim();
    if (!trimmed) {
      setBsiData(null);
      setBsiError("Claim ID is not available for this job.");
      return;
    }

    setBsiLoading(true);
    setBsiError(null);

    try {
      const response = await fetch("/api/bsi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: trimmed }),
      });

      const payload = (await response.json()) as { bsiData?: BSIData; error?: string };

      if (!response.ok || !payload.bsiData) {
        throw new Error(payload.error ?? "Failed to fetch BSI data");
      }

      setBsiData(payload.bsiData);
    } catch (err) {
      setBsiData(null);
      setBsiError(err instanceof Error ? err.message : "Failed to fetch BSI data");
    } finally {
      setBsiLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void loadBsi();
  }, [loadBsi]);

  // Fetch benefit plan — extract cappings and benefit plan limit
  useEffect(() => {
    const trimmed = claimId?.trim();
    if (!trimmed) return;
    let cancelled = false;
    // Reset ailment state for this (re)load so we don't show stale points or a
    // premature "no restriction" message before the new fetch resolves.
    setAilmentLoading(true);
    setAilmentPoints([]);
    setAilmentSummary(null);

    const run = async () => {
      try {
        const r = await fetch("/api/benefit-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claimId: trimmed }),
        });
        const d = await r.json() as { snapshot?: Record<string, unknown> };
        if (cancelled) return;

        type Row = Record<string, unknown>;
        const snap = d.snapshot;
        if (!snap) {
          if (!cancelled) setAilmentLoading(false);
          return;
        }

        const getF = (row: Row, keys: string[]): unknown => {
          for (const k of keys) if (row[k] !== undefined && row[k] !== null) return row[k];
          return null;
        };
        const asT = (v: unknown) => String(v ?? "").trim();
        const parseId = (v: unknown): number | null => {
          const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null;
        };
        const describeLimit = (label: string, abs: unknown, perc: unknown, count?: unknown): string | null => {
          const a = asT(abs), p = asT(perc);
          if (!a && !p) return null;
          const parts = [a ? `${label} is ${a}` : "", p ? `(or) ${p}% on SumInsured` : "", count ? `::: Count ${count}` : ""].filter(Boolean);
          return parts.join(" ");
        };

        const conditions: Row[] = ((snap as { masters?: { conditions?: Row[] } }).masters?.conditions) ?? [];
        const ruleConfigs: Row[] = ((snap as { main?: { ruleConfigs?: Row[] } }).main?.ruleConfigs) ?? [];

        const condById = new Map<number, Row>();
        conditions.forEach((row) => {
          const id = parseId(getF(row, ["ID"]));
          if (id !== null) condById.set(id, row);
        });

        // Log all parent group names so we know exact names from DB
        const _parentNames = new Set<string>();
        conditions.forEach((row) => {
          const _pid = parseId(getF(row, ["ParentID"]));
          if (!_pid) return;
          const _par = condById.get(_pid);
          if (_par) _parentNames.add(asT(getF(_par, ["Name"])));
        });
        console.log("[ClaimAI] Benefit plan parent group names:", Array.from(_parentNames));

        const allCaps: string[] = [];
        const seen = new Set<string>();

        conditions.forEach((row) => {
          const parentId = parseId(getF(row, ["ParentID"]));
          if (!parentId) return;
          const parent = condById.get(parentId);
          if (!parent) return;
          // For cataract: Ailment Conditions group. For maternity: Maternity group
          const targetParent = claimTypeSafe === "maternity" ? "Maternity" : "Ailment Conditions";
          if (asT(getF(parent, ["Name"])) !== targetParent) return;

          const condId = parseId(getF(row, ["ID"]));
          if (!condId) return;
          const condName = asT(getF(row, ["Name"]));

          const linkedRules = ruleConfigs.filter(
            (r) => parseId(getF(r, ["BPConditionID"])) === condId
          );

          linkedRules.forEach((rule) => {
            const remark = asT(getF(rule, ["Remarks"]));
            const limits: string[] = [];
            const lim1 = describeLimit("Individual Limit", getF(rule, ["IndividualLimit"]), getF(rule, ["IndividualPerc"]), getF(rule, ["IndividualClaimCount"]));
            const lim2 = describeLimit("Claim Limit", getF(rule, ["ClaimLimit"]), getF(rule, ["ClaimPerc"]));
            const lim3 = describeLimit("Overall Limit", getF(rule, ["ExternalValueAbs"]), getF(rule, ["ExternalValuePerc"]));
            if (lim1) limits.push(lim1);
            if (lim2) limits.push(lim2);
            if (lim3) limits.push(lim3);
            const fullText = [remark, ...limits].filter(Boolean).join(" | ");
            if (fullText && !seen.has(fullText)) {
              seen.add(fullText);
              allCaps.push(`${condName}: ${fullText}`);
            }
          });
        });

        if (cancelled) return;
        setAlignmentCappings(allCaps.length > 0 ? allCaps : []);

        // ── AI summary for Ailment Cappings — filtered by claim type ─────
        if (allCaps.length > 0) {
          setAilmentLoading(true);
          fetch("/api/benefit-section-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              section: claimTypeSafe === "maternity" ? "maternity" : "ailment",
              rawText: allCaps.join("\n"),
              claimType: claimTypeSafe,
            }),
          }).then(r => r.json()).then((d: { summary?: string; points?: string[] }) => {
            if (cancelled) return;
            // Try JSON array first (new format), fall back to plain text
            if (d.points && Array.isArray(d.points) && d.points.length > 0) {
              setAilmentPoints(d.points);
            } else if (d.summary) {
              // Try parsing summary as JSON array
              try {
                const parsed = JSON.parse(d.summary);
                if (Array.isArray(parsed)) setAilmentPoints(parsed);
                else setAilmentSummary(d.summary);
              } catch {
                setAilmentSummary(d.summary);
              }
            }
          }).catch(() => {}).finally(() => {
            if (!cancelled) setAilmentLoading(false);
          });
        } else {
          // No raw cappings at all → nothing to fetch; we're done loading.
          if (!cancelled) setAilmentLoading(false);
        }

        // ── Extract Exclusions from condition groups ─────────────────────
        const exclusionLines: string[] = [];
        conditions.forEach((row) => {
          const parentId = parseId(getF(row, ["ParentID"]));
          if (!parentId) return;
          const parent = condById.get(parentId);
          if (!parent) return;
          const pName = asT(getF(parent, ["Name"]));
          if (pName !== "Exclusions" && pName !== "Exceptions") return;
          const condId = parseId(getF(row, ["ID"]));
          if (!condId) return;
          const condName = asT(getF(row, ["Name"]));
          ruleConfigs.filter(r => parseId(getF(r, ["BPConditionID"])) === condId).forEach(rule => {
            const remarks = asT(getF(rule, ["Remarks"]));
            const lim1 = describeLimit("Individual Limit", getF(rule, ["IndividualLimit"]), getF(rule, ["IndividualPerc"]));
            const parts = [remarks, lim1].filter(Boolean);
            if (parts.length) exclusionLines.push(`${condName}: ${parts.join(" | ")}`);
            else exclusionLines.push(condName);
          });
          // Include condition even if no rules — the name itself is the exclusion
          if (ruleConfigs.filter(r => parseId(getF(r, ["BPConditionID"])) === condId).length === 0) {
            exclusionLines.push(condName);
          }
        });
        if (exclusionLines.length > 0) {
          fetch("/api/benefit-section-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              section: "exclusions",
              rawText: exclusionLines.join("\n"),
              claimType: claimTypeSafe,
            }),
          }).then(r => r.json()).then((d: { summary?: string }) => {
            if (!cancelled && d.summary) setExclusionsSummary(d.summary);
          }).catch(() => {});
        }

        // ── Extract CoPay — rules linked directly to "General Copay" condition ─
        const copayLines: string[] = [];
        conditions.forEach((row) => {
          const id   = parseId(getF(row, ["ID"]));
          const name = asT(getF(row, ["Name"]));
          if (name !== "General Copay" || !id) return;
          ruleConfigs.filter(r => parseId(getF(r, ["BPConditionID"])) === id).forEach(rule => {
            const parts: string[] = [];
            const copayVal  = asT(getF(rule, ["CopayValue"]));
            const copayPerc = asT(getF(rule, ["CopayPerc"]));
            const remarks   = asT(getF(rule, ["Remarks"]));
            if (copayVal)  parts.push(`Co-pay Amount: ${copayVal}`);
            if (copayPerc) parts.push(`Co-pay Percent: ${copayPerc}%`);
            if (remarks)   parts.push(remarks);
            if (parts.length) {
              copayLines.push(parts.join(" | "));
              // Store concise display string — prefer remarks (already human-readable), then percent, then value
              const display = remarks
                ? remarks
                : copayPerc ? `${copayPerc}% co-pay applicable`
                : copayVal  ? `${copayVal}% co-pay applicable`
                : null;
              if (display && !cancelled) setCopayRawInfo(display);
            }
          });
        });
        if (copayLines.length > 0) {
          fetch("/api/benefit-section-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              section: "copay",
              rawText: copayLines.join("\n"),
              claimType: claimTypeSafe,
            }),
          }).then(r => r.json()).then((d: { summary?: string }) => {
            if (!cancelled && d.summary) setCopaySummary(d.summary);
          }).catch(() => {});
        }

        // Benefit plan limit is now calculated only when user clicks Calculate button
        // (uses USP_Codingprocedurelimits via Spectra postMessage)


      } catch (e) {
        console.warn("[ClaimAI] benefit-plan useEffect error:", e);
        if (!cancelled) setAilmentLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [claimId, diagnosis, onBenefitPlanLimitExtracted]);

    // ───────────────────────────────────────────────────────────────────────────

  const normalizeAmount = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : null;
  const isLensComponent = (name?: string | null, code?: string | null) =>
    /lens|iol|implant/i.test(`${name || ""} ${code || ""}`);
  const sumLensAmountFromTariff = (items?: TariffBreakdownItem[] | null) => {
    if (!Array.isArray(items)) return null;
    return items.reduce((sum, item) => {
      const amount = normalizeAmount(item.amount);
      if (amount === null) return sum;
      return isLensComponent(item.name, item.code) ? sum + amount : sum;
    }, 0);
  };
  const sumLensAmountFromHospital = (items?: HospitalBillBreakdownItem[] | null) => {
    if (!Array.isArray(items)) return null;
    return items.reduce((sum, item) => {
      const amount = normalizeAmount(item.amount);
      if (amount === null) return sum;
      return isLensComponent(item.name) ? sum + amount : sum;
    }, 0);
  };

  // ── Editable breakdown rows ───────────────────────────────────────────────
  type EditableRow = { id: string; name: string; amount: string; pdfText?: string; pdfPageNumber?: number; pdfRowTopPct?: number; pdfRowBottomPct?: number };

  const toEditableRows = (items: HospitalBillBreakdownItem[]): EditableRow[] =>
    items.map((item, i) => ({
      id: `h-${i}`,
      name: item.name ?? "",
      amount: item.amount != null ? String(item.amount) : "",
    }));

  const toEditableTariffRows = (items: TariffBreakdownItem[]): EditableRow[] =>
    items.map((item, i) => ({
      id: `t-${i}`,
      name: item.name ?? "",
      amount: item.amount != null ? String(item.amount) : "",
      pdfText: (item as any).pdfText ?? undefined,
      pdfPageNumber: (item as any).pdfPageNumber ?? undefined,
      pdfRowTopPct: (item as any).pdfRowTopPct ?? undefined,
      pdfRowBottomPct: (item as any).pdfRowBottomPct ?? undefined,
    }));

  const [hospitalRows, setHospitalRows] = useState<EditableRow[]>([]);
  const [tariffRows, setTariffRows]     = useState<EditableRow[]>([]);
  const [hospitalInit, setHospitalInit] = useState(false);
  const [tariffInit, setTariffInit]     = useState(false);

  // Initialise from props once data arrives
  useEffect(() => {
    if (!hospitalInit && Array.isArray(hospitalBillBreakdown) && hospitalBillBreakdown.length > 0) {
      setHospitalRows(toEditableRows(hospitalBillBreakdown));
      setHospitalInit(true);
    }
  }, [hospitalBillBreakdown, hospitalInit]);

  useEffect(() => {
    const tariffSrc = Array.isArray(tariffExtractionItem) ? tariffExtractionItem : [];
    if (!tariffInit && tariffSrc.length > 0) {
      setTariffRows(toEditableTariffRows(tariffSrc));
      setTariffInit(true);
    }
  }, [tariffExtractionItem, tariffInit]);

  // Computed totals from editable rows
  const hospitalRowsTotal = hospitalRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const tariffRowsTotal   = tariffRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const addHospitalRow = () =>
    setHospitalRows(rows => [...rows, { id: `h-${Date.now()}`, name: "", amount: "" }]);
  const addTariffRow = () =>
    setTariffRows(rows => [...rows, { id: `t-${Date.now()}`, name: "", amount: "" }]);

  const updateHospitalRow = (id: string, field: "name" | "amount", val: string) =>
    setHospitalRows(rows => rows.map(r => r.id === id ? { ...r, [field]: val } : r));
  const updateTariffRow = (id: string, field: "name" | "amount", val: string) =>
    setTariffRows(rows => rows.map(r => r.id === id ? { ...r, [field]: val } : r));

  const deleteHospitalRow = (id: string) =>
    setHospitalRows(rows => rows.filter(r => r.id !== id));
  const deleteTariffRow = (id: string) =>
    setTariffRows(rows => rows.filter(r => r.id !== id));

  // Manual overrides (kept for backward compat with onAmountsChange)
  const [editedClaimedAmount] = useState<string | null>(null);
  const [editedTariffAmount]  = useState<string | null>(null);

  // ── Previous Claims ────────────────────────────────────────────────────────
  type PreviousClaim = {
    claimId: string; slNo: number; admissionDate: string | null;
    dischargeDate: string | null; diagnosis: string | null;
    treatment: string | null; complaint: string | null;
    billAmount: number | null; approvedAmount: number | null;
    hospital: string | null; status: string | null;
  };
  const [prevClaims, setPrevClaims]       = useState<PreviousClaim[]>([]);
  const [prevClaimsLoading, setPrevLoading] = useState(false);
  const [prevClaimsError, setPrevError]   = useState<string | null>(null);
  const [ailmentSummary,    setAilmentSummary]    = useState<string | null>(null);
  const [ailmentPoints,     setAilmentPoints]     = useState<string[]>([]);
  const [ailmentLoading,    setAilmentLoading]    = useState(true);
  const [copayRawInfo,      setCopayRawInfo]      = useState<string | null>(null);
  const [spLimitLoading,    setSpLimitLoading]    = useState(false);

  // Listen for coding procedure limit result from Spectra (via postMessage → CustomEvent)
  useEffect(() => {
    const handler = (e: Event) => {
      console.log("[ClaimAI] claimai:codingLimitResult event received:", (e as CustomEvent).detail);
      const d = (e as CustomEvent).detail as {
        success: boolean; error?: string;
        eligibleAmount?: number; ruleName?: string;
        limits?: Record<string, number | null>;
        utilized?: Record<string, number>;
      };
      setSpLimitLoading(false);
      if (d.success) {
        if ((d as unknown as { noLimit?: boolean }).noLimit) {
          // No sub-limit configured — show info but don't change the amount
          setSpLimitResult({
            eligibleAmount: -1,
            ruleName: d.ruleName ?? "No sub-limit — full sum insured applies",
            limits: {},
            utilized: {},
          });
        } else if (d.eligibleAmount !== undefined && d.eligibleAmount !== null) {
          setSpLimitResult({
            eligibleAmount: d.eligibleAmount,
            ruleName: d.ruleName ?? "",
            limits: d.limits ?? {},
            utilized: d.utilized ?? {},
            warning: (d as unknown as { warning?: string }).warning,
          });
          onBenefitPlanLimitExtracted?.(d.eligibleAmount, `Calculated from benefit plan rules: ${d.ruleName ?? ""}`);
        }
      } else {
        setSpLimitError(d.error ?? "Failed to calculate");
      }
    };
    window.addEventListener("claimai:codingLimitResult", handler);
    return () => window.removeEventListener("claimai:codingLimitResult", handler);
  }, [onBenefitPlanLimitExtracted]);
  const [spLimitResult,     setSpLimitResult]     = useState<{
    eligibleAmount: number;
    ruleName: string;
    limits: Record<string, number | null>;
    utilized: Record<string, number>;
    warning?: string;
  } | null>(null);
  const [spLimitError,      setSpLimitError]      = useState<string | null>(null);
  const [exclusionsSummary, setExclusionsSummary] = useState<string | null>(null);
  const [copaySummary,      setCopaySummary]      = useState<string | null>(null);
  const [similarityResult, setSimilarityResult] = useState<{
    isSimilar: boolean;
    similarityReason: string;
    recommendedAmount: number | null;
    recommendationBasis: string;
    confidence: string;
  } | null>(null);

  useEffect(() => {
    if (!claimId) return;
    setPrevLoading(true);
    const params = new URLSearchParams({ claimId });
    if (memberPolicyId) params.set("memberPolicyId", memberPolicyId);
    fetch(`/api/previous-claims?${params.toString()}`)
      .then((r) => r.json())
      .then(async (data) => {
        const claims: PreviousClaim[] = data.claims ?? [];
        setPrevClaims(claims);
        setPrevError(null);

        // Check similarity with latest previous claim
        if (claims.length > 0 && diagnosis && onBenefitPlanLimitExtracted) {
          const latest = claims[0];
          try {
            const simRes = await fetch("/api/previous-claim-similarity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                currentClaim: {
                  diagnosis:   diagnosis ?? "",
                  treatment:   "",
                  complaint:   "",
                  billAmount:  null,
                  hospital:    "",
                },
                previousClaim: latest,
                benefitPlanLimit: dbBenefitPlanLimit ?? null,
                claimType: claimTypeSafe,
              }),
            });
            if (simRes.ok) {
              const simData = await simRes.json() as {
                isSimilar: boolean;
                similarityReason: string;
                recommendedAmount: number | null;
                recommendationBasis: string;
                confidence: string;
              };
              console.log("[ClaimAI] ── Previous Claim Similarity Result ──");
              console.log("[ClaimAI] isSimilar:", simData.isSimilar);
              console.log("[ClaimAI] similarityReason:", simData.similarityReason);
              console.log("[ClaimAI] recommendedAmount:", simData.recommendedAmount);
              console.log("[ClaimAI] recommendationBasis:", simData.recommendationBasis);
              console.log("[ClaimAI] confidence:", simData.confidence);
              if (simData.isSimilar && simData.recommendedAmount) {
                console.log("[ClaimAI] ACTION: Overriding approved amount with min(prevApproved=" + simData.recommendedAmount + ", currentBill)");
              } else {
                console.log("[ClaimAI] ACTION: No override — proceeding with normal tariff/benefit plan calculation");
              }
              setSimilarityResult(simData);
              // Don't change benefit plan amount — just store similarity result for reason line
            }
          } catch (e) {
            console.warn("[ClaimAI] Previous claim similarity error:", e);
          }
        }
      })
      .catch((e) => setPrevError(String(e)))
      .finally(() => setPrevLoading(false));
  }, [memberPolicyId, claimId]);

  const hospitalAmount = normalizeAmount(financialSummaryTotals.hospitalBillAfterDiscount);
  // Only use benefit plan limit after Calculate button is clicked (spLimitResult set)
  // Before that, benefitTotal is null — Total Approved = min(Bill, Tariff, BSI) only
  const benefitTotal = spLimitResult !== null && spLimitResult.eligibleAmount !== -1
    ? spLimitResult.eligibleAmount
    : spLimitResult !== null && spLimitResult.eligibleAmount === -1
      ? null // noLimit — don't cap
      : null; // not yet calculated — don't show or use
  const tariffItems = Array.isArray(tariffExtractionItem) ? tariffExtractionItem : [];
  const tariffItemsTotal = tariffItems.reduce(
    (sum, item) => sum + (normalizeAmount(item.amount) ?? 0), 0,
  );
  const effectiveTariffTotal = tariffItems.length > 0 ? tariffItemsTotal : null;

  // Effective amounts — row totals take priority, then manual edit, then extracted
  const effectiveClaimedAmount =
    hospitalInit && hospitalRows.length > 0 ? hospitalRowsTotal
    : editedClaimedAmount !== null ? (parseFloat(editedClaimedAmount) || 0)
    : hospitalAmount;
  const effectiveTariffAmount =
    tariffInit && tariffRows.length > 0 ? tariffRowsTotal
    : editedTariffAmount !== null ? (parseFloat(editedTariffAmount) || 0)
    : effectiveTariffTotal;
  const tariffLensAmount = sumLensAmountFromTariff(tariffItems);
  const hospitalLensAmount = sumLensAmountFromHospital(hospitalBillBreakdown);
  const tariffWithoutLens =
    tariffLensAmount !== null && effectiveTariffTotal !== null
      ? Math.max(effectiveTariffTotal - tariffLensAmount, 0) : null;
  const hospitalWithoutLens =
    hospitalAmount !== null && hospitalLensAmount !== null
      ? Math.max(hospitalAmount - hospitalLensAmount, 0) : null;

  const completePackage = isAllInclusivePackage;

  const totalAmountApproved =
    claimCalculation?.totalAmountApproved ??
    normalizeAmount(finalInsurerPayable) ??
    (() => {
      if (completePackage) {
        if (hospitalAmount === null || effectiveTariffTotal === null) return null;
        const packageMin = Math.min(hospitalAmount, effectiveTariffTotal);
        return benefitTotal === null ? packageMin : Math.min(packageMin, benefitTotal);
      }
      if (tariffWithoutLens === null || hospitalWithoutLens === null ||
          tariffLensAmount === null || hospitalLensAmount === null) {
        if (hospitalAmount === null || effectiveTariffTotal === null) return null;
        const fallbackMin = Math.min(hospitalAmount, effectiveTariffTotal);
        return benefitTotal === null ? fallbackMin : Math.min(fallbackMin, benefitTotal);
      }
      const baseAmount = Math.min(tariffWithoutLens, hospitalWithoutLens);
      const lensAmount = Math.min(tariffLensAmount, 10000, hospitalLensAmount);
      const nonPackageTotal = baseAmount + lensAmount;
      return benefitTotal === null ? nonPackageTotal : Math.min(nonPackageTotal, benefitTotal);
    })();

  // Notify parent whenever effective amounts change (rows edited, added, deleted)
  useEffect(() => {
    if (onAmountsChange) {
      onAmountsChange(effectiveClaimedAmount, effectiveTariffAmount, editedApprovedAmount);
    }
  }, [hospitalRows, tariffRows, editedClaimedAmount, editedTariffAmount]);

  // ── BSI derived values ──────────────────────────────────────────────────────
  const bsiBaseSI =
    bsiData?.Suminsured?.find((r) => r.SICategery === 69) ??
    bsiData?.Suminsured?.[0] ?? null;
  const bsiEffectiveBalance: number | null =
    typeof bsiBaseSI?.EffectiveBalance === "number" ? bsiBaseSI.EffectiveBalance : null;

  // Recalculate approved amount from edited values — placed here after bsiEffectiveBalance
  const editedApprovedAmount: number | null = (() => {
    const claimed = effectiveClaimedAmount ?? null;
    const tariff  = effectiveTariffAmount  ?? null;

    // If a similar previous claim exists — approve min(previousApproved, currentBill)
    // This overrides tariff and benefit plan limits entirely
    if (similarityResult?.isSimilar && similarityResult.recommendedAmount && claimed !== null) {
      const prevApproved = similarityResult.recommendedAmount;
      const simApproved  = Math.min(prevApproved, claimed);
      return bsiEffectiveBalance !== null ? Math.min(simApproved, bsiEffectiveBalance) : simApproved;
    }

    if (claimed === null && tariff === null) return null;
    let base: number;
    if (claimed !== null && tariff !== null) base = Math.min(claimed, tariff);
    else base = (claimed ?? tariff) as number;
    const withBenefit: number = benefitTotal !== null ? Math.min(base, benefitTotal) : base;
    return bsiEffectiveBalance !== null ? Math.min(withBenefit, bsiEffectiveBalance) : withBenefit;
  })();

  const bsiCappedPayable: number | null =
    totalAmountApproved !== null && bsiEffectiveBalance !== null
      ? Math.min(totalAmountApproved, bsiEffectiveBalance)
      : totalAmountApproved;
  const bsiCapApplied: boolean =
    bsiCappedPayable !== null && totalAmountApproved !== null &&
    bsiCappedPayable < totalAmountApproved;
  // ───────────────────────────────────────────────────────────────────────────

  const lensTypeValue = lensType?.trim() || null;
  const lensApproved: LensTypeApproval | null = lensTypeApproved ?? null;

  const formatBoolean = (value: boolean) => (value ? "Yes" : "No");
  const formatLensTypeApproved = (value: LensTypeApproval | null) =>
    value === null ? "—" : value === "cant determine" ? "cant determine" : value ? "Yes" : "No";
  const formatDisplayAmount = (value: number | null) =>
    value === null ? "—" : `INR ${formatAmountValue(value)}`;
  const formatAppliedRule = (value?: string | null) => {
    switch (value) {
      case "policy_limit_or_hospital_package_lower": return "Lower of policy cataract limit and hospital package/R&C";
      case "no_policy_limit_use_hospital_package": return "No policy limit, so hospital package selected";
      case "no_policy_limit_package_excludes_lens": return "No policy limit and package excludes lens, so procedure package plus lens R&C applied";
      case "niac_no_policy_limit_lens_excluded": return "NIAC rule with no policy limit and package excludes lens, capped at INR 50,000";
      case "niac_flexi_floater_cap_24000": return "NIAC Flexi Floater cataract cap applied at INR 24,000";
      case "psu_retail_upto_5l_package_plus_lens": return "PSU retail up to 5L: package plus monofocal lens";
      case "psu_corporate_above_5l_package_plus_lens": return "PSU corporate above 5L: package plus monofocal lens";
      case "psu_corporate_above_5l_no_cataract_limit_cap_45000": return "PSU corporate above 5L with no cataract limit: capped at INR 45,000";
      case "psu_no_policy_limit_package_plus_lens": return "PSU no policy limit: package plus monofocal lens";
      case "no_policy_limit_no_package_lens_rc_only": return "No policy limit or package, so lens R&C only applied";
      case "policy_limit_without_package": return "Policy cataract limit applied without package reference";
      case "billed_amount_only": return "Billed amount applied";
      case "standard_billed_or_tariff": return "Standard billed/tariff calculation";
      default: return "—";
    }
  };

  const lensTypeLinkable = !!lensTypePageNumber && !!onTariffAmountClick;
  const goToLensTypePage = () => { if (lensTypePageNumber && onTariffAmountClick) onTariffAmountClick(lensTypePageNumber); };
  const hospitalLinkable = !!hospitalBillPageNumber && !!onHospitalAmountClick;
  const tariffLinkable = !!tariffPageNumber && !!onTariffAmountClick;
  const goToHospitalPage = () => { if (hospitalBillPageNumber && onHospitalAmountClick) onHospitalAmountClick(hospitalBillPageNumber); };
  const goToTariffPage = () => { if (tariffPageNumber && onTariffAmountClick) onTariffAmountClick(tariffPageNumber); };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-base font-semibold tracking-tight">Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4">

          {/* Hospital bill extraction */}
          <Card className="bg-card border border-border">
            <CardContent>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Hospital bill extraction</span>
                {hospitalLinkable && (
                  <button type="button" onClick={goToHospitalPage} className="normal-case text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                    Page {hospitalBillPageNumber}
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {(hospitalRows.length > 0 ? hospitalRows : []).map((row) => (
                  <div key={row.id} className="flex items-center gap-1 text-sm group">
                    <input
                      className="flex-1 min-w-0 border border-transparent group-hover:border-border rounded px-1 py-0.5 text-foreground bg-transparent focus:border-ring focus:bg-background outline-none text-sm"
                      value={row.name}
                      placeholder="Item name"
                      onChange={(e) => updateHospitalRow(row.id, "name", e.target.value)}
                    />
                    <input
                      className="w-24 text-right border border-transparent group-hover:border-border rounded px-1 py-0.5 font-medium text-foreground bg-transparent focus:border-ring focus:bg-background outline-none text-sm"
                      value={row.amount}
                      placeholder="0"
                      type="number"
                      onChange={(e) => updateHospitalRow(row.id, "amount", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => deleteHospitalRow(row.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive px-1 text-xs transition-opacity"
                      title="Delete row"
                    >✕</button>
                  </div>
                ))}
                {hospitalRows.length === 0 && !hospitalInit && hospitalAmount !== null && (
                  <div className="text-sm text-foreground">Amount: {formatDisplayAmount(hospitalAmount)}</div>
                )}
                {/* Total row */}
                {hospitalRows.length > 0 && (
                  <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-1 mt-1">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-foreground">{formatDisplayAmount(hospitalRowsTotal)}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={addHospitalRow}
                  className="mt-1 text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  <span>＋</span> Add row
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Tariff extraction */}
          <Card className="bg-green-50 border border-green-200 dark:border-green-900/50 dark:bg-green-950/30 dark:border-green-900/50">
            <CardContent>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                <span>Tariff extraction</span>
                {tariffLinkable && (
                  <button type="button" onClick={goToTariffPage} className="normal-case text-xs font-medium text-blue-600">
                    Page {tariffPageNumber}
                  </button>
                )}
              </div>
              {tariffFileName && (
                <p className="text-xs text-green-600 dark:text-green-400 mb-2 truncate" title={tariffFileName}>
                  📄 {tariffFileName.replace(/\.pdf$/i, "")}
                </p>
              )}
              <div className="space-y-1 border-t border-green-200 dark:border-green-900/50 pt-2">
                {tariffRows.map((row) => {
                  const canHighlight = tariffLinkable && !!row.amount;
                  const handleRowClick = () => {
                    if (canHighlight) {
                      // Always pass both name and text for best highlight matching
                      const page = row.pdfPageNumber ?? tariffPageNumber;
                      const searchText = row.pdfText ?? row.amount;
                      const searchName = row.name; // always pass name so Strategy A can find the row
                      onTariffAmountClick?.(page, searchText, searchName, row.pdfRowTopPct, row.pdfRowBottomPct);
                    }
                  };
                  return (
                  <div
                    key={row.id}
                    className={`tariff-row-clickable flex items-center gap-1 text-sm group${canHighlight ? " cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 rounded" : ""}`}
                    title={canHighlight ? "Click to highlight in tariff PDF" : undefined}
                    onClick={handleRowClick}
                  >
                    <input
                      className="flex-1 min-w-0 border border-transparent group-hover:border-green-300 dark:border-green-800 rounded px-1 py-0.5 text-green-700 dark:text-green-400 bg-transparent focus:border-ring focus:bg-background outline-none text-sm"
                      value={row.name}
                      placeholder="Item name"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateTariffRow(row.id, "name", e.target.value)}
                    />
                    <input
                      className="w-24 text-right border border-transparent group-hover:border-green-300 dark:border-green-800 rounded px-1 py-0.5 font-medium text-green-900 dark:text-green-200 bg-transparent focus:border-ring focus:bg-background outline-none text-sm"
                      value={row.amount}
                      placeholder="0"
                      type="number"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateTariffRow(row.id, "amount", e.target.value)}
                    />
                    {canHighlight && (
                      <span className="opacity-0 group-hover:opacity-60 text-blue-500 text-xs px-1 select-none" title="Highlight in tariff PDF">↗</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteTariffRow(row.id); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive px-1 text-xs transition-opacity"
                      title="Delete row"
                    >✕</button>
                  </div>
                  );
                })}
                {tariffRows.length === 0 && (
                  <div className="text-sm text-green-700 dark:text-green-400">—</div>
                )}
                {/* Total row */}
                {tariffRows.length > 0 && (
                  <div className="flex items-center justify-between text-sm font-semibold border-t border-green-200 dark:border-green-900/50 pt-1 mt-1">
                    <span className="text-green-700 dark:text-green-400">Total</span>
                    <span className="text-green-900 dark:text-green-200">{formatDisplayAmount(tariffRowsTotal)}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={addTariffRow}
                  className="mt-1 text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <span>＋</span> Add row
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Benefit extraction */}
          <Card className="bg-card border border-border">
            <CardContent>
              <div
                className={`mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground ${onBenefitExtractionClick ? "cursor-pointer hover:text-blue-600 transition-colors" : ""}`}
                onClick={() => onBenefitExtractionClick?.()}
                title={onBenefitExtractionClick ? "Click to open Benefit Plan" : undefined}
              >
                Benefit extraction {onBenefitExtractionClick && <span className="text-xs text-blue-500 normal-case">↗ View Benefit Plan</span>}
              </div>
              {/* Three small sections inside Benefit Extraction */}
              <div className="space-y-2">

                {/* 1. Ailment Cappings */}
                {(ailmentPoints.length > 0 || ailmentSummary || alignmentCappings.length > 0) ? (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-2">
                    <div className="text-xs font-semibold text-blue-700 mb-2">Ailment Cappings</div>
                    {ailmentPoints.length > 0 ? (
                      <ul className="space-y-1">
                        {ailmentPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                            <span className="mt-0.5 text-blue-500 shrink-0">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : ailmentSummary ? (
                      <p className="text-xs text-foreground">{ailmentSummary}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Extracting relevant cappings...</p>
                    )}
                  </div>
                ) : ailmentLoading ? (
                  // Still loading — don't prematurely show the "no restriction" message.
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-2">
                    <div className="text-xs font-semibold text-blue-700 mb-2">Ailment Cappings</div>
                    <p className="text-xs text-muted-foreground italic">Extracting relevant cappings...</p>
                  </div>
                ) : (
                  // Loaded, and genuinely no ailment-capping rule for this claim type —
                  // show the admissible-as-per-policy message.
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-2">
                    <div className="text-xs font-semibold text-blue-700 mb-2">Ailment Cappings</div>
                    <p className="text-xs text-foreground">
                      {`${claimTypeSafe.charAt(0).toUpperCase()}${claimTypeSafe.slice(1)}: No restriction mentioned – Admissible as per SI/Policy Terms`}
                    </p>
                  </div>
                )}

                {/* 2. Exclusions */}
                {exclusionsSummary && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2">
                    <div className="text-xs font-semibold text-destructive mb-1">Exclusions</div>
                    <p className="text-xs text-foreground">{exclusionsSummary}</p>
                  </div>
                )}

                {/* 3. CoPay */}
                {copaySummary && (
                  <div className="rounded border border-orange-100 bg-orange-50 p-2">
                    <div className="text-xs font-semibold text-orange-700 mb-1">Co-Pay</div>
                    <p className="text-xs text-foreground">{copaySummary}</p>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

          {/* Balance Sum Insured */}
          <Card className="border border-border bg-card">
            <CardContent className="pt-4">
              <div className="mb-3">
                <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Balance Sum Insured
                </div>
              </div>

              {bsiLoading && (
                <div className="text-xs text-muted-foreground animate-pulse">
                  Fetching live SI balance...
                </div>
              )}

              {bsiError && !bsiLoading && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
                  <span className="font-semibold">BSI not available: </span>{bsiError}
                </div>
              )}

              {bsiData && !bsiLoading && (
                <div className="space-y-3">
                  {/* Main SI table */}
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-foreground text-background">
                          <th className="px-2 py-1.5 text-left font-semibold">BPSI ID</th>
                          <th className="px-2 py-1.5 text-right font-semibold">Sum Insured</th>
                          <th className="px-2 py-1.5 text-right font-semibold">Utilized</th>
                          <th className="px-2 py-1.5 text-right font-semibold">Blocked</th>
                          <th className="px-2 py-1.5 text-right font-semibold">Reserved</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-emerald-300">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bsiData.Suminsured.map((row, idx) => (
                          <tr
                            key={`bsi-${row.BPSIID}-${idx}`}
                            className={row.SICategery === 69 ? "bg-card font-semibold" : "bg-muted/40 text-muted-foreground"}
                          >
                            <td className="border-t border-border px-2 py-1.5">
                              {row.BPSIID}
                              {row.SICategery === 69 && <span className="ml-1 text-[9px] text-muted-foreground">base</span>}
                            </td>
                            <td className="border-t border-border px-2 py-1.5 text-right">{formatAmountValue(row.Suminsured)}</td>
                            <td className="border-t border-border px-2 py-1.5 text-right text-red-600 dark:text-red-400">{formatAmountValue(row.Utilized)}</td>
                            <td className="border-t border-border px-2 py-1.5 text-right text-orange-600 dark:text-orange-400">{formatAmountValue(row.Blocked)}</td>
                            <td className="border-t border-border px-2 py-1.5 text-right text-amber-600 dark:text-amber-400">{formatAmountValue(row.Reserved)}</td>
                            <td className={`border-t border-border px-2 py-1.5 text-right font-bold ${row.EffectiveBalance <= 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                              {formatAmountValue(row.EffectiveBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Effective balance highlight */}
                  {bsiBaseSI && (
                    <div className={`flex items-center justify-between rounded-md px-3 py-2 ${bsiEffectiveBalance !== null && bsiEffectiveBalance > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                      <span className="text-xs font-semibold text-foreground">
                        Effective SI balance available for this claim
                      </span>
                      <span className={`text-sm font-bold ${bsiEffectiveBalance !== null && bsiEffectiveBalance > 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {formatDisplayAmount(bsiEffectiveBalance)}
                      </span>
                    </div>
                  )}

                  {/* Other benefits / sub-limits */}
                  {bsiData.OtherBenefits.length > 0 && (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Other benefits / sub-limits
                      </div>
                      <div className="overflow-x-auto rounded-md border border-border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted text-muted-foreground">
                              <th className="px-2 py-1 text-left">BPSI ID</th>
                              <th className="px-2 py-1 text-right">Limit</th>
                              <th className="px-2 py-1 text-right">Utilized</th>
                              <th className="px-2 py-1 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bsiData.OtherBenefits.map((ob, idx) => (
                              <tr key={`ob-${idx}`} className="border-t border-border">
                                <td className="px-2 py-1">{ob.BPSIID}</td>
                                <td className="px-2 py-1 text-right">{formatAmountValue(ob.Suminsured)}</td>
                                <td className="px-2 py-1 text-right text-red-500">{formatAmountValue(ob.Utilized)}</td>
                                <td className="px-2 py-1 text-right font-semibold text-emerald-700">{formatAmountValue(ob.EffectiveBalance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Approvals */}
        <section className="space-y-6">
          <h3 className="font-display text-base font-semibold uppercase tracking-wide text-foreground">APPROVALS</h3>
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
            {/* Three breakdown lines */}
            {/* Total Medical Bill — reflects editable breakdown rows */}
            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Medical Bill</span>
              <span className="text-sm text-foreground font-medium">
                {formatDisplayAmount(effectiveClaimedAmount)}
                {hospitalInit && hospitalRows.length > 0 && (
                  <span className="ml-1 text-[10px] text-blue-400">edited</span>
                )}
              </span>
            </div>

            {/* Tariff Amount — reflects editable breakdown rows */}
            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-sm text-muted-foreground">Tariff Amount</span>
              <span className="text-sm text-foreground font-medium">
                {effectiveTariffAmount !== null ? formatDisplayAmount(effectiveTariffAmount) : "—"}
                {tariffInit && tariffRows.length > 0 && (
                  <span className="ml-1 text-[10px] text-blue-400">edited</span>
                )}
              </span>
            </div>

            {/* Benefit Plan Limit — with Calculate button */}
            <div className="flex items-center justify-between py-1 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Benefit Plan Limit</span>
                <button
                  onClick={() => {
                    if (!claimId) return;
                    setSpLimitLoading(true);
                    setSpLimitError(null);
                    setSpLimitResult(null);
                    console.log("[ClaimAI] Sending getCodingProcedureLimit postMessage, claimId=", claimId);
                    window.parent.postMessage(
                      { source: "claimai", type: "getCodingProcedureLimit", claimId },
                      "*"
                    );
                  }}
                  disabled={spLimitLoading || !claimId}
                  className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {spLimitLoading ? "Calculating..." : "Calculate"}
                </button>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-sm text-foreground">
                  {spLimitResult !== null
                    ? spLimitResult.eligibleAmount === -1
                      ? "No sub-limit"
                      : formatDisplayAmount(spLimitResult.eligibleAmount)
                    : benefitTotal !== null ? formatDisplayAmount(benefitTotal) : "—"}
                </span>
                {spLimitResult && spLimitResult.eligibleAmount === -1 && (
                  <span className="text-xs text-green-700 dark:text-green-400">
                    No Restriction mentioned - Admissible as per SI/Policy Terms
                  </span>
                )}
                {spLimitResult && spLimitResult.eligibleAmount !== -1 && (
                  <span className="text-xs text-muted-foreground">{spLimitResult.ruleName}</span>
                )}
                {spLimitError && (
                  <span className="text-xs text-red-500">{spLimitError}</span>
                )}
              </div>
            </div>

            {/* Total Amount Approved — always uses editedApprovedAmount (recalculated from row totals) */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-bold text-foreground">Total Amount Approved</span>
              <div className="flex flex-col items-end gap-0.5">
                {editedApprovedAmount !== null && bsiEffectiveBalance !== null &&
                 editedApprovedAmount > bsiEffectiveBalance && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatDisplayAmount(editedApprovedAmount)}
                  </span>
                )}
                <span className="text-sm font-bold text-foreground">
                  {formatDisplayAmount(
                    editedApprovedAmount !== null && bsiEffectiveBalance !== null
                      ? Math.min(editedApprovedAmount, bsiEffectiveBalance)
                      : editedApprovedAmount
                  )}
                </span>
                {editedApprovedAmount !== null && bsiEffectiveBalance !== null &&
                 editedApprovedAmount > bsiEffectiveBalance && (
                  <span className="text-[10px] font-medium text-amber-600">Capped by live SI balance</span>
                )}
              </div>
            </div>
            {/* One-line explanation — uses effective (edited) values */}
            <div className="pt-1 text-xs text-muted-foreground italic">
              {(() => {
                const eff = effectiveClaimedAmount;
                const tar = effectiveTariffAmount;
                const fin = editedApprovedAmount !== null && bsiEffectiveBalance !== null
                  ? Math.min(editedApprovedAmount, bsiEffectiveBalance)
                  : editedApprovedAmount;
                const parts: string[] = [];
                if (eff !== null && tar !== null && eff > tar)
                  parts.push(`bill (${formatDisplayAmount(eff)}) exceeds tariff (${formatDisplayAmount(tar)})`);
                if (tar !== null && benefitTotal !== null && tar > benefitTotal)
                  parts.push(`tariff (${formatDisplayAmount(tar)}) exceeds benefit plan limit (${formatDisplayAmount(benefitTotal)})`);
                if (editedApprovedAmount !== null && bsiEffectiveBalance !== null &&
                    editedApprovedAmount > bsiEffectiveBalance)
                  parts.push(`capped by SI balance (${formatDisplayAmount(bsiEffectiveBalance)})`);
                // If similar previous claim — override reason entirely
                if (similarityResult?.isSimilar && similarityResult.recommendedAmount) {
                  const prevAmt = formatDisplayAmount(similarityResult.recommendedAmount);
                  return `Approving ${formatDisplayAmount(fin)} based on similar previous claim (${prevAmt} approved previously). ${similarityResult.recommendationBasis}`;
                }
                if (similarityResult?.isSimilar && similarityResult.recommendationBasis)
                  parts.push(`Previous claim: ${similarityResult.recommendationBasis}`);
                return parts.length
                  ? `Approving ${formatDisplayAmount(fin)} because ${parts.join("; ")}.`
                  : `Approving ${formatDisplayAmount(fin)} — amount is within all limits.`;
              })()}
            </div>
            {/* Co-pay notice */}
            {copayRawInfo && (
              <div className="mt-1 text-xs text-orange-600 font-medium">
                ⚠ {copayRawInfo} — will be reflected in the Calculate section.
              </div>
            )}
          </div>
        </section>


      </CardContent>
    </Card>
  );
}