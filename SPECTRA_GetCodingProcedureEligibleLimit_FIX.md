# Spectra fix — Calculate returns "No Restriction" for maternity (and any IndividualLimit cap)

File: `MedicalScrutinyController.cs`
Method: `GetCodingProcedureEligibleLimit`
Two fallback blocks change: the **uncoded** path (~lines 8919-8936) and the
**coded / SP-no-limit** path (~lines 9046-9063).

## Why it's broken
Both fallbacks read and filter on `bsc.ClaimLimit`:
```sql
... AND bsc.ClaimLimit IS NOT NULL
ORDER BY bsc.ClaimLimit ASC
```
But every ailment cap on these plans stores the amount in **`IndividualLimit`**
with `ClaimLimit = NULL` — cataract 35k, **maternity delivery 25k**, psychiatric
35k. So the query matches zero rows → the method returns `noLimit = true` →
ClaimAI shows "No Restriction mentioned." (The Ailment Cappings bullet list you
see in Benefit Extraction comes from ClaimAI's own extraction, which is why it
shows 25,000 while Calculate shows nothing.)

## Fix
Read the amount from whichever column holds it via COALESCE, and on the coded
path scope to the claim's procedure (with a plan-wide fallback so maternity caps
that aren't procedure-listed still match), preferring a procedure-specific row.

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
                                  WHERE bsc.BPSIID = @BPSIID
                                  AND ISNULL(bsc.Deleted,0) = 0
                                  AND par.Name = 'Ailment Conditions'
                                  AND ISNULL(bsc.isCovered,0) = 1
                                  AND COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) IS NOT NULL
                                  ORDER BY COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) ASC", conn))
                            {
                                bpCmd.Parameters.AddWithValue("@BPSIID", bpsiIdFallback);
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
                                  WHERE bsc.BPSIID = @BPSIID
                                  AND ISNULL(bsc.Deleted,0) = 0
                                  AND par.Name = 'Ailment Conditions'
                                  AND ISNULL(bsc.isCovered,0) = 1
                                  AND COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) IS NOT NULL
                                  AND (bsc.TPAProcedureID IS NULL
                                       OR LTRIM(RTRIM(bsc.TPAProcedureID)) = ''
                                       OR EXISTS (SELECT 1 FROM fn_Split(bsc.TPAProcedureID, ',')
                                                  WHERE LTRIM(RTRIM(Stringvalue)) = @ProcedureID))
                                  ORDER BY
                                      CASE WHEN EXISTS (SELECT 1 FROM fn_Split(bsc.TPAProcedureID, ',')
                                                        WHERE LTRIM(RTRIM(Stringvalue)) = @ProcedureID)
                                           THEN 0 ELSE 1 END,
                                      COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) ASC", conn))
                            {
                                bpCmd.Parameters.AddWithValue("@BPSIID", bpsiId);
                                bpCmd.Parameters.AddWithValue("@ProcedureID", procedureID.ToString());
                                using (var rdr = bpCmd.ExecuteReader())
                                {
                                    if (rdr.Read())
                                    {
                                        ailmentLimit = rdr["LimitAmt"] != DBNull.Value ? Convert.ToDouble(rdr["LimitAmt"]) : (double?)null;
```

Note: only the SQL, the added `@ProcedureID` parameter, and the limit-reader line
change. The `ConditionName` / `Remarks` reader lines just below stay as-is.

---

## Confirm it will pick the right maternity row (diagnostic)
Run this against the worker DB for the maternity test claim. It shows exactly
what the fixed coded query will return:

```sql
DECLARE @ClaimID BIGINT = <claimId>;
DECLARE @MemberPolicyID BIGINT = (SELECT MemberPolicyID FROM Claims WHERE ID = @ClaimID);
DECLARE @BPSIID BIGINT = (SELECT TOP 1 BPSIID FROM MemberSI WITH(NOLOCK)
                          WHERE MemberPolicyID = @MemberPolicyID AND ISNULL(Deleted,0)=0 ORDER BY ID DESC);
DECLARE @ProcedureID VARCHAR(20) =
       (SELECT TOP 1 CONVERT(VARCHAR(20), TPAProcedureID) FROM ClaimsCoding WITH(NOLOCK)
        WHERE ClaimID = @ClaimID AND ISNULL(Deleted,0)=0 ORDER BY ID DESC);

SELECT bsc.ID, c.Name AS ConditionName,
       bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit,
       COALESCE(bsc.ClaimLimit,bsc.IndividualLimit,bsc.FamilyLimit,bsc.PolicyLimit) AS LimitAmt,
       bsc.TPAProcedureID, bsc.isCovered, bsc.Remarks
FROM BPSIConditions bsc WITH(NOLOCK)
LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
WHERE bsc.BPSIID = @BPSIID AND ISNULL(bsc.Deleted,0)=0
  AND par.Name = 'Ailment Conditions' AND ISNULL(bsc.isCovered,0)=1
ORDER BY bsc.ID;
```
Check the maternity delivery row (should show 25000 in one of the limit columns).
If its `TPAProcedureID` lists the delivery procedure the claim is coded with
(`@ProcedureID`), the fixed query returns it specifically. If `TPAProcedureID` is
NULL/blank, it still matches via the plan-wide fallback and returns the smallest
covered maternity cap (25000 for a delivery).

## Deploy
Apply both edits, build in Visual Studio, recycle the app pool. No ClaimAI change
needed — it only displays what this method returns. This same fix also covers
cataract and any other ailment cap stored in IndividualLimit.

## Expected after fix
Calculate on the maternity claim → `eligibleAmount = 25000`,
`source = "BPSIConditions (Ailment Cappings)"`, instead of "No Restriction."
