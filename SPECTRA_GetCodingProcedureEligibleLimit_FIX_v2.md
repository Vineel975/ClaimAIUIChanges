# Spectra fix v2 — Calculate "No Restriction" for maternity (based on your DB output)

File: `MedicalScrutinyController.cs`
Method: `GetCodingProcedureEligibleLimit`
Two fallback blocks: **uncoded** path (~lines 8919-8936) and **coded** path (~lines 9046-9063).

This supersedes the earlier `coding-limit-maternity-fix` doc — your query output
showed the real reasons, which that version didn't fully cover.

## What your data showed (BPSIID 1057770, active rows)
```
ParentName = 'Maternity'        ConditionName = 'Maternity'   isCovered = 1  Deleted = 0
FamilyLimit = 25000.00          (ClaimLimit / IndividualLimit / PolicyLimit all NULL)
TPAProcedureID = 403,404,405,407,408   (Normal)   -> row 11545757
TPAProcedureID = 419,420,421,422,1173  (C-Sec)    -> row 11545758
```
Three reasons the deployed fallback returns nothing:
1. It filters `par.Name = 'Ailment Conditions'`, but maternity caps sit under
   parent **`Maternity`** → excluded.
2. The 25,000 is in **`FamilyLimit`**, but the query reads `ClaimLimit` (NULL).
3. The member has two BPSIIDs (1057427 with the caps soft-deleted, 1057770 with
   them active). The method keys off a single `TOP 1` BPSIID, which may not be the
   one holding the live caps.

## What the fix does
- Reads the amount via `COALESCE(ClaimLimit, IndividualLimit, FamilyLimit, PolicyLimit)`
  → picks up the 25,000 in `FamilyLimit`.
- Broadens the parent filter to `par.Name IN ('Ailment Conditions', 'Maternity')`
  → includes maternity caps (still covers cataract).
- Searches across **all** the member's non-deleted SIs
  (`bsc.BPSIID IN (SELECT BPSIID FROM MemberSI ... )`), with `bsc.Deleted = 0`, so
  the active caps on 1057770 are found regardless of which BPSIID is "latest".
- Coded path keeps procedure scoping (`fn_Split(TPAProcedureID) = @ProcedureID`),
  so a delivery claim coded `403` matches the Normal row → 25,000.

---

## EDIT 1 — UNCODED path (procedureID == 0)

### FIND
```csharp
                            using (var bpCmd = new System.Data.SqlClient.SqlCommand(
                                @"SELECT TOP 1 bsc.ClaimLimit, c.Name AS ConditionName, bsc.Remarks
                                  FROM BPSIConditions bsc WITH(NOLOCK)
                                  LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
                                  LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
                                  WHERE bsc.BPSIID = @BPSIID
                                  AND ISNULL(bsc.Deleted,0) = 0
                                  AND par.Name = 'Ailment Conditions'
                                  AND bsc.ClaimLimit IS NOT NULL
                                  AND ISNULL(bsc.isCovered,0) = 1
                                  ORDER BY bsc.ClaimLimit ASC", conn))
                            {
                                bpCmd.Parameters.AddWithValue("@BPSIID", bpsiIdFallback);
                                using (var rdr = bpCmd.ExecuteReader())
                                {
                                    if (rdr.Read())
                                    {
                                        ailmentLimitFb = rdr["ClaimLimit"] != DBNull.Value ? Convert.ToDouble(rdr["ClaimLimit"]) : (double?)null;
```

### REPLACE WITH
```csharp
                            using (var bpCmd = new System.Data.SqlClient.SqlCommand(
                                @"SELECT TOP 1
                                      COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) AS LimitAmt,
                                      c.Name AS ConditionName, bsc.Remarks
                                  FROM BPSIConditions bsc WITH(NOLOCK)
                                  LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
                                  LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
                                  WHERE bsc.BPSIID IN (SELECT BPSIID FROM MemberSI WITH(NOLOCK)
                                                       WHERE MemberPolicyID = @MemberPolicyID AND ISNULL(Deleted,0) = 0)
                                  AND ISNULL(bsc.Deleted,0) = 0
                                  AND par.Name IN ('Ailment Conditions', 'Maternity')
                                  AND ISNULL(bsc.isCovered,0) = 1
                                  AND COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) IS NOT NULL
                                  ORDER BY COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) ASC", conn))
                            {
                                bpCmd.Parameters.AddWithValue("@MemberPolicyID", memPolId);
                                using (var rdr = bpCmd.ExecuteReader())
                                {
                                    if (rdr.Read())
                                    {
                                        ailmentLimitFb = rdr["LimitAmt"] != DBNull.Value ? Convert.ToDouble(rdr["LimitAmt"]) : (double?)null;
```

---

## EDIT 2 — CODED path (after USP_Codingprocedurelimits returns no limit)

### FIND
```csharp
                            using (var bpCmd = new System.Data.SqlClient.SqlCommand(
                                @"SELECT TOP 1 bsc.ClaimLimit, c.Name AS ConditionName, bsc.Remarks
                                  FROM BPSIConditions bsc WITH(NOLOCK)
                                  LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
                                  LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
                                  WHERE bsc.BPSIID = @BPSIID
                                  AND ISNULL(bsc.Deleted,0) = 0
                                  AND par.Name = 'Ailment Conditions'
                                  AND bsc.ClaimLimit IS NOT NULL
                                  AND ISNULL(bsc.isCovered,0) = 1
                                  ORDER BY bsc.ClaimLimit ASC", conn))
                            {
                                bpCmd.Parameters.AddWithValue("@BPSIID", bpsiId);
                                using (var rdr = bpCmd.ExecuteReader())
                                {
                                    if (rdr.Read())
                                    {
                                        ailmentLimit = rdr["ClaimLimit"] != DBNull.Value ? Convert.ToDouble(rdr["ClaimLimit"]) : (double?)null;
```

### REPLACE WITH
```csharp
                            using (var bpCmd = new System.Data.SqlClient.SqlCommand(
                                @"SELECT TOP 1
                                      COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) AS LimitAmt,
                                      c.Name AS ConditionName, bsc.Remarks
                                  FROM BPSIConditions bsc WITH(NOLOCK)
                                  LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
                                  LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
                                  WHERE bsc.BPSIID IN (SELECT BPSIID FROM MemberSI WITH(NOLOCK)
                                                       WHERE MemberPolicyID = @MemberPolicyID AND ISNULL(Deleted,0) = 0)
                                  AND ISNULL(bsc.Deleted,0) = 0
                                  AND par.Name IN ('Ailment Conditions', 'Maternity')
                                  AND ISNULL(bsc.isCovered,0) = 1
                                  AND COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) IS NOT NULL
                                  AND EXISTS (SELECT 1 FROM fn_Split(bsc.TPAProcedureID, ',')
                                              WHERE LTRIM(RTRIM(Stringvalue)) = @ProcedureID)
                                  ORDER BY COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) ASC", conn))
                            {
                                bpCmd.Parameters.AddWithValue("@MemberPolicyID", memPolId);
                                bpCmd.Parameters.AddWithValue("@ProcedureID", procedureID.ToString());
                                using (var rdr = bpCmd.ExecuteReader())
                                {
                                    if (rdr.Read())
                                    {
                                        ailmentLimit = rdr["LimitAmt"] != DBNull.Value ? Convert.ToDouble(rdr["LimitAmt"]) : (double?)null;
```

Notes:
- Only the SQL, the parameters, and the limit-reader line change. The
  `ConditionName` / `Remarks` reader lines just below stay as-is.
- The existing `bpsiId` / `bpsiIdFallback` lookups and their `if (... > 0)` guards
  are unchanged; the query now searches all of the member's SIs via `@MemberPolicyID`
  (`memPolId`, already parsed at the top of the method).

## Data prerequisite for the coded path
The coded claim's `ClaimsCoding.TPAProcedureID` must be one of the delivery
procedures in the cap rows: Normal `403,404,405,407,408` or C-Sec
`419,420,421,422,1173`. Confirm with:
```sql
SELECT TOP 1 TPAProcedureID FROM ClaimsCoding WITH(NOLOCK)
WHERE ClaimID = <claimId> AND ISNULL(Deleted,0)=0 ORDER BY ID DESC;
```
If it's e.g. `403`, you'll get the Normal cap (25,000). If the claim isn't coded
(`TPAProcedureID` 0/none), the uncoded path returns the smallest covered maternity/
ailment cap as a pre-coding hint (25,000 here).

## Deploy
Apply both edits, build in Visual Studio, recycle the app pool. No ClaimAI change.

## Expected
Calculate on the maternity claim → `eligibleAmount = 25000`,
`ruleName = "Maternity"`, `source = "BPSIConditions (Ailment Cappings)"`.

## Adding more diseases later
If another disease's caps live under a different parent (e.g. a `Psychiatric`
group), add that name to the `par.Name IN (...)` list in both queries.
