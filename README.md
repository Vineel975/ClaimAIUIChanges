DECLARE @ClaimID BIGINT = <claimId>;   -- the maternity claim

DECLARE @MemberPolicyID BIGINT;
SELECT @MemberPolicyID = MemberPolicyID FROM Claims WHERE ID = @ClaimID;
SELECT @ClaimID AS ClaimID, @MemberPolicyID AS MemberPolicyID;

SELECT ID, MemberPolicyID, BPSIID, Deleted
FROM MemberSI WITH(NOLOCK)
WHERE MemberPolicyID = @MemberPolicyID
ORDER BY ID DESC;
