-- the claim you parked
SELECT c.ID, c.StageID, c.Deleted, r.ProcessingStatus, r.ClaimAI_JobId
FROM Claims c
LEFT JOIN dbo.ClaimAI_Results r ON r.ClaimID = c.ID
WHERE c.ID = <yourClaimId>;

-- and the worker's exact selection
SELECT COUNT(*)
FROM Claims c WITH (NOLOCK)
LEFT JOIN dbo.ClaimAI_Results r WITH (NOLOCK) ON r.ClaimID = c.ID
WHERE c.StageID = 52
  AND ISNULL(c.Deleted, 0) = 0
  AND (r.ID IS NULL OR r.ProcessingStatus IS NULL);
