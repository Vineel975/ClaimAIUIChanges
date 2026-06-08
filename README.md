-- cataract candidates
SELECT TOP 10 ID, Level1 AS Specialty, Level3 AS ProcedureName, Code
FROM TPAProcedures
WHERE Level1 = 'Ophtholmology' AND ISNULL(Deleted,0)=0 AND Code > 0 AND Level3 IS NOT NULL;


EXEC sp_helptext 'USP_ClaimMedicalScrutiny_Retrieve';

UPDATE <that_table>
SET <that_column> = <chosenTPAProcedureID>
WHERE ClaimID = 26060843162 AND Slno = <slno> AND ISNULL(Deleted,0)=0;

DELETE FROM dbo.ClaimAI_Results WHERE ClaimID = 26060843162;
UPDATE Claims SET StageID = 52 WHERE ID = 26060843162;
