# Spectra fix — cataract Benefit Plan shows 5,000 instead of 75,000

File: `MedicalScrutinyController.cs`
Method: `GetCodingProcedureEligibleLimit`
Block: the **UNCODED** fallback (procedureID == 0) — the one whose reader sets
`ailmentLimitFb` (~lines 8919-8936 after the v2 fix).

## Root cause (from your DB output, MemberPolicyID 105694498)
- The claim has **no `ClaimsCoding` rows** → `procedureID = 0` → uncoded fallback.
- The uncoded fallback selects `TOP 1 … ORDER BY <limit> ASC`, i.e. the **smallest**
  covered Ailment/Maternity cap. On this policy that's a **5,000** maternity
  sub-limit (Well-Baby `9808204`, Pre/Post-Natal `10259819`) — unrelated to cataract.
- The real cataract cap is `BPSIConditionID 9808219`: `ClaimLimit = 75,000`,
  `TPAProcedureID = 496,497,498,499,500,501,502,503,526,527,1237,1238`,
  Remarks "Cataract covered upto Rs.75,000/- Per Eye…".

"Smallest wins" is the bug. Maternity only looked correct earlier because 25,000
was the smallest cap on that other policy.

## The fix
Make the uncoded fallback **disease-aware** using the existing `claimType` parameter
(already used to set `isDayCare`). Prioritise the cap that matches the claim's
disease; fall back to the old "smallest" only when nothing matches (so non
cataract/maternity claims don't regress):
- `claimType = 'cataract'`  → the `Ailment Conditions` cap whose Remarks mention
  cataract → **75,000**.
- `claimType = 'maternity'` → the `Maternity`/`Maternity` delivery cap (75,000
  Normal here; the coded path refines Normal vs C-Section later).
- anything else → unchanged (smallest covered cap).

Only the **uncoded** block changes. The coded path already scopes by the coded
procedure and correctly returns 75,000 for a cataract procedure, so it is left as-is.

---

## EDIT — UNCODED fallback (the block with `ailmentLimitFb`)

### FIND
```csharp
                                  ORDER BY COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) ASC", conn))
                            {
                                bpCmd.Parameters.AddWithValue("@MemberPolicyID", memPolId);
                                using (var rdr = bpCmd.ExecuteReader())
                                {
                                    if (rdr.Read())
                                    {
                                        ailmentLimitFb = rdr["LimitAmt"] != DBNull.Value ? Convert.ToDouble(rdr["LimitAmt"]) : (double?)null;
```

### REPLACE WITH
```csharp
                                  ORDER BY
                                      CASE
                                          WHEN @ClaimType = 'maternity' AND par.Name = 'Maternity'          AND c.Name = 'Maternity'                 THEN 0
                                          WHEN @ClaimType = 'cataract'  AND par.Name = 'Ailment Conditions' AND LOWER(bsc.Remarks) LIKE '%cataract%' THEN 0
                                          ELSE 1
                                      END,
                                      COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) ASC", conn))
                            {
                                bpCmd.Parameters.AddWithValue("@MemberPolicyID", memPolId);
                                bpCmd.Parameters.AddWithValue("@ClaimType", (claimType ?? "").Trim().ToLower());
                                using (var rdr = bpCmd.ExecuteReader())
                                {
                                    if (rdr.Read())
                                    {
                                        ailmentLimitFb = rdr["LimitAmt"] != DBNull.Value ? Convert.ToDouble(rdr["LimitAmt"]) : (double?)null;
```

Notes:
- The `FIND` is unique to the uncoded block because of the `ailmentLimitFb` line
  (the coded block sets `ailmentLimit`).
- Only the `ORDER BY` (now a CASE priority + the same ASC tie-break) changes, plus
  one new `@ClaimType` parameter. Everything else — `WHERE`, the limit reader, the
  `ConditionName`/`Remarks` readers — stays.
- `claimType` is the method parameter (default `"cataract"`), already in scope.

## Expected after the fix
For this cataract claim (uncoded): Benefit Plan → **75,000**,
ruleName "Ailment Cappings", remarks "Cataract covered upto Rs.75,000/- Per Eye…",
source "BPSIConditions (Ailment Cappings)".
Maternity claims still resolve to their delivery cap (25,000 on the earlier policy,
75,000 here), so that path is unchanged in behaviour.

## Deploy
Apply the edit, build in Visual Studio, recycle the app pool. No ClaimAI change.
(C# brace/paren balance is unchanged — the CASE lives inside the SQL string and the
new line is a single balanced `AddWithValue(...)`.)

## If you ever need to broaden it
The cataract cap is matched by `Remarks LIKE '%cataract%'`. If a policy labels it
differently, either adjust that keyword or match by the cataract procedure ids
(`496,497,498,499,500,501,502,503,526,527,1237,1238`) via `fn_Split(bsc.TPAProcedureID, ',')`.
