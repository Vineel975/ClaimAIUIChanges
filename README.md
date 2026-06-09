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
