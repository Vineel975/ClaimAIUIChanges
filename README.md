Text
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/*-------------------------------------------------------------------
 Sp Title				: USP_ClaimMedicalScrutiny_retrieve
 Author					:
 Date Created			: 
 Description			: 
 -------------------------------------------------------------
 Modification History
 ------------------------------------------------------------
 Sr No		Date		Modified By					Reason
 2.			 26-05-2025	 Ramesh Arjampudi			fetching Provide flagging
 3.			 18/06/2025  subbu                      is Final flag added
 4.			 09/07/2025  Venkat Mandadi				iAIManualPush, iAIClaim flags added to resubmit iAI Failed scenarios & to access the iAI bill view (SP3V-4924)
 5.			 22-07-2025  subbu                      Payment NIDB logic added
 6.			 27-08-2025	 Ramesh Arjampudi			Added Is claim is automation or not -SP3V-5156
 7.			 11-09-2025   subbu                     SP3V-5181 task changes
 8.			 16-10-2025	 Ramesh Arjampudi			SP3V-5224 Pop-up Tagging at policy Level- ACKO
 9.          30-10-2025  subbu                      SR-114024 changes 
 10.         04-12-2025  Ramesh A                   SP3V-5317	OIC – MBBS and CMO Approval workflow for PP claims
 11.         09-12-2025  Ramesh A                   SP3V-5317	ADDED ReasonID
 12.		 05/01/2026  Mohan Y 					Add NOlock
 13.		 23-02-2026	 Ramesh A					SP3V-5393 changes
 14.		 11-03-2026	 Ramesh A					SP3V-5381	Magma Insurer RTI Flow
 15.		 26-03-2026	 Ramesh	A					SP3V-5407	Health Pay - Auto population of Billing extraction status in Spectra claims dash board
 16.		 08-04-2026	 Ramesh A					SP3V-5313	Utilization of buffer when SI is existed to be implemented for Prepost for IQVIA corporate
 17.		 07-05-2026	 Ramesh A					SP3V-5484	Skip audit  and Skip medical Scrutiny validation at Pre auth Final
 -------------------------------------------------------------------*/
CREATE PROCEDURE [dbo].[USP_ClaimMedicalScrutiny_retrieve]
(
    @ClaimID bigint,@Slno tinyint
)
AS
BEGIN

SET NOCOUNT ON
  
declare @Billamount money,@eligibleamount money,@BillafterDeductions money , @iSangentSuspicious bit= null,@topupMemberSIID Bigint=0,@EnhancedMemberSIID bigint=0,@TopUpBPSIID bigint=0,@EnhancedBPSIID bigint=0,@BaseMemberSIID bigint=0,@BaseBPSIID bigint=0,

@RestoreMemberSIID bigint,@RestoreBPSIID bigint, @CriticalMEmberSIID bigint,@CriticalBPSIID bigint,@Score int=0,@ITGIinsurerresponse varchar(max)='',@isITGImanualapv int =0,@RequesttypeID int=0,@ClaimTypeID int=0,
@SupertopupMemberSIID BIGINT=0,@SupertopupBPSIID BIGINT=0,@Isrefertoinsurer bit=0,@isautoCashlessclaims int = 0,@Isrefertocrm bit = 0,@Mbbs_thresholdlimit decimal(10,2)=0,@cmo_thresholdlimit decimal(10,2)=0,
@REFER_TO_INSURER_PREAUTH_FLOW decimal(10,2)=0
;
set @Score=(select Isnull(sum(score),0) from investigationScore SI with(nolock) inner join claimInvestigationScore CS with(nolock) ON SI.id=CS.InvestigationID and cs.claimid=@ClaimID and slno=@Slno and CS.deleted=0 and si.deleted=0 )
select @Billamount=sum(billamount),@BillafterDeductions=sum(billamount-isnull(deductionamount,0)),@Eligibleamount=sum(eligibleamount)   
from ClaimsServiceDetails with(nolock) where claimid=@ClaimID and Slno=@Slno and Deleted=0;   

IF EXISTS(SELECT TOP 1 * FROM CLAIMACTIONITEMS (NOLOCK) WHERE CLAIMID = @ClaimID AND SLNO = @Slno AND CLAIMSTAGEID = 5 AND CLOSEDATE IS NULL)
BEGIN

	IF EXISTS(SELECT * FROM ClaimUtilizedAmount (NOLOCK) WHERE CLAIMID = @ClaimID AND SLNO = @Slno AND DELETED = 0)
	BEGIN
		UPDATE ClaimUtilizedAmount SET DELETED = 1 WHERE CLAIMID = @ClaimID AND SLNO = @Slno AND DELETED = 0
	END

END


Select top 1 @iSangentSuspicious = IsAgentsuspicious from Mst_Agent MA with(nolock), memberPolicy MP (NOLOCK), Claims cc with(nolock)
where MA.Code=(Select partyCode from MemberPolicy (NOLOCK) where ID=(Select MemberPolicyID from Claims with(nolock) where ID=@ClaimID) And CorpID=0) order By MA.ID desc;



if((Select RequestTypeID from Claimsdetails (NOLOCK) where ClaimID=@ClaimID And Slno=@Slno and Deleted=0)=4)
begin
    Select top 1 @topupMemberSIID=MemberSIID from ClaimUtilizedAmount with(nolock) where Claimid=@ClaimID And Slno=@Slno-1 ANd SICategoryID=70 And Deleted=0 order By ID desc
    if (@topupMemberSIID!=0 or @topupMemberSIID is not null)
    Select @TopUpBPSIID= BPSIID from MemberSI (NOLOCK) where ID=@topupMemberSIID And Deleted=0 order By ID desc
    Else Select @topupMemberSIID=0
    Select top 1 @EnhancedMemberSIID=MemberSIID from ClaimUtilizedAmount with(nolock) where Claimid=@ClaimID And Slno=@Slno-1 ANd SICategoryID=74 And Deleted=0 order By ID desc
    if (@EnhancedMemberSIID!=0 or @EnhancedMemberSIID is not null)
    Select @EnhancedBPSIID= BPSIID from MemberSI (NOLOCK) where ID=@EnhancedMemberSIID And Deleted=0 order By ID desc
    Else Select @EnhancedMemberSIID=0
    Select top 1 @RestoreMemberSIID=MemberSIID from ClaimUtilizedAmount with(nolock) where Claimid=@ClaimID And Slno=@Slno-1 ANd SICategoryID=389 And Deleted=0 order By ID desc
    if (@RestoreMemberSIID!=0 or @RestoreMemberSIID is not null)
    Select @RestoreBPSIID= BPSIID from MemberSI (NOLOCK) where ID=@RestoreMemberSIID And Deleted=0 order By ID desc
    Else Select @RestoreMemberSIID=0
    Select top 1 @CriticalMEmberSIID=MemberSIID from ClaimUtilizedAmount with(nolock) where Claimid=@ClaimID And Slno=@Slno-1 ANd SICategoryID=71 And Deleted=0 order By ID desc
    if (@CriticalMEmberSIID!=0 or @CriticalMEmberSIID is not null)
    Select @CriticalBPSIID= BPSIID from MemberSI (NOLOCK) where ID=@CriticalMEmberSIID And Deleted=0 order By ID desc
    Else Select @CriticalMEmberSIID=0
	Select top 1 @SupertopupMemberSIID=MemberSIID from ClaimUtilizedAmount with(nolock) where Claimid=@ClaimID And Slno=@Slno-1 ANd SICategoryID=75 And Deleted=0 order By ID desc
    if (@SupertopupMemberSIID!=0 or @SupertopupMemberSIID is not null)
    Select @SupertopupBPSIID= BPSIID from MemberSI (NOLOCK) where ID=@SupertopupMemberSIID And Deleted=0 order By ID desc
    Else Select @SupertopupMemberSIID=0




Select top 1 @BaseMemberSIID=MemberSIID from ClaimUtilizedAmount with(nolock) where Claimid=@ClaimID And Slno=@Slno-1 ANd SICategoryID=69 And Deleted=0 order By ID desc
end

	--Sp3v-3783 - Temp MOU Leena---------------------------------------------------------------
	Declare @MOUID bigint=0,@PolicyID bigint=null,@IssueID int=null,@CorpID Bigint =null
	,@ProviderID bigint=null,@MemberPolicyID bigint=null,@DateofAdmission datetime=null,@FlagTempMOU BIT =0
	

	IF(@ClaimID is not null and @ClaimID <>0)
	Select @ProviderID=ProviderID,@DateofAdmission=DateofAdmission,@MemberPolicyID=MemberPolicyID From  Claims with(nolock) where Id=@ClaimID

	Select @IssueID=IssueID,@PolicyID=Policyid,@CorpID=CorpID from MemberPolicy with(nolock) where ID=@MemberPolicyID and Deleted=0  

	select @MOUID=ID from ProviderMOU with(nolock) where providerid=@ProviderID and MOUTypeID_P44=170 and MOUEntityID=@PolicyID and deleted=0 and @DateofAdmission between startdate and enddate  
   
	if(@MOUID=0 or @MOUID='' or @MOUID is null)      
	select @MOUID=ID from ProviderMOU with(nolock) where providerid=@ProviderID and MOUTypeID_P44=169 and MOUEntityID=@CorpID and deleted=0 and @DateofAdmission between startdate and enddate    
  
	if(@MOUID=0 or @MOUID='' or @MOUID is null)      
	select @MOUID=ID from ProviderMOU with(nolock) where providerid=@ProviderID and MOUTypeID_P44=167 and MOUEntityID=@IssueID and deleted=0 and @DateofAdmission between startdate and enddate  
  
	if(@MOUID=0 or @MOUID='' or @MOUID is null)      
	select @MOUID=ID from ProviderMOU with(nolock) where providerid=@ProviderID and MOUTypeID_P44=166 and MOUEntityID=@ProviderID and deleted=0 and @DateofAdmission between startdate and enddate 
	
	print @MOUID
	Set @MOUID = IsNull(@MOUID,0)

	iF @MOUID > 0
	Begin
		Select @FlagTempMOU=TempMOU From ProviderMOU (nolock) Where Id=@MOUID
	End
   Set @FlagTempMOU = IsNull(@FlagTempMOU,0)
   --END-------------------------------------------------------------------------------------------
   Select @RequesttypeID=RequesttypeID,@ClaimTypeID=ClaimTypeID from Claimsdetails with(nolock) where ClaimID=@ClaimID and Slno=@Slno order BY ID desc
   if(@issueID=10)
   BEGIN

     if(@RequesttypeID in  (1,2,3))
     Select TOP 1 @ITGIinsurerresponse = InsurerResponseStatus FROM ITIC_Authorizations with(nolock) where preauthID=@claimID and Slno=@Slno  order BY ID desc 
     else 
     BEGIN
     if(@ClaimTypeID=1 and @RequesttypeID=4) 
     Select TOP 1 @ITGIinsurerresponse = InsurerResponseStatus FROM ITIC_Claims with(nolock) where ClaimID=@claimID and Slno=1 order BY ID desc
	 else 
	 Select TOP 1 @ITGIinsurerresponse = InsurerResponseStatus FROM ITIC_Claims with(nolock) where ClaimID=@claimID and Slno=@Slno order BY ID desc
     END

   if((Select top 1 Httpcode FROM ITIC_WebApi_requests with(nolock) where ClaimID=@claimID and Slno=@Slno  order BY ID desc) in ('500','400')) 
   Set @isITGImanualapv = 1;
   else 
   Set @isITGImanualapv = 0;
   END
   
       DECLARE @ISSINGLELETTER INT = 0,@GETMEMBERPOLICYID BIGINT =0,@GETRequesttypeID INT
   SELECT @GETRequesttypeID = RequesttypeID, @GETMEMBERPOLICYID = MemberPolicyID FROM CLAIMS (NOLOCK) C
	INNER JOIN Claimsdetails (NOLOCK) CD ON C.ID = @ClaimID AND CD.CLAIMID =  C.ID  AND CD.SLNO = @Slno
  IF(@GETRequesttypeID in (1,2,3))
  BEGIN
	 SET @ISSINGLELETTER = (SELECT CASE WHEN EXISTS(
							SELECT * FROM Fn_GettopupPolicyDetails(@GETMEMBERPOLICYID) WHERE ISNULL(TopupPolicyID,0)!=0 OR ISNULL(SupertopPolicyID,0) !=0 
							AND ISNULL(BasePolicyID,0)!=0
							) THEN 1 ELSE 0 END )
  END


IF(Exists( SELECT TOP 1 * FROM Refer_to_insurer_details R WHERE R.IssueID = @IssueID
	AND R.Status = 1 AND R.RTI_Enabled = 1
  AND EXISTS (SELECT 1 FROM fn_Split(R.ClaimTypeID, ',') WHERE Stringvalue = @ClaimTypeID)
  AND EXISTS (SELECT 1 FROM fn_Split(R.RequesttypeID, ',') WHERE Stringvalue = @RequestTypeID)
  AND EXISTS (SELECT 1 FROM fn_Split(R.Policy_Type, ',') WHERE Stringvalue = (SELECT TOP 1 PolicyTypeID_P2 FROM POLICY (NOLOCK) WHERE ID = @PolicyID ))
  AND (EXISTS (SELECT 1 FROM fn_Split(R.Corp_id, ',') WHERE Stringvalue = @CorpID) OR R.Corp_id = '0')
	ORDER BY CASE WHEN EXISTS (SELECT 1 FROM fn_Split(R.Corp_id, ',') WHERE Stringvalue = @CorpID) THEN 1 ELSE 2 END
 ))
BEGIN
SET @Isrefertoinsurer =1;
SET @REFER_TO_INSURER_PREAUTH_FLOW = (SELECT TOP 1 approvedamount FROM Refer_to_insurer_details R WHERE R.IssueID = @IssueID
	AND R.Status = 1 AND R.RTI_Enabled = 1
  AND EXISTS (SELECT 1 FROM fn_Split(R.ClaimTypeID, ',') WHERE Stringvalue = @ClaimTypeID)
  AND EXISTS (SELECT 1 FROM fn_Split(R.RequesttypeID, ',') WHERE Stringvalue = @RequestTypeID)
  AND EXISTS (SELECT 1 FROM fn_Split(R.Policy_Type, ',') WHERE Stringvalue = (SELECT TOP 1 PolicyTypeID_P2 FROM POLICY (NOLOCK) WHERE ID = @PolicyID ))
  AND (EXISTS (SELECT 1 FROM fn_Split(R.Corp_id, ',') WHERE Stringvalue = @CorpID) OR R.Corp_id = '0')
	ORDER BY CASE WHEN EXISTS (SELECT 1 FROM fn_Split(R.Corp_id, ',') WHERE Stringvalue = @CorpID) THEN 1 ELSE 2 END)
END

DECLARE @ReasonIDs_P varchar(100)='0',@IRreason_request varchar(100)='0'
--if(@Isrefertoinsurer=1 or @issueID=26)
SELECT top 1 @ReasonIDs_P = ReasonIDs_P FROM ClaimActionItems with(nolock) where ClaimID=@ClaimID and Slno=@Slno and ClaimStageID=14 order BY ID desc
SELECT top 1 @IRreason_request = ReasonIDs_P FROM ClaimActionItems with(nolock) where ClaimID=@ClaimID and Slno=@Slno and ClaimStageID=17 and Closedate is null order BY ID desc

DECLARE @PROVIDERFLAGGINGCOUNT INT = 0
PRINT CAST(@DateofAdmission AS DATE)
SELECT  @PROVIDERFLAGGINGCOUNT = COUNT(1) FROM ProviderCategory (NOLOCK) WHERE  providerid = @ProviderID AND RelevantID= @IssueID AND providerStatusID = 1 AND DELETED = 0 AND CAST(STARTDATE AS DATE) <= CAST(@DateofAdmission AS DATE)  AND 1 = (CASE WHEN EN
DDATE IS NULL THEN 1 WHEN ENDDATE IS NOT NULL AND CAST(ENDDATE AS DATE) >= CAST(@DateofAdmission AS DATE) THEN 1	ELSE 0 END )
	
    if(@ClaimTypeID=1 and @RequesttypeID=1)
	begin
		if exists (SELECT * FROM CLA_RULES_EXEC_LOG with(nolock) WHERE CLAIMID = @ClaimID AND SLNO = @Slno)
		begin
			SET @isautoCashlessclaims = 1;
		end
	end
    
DECLARE @IsPayment_NIDB BIT=0
IF(EXISTS(Select 1 from Insurers_Payment_NIDB WITH(NOLOCK) WHERE IssueID=@issueid AND Deleted=0))
SET @IsPayment_NIDB =1;
ELSE
SET @IsPayment_NIDB =0;
  
  DECLARE @IsLegal_RefertoInsurer INT = 1,@ISLEGAL INT = 0 -- CHECK CLAIMS SEND TO REFER TO INSURER IF IT IS LEAGL CASE
IF(@Isrefertoinsurer = 1)
BEGIN
	IF EXISTS (SELECT LegalFlag FROM CLAIMS (NOLOCK) WHERE ID = @ClaimID AND LegalFlag = 1)
	BEGIN
		IF EXISTS( SELECT ID FROM CLAIMACTIONITEMS (NOLOCK) WHERE CLAIMID = @ClaimID AND SLNO = @Slno AND CLAIMSTAGEID = 17 AND ReasonIDs_P = 448)
		BEGIN
			SET @IsLegal_RefertoInsurer = 0;
		END
	END
END

DECLARE @CRM_REASONID INT = 0
 IF(Exists(SELECT 1 FROM Refer_to_crm_Details (NOLOCK) WHERE IssueID=@IssueID and (@ClaimTypeID in (Select Stringvalue from fn_Split(ClaimTypeID, ','))) and
(@RequestTypeID in (Select Stringvalue from fn_Split(RequesttypeID, ','))) and status=1))
BEGIN
SET @Isrefertocrm =1;
SELECT @Mbbs_thresholdlimit = Mbbs_AdmissibleAmountlimit,@cmo_thresholdlimit = Cmo_AdmissibleAmountlimit FROM Refer_to_crm_Details (NOLOCK) WHERE IssueID=@IssueID and (@ClaimTypeID in (Select Stringvalue from fn_Split(ClaimTypeID, ','))) and
(@RequestTypeID in (Select Stringvalue from fn_Split(RequesttypeID, ','))) and status=1

SELECT @CRM_REASONID = ReasonIDs_P FROM ClaimActionItems (NOLOCK) where ClaimID=@ClaimID and Slno=@Slno and ClaimStageID=10 AND CLOSEDATE IS NULL order BY ID desc 

END

	DECLARE @IS_ADJ_FROM_QR INT  
	IF OBJECT_ID('tempdb..#TEMP') IS NOT NULL DROP TABLE #TEMP
	SELECT * INTO #TEMP FROM (SELECT TOP 3 * FROM CLAIMACTIONITEMS (NOLOCK) WHERE CLAIMID = @ClaimID AND SLNO = @Slno ORDER BY ID DESC) FINAL

	IF(
	(SELECT COUNT(1) FROM #TEMP WHERE CLAIMSTAGEID = 5 AND CLOSEDATE IS NULL)>0 AND 
	(SELECT COUNT(1) FROM #TEMP WHERE CLAIMSTAGEID IN (5,13,12,38)) = 3 AND 
	(SELECT COUNT(1) FROM CLAIMSIRREASONS (NOLOCK) WHERE CLAIMID = @ClaimID AND SLNO = @Slno AND DELETED = 0 AND isMandatory = 1 AND isReceived = 0)>0
	)
	BEGIN
		
		SET @IS_ADJ_FROM_QR = 1
	END
	ELSE
	BEGIN
		SET @IS_ADJ_FROM_QR = 0
	END

	--SP3V-5313	Utilization of buffer when SI is existed to be implemented for Prepost for IQVIA corporate

	SET @REFER_TO_INSURER_PREAUTH_FLOW = (SELECT TOP 1 approvedamount FROM Refer_to_insurer_details R WHERE R.IssueID = @IssueID
	AND R.Status = 1 AND R.RTI_Enabled = 1
  AND EXISTS (SELECT 1 FROM fn_Split(R.ClaimTypeID, ',') WHERE Stringvalue = @ClaimTypeID)
  AND EXISTS (SELECT 1 FROM fn_Split(R.RequesttypeID, ',') WHERE Stringvalue = @RequestTypeID)
  AND EXISTS (SELECT 1 FROM fn_Split(R.Policy_Type, ',') WHERE Stringvalue = (SELECT TOP 1 PolicyTypeID_P2 FROM POLICY (NOLOCK) WHERE @PolicyID = ID ))
  AND (EXISTS (SELECT 1 FROM fn_Split(R.Corp_id, ',') WHERE Stringvalue = @CorpID) OR R.Corp_id = '0')
	ORDER BY CASE WHEN EXISTS (SELECT 1 FROM fn_Split(R.Corp_id, ',') WHERE Stringvalue = @CorpID) THEN 1 ELSE 2 END)

	DECLARE @BUFFER_UTLILIZATION BIT

	-- CORPORATE LEVEL CHECK
	SET @BUFFER_UTLILIZATION =(SELECT ApplFlag FROM Claims_Workflow_Config (NOLOCK) C WHERE EntityType = 2 AND WorkFlowID = 1 AND STATUS = 1 
								 AND EXISTS (SELECT 1 FROM fn_Split(C.ClaimTypeID, ',') WHERE Stringvalue = @ClaimTypeID)
								 AND EXISTS (SELECT 1 FROM fn_Split(C.RequestTypeID, ',') WHERE Stringvalue = @RequestTypeID)
								 AND EXISTS (SELECT 1 FROM fn_Split(C.PolicyTypeID, ',') WHERE Stringvalue = (SELECT TOP 1 PolicyTypeID_P2 FROM POLICY (NOLOCK) WHERE ID = @PolicyID ))
								 AND EXISTS (SELECT 1 FROM fn_Split(C.entityIDs, ',') WHERE Stringvalue = @CorpID)
								 )

	IF(@BUFFER_UTLILIZATION IS NULL)
	BEGIN
		SET @BUFFER_UTLILIZATION =(SELECT COUNT(1) FROM Claims_Workflow_Config (NOLOCK) C WHERE EntityType = 1 AND WorkFlowID = 1 AND STATUS = 1 
							 AND EXISTS (SELECT 1 FROM fn_Split(C.ClaimTypeID, ',') WHERE Stringvalue = @ClaimTypeID)
							 AND EXISTS (SELECT 1 FROM fn_Split(C.RequestTypeID, ',') WHERE Stringvalue = @RequestTypeID)
							 AND EXISTS (SELECT 1 FROM fn_Split(C.PolicyTypeID, ',') WHERE Stringvalue = (SELECT TOP 1 PolicyTypeID_P2 FROM POLICY (NOLOCK) WHERE ID = @PolicyID ))
							 AND EXISTS (SELECT 1 FROM fn_Split(C.entityIDs, ',') WHERE Stringvalue = @IssueID)
							 )
	END
	

    select CD.id ClaimDetailsID,MP.ID MemberpolicyID,P.ID PolicyID,BS.SITypeID,ISNULL(P.CorpID,0) CorpID,ISNULL(P.BrokerID,0) BrokerID,C.ProviderID,C.IssueID,P.PayerID,CD.ApprovedFacilityID, CD.ReqFacilityID, -- CD.ReqFacilityID added for task: SP-1103
    CD.StageID,MP.MainmemberID MainMemberPolicyID,CD.ClaimTypeID,CD.RequestTypeID,P.PolicyTypeID_P2 PolicyType,  
    @Billamount BillAmount,CD.PackageAmount,@Eligibleamount EligibleAmount,@BillafterDeductions BillafterDeductions,cd.MOUDiscount,cd.PayeeName,  
    Cd.BankName,cd.BankAccountNo,cd.BranchName,cd.IFSCCode,cd.MICRNo,Isnull(cd.Sanctionedamount,0) Sanctionedamount,cd.TDSAmount,cd.Netamount,  
  Isnull(TariffValue,0)  TariffValue,PackageLimit,cd.BPCoverageLimit,C.ServiceTypeID,c.ServiceSubTypeID,CD.BillingCorrection,  
    --CD.DoctorNotes,CD.AdditionalRemarks  
    isnull(CD.DoctorNotes,case when cd.claimtypeid=1  and cd.RequestTypeID in (2,3) and cd.slno !=1 then (Select DoctorNotes from Claimsdetails with(nolock) where ClaimID=@ClaimID and Slno=(@Slno-1) and Deleted=0 ) end) DoctorNotes,  
    isnull(CD.AdditionalRemarks,case when cd.claimtypeid=1 and cd.RequestTypeID in (2,3) and cd.slno !=1  then (Select AdditionalRemarks from Claimsdetails with(nolock) where ClaimID=CD.ClaimID and Slno=@Slno-1 and Deleted=0 ) end) AdditionalRemarks  
    ,MP.isSuspicious,MP.Notes,MP.Remarks,'' as PortabilityNotes,ISNULL(Ma.ID,P.AgentID) AgentID ,CD.ISNeftBounced,C.LegalFlag,isnull(CD.IsBufferUtilized,0) IsBufferEnabled,BS.ID BPSIID,MP.ProposerName,MP.NomineeName,MP.MemberName,
    dateofadmission,mp.MemberCommencingDate,mp.MemberEndDate,C.RelationShipID,ISNULL(P.IsPolicyNIDB,0) IsPolicyNIDB,case when c.DateofAdmission between Mp.MemberCommencingDate and mp.MemberEndDate then 0 else 1 end IsWithinpolicy,@iSangentSuspicious IsAn
entSuspicious,
    @topupMemberSIID topupMemberSIID,@TopUpBPSIID TopUpBPSIID,@EnhancedMemberSIID EnhancedMemberSIID,@EnhancedBPSIID EnhancedBPSIID,@BaseMemberSIID BaseMemberSIID,@RestoreMemberSIID RestoreMemberSIID,@RestoreBPSIID RestoreBPSIID,@CriticalMEmberSIID Critic
alMEmberSIID,@CriticalBPSIID CriticalBPSIID,
    cd.IsRecalculated,MP.isVIP,isnull(cd.bufferwithoutbase,0) bufferwithoutbase,@Score score,cd.claimdiagnosis,cd.isoutofSI,PV.GSTIN as ProviderGSTIN
	,Isnull(MP.Ins_Personid,'') Ins_Personid,PV.PRCNo,Isnull(cd.excess_SI,0) excesssuminsured
	,BT1.BaseClaimID,Isnull(BT.Topupslno,0) Topupslno,Isnull(BT1.Topupslno,0) PreTopupslno
	-- SP3V-1690 - Added by leena
	,Case When IsAutomationClaim =8 then 5 else IsAutomationClaim END IsAutomationClaim
	,case when IsAutomationClaim=2  then 'ReviewReturn' when IsAutomationClaim in (3,4) then 'Reviwed' end IsAutomationClaimName
	,case  
		 when IsAutomationClaim>1 then (Select Top 1 remarks From claimactionitems (nolock) wHERE claimid = @ClaimId and slno=@SlNo and ClaimStageID=29 and CloseDate is not null order by id desc)
	 Else  ca.remarks 
	 End ReviwedRemarks
	---End SP3V-1690 - Added by leena
    ,ReceivedMode_P23 --SP3V-2383
	,P.IsSuspiciousPolicy IsSuspiciousPolicy --SP3V-994 Leena
	,mp.uhidno
	--,IsNull(CAD.TempMOU,0) TempMOU--SP3V-3783
	--,@FlagTempMOU TempMOU--SP3V-3783
	,CAD.TempMOU TempMOU
	,P.PolicyNo
	,Isnull(@ITGIinsurerresponse,'') ITGIinsurerresponse,@ReasonIDs_P ReasonIDs_P,
	@isITGImanualapv isITGImanualapv,@SupertopupMemberSIID SupertopupMemberSIID,@SupertopupBPSIID SupertopupBPSIID 
	,Isnull(CAD.IsAprvFacilitychanged,0) IsAprvFacilitychanged,ISNULL(tt.ID,0) IntimationID
	,@MOUID MOUID,
	Isnull(prop_dedu_percentage,0) prop_dedu_percentage,Isnull(prop_dedu_appl_flag,0) prop_dedu_appl_flag,prop_dedu_remarks,
	HospitalCategory_P68,pv.cityID provider_city_ID,mc.name provider_city_name,Pv.ID providerID,Pv.name Providername,cd.TreatmentTypeID_P19,tp.ID level3_ID,Tp.level3
       ,@ISSINGLELETTER IsSingleLetterEnabled --SP3V-4854
   ,CoverageTypeID_P21,@Isrefertoinsurer Isrefertoinsurer ,@IRreason_request IRreason_request, @PROVIDERFLAGGINGCOUNT hospital_flagging,cd.IsFinal,Isnull(mp.IsNIDB,0) IsNIDB
   
    -- Spectra - iAI integration change (SP3V-4924)
	,CASE WHEN ISNULL(CD.iAIBillProcessStatus, 1) IN (5) THEN 1 ELSE 0 END AS iAIClaim,
	--CASE WHEN ISNULL(CD.iAIBillProcessStatus, 1) IN (2) THEN 1 ELSE 0 END AS iAIManualPush
	CASE WHEN ISNULL(CD.iAIBillProcessStatus, 1) IN (2) AND CD.StageID = 3 THEN 1 ELSE 0 END AS iAIManualPush
	-- End of Spectra - iAI integration change (SP3V-4924)
	,@IsPayment_NIDB IsPayment_NIDB
        ,@isautoCashlessclaims isautoCashlessclaims
   ,@IsLegal_RefertoInsurer IsForwardedtoInsurer
	,P.IsAckoSuspiciousPolicy IsAckoSuspiciousPolicy,ISNULL(IsAutomationClaim,0) actIsAutomationClaim
 	,CASE WHEN MP.CorpID IN (279293,279295,279294,279299,279301,279300,279296,279298,279297,279302,279304,279303,279305,279307,279306) THEN 0 ELSE @Isrefertocrm END Isrefertocrm
	,@Mbbs_thresholdlimit Mbbs_thresholdlimit,@cmo_thresholdlimit cmo_thresholdlimit,BP.ProductID
	,ISNULL(@CRM_REASONID,0) crm_reasonid
	,ISNULL(@IS_ADJ_FROM_QR,0) IS_ADJ_FROM_QR
	,ISNULL(@REFER_TO_INSURER_PREAUTH_FLOW,0) REFER_TO_INSURER_PREAUTH_FLOW
	,CASE WHEN ISNULL(CAD.AI_Tool,0) = 2 AND iAIBillProcessStatus = 11 THEN ' HPAI In-Process'
	WHEN ISNULL(CAD.AI_Tool,0) = 2 AND iAIBillProcessStatus = 12 THEN ' HPAI PASS'
	WHEN ISNULL(CAD.AI_Tool,0) = 2 AND iAIBillProcessStatus = 13 THEN ' HPAI FAILED'
	ELSE ''	END healthpaystatus
	,ISNULL(@BUFFER_UTLILIZATION,0) IS_BUFFER_UTLILIZATION
	,CAD.SkipMedicalScrutinyReasons,CAD.SkipMedicalScrutinyRemarks
    from Claims C with(nolock) inner join MemberPolicy MP (NOLOCK) on C.MemberPolicyID=MP.ID and C.deleted=0  
    Inner Join MemberSI S (NOLOCK) on S.memberpolicyid=MP.ID and S.Deleted=0  
    Inner Join BPSumInsured BS (NOLOCK) on BS.ID=S.BPSIID and BS.Deleted=0 and BS.SICategoryID_P20=69  
    inner Join Policy P (NOLOCK) on P.ID=MP.PolicyID  
    inner join BenefitPlan BP on BP.ID=P.BenefitPlanID  
    Inner Join Claimsdetails CD (NOLOCK) on CD.ClaimID=C.ID and CD.Deleted=0  
    left outer  join Provider PV (nolock) on PV.id=C.ProviderID and PV.deleted=0
    Left outer Join Mst_Agent Ma on Ma.code = MP.Partycode  and ma.deleted=0
	left join BaseTopupClaimLinking BT on BT.BaseClaimID=cd.ClaimID and BT.BaseSlno = cd.Slno and Bt.Deleted=0
	left join BaseTopupClaimLinking BT1 on BT1.BaseClaimID=cd.ClaimID and BT1.BaseSlno = cd.Slno-1 and Bt1.Deleted=0
    --SP3V-1690 Leena
	left outer join ClaimAdditionalDetails (NoLock) CAD on CD.id=CAD.ClaimDetailsId 
	left join claimactionitems (NoLock) ca on ca.claimid = cd.claimid and ca.slno=cd.slno and ca.ClaimStageID=CD.STAGEID and ca.CloseDate is  null 
	--SP3V-1690 Leena
	left join intimation tt on tt.ClaimID=c.ID and tt.Deleted=0
	LEFT JOIN MSt_CITY  mc (NoLock) on mc.ID=pv.CityID
	LEFT JOIN Claimscoding ccd (NoLock) on ccd.ClaimID=cd.ClaimID and ccd.Slno=cd.Slno and ccd.Deleted=0
	LEFT JOIN TpaProcedures Tp (NoLock) on tp.ID=ccd.TPALevel3
    --Left Outer join ClaimNeftBounceQueryDetails CNB on CNB.ClaimID=cd.ClaimID and CNB.Slno =Cd.Slno and CNB.Deleted=0
    where CD.ClaimID=@ClaimID and CD.Slno=@Slno;
  
END



Completion time: 2026-06-08T21:51:52.5083487+05:30
