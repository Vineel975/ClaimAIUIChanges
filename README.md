SELECT bsc.ID, bsc.BPSIID,
       par.Name AS ParentName, c.Name AS ConditionName,
       bsc.isCovered, bsc.Deleted,
       bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit, bsc.CorporateLimit,
       bsc.TPAProcedureID, bsc.Remarks
FROM BPSIConditions bsc WITH(NOLOCK)
LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
WHERE bsc.BPSIID IN (
    SELECT BPSIID FROM MemberSI WITH(NOLOCK)
    WHERE MemberPolicyID = (SELECT MemberPolicyID FROM Claims WHERE ID = <claimId>)
)
ORDER BY bsc.BPSIID, par.Name, c.Name;
