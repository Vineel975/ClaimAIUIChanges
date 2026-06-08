DECLARE @cid BIGINT = 26060843162;
DECLARE @slno INT = (SELECT TOP 1 Slno FROM Claimsdetails
                     WHERE ClaimID=@cid AND ISNULL(Deleted,0)=0 ORDER BY Slno);
EXEC USP_ClaimMedicalScrutiny_Retrieve @ClaimID=@cid, @Slno=@slno;   -- look at the level3_ID column
