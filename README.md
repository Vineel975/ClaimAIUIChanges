SELECT bsc.ID, bsc.BPSIID, par.Name AS ParentName, c.Name AS ConditionName,
       bsc.isCovered, bsc.Deleted,
       bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit,
       bsc.TPAProcedureID, bsc.Remarks
FROM BPSIConditions bsc WITH(NOLOCK)
LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
WHERE (c.Name LIKE '%delivery%' OR c.Name LIKE '%maternity%' OR bsc.Remarks LIKE '%delivery%'
       OR bsc.IndividualLimit = 25000 OR bsc.ClaimLimit = 25000)
  AND ISNULL(bsc.Deleted,0) = 0;
