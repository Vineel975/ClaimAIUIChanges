DECLARE @ClaimID BIGINT = 26060843162;   -- your claim

-- Slno (note this value; you'll reuse it below)
SELECT TOP 1 Slno FROM Claimsdetails
WHERE ClaimID = @ClaimID AND ISNULL(Deleted,0) = 0
ORDER BY Slno;


SELECT TOP 10 ID, Level1, Level3
FROM TPAProcedures
WHERE Level1 = 'Ophtholmology' AND ISNULL(Deleted,0) = 0 AND Code > 0 AND Level3 IS NOT NULL;


SELECT ID, ClaimID, Slno, TPALevel3, Deleted
FROM ClaimsCoding
WHERE ClaimID = @ClaimID AND Slno = <slno>;

//Step 3a — if a non-deleted row exists → just UPDATE it
UPDATE ClaimsCoding
SET TPALevel3 = <tpa>
WHERE ClaimID = @ClaimID AND Slno = <slno> AND Deleted = 0;

//Step 3b — if there's no row (or only a deleted one) → INSERT one
DECLARE @slno TINYINT = <slno>;
DECLARE @tpa  INT     = <tpa>;
DECLARE @region INT   = (SELECT TOP 1 CreatedUserRegionID FROM ClaimsCoding WHERE CreatedUserRegionID IS NOT NULL);

INSERT INTO ClaimsCoding
    (ClaimID, Slno, TPAProcedureID,
     TPALevel1, TPALevel2, TPALevel3,
     PCSCode, PCSDescription, TreatementTypeID_19,
     BillAmount, PackageRate, PackageRatio, Discount,
     EligibleAmount, DisallowedAmount, PayableAmount,
     ICDCode, BillingType_P51,
     isGipsa, isDayCare, isPED,
     Deleted, Createddatetime, CreatedUserRegionID)
VALUES
    (@ClaimID, @slno, @tpa,
     NULL, NULL, @tpa,        -- TPALevel3 is the value the classifier reads
     NULL, NULL, 66,
     NULL, NULL, 100.00, 0,
     NULL, 0, NULL,
     NULL, 201,
     0, 0, 0,
     0, GETDATE(), @region);


  Step 4 — verify level3_ID is now populated
EXEC USP_ClaimMedicalScrutiny_retrieve @ClaimID = 26060843162, @Slno = <slno>;

Step 5 (only if you're testing the staging worker) — reset so it re-picks the claim
DELETE FROM dbo.ClaimAI_Results WHERE ClaimID = 26060843162;
UPDATE Claims SET StageID = 52 WHERE ID = 26060843162;



-- the claim's member policy
DECLARE @MemberPolicyID BIGINT = (SELECT MemberPolicyID FROM Claims WHERE ID = <claimId>);

-- 1. which BPSIID the fallback will use (it takes the TOP 1 by ID DESC)
SELECT ID, MemberPolicyID, BPSIID, SICategoryID_P20, Deleted
FROM MemberSI WITH(NOLOCK)
WHERE MemberPolicyID = @MemberPolicyID AND ISNULL(Deleted,0)=0
ORDER BY ID DESC;

-- 2. every ailment condition on this member's BPSIs — see where 35,000 actually lives
SELECT bsc.*, c.Name AS ConditionName, par.Name AS ParentName
FROM BPSIConditions bsc WITH(NOLOCK)
LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
WHERE bsc.BPSIID IN (SELECT BPSIID FROM MemberSI WITH(NOLOCK)
                     WHERE MemberPolicyID = @MemberPolicyID AND ISNULL(Deleted,0)=0)
  AND ISNULL(bsc.Deleted,0) = 0
ORDER BY bsc.BPSIID;
