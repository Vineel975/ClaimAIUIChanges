DECLARE @cid  BIGINT  = 26060843162;
DECLARE @slno TINYINT = <slno>;              -- the claim's Slno
DECLARE @tpa  INT     = <tpaProcId>;         -- a TPAProcedures.ID whose Level1 = 'Ophtholmology'
DECLARE @region INT   = (SELECT TOP 1 CreatedUserRegionID FROM ClaimsCoding
                         WHERE CreatedUserRegionID IS NOT NULL);  -- borrow a valid region

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
    (@cid, @slno, @tpa,
     NULL, NULL, @tpa,        -- TPALevel3 = the cataract procedure ID — this is the one the classifier reads
     NULL, NULL, 66,          -- 66 = Surgical (the cataract default the app uses)
     NULL, NULL, 100.00, 0,
     NULL, 0, NULL,
     NULL, 201,               -- BillingType_P51 = 201 (cataract default)
     0, 0, 0,
     0, GETDATE(), @region);
