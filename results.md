/* ============================================================================
   Why is the cataract Benefit Plan showing 5000 instead of 75000 (per eye)?
   Replace @ClaimID with your cataract claim id, run in SSMS against McarePlus,
   and send me the 4 result sets.
   ============================================================================ */
DECLARE @ClaimID BIGINT = 0;   -- <<< put your cataract claim id here

DECLARE @MemberPolicyID INT =
    (SELECT TOP 1 MemberPolicyID FROM Claims WITH(NOLOCK) WHERE ID = @ClaimID);

/* (0) sanity */
SELECT @ClaimID AS ClaimID, @MemberPolicyID AS MemberPolicyID;

/* (1) Is the claim coded, and with which procedure(s)?
       (the coded path scopes the cap by this TPAProcedureID) */
SELECT TOP 10 ID, TPAProcedureID, TPALevel1, TPALevel2, TPALevel3, ISNULL(Deleted,0) AS Deleted
FROM ClaimsCoding WITH(NOLOCK)
WHERE ClaimID = @ClaimID
ORDER BY ID DESC;

/* (2) EVERY covered Ailment/Maternity cap the fallback can see, ordered the same
       way the code orders them (ASC). The fallback returns the FIRST row = the
       smallest LimitAmt. If row #1 here is 5000 and cataract 75000 is lower down,
       that's the bug. */
SELECT
    bsc.BPSIID,
    bsc.ID                                AS BPSIConditionID,
    par.Name                              AS ParentName,
    c.Name                                AS ConditionName,
    bsc.isCovered,
    ISNULL(bsc.Deleted,0)                 AS Deleted,
    bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit, bsc.CorporateLimit,
    COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) AS LimitAmt,
    bsc.TPAProcedureID,
    bsc.Remarks
FROM BPSIConditions bsc WITH(NOLOCK)
LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
WHERE bsc.BPSIID IN (SELECT BPSIID FROM MemberSI WITH(NOLOCK)
                     WHERE MemberPolicyID = @MemberPolicyID AND ISNULL(Deleted,0)=0)
  AND ISNULL(bsc.Deleted,0) = 0
  AND ISNULL(bsc.isCovered,0) = 1
  AND par.Name IN ('Ailment Conditions','Maternity')
ORDER BY LimitAmt ASC;

/* (3) The cataract-specific cap row(s) — so we can see the 75000 and what
       identifies it (condition name / remarks / which procedures it covers). */
SELECT
    bsc.BPSIID, bsc.ID AS BPSIConditionID,
    par.Name AS ParentName, c.Name AS ConditionName,
    bsc.isCovered, ISNULL(bsc.Deleted,0) AS Deleted,
    bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit, bsc.CorporateLimit,
    bsc.TPAProcedureID, bsc.Remarks
FROM BPSIConditions bsc WITH(NOLOCK)
LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
WHERE bsc.BPSIID IN (SELECT BPSIID FROM MemberSI WITH(NOLOCK)
                     WHERE MemberPolicyID = @MemberPolicyID AND ISNULL(Deleted,0)=0)
  AND ( c.Name    LIKE '%cataract%'
     OR c.Name    LIKE '%lens%'
     OR c.Name    LIKE '%lasik%'
     OR c.Name    LIKE '%eye%'
     OR bsc.Remarks LIKE '%cataract%'
     OR bsc.Remarks LIKE '%lens%'
     OR bsc.Remarks LIKE '%lasik%'
     OR bsc.Remarks LIKE '%eye%'
     OR bsc.Remarks LIKE '%75000%'
     OR bsc.Remarks LIKE '%75,000%' );

/* (4) What is the 5000 row exactly? (find any cap whose amount is 5000) */
SELECT
    bsc.BPSIID, bsc.ID AS BPSIConditionID,
    par.Name AS ParentName, c.Name AS ConditionName,
    bsc.isCovered, ISNULL(bsc.Deleted,0) AS Deleted,
    bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit, bsc.CorporateLimit,
    bsc.TPAProcedureID, bsc.Remarks
FROM BPSIConditions bsc WITH(NOLOCK)
LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
WHERE bsc.BPSIID IN (SELECT BPSIID FROM MemberSI WITH(NOLOCK)
                     WHERE MemberPolicyID = @MemberPolicyID AND ISNULL(Deleted,0)=0)
  AND 5000 IN (bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit, bsc.CorporateLimit);
