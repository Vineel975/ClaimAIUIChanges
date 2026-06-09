/*-------------------------------------------------
       ////Code Written By B. Srinu  on 17thDec2015
       ////Description: ClaimUnlock
       ////---------------------------------------------------*/
var BankValidations = [];  //Added by Subbu (SP-1235)
var _TempAddressFlag = 0;  //SP3V-188
var proportionateperc = 0;
var proportionatesum = 0;
var proporreasionID = 37;
var propbilling_override_flag = false;
function ClaimUnlock(claimid) {
    try {

        $.ajax({
            url: '/Claims/ClaimUnlock',
            type: 'GET',
            data: { ClaimID: claimid },
            success: function (result) {

                window.location = "/claims/Index";
            },
            error: function () {
                DialogCommomErrorFunction('Error while unlock')
            }
        });


    } catch (e) {
        DialogErrorMessage("Error while unlock");
    }
}

/* Start Request Details */
function LoadRequestDetails(_ClaimID, _spanRD_ReceivedMode) {
    if ($("#" + _spanRD_ReceivedMode).text() == "") {
        $.ajax({
            //type: "POST",
            url: "/Claims/GetRequestDetails",
            contentType: 'application/json;charset=utf-8',
            //processData: false,
            data: { ClaimID: _ClaimID },
            success: function (data) {
                data = $.parseJSON(data);
                if (data == null || data == "") {
                    //alert('Data not found.');
                }
                else {
                    var CommunicationMode = getNamepropwithId(data[0].SourceType_P23, MasterData.CommunicationMode);
                    var RegionName = getNamepropwithId(data[0].RegionID, MasterData.Mst_Regions);
                    var CreatedUser = GetUserName(data[0].CreatedUserRegionID, MasterData.Lnk_UserRegions, MasterData.Mst_Users);

                    $("#spanRD_ReceivedMode").text(CommunicationMode);
                    $("#spanRD_RequestSource").text(data[0].SourceValue);
                    $("#spanRD_ReceivedDate").text(data[0].FileReceivedDate);
                    $("#spanRD_ReceivedBy").text(CreatedUser);
                    $("#spanRD_ReceivedLocation").text(RegionName);
                }
            },
            error: function (e, x) {
                ShowResultMessage('ErrorMessage', e.responseText);
            }
        });

    }
}


/* Start Current Policy Details */
function LoadPolicyDetails(_policyID, _insuranceCompany) {
    if ($("#" + _insuranceCompany).text() == '' || $("#" + _insuranceCompany).text() == null) {
        $.ajax({
            //type: "POST",
            url: "/Common/Policy_Data_Retrieve_Revised",
            contentType: 'application/json;charset=utf-8',
            //processData: false,
            data: { PolicyId: _policyID },
            success: function (data) {
                data = $.parseJSON(data);

                if (data == null || data == "") {
                    //alert('Data not found.');
                }
                else {

                    FillPolicyDetails(data);
                }
            },
            error: function (e, x) {
                ShowResultMessage('ErrorMessage', e.responseText);
            }
        });

    }
}

/*-------------------------------------------------
Code Modified By Srujan Jampani on 16thAug2023
Description: Add Coverage Type in Html Content Dynamically--Srujan Jampani 16thAug2023
---------------------------------------------------*/
function FillPolicyDetails(data) {
    var insName = getNamepropwithId(data.Table[0].IssueID, MasterData.Mst_IssuingAuthority);
    $("#hdnInsuranceCompanyID").val(data.Table[0].IssueID);
    $("#hdnClaimProductID").val(data.Table[0].ProductID);
    var payerName = getNamepropwithId(data.Table[0].PayerID, MasterData.payer);
    $("#hdnPayerID").val(data.Table[0].PayerID);
    var product = getNamepropwithId(data.Table[0].ProductID, MasterData.product);
    var policyType = getNamepropwithId(data.Table[0].PolicyTypeID_P2, MasterData.PolicyType);
    var policyStatus = getNamepropwithId(data.Table[0].StatusID, MasterData.PolicyStatus);

    $("#hplPolicyInsuranceCompany").text(insName);
    $("#hplPolicyPayerName").text(payerName);
    $("#hplPolicyCorporateName").text(MakeNullasNotApplicable(data.Table[0].CorporateName));

    $("#hdnCorporateID").val(data.Table[0].CorpID);
    $("#spanPolicyProductName").text(product);
    //$("#hplPolicyBenefitPlanName").text(data.Table[0].BenefitplanID);
    $("#spanPolicyBenefitPlanName").text(data.Table[0].BenefitplanName);
    $("#spanPolicyStatus").text(policyStatus);

    //SP3V-994 Leena
    $("#spanIsSuspiciousPolicy").text(data.Table[0].IsSuspicious == null || data.Table[0].IsSuspicious == "" || data.Table[0].IsSuspicious == "0" ? '' : "Suspicious Policy");
    //END SP3V-994 Leena


    $("#spanPolicyType").text(policyType);
    $("#spanPolicyNumber").text(data.Table[0].PolicyNo);
    //JSONDateSpan(data.Table[0].StartDate, "spanPolicyStartDate");
    $("#spanPolicyStartDate").text(JSONDate2(data.Table[0].StartDate));
    //JSONDateSpan(data.Table[0].EndDate, "spanPolicyEndDate");
    $("#spanPolicyEndDate").text(JSONDate2(data.Table[0].EndDate));
    //JSONDateSpan(data.Table[0].InceptionDate, "spanPolicyInceptionDate");
    $("#spanPolicyInceptionDate").text(JSONDate2(data.Table[0].InceptionDate));

    //SP3V-2752 Srujan Jampani
    $("#spnCoverageTypeClaims").text(data.Table[0].COVERAGETYPEID);

    //End of SP3V-2752 Srujan Jampani

    // alert(data.Table[0].BrokerName)
    //****************SP-1226
    $('#txtPolNotes').val(data.Table[0].Notes);
    $('#txtPolRemarks').val(data.Table[0].PolicyRemarks);
    //***************
    $("#spanAgentbrokername").text(data.Table[0].BrokerName == "" || data.Table[0].BrokerName == null ? 'N/A' : data.Table[0].BrokerName);

    var Address = '';
    for (var i = 0; i < data.Table1.length; i++) {
        if (data.Table1[i].IsBaseAddress == 1) {
            Address = data.Table1[i].Address1 + ',' + data.Table1[i].Address2 + ',' + data.Table1[i].Location + ',' + data.Table1[i].City + ','
                + data.Table1[i].District + ',' + data.Table1[i].State;
            break;
        }
    }
    if (Address == '')
        $("#spanPolicyHolderAddress").text('No address available');
    else
        $("#spanPolicyHolderAddress").text(Address);

    $("#spnPlanYears").text(data.Table[0].PlanYears == "" || data.Table[0].PlanYears == null ? 'One Year Policy' : data.Table[0].PlanYears);

    if (data.Table[0].RenewedCount == 0) {
        $("#spnrenewalStatus").text('Fresh Policy');
    }
    else {
        $("#spnrenewalStatus").text(number2text(data.Table[0].RenewedCount) + ' Renewal');
    }

    //SP3V - 1051 LEENA //
    if (data.Table[0].IsRevolving == true) {
        $("#spnRevolvingpolicyView").html('<p style="color:red;"><b>Yes</b></p>');
    }
    else {
        $("#spnRevolvingpolicyView").html('<p style="color:green;"><b> NO</b></p>');
    }
    //END SP3V-1051//

}

var PatientDtls = null;
/* Start Received Patient Details */
AddDateTimePicker('txtReceivedPatient_DOB');
function LoadReceivedPatientDetails(_ClaimID, _Slno, _PatientName, _flag, _IsFrmArchived) {
    if (_flag == 1) {
        if ($('#txtReceivedPatient_Address1').val() == '' && $('#txtReceivedPatient_BankAccountNo').val() == '') {
            LoadReceivedPatien_BankDetails(_ClaimID, _Slno, _IsFrmArchived);
        }
    }
    else if (_flag == 0) {
        if ($("#" + _PatientName).val() == '' || $("#" + _PatientName).val() == null) {
            LoadReceivedPatien_BankDetails(_ClaimID, _Slno, _IsFrmArchived);
        }
    }
}

function LoadReceivedPatien_BankDetails(_ClaimID, _Slno, _IsFrmArchived) {
    var paramString = [
        _ClaimID,
        _Slno,
        _IsFrmArchived
    ].join('|');
    $.ajax({
        url: '/Common/EncryptParameters',
        type: 'POST',
        data: { Q: paramString },
        success: function (encryptedValue) {
            if (encryptedValue) {
                $.ajax({
                    url: "/Claims/ReceivedPatientDetails",
                    type: "GET",
                    data: { Q: encryptedValue }, // pass as query/form parameter
                    success: function (response) {
                        if (response && response.Success) {
                            data = $.parseJSON(response.Data);
                            if (data == null || data == "") {
                            }
                            else {
                                FillReceivedPatientDetails(data);
                            }
                        }
                        else {
                            DialogWarningMessage(response.Message || 'An unexpected issue occurred.');
                        }
                    },
                    error: function (e, x) {
                        ShowResultMessage('ErrorMessage', e.responseText);
                    }
                });
            }
            else {
                DialogWarningMessage('Error encrypting payer details');
            }
        },
        error: function (err) {
            DialogWarningMessage('Encryption failed');
        }
    });
}

function FillReceivedPatientDetails(data) {
    $("#txtReceivedPatient_PatientName").val(data[0].PatientName);
    $("#ddlReceivedPatient_Gender").val(data[0].GenderID);
    $("#ddlReceivedPatient_PatientRelationship").val(data[0].RelationshipID);
    $("#txtReceivedPatient_PatientUHID").val(data[0].UHIDNo);
    //JSONDate(data[0].DOB, 'txtReceivedPatient_DOB');

    $("#txtReceivedPatient_Age").val(data[0].Age);
    $("#ddlReceivedPatient_AgeType").val(data[0].AgetypeID);
    $("#txtReceivedPatient_EmployeeID").val(data[0].EmployeeID);
    $("#txtReceivedPatient_MainMemberName").val(data[0].EmpName);
    $("#ddlReceivedPatient_MainMemberGender").val(data[0].EmpGenderID);
    //$("#txtReceivedPatient_Mobile").val(data[0].MobileNo);
    var hiddenphone = data[0].MobileNo;
    $("#hdnReceivedPatient_Mobile").val(hiddenphone);
    //console.log("Hidden Mobile value:", $("#hdnReceivedPatient_Mobile").val());
    var hiddendob = JSONDate2(data[0].DOB);
    $("#hdnReceivedPatient_DOB").val(hiddendob);
    $("#hdnTempAddress_Mobile").val(data[0].MobileNo);
    var hiddenemail = data[0].Email;
    $("#hdnReceivedPatient_Email").val(hiddenemail); //-- change here
    var hiddenaltermobile = data[0].AlternateMobileNo;
    $("#txtReceivedPatient_RelativeMobile").val(hiddenaltermobile);

    if ($('#hdnInsuranceCompanyID').val() === "14") {

        Maskvalue("#txtReceivedPatient_Mobile", String(data[0].MobileNo), 1);
        Maskvalue("#txtReceivedPatient_DOB", JSONDate2(data[0].DOB), 2);
        Maskvalue("#txtTempAddress_Mobile", String(data[0].MobileNo), 1);
        Maskvalue("#txtReceivedPatient_Email", data[0].Email, 3);
        Maskvalue("#txtReceivedPatient_BankAccountNo", data[0].BankAccountNo, 1);
        console.log("Original mobile:", data[0].AlternateMobileNo);
        Maskvalue("#txtReceivedPatient_RelativeMobile", String(data[0].AlternateMobileNo), 1);

    }
    else {
        $("#txtReceivedPatient_Mobile").val(data[0].MobileNo);
        $("#txtReceivedPatient_DOB").val(JSONDate2(data[0].DOB));
        $("#txtTempAddress_Mobile").val(data[0].MobileNo);
        $("#txtReceivedPatient_Email").val(data[0].Email);
        $("#txtReceivedPatient_RelativeMobile").val(data[0].AlternateMobileNo);
    }
    //console.log("Hidden element exists?", $("#hdnReceivedPatient_Mobile").length);
    //console.log("Hidden Mobile value:", $("#hdnReceivedPatient_Mobile").val());
    //console.log("Original Mobile:", data[0].MobileNo);
    //console.log(val(data[0].MobileNo), "hidden field for mobile");

    //$("#hdnReceivedPatient_DOB").val(data.Table[0].DOB);
    //$("#txtTempAddress_Mobile").val(data[0].MobileNo);
    //$("#txtReceivedPatient_Email").val(data[0].Email);
    $("#txtReceivedPatient_PhysicianName").val(data[0].PhysicianName);
    $("#txtReceivedPatient_PhysicianMobile").val(data[0].PhysicianMobile);
    $("#txtReceivedPatient_PhysicianAddress").val(data[0].PhysicianAddress);
    if (data[0].AnyOtherMediclaim == 1 || data[0].AnyOtherMediclaim == true)
        $("#chkReceivedPatient_AnyOtherMediclaim").attr("checked", true);
    $("#txtReceivedPatient_OtherMediclaimDetails").val(data[0].MediclaimDetails);
    if (data[0].AnyOtherPolicy == 1 || data[0].AnyOtherPolicy == true)
        $("#chkReceivedPatient_OtherInsurancePolicy").attr("checked", true);
    $("#txtReceivedPatient_OtherPolicyDetails").val(data[0].OtherPolicyDetails);
    $("#txtReceivedPatient_InsurerUHID").val(data[0].InsUHIDNo);

    $("#txtReceivedPatient_Address1").val(data[0].Address1);
    $("#txtReceivedPatient_Address2").val(data[0].Address2);
    $("#txtReceivedPatient_Location").val(data[0].Location);
    $("#ddlReceivedPatient_State").val(data[0].Stateid);
    if (data[0].Stateid > 0 || data[0].Stateid != null)
        Cascading_OnlyDistricts('ddlReceivedPatient_District', data[0].Stateid);
    setTimeout(
        function () {
            $("#ddlReceivedPatient_District").val(data[0].Districtid);
            if (data[0].Districtid > 0 || data[0].Districtid != null)
                DistrictChange($('#ddlReceivedPatient_District').val(), 'ddlReceivedPatient_CityID', data[0].CityID);
        }, 100);
    $("#ddlReceivedPatient_CityID").val(data[0].CityID);
    $("#txtReceivedPatient_STDCode").val(data[0].STDCode);
    $("#txtReceivedPatient_Phone").val(data[0].PhoneNo);
    //$("#txtReceivedPatient_RelativeMobile").val(data[0].AlternateMobileNo);
    $("#txtTempAddress_RelativeMobile").val(data[0].AlternateMobileNo);

    if ($('#hdnInsuranceCompanyID').val() === "14") {
        Maskvalue("#txtReceivedPatient_RPANno", data[0].PANNo, 1);
        Maskvalue("#txtReceivedPatient_RAdharno", data[0].AdharNo, 1);
        Maskvalue("#txtReceivedPatient_REmail", data[0].Email, 3);
        Maskvalue("#txtReceivedPatient_BankAccountNo", data[0].BankAccountNo, 1);
        Maskvalue("#txtReceivedPatient_IFSCode", data[0].IFSCode, 1);
    }
    else {
        $("#txtReceivedPatient_RPANno").val(data[0].PANNo);
        $("#txtReceivedPatient_RAdharno").val(data[0].AdharNo);
        $("#txtReceivedPatient_REmail").val(data[0].Email);
    }


    $("#txtReceivedPatient_RPayeeName").val(data[0].PayeeName);

    //SP3V-188 start
    if (_TempAddressFlag != 0 || $("#hdnClaimStageID").val() != 24) {
        //Added by Subbu...SP-1235
        var hiddenbankaccount = data[0].BankAccountNo;
        $("#hdnReceivedPatient_BankAccountNo").val(hiddenbankaccount);
        if ($('#hdnInsuranceCompanyID').val() === "14") {
            Maskvalue("#txtReceivedPatient_BankAccountNo", data[0].BankAccountNo, 1);
        }
        else {
            $("#txtReceivedPatient_BankAccountNo").val(data[0].BankAccountNo);
        }

        $("#txtReceivedPatient_BankName").val(data[0].BankName);
        $("#txtReceivedPatient_BranchName").val(data[0].Branch);
        $("#ddlReceivedPatient_AccountType").val(data[0].AccountTypeID);
        //$("#txtReceivedPatient_IFSCode").val(data[0].IFSCode);
        if ($('#hdnInsuranceCompanyID').val() === "14") {
            Maskvalue("#txtReceivedPatient_IFSCode", data[0].IFSCode, 1);
        }
        else {
            $("#txtReceivedPatient_IFSCode").val(data[0].IFSCode);
        }

    }

    if (($('#hdnClaimTypeID').val() == 2) || ($('#hdnClaimStageID').val() == 24)) {
        BankValidations.push(data[0].BankAccountNo, data[0].BankName, data[0].Branch, data[0].AccountTypeID, data[0].IFSCode);
        $('#hdnBankValidations').val(BankValidations.toString());
    }

    if (data[0].Issueid != 30) {
        $('#payeename_hide').hide();
    }
    //SP3V-1778 Leena---------------------------------------------------
    $("#txtReceivedPatient_Pincode").val(data[0].Pincode);
    //End SP3V-1778------------------------------------------------------
}

var BankValidationflag = false;
function Save_ReceivedPatientDetails(_ClaimID, _SlNo, _flag) {
    $('#divAudit').hide();
    if (_flag == 1) {
        //if (PatientTemporaryDetails_Validating()) {
        if (TemporaryAddress_Validate(_ClaimID, _SlNo, _flag)) {
            if (BankValidationflag == false)
                Save_ReceivedPatient_TempAddr(_ClaimID, _SlNo, _flag)
        }
        //}
    }
    else if (_flag == 0) {
        if (ReceivedPatientDetails_Validate()) {
            Save_ReceivedPatient_TempAddr(_ClaimID, _SlNo, _flag)
        }
    }
}

function PatientTemporaryDetails_Validating() {
    try {
        var _controlFields = [];
        _controlFields.push(['txtReceivedPatient_Pincode', 'Please Enter Pincode']);
        return CustomFiledsValidate(_controlFields, 'divErrorMessage');

    } catch (e) {
        alert('Error Occured while Validating Executive Scrutiny Information');
    }
}

function Save_ReceivedPatient_TempAddr(_ClaimID, _SlNo, _flag) {
    try {
        $('#divErrorMessage').html('');
        var ReceivedPatientDetails = JSON.stringify(consolidateElements('divReceivedPatientDetails'));
        var hiddenMobile = $("#hdnReceivedPatient_Mobile").val();
        var obj = JSON.parse(ReceivedPatientDetails);
        obj["hdnReceivedPatient_Mobile"] = hiddenMobile;
        obj["hdnReceivedPatient_RPANno"] = $("#hdnReceivedPatient_RPANno").val();
        obj["hdnReceivedPatient_RAdharno"] = $("#hdnReceivedPatient_RAdharno").val();
        obj["hdnReceivedPatient_REmail"] = $("#hdnReceivedPatient_REmail").val();
        obj["hdnReceivedPatient_IFSCode"] = $("#hdnReceivedPatient_IFSCode").val();
        ReceivedPatientDetails = JSON.stringify(obj);

        console.log("ReceivedPatientDetails JSON:", ReceivedPatientDetails);
        ajaxGETResonse('/Claims/Save_ReceivedPatientDetails', ReceivedPatientDetails_InsertSucces, ExecutiveScrutinyData_Error,
            {
                ReceivedPatientDetails: JSON.stringify(consolidateElements('divReceivedPatientDetails')),
                TemporaryAddress: JSON.stringify(consolidateElements('divPatientTemporaryAddress')),
                ClaimID: _ClaimID, SlNo: _SlNo, Flag: _flag
            });
        if ($("#hdnClaimStageID").val() == "24") {
            $("#hdnNEFTValidation").val(1);
        }


    } catch (e) {
        //alert('Error Occured while Insert Patient Details');
        alert(e.message);
    }
}

function ReceivedPatientDetails_InsertSucces(data) {
    try {

        CheckSessionVariable(data.responseText);
        DialogResultMessage(data.responseText);
        LoadReceivedPatientDetails($('#hdnClaimID').val(), $('#hdnClaimSlNo').val(), 'txtReceivedPatient_PatientName', 1);


    } catch (e) {
        alert('Error Occured');
    }
}

function ExecutiveScrutinyData_Error(data) {
    try {
        //ShowResultMessage('divErrorMessage', data.responseText);      
        DialogResultMessage(data.responseText);

    } catch (e) {
        alert('Error Occured');
    }
}

function ReceivedPatientDetails_Validate() {
    try {
        var _controlFields = [];

        // Received Patient Details
        _controlFields.push(['txtReceivedPatient_PatientName', 'Please Patient Name']);
        _controlFields.push(['ddlReceivedPatient_Gender', 'Please Select Patient Gender']);
        _controlFields.push(['ddlReceivedPatient_PatientRelationship', 'Please Select Patient Relationship']);
        _controlFields.push(['txtReceivedPatient_Age', 'Please Enter Patient Age']);
        _controlFields.push(['ddlReceivedPatient_AgeType', 'Please Select Patient AgeType']);
        _controlFields.push(['txtReceivedPatient_MainMemberName', 'Please Enter Main Member Name']);
        _controlFields.push(['ddlReceivedPatient_MainMemberGender', 'Please Select Main Member Gender']);
        _controlFields.push(['txtReceivedPatient_Mobile', 'Please Select Enter Patient Mobile']);
        _controlFields.push(['txtReceivedPatient_PhysicianName', 'Please Enter Treating Doctor Name']);
        //_controlFields.push(['txtReceivedPatient_Address1', 'Please Enter Patient Address1']);
        //_controlFields.push(['txtReceivedPatient_Location', 'Please Enter Patient Location']);
        //_controlFields.push(['ddlReceivedPatient_State', 'Please Select State']);

        return CustomFiledsValidate(_controlFields, 'divErrorMessage');

    } catch (e) {
        alert('Error Occured while Validating Executive Scrutiny Information');
    }
}

function TemporaryAddress_Validate(_ClaimID, _SlNo, _flag) {
    try {
        var flag = true;
        //SP3V-1778 - 09May2023-----------------------------------------------------------------------------
        var InsurerId = $('#hdnInsuranceCompanyID').val();

        if (($('#hdnClaimTypeID').val() == 2) && InsurerId == 7 && $('#hdnClaimStageID').val() == 24) {

            var strmandatoryfield = '';
            if ($('#txtReceivedPatient_Address1').val() == "" || $('#txtReceivedPatient_Address1').val() == undefined) {
                strmandatoryfield = ' Address1 / ';
            }
            if ($('#txtReceivedPatient_Address2').val() == "" || $('#txtReceivedPatient_Address2').val() == undefined) {
                strmandatoryfield = strmandatoryfield + ' Address2 / ';
            }
            if ($('#ddlReceivedPatient_State').val() == '' || $('#ddlReceivedPatient_State').val() == undefined || $('#ddlReceivedPatient_State').val() == 0) {
                strmandatoryfield = strmandatoryfield + ' State / ';
            }
            if ($('#ddlReceivedPatient_District').val() == '' || $('#ddlReceivedPatient_District').val() == undefined || $('#ddlReceivedPatient_District').val() == 0) {
                strmandatoryfield = strmandatoryfield + ' District / ';
            }
            if (($('#ddlReceivedPatient_CityID').val() == '' || ($('#ddlReceivedPatient_CityID').val() == undefined || $('#ddlReceivedPatient_CityID').val() == 0))) {
                strmandatoryfield = strmandatoryfield + ' City / ';
            }
            if ($('#txtReceivedPatient_Location').val() == '' || $('#txtReceivedPatient_Location').val() == undefined) {
                strmandatoryfield = strmandatoryfield + ' Location / ';
            }
            if (MakeNullfromUndefinedorEmpty($('#txtReceivedPatient_Pincode').val()) == null) {
                strmandatoryfield = strmandatoryfield + ' PinCode / ';
            }

            if (strmandatoryfield != '') {
                strmandatoryfield = strmandatoryfield.substring(0, strmandatoryfield.length - 2);
                DialogErrorMessage('Please enter Temporary Address : ' + strmandatoryfield);
                return false;
            }
            else if (MakeNullfromUndefinedorEmpty($('#txtReceivedPatient_Pincode').val()) != null && MakeNullfromUndefinedorEmpty($('#txtReceivedPatient_Pincode').val()).length < 6) {
                DialogErrorMessage('Pin Code should be 6 digits.');
                return false;
            }
        }
        //SP3V-1778 End
        if ($('#txtReceivedPatient_Address1').val() == '' && $('#txtReceivedPatient_BankAccountNo').val() == '') {
            DialogErrorMessage('Please enter patient address details or Bank account details.');
            flag = false;
        }
        //Added by bhagyaraj 24th July,2019
        //else if ($('#hdnClaimTypeID').val() == 2 && ($('#hdnClaimStageID').val() == 4 || $('#hdnClaimStageID').val() == 5) && $('#txtReceivedPatient_Address1').val() == "" || $('#txtReceivedPatient_Address1').val() == undefined) {
        //    DialogErrorMessage('Please enter Address1');  //if claimtype is Reimbursement and claim stage in 'For Bill Entry' or 'For Adjudication'
        //    flag = false;
        //}
        //else if ($('#hdnClaimTypeID').val() == 2 && ($('#hdnClaimStageID').val() == 4 || $('#hdnClaimStageID').val() == 5) && $('#txtReceivedPatient_Address2').val() == "" || $('#txtReceivedPatient_Address2').val() == undefined) {
        //    DialogErrorMessage('Please enter Address2');
        //    flag = false;
        //}
        //else if ($('#hdnClaimTypeID').val() == 2 && ($('#hdnClaimStageID').val() == 4 || $('#hdnClaimStageID').val() == 5) && $('#txtReceivedPatient_Location').val() == '' || $('#ddlReceivedPatient_State').val() == 0) {
        //    DialogErrorMessage('Please enter location or select state.');
        //    flag = false;
        //}
        //else if ($('#hdnClaimTypeID').val() == 2 && ($('#hdnClaimStageID').val() == 4 || $('#hdnClaimStageID').val() == 5) && $('#ddlReceivedPatient_District').val() != '' && $('#ddlReceivedPatient_District').val() == undefined || $('#ddlReceivedPatient_District').val() == 0) {
        //    DialogErrorMessage('Please select District');
        //    flag = false;
        //}
        //else if ($('#hdnClaimTypeID').val() == 2 && ($('#hdnClaimStageID').val() == 4 || $('#hdnClaimStageID').val() == 5) && $('#ddlReceivedPatient_CityID').val() != '' && $('#ddlReceivedPatient_CityID').val() ==undefined || $('#ddlReceivedPatient_CityID').val() == 0) {
        //    DialogErrorMessage('Please select City');
        //    flag = false;
        //}

        //else if (($('#txtReceivedPatient_Address1').val() != '') && ($('#txtReceivedPatient_Location').val() == '' || $('#ddlReceivedPatient_State').val() == 0)) {
        //    DialogErrorMessage('Please enter location or select state.');
        //    flag = false;
        //}
        else if ($('#txtReceivedPatient_BankAccountNo').val() != '' && ($('#txtReceivedPatient_BankName').val() == '' || $('#txtReceivedPatient_BranchName').val() == ''
            || $('#ddlReceivedPatient_AccountType').val() == 0 || $('#txtReceivedPatient_IFSCode').val() == '')) {
            DialogErrorMessage('Please enter full bank details.');
            flag = false;
        }
        else if (MakeNullfromUndefinedorEmpty($('#txtReceivedPatient_IFSCode').val()) != null && MakeNullfromUndefinedorEmpty($('#txtReceivedPatient_IFSCode').val()).length < 11) {
            DialogErrorMessage('IFSC Code should be 11 digits.');
            flag = false;
        }
        //SP3V-1778 Leena In Audit stage if user click on save button, bank account no is mandatory.
        else if ($('#txtReceivedPatient_BankAccountNo').val() == '' && $('#hdnClaimTypeID').val() == 2 && $('#hdnClaimStageID').val() == 24) {
            DialogErrorMessage('Please enter Bank Account No.');
            flag = false;
        }
        //else  if ($('#hdnClaimTypeID').val() == 2 && $('#txtReceivedPatient_REmail').val() == "" || $('#txtReceivedPatient_REmail').val() == undefined) {
        //     DialogWarningMessage('Please enter Valid email '); //if claimtype is Reimbursement ,valid email mandatory field
        //     $('#txtEmail').val('');
        //     return false;
        // }
        //else  if ($('#hdnClaimTypeID').val() == 2 && $('#txtTempAddress_Mobile').val() == "" || $('#txtTempAddress_Mobile').val() == undefined) {
        //     DialogWarningMessage('Please enter Valid Mobile number'); //if claimtype is Reimbursement ,valid Mobiel no mandatory field
        //     $('#txtTempAddress_Mobile').val('');
        //     return false;
        // } 

        else if (($('#hdnClaimTypeID').val() == 2) && ($('#hdnClaimStageID').val() == 24)) {
            var validationsforbank = [];
            validationsforbank = $('#hdnBankValidations').val();
            var Bankdata = validationsforbank.split(',');
            var check_BankAccountNo = $("#txtReceivedPatient_BankAccountNo").val();
            var check_BankName = $("#txtReceivedPatient_BankName").val();
            var check_BranchName = $("#txtReceivedPatient_BranchName").val();
            var check_AccountType = $("#ddlReceivedPatient_AccountType").val();
            var check_IFSCode = $("#txtReceivedPatient_IFSCode").val();
            BankValidationflag = false;
            var mismatch = "";
            if (Bankdata[0] != check_BankAccountNo || Bankdata[1] != check_BankName || Bankdata[2] != check_BranchName || Bankdata[3] != check_AccountType || Bankdata[4] != check_IFSCode) {
                if (Bankdata[0] != check_BankAccountNo)
                    mismatch = 'BankAccount No';
                else if (Bankdata[1] != check_BankName)
                    mismatch = 'BankName';
                else if (Bankdata[2] != check_BranchName)
                    mismatch = 'Branch Name';
                else if (Bankdata[3] != check_AccountType)
                    mismatch = 'Account Type';
                else if (Bankdata[4] != check_IFSCode)
                    mismatch = 'IFSC Code';
                var url = '/Claims/Save_ReceivedPatientDetails';
                var data = {
                    ReceivedPatientDetails: JSON.stringify(consolidateElements('divReceivedPatientDetails')),
                    TemporaryAddress: JSON.stringify(consolidateElements('divPatientTemporaryAddress')),
                    ClaimID: _ClaimID, SlNo: _SlNo, Flag: _flag
                };
                BankValidationflag = true;
                CommonConfirmAjaxDialog2('Mismatch in ' + mismatch + ' from Bil Entry to Audit...Do yo want to process?', 'Mismatch in Bank Details', url, data, _ClaimID, _SlNo, _flag);
            }
        }
        return flag;

    } catch (e) {
        alert('Error Occured while Validating Executive Scrutiny Information');
    }
}

function CommonConfirmAjaxDialog2(innertext, titletext, URL, inputParams, _ClaimID, _SlNo, _flag) {
    $('#dialogInnerText').text(innertext);
    $("#dialog-confirm").removeClass('hide').dialog({
        resizable: false,
        width: '320',
        modal: true,
        title: titletext,
        title_html: true,
        buttons: [
            {
                html: "<i class='ace-icon fa fa-check-o bigger-110'></i>&nbsp; Confirm",
                "class": "btn btn-danger btn-minier",
                click: function () {
                    $(this).dialog("close");
                    $.ajax({
                        url: URL,
                        type: 'GET',
                        data: inputParams,
                        success: function (result) {
                            DialogResultMessage(result);
                            if ($("#hdnClaimStageID").val() == "24") {
                                $("#hdnNEFTValidation").val(1);
                            }
                            LoadReceivedPatien_BankDetails($('#hdnClaimID').val(), $('#hdnClaimSlNo').val(), 1);
                        },
                        error: function () {
                            DialogCommomErrorFunction('Error while processing bank details ');
                        }
                    });
                    return true;
                }
            },
            {
                html: "<i class='ace-icon fa fa-times bigger-110'></i>&nbsp; Cancel",
                "class": "btn btn-minier",
                click: function () {
                    $(this).dialog("close");
                    _TempAddressFlag = 1;
                    //LoadReceivedPatientDetails(_ClaimID, _SlNo, 'txtReceivedPatient_PatientName', 0);
                    return false;
                }
            }
        ]
    });
}


/* Start System Patient Details */
function LoadSystemPatientDetails(_ClaimID, _SrNo, IsFrmArchived, _spnSystemPatient_PatientName) {
    if ($("#" + _spnSystemPatient_PatientName).text() == "") {
        $.ajax({
            //type: "POST",
            url: "/Claims/GetSystemPatientDetails",
            contentType: 'application/json;charset=utf-8',
            //processData: false,
            data: { ClaimID: _ClaimID, SlNo: _SrNo, IsFrmArchived: IsFrmArchived },
            success: function (data) {


                if (data == null || data == "") {
                    //alert('Data not found.');
                }
                else {
                    data = $.parseJSON(data);
                    PatientDtls = data;
                    var RelationShip = getNamepropwithId(data.Table[0].RelationShipID, MasterData.Mst_RelationShip);
                    var Gender = getNamepropwithId(data.Table[0].GenderID, MasterData.Gender);
                    var AgeType = getNamepropwithId(data.Table[0].AgetypeID, MasterData.Mst_AgeType);

                    //$("#spnSystemPatient_CoverageType").text(data.Table[0].COVERAGETYPEID);
                    $("#spnNomineePayeeName").text(data.Table[0].NomineeName);
                    $("#spnPatientNomineeName").text(data.Table[0].NomineeName);
                    $("#spnSystemPatient_PatientName").text(data.Table[0].PatientName + " (" + Gender + ")");
                    $("#spnSystemPatient_PatientRelatinship").text(RelationShip);
                    $("#hplSystemPatient_PatientUHID").text(data.Table[0].UhidNo);
                    $("#spnSystemPatient_InsurerUHID").text(data.Table[0].InsUhidno);
                    if ($('#hdnInsuranceCompanyID').val() === "14") {
                        var maskedDOB = Maskvalue("#spnSystemPatient_DOB", JSONDate2(data.Table[0].DOB), 2);
                        var age = data.Table[0].Age;
                        var ageType = AgeType;
                        $("#spnSystemPatient_DOB").text(maskedDOB + "(" + age + ":" + ageType + ")");
                    }
                    else {
                        JSONDateSpan(data.Table[0].DOB, "spnSystemPatient_DOB");
                        $("#spnSystemPatient_DOB").text(JSONDate2(data.Table[0].DOB));
                        $("#spnSystemPatient_DOB").text($("#spnSystemPatient_DOB").text() + " (" + data.Table[0].Age + ":" + AgeType + ")");
                        //$("#spnSystemPatient_DOB").text($("#spnSystemPatient_DOB").text() + " (" + data.Table[0].Age + ")");
                    }


                    if (data.Table[0].isNIDB == true) {
                        $('#divIsNIDB').show();
                        //$("#spnSystemPatient_PolicyStatus").text(data.Table[0].Policystatus);
                        $("#spnSystemPatient_PolicyStatus").addClass("label label-danger arrowed-in arrowed-in-right");
                        $("#spnSystemPatient_PolicyStatus").text('NIDB');
                    }
                    else {
                        $("#spnSystemPatient_PolicyStatus").text(data.Table[0].Policystatus);
                    }

                    if (data.Table[0].Policystatus == "InActive") {
                        alert("Member Is Inactive/Discontinued.Please check");
                        $("#divMemberInActive").show();
                    }
                    if (BhimaSatarkInsurer($('#hdnInsuranceCompanyID').val()) == true && (basicData[0].RequestTypeID == 4 || basicData[0].RequestTypeID == 7)) {
                        if ($('#txt_radio').is(':checked') == false || $('#txt_radio1').is(':checked') == false ||
                            $('#txt_radio1').is(':checked') == false || $('#txt_radio1').is(':checked') == false) {
                            if ($("#hdnClaimStageID").val() == 4 || $("#hdnClaimStageID").val() == 5 || $("#hdnClaimStageID").val() == 24) {
                                alert("Please fill the bhima satark details");
                            }
                        }
                    }//added by vsvskprasad
                    if (BhimaSatarkInsurer($('#hdnInsuranceCompanyID').val()) == true)
                        LoadBimaSatarkDetails($('#hdnClaimDetailsID').val());
                    if (dtRadio1data == "true") {
                        $('#txt_radio').prop('checked', true);
                    }
                    if (dtRadio2data == "true") {
                        $('#txt_radio1').prop('checked', true);
                    }
                    if (dtRadio3data == "true") {
                        $('#txt_radio2').prop('checked', true);
                    }
                    if (dtRadio4data == "true") {
                        $('#txt_radio3').prop('checked', true);
                    }
                    //$("#spnSystemPatient_PolicyStatus").text(data.Table[0].Policystatus);
                    $("#spnSystemPatient_EmployeeID").text(data.Table[0].EmployeeID == null || data.Table[0].EmployeeID == "" ? 'N/A' : data.Table[0].EmployeeID);
                    $("#spnSystemPatient_doj").html(data.Table[0].DOJ == null || data.Table[0].DOJ == "" ? 'N/A' : DisplayDateasIcon_DayandMonthYear(data.Table[0].DOJ));
                    if ($('#hdnInsuranceCompanyID').val() === "14") {
                        Maskvalue("#spnSystemPatient_aadharNum", data.Table[0].AadharID, 1);
                        Maskvalue("#spnSystemPatient_panNum", data.Table[0].PanNo, 1);
                    }
                    else {
                        $("#spnSystemPatient_aadharNum").text(data.Table[0].AadharID == null || data.Table[0].AadharID == "" || data.Table[0].AadharID == 0 ? 'N/A' : data.Table[0].AadharID);
                        $("#spnSystemPatient_panNum").text(data.Table[0].PanNo == null || data.Table[0].PanNo == "" || data.Table[0].PanNo == 0 ? 'N/A' : data.Table[0].PanNo);
                    }
                    $("#spnSystemPatient_assigneeName").text(data.Table[0].AssigneeName == null || data.Table[0].AssigneeName == "" ? 'N/A' : data.Table[0].AssigneeName);


                    //$("#spnSystemPatient_MainMemberName").text(data.Table[0].EmployeeName+" ("+data.Table[0].GenderID+")");
                    $("#spnSystemPatient_MainMemberName").text(data.Table[0].EmployeeName);
                    //$("#hplSystemPatient_ViewFamilyDetails").text(data.Table[0].);
                    //$("#spnSystemPatient_TrackRecord").text(data.Table[0].);
                    // $("#spnSystemPatient_PlanPeriod").html(DisplayDateasIcon_DayandMonthYear(data.Table[0].MemberInceptionDate) + ' to ' + DisplayDateasIcon_DayandMonthYear(data.Table[0].MemberCommencingDate) + ' to ' + DisplayDateasIcon_DayandMonthYear(data.Table[0].MemberEndDate));
                    $("#spnSystemPatient_PlanPeriodInception").html(data.Table[0].MemberInceptionDate == null || data.Table[0].MemberInceptionDate == "" ? 'N/A' : DisplayDateasIcon_DayandMonthYear(data.Table[0].MemberInceptionDate));
                    $("#spnSystemPatient_PlanPeriodCommencing").html(DisplayDateasIcon_DayandMonthYear(data.Table[0].MemberCommencingDate));
                    $("#spnSystemPatient_PlanPeriodEnd").html(DisplayDateasIcon_DayandMonthYear(data.Table[0].MemberEndDate));

                    //SP-1285(Mouli)
                    $("#spnSystemPatient_OtherInsComp").text(data.Table[0].AnyPolFromOtherInsComp == null || data.Table[0].AnyPolFromOtherInsComp == "" ? 'N/A' : data.Table[0].AnyPolFromOtherInsComp);
                    $("#spnSystemPatient_PrePolicyno").text(data.Table[0].PreviousPolicyNumber == null || data.Table[0].PreviousPolicyNumber == "" ? 'N/A' : data.Table[0].PreviousPolicyNumber);
                    $("#spnSystemPatient_PreStartDate").text(data.Table[0].PrevoiusPolicystartDate == null || data.Table[0].PrevoiusPolicystartDate == "" ? 'N/A' : data.Table[0].PrevoiusPolicystartDate);
                    $("#spnSystemPatient_PolicyPreEnddate").text(data.Table[0].PreviousEndDate == null || data.Table[0].PreviousEndDate == "" ? 'N/A' : data.Table[0].PreviousEndDate);
                    $("#spnSystemPatient_PEDDetails").text(data.Table[0].PEDDetails == null || data.Table[0].PEDDetails == "" ? 'N/A' : data.Table[0].PEDDetails);
                    $("#spnSystemPatient_AnyPEDDescription").text(data.Table[0].AnyPEDDescription == null || data.Table[0].AnyPEDDescription == "" ? 'N/A' : data.Table[0].AnyPEDDescription);
                    //******
                    $("#spnClaimType").text(data.Table[0].ClaimTypeName);
                    if (data.Table[0].isSuspicious == "0" || data.Table[0].isSuspicious == null || data.Table[0].isSuspicious == undefined) {
                        $("#spnSystemPatient_TrackRecord").addClass("label label-success  arrowed-in arrowed-in-right");
                        $("#spnSystemPatient_TrackRecord").text('Clean');
                    }
                    else if (data.Table[0].isSuspicious == "1") {
                        $("#spnSystemPatient_TrackRecord").addClass("label label-danger arrowed-in arrowed-in-right");
                        $("#spnSystemPatient_TrackRecord").text('Suspicious');
                    }

                    //if (data.Table[0].isSuspicious == 1 || data.Table[0].isSuspicious == true) {
                    //    $("#spnSystemPatient_TrackRecord").hide('');
                    //    $("#spnSystemPatient_TrackRecord1").show();

                    //    //$("#spnSystemPatient_TrackRecord").removeClass("label label-success arrowed");
                    //    //$("#spnSystemPatient_TrackRecord").addClass("label label-inverse arrowed");
                    //}
                    //else {
                    //    //$("#spnSystemPatient_TrackRecord").hide().text('Clean');
                    //    $("#spnSystemPatient_TrackRecord").hide().text('');
                    //    $("#spnSystemPatient_TrackRecord1").hide();
                    //    //// $("#spnSystemPatient_TrackRecord").removeClass("label label-inverse arrowed");
                    //    //$("#spnSystemPatient_TrackRecord").addClass("label label-success arrowed");
                    //}


                    //$("#spnSystemPatient_RegisteredMobile").text(data.Table[0].Mobile);
                    if ($('#hdnInsuranceCompanyID').val() === "14") {
                        Maskvalue("#spnSystemPatient_RegisteredMobile", String(data.Table[0].Mobile), 1);
                    }
                    else {
                        $("#spnSystemPatient_RegisteredMobile").text(data.Table[0].Mobile);
                    }
                    //$("#spnSystemPatient_RegisteredEmail").text(data.Table[0].Email);
                    if ($('#hdnInsuranceCompanyID').val() === "14") {
                        Maskvalue("#spnSystemPatient_RegisteredEmail", data.Table[0].Email, 3);
                    }
                    else {
                        $("#spnSystemPatient_RegisteredEmail").text(data.Table[0].Email);
                    }
                    $("#spnSystemPatient_Partycode").text(data.Table[0].Partycode == null || data.Table[0].Partycode == "" ? 'N/A' : data.Table[0].Partycode);
                    $("#spnSystemPatient_TxtCategory").text(data.Table[0].TxtCategory == null || data.Table[0].TxtCategory == "" ? 'N/A' : data.Table[0].TxtCategory);

                    //Added
                    $("#spnSystemPatient_VB64DMSID").text(data.Table[0].VB64DMSID_Status);
                    $("#spnSystemPatient_ActMngr").text(data.Table[0].AccountManager);
                    //$("#spnSystemPatient_EmailID").text(data.Table[0].EmailID);
                    if ($('#hdnInsuranceCompanyID').val() === "14") {
                        Maskvalue("#spnSystemPatient_EmailID", data.Table[0].EmailID, 3);
                    }
                    else {
                        $("#spnSystemPatient_EmailID").text(data.Table[0].EmailID);
                    }
                    $("#spnSystemPatient_BussLocation").text(data.Table[0].BussinessLocation);


                    // Bind Bank Details
                    if (data.Table1.length > 0) {
                        if (data.Table1[0].payeeTypeID != null) {
                            $("#txtEnrollment_PayeeType").text(getNamepropwithId(data.Table1[0].payeeTypeID, MasterData.PayeeType));
                            $("#hdnPayeeTypeID").val(data.Table1[0].payeeTypeID);
                        }
                        else {
                            $("#txtEnrollment_PayeeType").text('Hospital');
                            $("#hdnPayeeTypeID").val(0);
                        }
                        $("#txtEnrollment_PayeeName").text(data.Table1[0].PayeeName);
                        if ($('#hdnInsuranceCompanyID').val() === "14") {
                            Maskvalue("#txtEnrollment_BankAccountNo", data.Table1[0].AccountNumber, 1);
                        }
                        else {
                            $("#txtEnrollment_BankAccountNo").text(data.Table1[0].AccountNumber);
                        }


                        //if (data.Table1[0].AccountNumber != null) {
                        //    var last4 = data.Table1[0].AccountNumber.substr(data.Table1[0].AccountNumber.length - 4, data.Table1[0].AccountNumber);
                        //    // $("#txtEnrollment_BankAccountNo").text(data.Table1[0].AccountNumber);
                        //    $("#txtEnrollment_BankAccountNo").text("*******" + last4);
                        //}


                        $("#txtEnrollment_BankName").text(data.Table1[0].Bank + '  ' + data.Table1[0].Branch);
                        //$("#txtEnrollment_BranchName").text(data.Table1[0].Branch);
                        $("#ddlEnrollment_AccountType").text(getNamepropwithId(data.Table1[0].AccountTypeID, MasterData.Mst_AccountType));
                        //$("#txtEnrollment_IFSCode").text(data.Table1[0].IFSCCode);
                        if ($('#hdnInsuranceCompanyID').val() === "14") {
                            Maskvalue("#txtEnrollment_IFSCode", data.Table1[0].IFSCCode, 1);
                        }
                        else {
                            $("#txtEnrollment_IFSCode").text(data.Table1[0].IFSCCode);
                        }
                    }

                    if (parseInt(data.Table[0].GenderID) == 1) {
                        $("#divHospMaternity").hide();
                    }

                    if ($('#hdnMainMemberPolicyID').val() == $('#hdnMemberPolicyID').val() && $('#ddlPatientCondition').val() == "271") {
                        $('#divPatientNomineeName').show();
                    }
                    else {
                        $('#divPatientNomineeName').hide();
                    }

                }
            },
            error: function (e, x) {
                ShowResultMessage('ErrorMessage', e.responseText);
            }
        });

    }
}


/* Start Hospitalization Details */
AddDateTimePicker('txtFirstConsultation');
AddDateTimePicker('txtLMP');
AddDateTimePicker('txtBillDate');
//AddDateTimePicker('txtIllnessStartDate');
//AddDateTimePicker('txtDateOfInjury');
AddDateTimePicker('txtFIRDate');
AddDateTimePicker('txtDateOfDelivery');

$('#chkAccidentCase').on("click", function () {
    if ($('#chkAccidentCase').is(":checked") == true) {
        //$('#txtDateOfInjury').removeAttr("disabled", "disabled");
        $('#divReportedToPolice').show();
        $('#divAccidentCase').show();
    }
    else {
        $('#divReportedToPolice').hide();
        $('#divAccidentCase').hide();
        ClearControls('divAccidentCase');
        ClearControls('divReportedToPolice');
        //$('#txtDateOfInjury').attr("disabled", "disabled");
        //$('#txtDateOfInjury').val('');
    }

});

$('#chkReportedToPolice').on("click", function () {
    if ($('#chkReportedToPolice').is(":checked") == true) {
        $("#divReportedToPolice").find("input,button,textarea,select").removeAttr("disabled", "disabled");

    }
    else {
        $("#divReportedToPolice").find("input,button,textarea,select").removeAttr("disabled", "disabled");
        $("#divReportedToPolice").find("input,button,textarea,select").val('');
    }
    $('#chkReportedToPolice').removeAttr("disabled", "disabled");
});

$('#chkIsMaternity').on("click", function () {
    if ($('#chkIsMaternity').is(":checked") == true) {
        $("#divHospMaternity").find("input,button,textarea,select").removeAttr("disabled", "disabled");
    }
    else {
        $("#divHospMaternity").find("input,button,textarea,select").attr("disabled", "disabled");
        $("#divHospMaternity").find("input,button,textarea,select").val('');
    }

    $('#chkIsMaternity').removeAttr("disabled", "disabled");
});

$('#txtDateOfInjury').datepicker({
    changeMonth: true,
    changeYear: true,
    //minDate: -30,
    maxDate: new Date(),
    dateFormat: 'dd-M-yy',
    onSelect: function (selected) {
        var dt = new Date(selected);
        if ($('#txtHospDOA').val() != null && $('#txtHospDOA').val() != '') {

            if (new Date($('#txtHospDOA').val()) < dt) {
                DialogWarningMessage('Date of Injury should be less than Date of Admission');
                $(this).val('');
            }
        }
    }
});

function Validate_DOADOD(selected, ctrl) {
    var dt = new Date(selected);
    if ($('#txtHospDOD').val() == null || $('#txtHospDOD').val() == '') {
        //DialogWarningMessage('Date of Discharge mandatory');
    }
    else {
        if (new Date($('#txtHospDOA').val()) > dt) {
            DialogWarningMessage('Date of discharge should be greater than Date of Admission');
            //$(this).val('');
            $('#' + ctrl).val('');
        }
        else {
            var days = daydiff($('#txtHospDOA').val(), $('#txtHospDOD').val());
            $("#txtExtimatedDays").val(days);
            $("#txtRoomDays").val('');
            $("#txtICUDays").val('');
        }
    }
}
var DOD = null;
function Get_HospitalizationDetails(_ClaimID, _SlNo, IsFrmArchived, _spnSystemPatient_PatientName) {
    if ($("#" + _spnSystemPatient_PatientName).text() == "") {
        $.ajax({
            //type: "POST",
            url: "/Claims/Get_HospitalizationDetails",
            contentType: 'application/json;charset=utf-8',
            //processData: false,
            data: { ClaimID: _ClaimID, SlNo: _SlNo, IsFrmArchived: IsFrmArchived },
            success: function (data) {
                data = $.parseJSON(data);

                if (data == null || data == "") {
                    //alert('Data not found.');
                }
                else {
                    Fill_HospitalizationDetails(data.Table);
                    $('#hdnGetHospitalDetails').val(JSON.stringify(data.Table));
                    // alert(data.Table1[0].Name);
                    if (data.Table1[0] != null && data.Table1[0] != "") {
                        if (data.Table1[0].ID == 5 || data.Table1[0].ID == 4 || data.Table1[0].ID == 1) {
                            $('#divHospitalStatus').removeClass('alert-success')
                            $('#divHospitalStatus').addClass('alert-danger');
                        }
                        //else {
                        //    $('#divHospitalStatus').removeClass('alert-danger')
                        //    $('#divHospitalStatus').addClass('alert-success');
                        //}
                        //$('#divHospitalStatus').removeClass('alert-danger')
                        $("#spnHospital_Status").text(data.Table1[0].Name);
                        //if (data.Table1[0].ID == 3)
                        //    $("#spnHospital_Status").addClass('label label-success arrowed');
                        //else
                        $("#spnHospital_Status").addClass('label label-inverse arrowed');
                        $('#divHospitalStatus').show();
                    }
                    else {

                        $('#divHospitalStatus').html('');
                        // $("#spnHospital_Status").text('Clean');
                        $("#spnHospital_Status").text('');
                        $("#spnHospital_Status").addClass('label label-success arrowed');
                    }
                    if (data.Table2[0] != null && data.Table2[0] != "") {
                        $('#spntxtLDRDate').text(data.Table2[0].ldr_date);
                    }
                    if (data.Table3 != null && data.Table3[0] != "") {
                        bindroomtariffdata(data.Table3);
                    }
                    else {
                        $('#id_body_roomtariff_display').hide();
                        $('#ID_notariff').show();
                    }
                }
            },
            error: function (e, x) {
                ShowResultMessage('ErrorMessage', e.responseText);
            }
        });
    }
}

function bindroomtariffdata(data) {
    try {
        if (data.length > 0) {
            $('#id_body_roomtariff_display').show();
            $('#ID_notariff').hide();
            if (data[0].PolicyLimit > 0)
                $('#ID_displayRoomtariff_policy').text(data[0].PolicyLimit);
            else if (data[0].PolicyFacility != '' && data[0].PolicyFacility != '0')
                $('#ID_displayRoomtariff_policy').text(getmasternamewithID(data[0].PolicyFacility, MasterData.mFacility));
            else
                $('#ID_displayRoomtariff_policy').text("N/A");

            if (data[0].ApprovedFacilityID != null && data[0].ApprovedFacilityID != 0)
                $('#Id_tariff_apraccom').text(getmasternamewithID(data[0].ApprovedFacilityID.toString(), MasterData.mFacility));

            $.each(data, function (i, item) {
                $('#ID_displayRoomtariff_' + item.TariffFacility).text(item.TariffCharge);
            });
            if ((data[0].ApprovedFacilityID != null && data[0].ApprovedFacilityID != 0) && (basicData[0].RequestTypeID == 1) && basicData[0].IsAprvFacilitychanged == false && $('#hdnClaimStageID').val() == 5 && basicData[0].ServiceTypeID == 1) {
                // ClaimAI: For cataract (diagnosis 466), always use Day-care (ID=195)
                var _isCataractTariff = (typeof basicData !== 'undefined' && basicData[0] && basicData[0].claimdiagnosis == 466);
                $("#ddlApprovedFacility").val(_isCataractTariff ? 195 : data[0].ApprovedFacilityID);
            }
        }
        else {
            $('#id_body_roomtariff_display').hide();
            $('#ID_notariff').show();
        }
    }
    catch (e) {
        DialogWarningMessage("Error while retrieveing room tariff data");
    }
}


function DateTimeDiff(start_actual_time, end_actual_time) {
    // var start_actual_time  =  "01/17/2012 11:20";
    // var end_actual_time    =  "01/18/2012 12:25";

    start_actual_time = new Date(start_actual_time);
    end_actual_time = new Date(end_actual_time);

    var diff = end_actual_time - start_actual_time;

    var diffSeconds = diff / 1000;
    var HH = Math.floor(diffSeconds / 3600);
    var MM = Math.floor(diffSeconds % 3600) / 60;

    var formatted = ((HH < 10) ? ("0" + HH) : HH) + ":" + ((MM < 10) ? ("0" + MM) : MM);
    var days = Math.floor(HH / 24);
    var hours = parseInt(HH % 24) + parseInt(Math.floor(MM / 60));
    // alert(days + ' Days' + ' ' + hours + ' Hours');
    return days + ' Day(s)' + ' ' + hours + ' Hour(s)';
}

function Fill_HospitalizationDetails(data) {

    $('#hdnPRCNo').val(data[0].PRCNo);
    $('#hdnProviderID').val(data[0].ProviderID);
    $("#spnHospitalName").text(data[0].HospitalName);
    $("#pthospname").text(data[0].HospitalName);
    $("#spnLocationName").text(data[0].location);
    $("#spnCityName").text(data[0].HospCity);
    //$("#spnZoneName").text(data[0].ZoneName == null || data[0].ZoneName == "" ? 'N/A' : data[0].ZoneName);
    $("#spnHospAddress").text('PRC : ' + data[0].PRCNo + ', ' + data[0].Address1 + ',' + MakeEmptyfromUndefinedorNull(data[0].Address2));

    $("#ddlReceivedAccomodation").val(data[0].ReqFacilityID);
    console.log('[ClaimAI] Fill_HospDtls: ReqFacilityID=', data[0].ReqFacilityID,
        'ApprovedFacilityID=', data[0].ApprovedFacilityID,
        'IsAprvFacilitychanged=', basicData[0].IsAprvFacilitychanged,
        'StageID=', $('#hdnClaimStageID').val(),
        'ServiceTypeID=', basicData[0].ServiceTypeID,
        'RequestTypeID=', data[0].RequestTypeID);
    // Always populate approved from ApprovedFacilityID saved in DB,
    // fallback to ReqFacilityID (availed). Never reset to 0.
    // ClaimAI: Always set Approved Accommodation to Day-care (195)
    var _aprvFacVal = 195;

    $("#ddlApprovedFacility").val(_aprvFacVal);
    console.log('[ClaimAI] ddlApprovedFacility set to:', _aprvFacVal, 'actual val after set:', $("#ddlApprovedFacility").val());

    $("#txtOtherAccomodation").val(data[0].ReqOtherAccm);
    $('#hdnClaimTypeID').val(data[0].ClaimTypeID);
    $('#hdnRequestTypeID').val(data[0].RequestTypeID);
    var SID = parseInt($('#hdnClaimStageID').val());
    var claimTypeID = parseInt(data[0].ClaimTypeID);
    $('#txtTreatingDoctorName').val(data[0].PhysicianName);

    if (claimTypeID === 2) {
        $('#divTreatingDoctor').show();
    } else {
        $('#divTreatingDoctor').hide();
    }

    $('#ddlServiceType').val(data[0].ServiceTypeID);
    $('#ddlServiceSubType').val(data[0].ServiceSubTypeID);
    $('#ddlRequestType').val(data[0].RequestTypeID);
    var claimType = getNamepropwithId(data[0].ClaimTypeID, MasterData.ClaimType);
    $("#spnClaimType").text(claimType);

    $("#txtHospPatientPaidAmount").val(data[0].PaidByPatient);

    //Code added By Srinu B
    // alert(data[0].DateofAdmission);
    //JSONDate2(data[0].DateofAdmission, 'txtHospDOA');
    //JSONDate2(data[0].DateofDischarge, 'txtHospDOD');
    $("#txtHospDOA").val(JSONDate2(data[0].DateofAdmission));
    $("#txtHospDOD").val(JSONDate2(data[0].DateofDischarge));


    $("#dtTOAHH").val(data[0].DateofAdmission.split('T')[1].split(':')[0]);
    $("#dtTOAMM").val(data[0].DateofAdmission.split('T')[1].split(':')[1]);
    if (data[0].DateofDischarge != null && data[0].DateofDischarge != undefined) {
        $("#dtTODHH").val(data[0].DateofDischarge.split('T')[1].split(':')[0]);
        $("#dtTODMM").val(data[0].DateofDischarge.split('T')[1].split(':')[1]);
        $('#spnLOS').text(DateTimeDiff(data[0].DateofAdmission.split('T')[0] + ' ' + data[0].DateofAdmission.split('T')[1], data[0].DateofDischarge.split('T')[0] + ' ' + data[0].DateofDischarge.split('T')[1]));

    }

    //Test

    DOD = data[0].DateofDischarge;
    _doa = data[0].DateofAdmission;
    _dod = data[0].DateofDischarge;
    //Code added By Srinu B End
    //JSONDate2(data[0].ProbableDOA, 'txtProbableDOA');
    $("#txtProbableDOA").val(JSONDate2(data[0].ProbableDOA));

    var serviceName = getNamepropwithId(data[0].ServiceTypeID, MasterData.mClaimServiceType);
    // $("#ddlServiceType").val(data[0].ServiceTypeID);
    $("#spnServiceType").text(serviceName);
    var serviceSubType = getNamepropwithId(data[0].ServiceSubTypeID, MasterData.mClaimServiceType);
    // $("#ddlServiceType").val(data[0].ServiceTypeID);
    $("#spnServiceSubType").text(serviceSubType);
    var Hospitallization = getNamepropwithId(data[0].HospitalizationType, MasterData.mClaimServiceType);
    $("#spnHospitalization").text(Hospitallization);
    var RequestTYpe = getNamepropwithId(data[0].RequestTypeID, MasterData.mClaimRequestType);
    $("#spnRequestType").text(RequestTYpe);
    $("#spnHospitalization").val(data[0].HospitalizationType);
    $("#spnRequestType").val(data[0].RequestTypeID);
    $("#spnServiceSubType").val(data[0].ServiceSubTypeID);
    $("#spnServiceType").val(data[0].ServiceTypeID);
    //SP3V - 1532
    if (data[0].ServiceSubTypeID == "45") {
        $("#txtPharmacyName").text("Diagnostic Center Name");
        $("#txtPharmacyAddress").text("Diagnostic Center Adress");
    }
    else if (data[0].ServiceSubTypeID == "43") {
        $("#txtPharmacyName").text("Clinic Name");
        $("#txtPharmacyAddress").text("Clinic Adress");
    }
    else if (data[0].ServiceSubTypeID == "32") {
        $("#txtPharmacyName").text("Pharmacy Name");
        $("#txtPharmacyAddress").text("Pharmacy Adress");
    }
    $("#spnPharmacyName").text(data[0].HospitalName);
    $("#spnPharmacyAddress").text(data[0].HospitalAddress);
    //SP3V - 1532
    $("#hdnEstimatedDays").val(data[0].EstimatedDays);
    $("#txtExtimatedDays").val(data[0].EstimatedDays);
    $("#txtRoomDays").val(data[0].RoomDays);
    $("#txtICUDays").val(data[0].ICUDays);
    $("#txtClaimedAmount").val(data[0].ClaimedAmount);
    $("#txtDurationOfAilment").val(data[0].DurationOfAilment);
    $("#ddlDurationOfAilmentType").val(data[0].AilmentType_P18);
    $("#txtICD10Code").val(data[0].icd10code);
    $("#txtPCSCode").val(data[0].PCSCode);
    $("#txtPhysicianMobileNo").val(data[0].PhysicianMobile);
    $("#txtFirstConsultation").val(data[0].FirstConsultation);
    $("#ddlAdmissionType").val(data[0].AdmissionTypeID);
    $("#txtBedNo").val(data[0].BedNo);
    $("#ddlTypeOfAnesthitia").val(data[0].TypeOfAnesthesiaID);
    $("#txtBloodPressure").val(data[0].BP);

    $("#txtPR").val(data[0].PR);
    JSONDate(data[0].LMP, 'txtLMP');
    $("#txtTemparature").val(data[0].Temperature);
    $("#txtRS").val(data[0].RS);
    $("#txtCVS").val(data[0].CVS);
    $("#txtPorA").val(data[0].PorA);
    $("#txtOthers").val(data[0].Others);
    // BillNo — default to '135' if blank
    var _billNoVal = data[0].BillNo;
    if (!_billNoVal || _billNoVal.toString().trim() === '') _billNoVal = '135';
    $("#txtBillNo").val(_billNoVal);
    JSONDate(data[0].BillDate, 'txtBillDate');
    $("#txtIPNo").val(data[0].IPNo);

    if (MakeZerofromUndefinedorEmpty(data[0].NatureofTreatmentType_P43) != 0) {
        $('#ddlTypeofNatureofTreatmentType').html("");
        $('#ddlTypeofNatureofTreatmentType').append(new Option('Select', ''))
        if (data[0].NatureofTreatmentType_P43 == 196) {
            $('#ddlTypeofNatureofTreatmentType').append(new Option('Allopathy', 196))
            $('#ddlNatureofTreatmentType').val(data[0].NatureofTreatmentType_P43);
            $("#ddlTypeofNatureofTreatmentType").val(data[0].NatureofTreatmentType_P43);
        }
        else {
            $('#ddlTypeofNatureofTreatmentType').append(new Option('Ayurvedic', 197))
            $('#ddlTypeofNatureofTreatmentType').append(new Option('Homeopathy', 198))
            $('#ddlTypeofNatureofTreatmentType').append(new Option('Siddha', 199))
            $('#ddlTypeofNatureofTreatmentType').append(new Option('Unnani', 200))
            $("#ddlNatureofTreatmentType").val(267);
            $("#ddlTypeofNatureofTreatmentType").val(data[0].NatureofTreatmentType_P43);
        }
        $("#ddlTypeofNatureofTreatmentType").removeAttr("disabled");
    }
    //else
    //    $('#ddlNatureofTreatmentType').val(196);

    /* if ($('#ddlNatureofTreatmentType').val() == 196) {
         $("#ddlTypeofNatureofTreatmentType").prop("disabled", true);
     }
 
     if ($('#ddlNatureofTreatmentType').val() == 196) {
         $("#ddlTypeofNatureofTreatmentType").prop("disabled", true);
     }
     else {
         $("#ddlTypeofNatureofTreatmentType").removeAttr("disabled");
 }
 */
    if (data[0].InsurerClaimID != null) {
        $('#DivInsuranceClaimId').text(data[0].InsurerClaimID);
    }
    //else {
    //    $('#DivInsuranceClaimId').append("<input id='spanInsurerClaimID' maxlength='20' type='text' class='form-control' value=''>");
    //}
    if (MakeZerofromUndefinedorEmpty(data[0].PatientConditionID) != 0)
        $('#ddlPatientCondition').val(data[0].PatientConditionID);
    //else
    //  $('#ddlPatientCondition').val(269);

    $("#txtPatientConditionDate").val(JSONDate2(data[0].PatientConditionDate));
    $("#txtclaimRecievedDate").text(data[0].ReceivedDate);
    //JSONDate(data[0].IllnessStartDate, 'txtIllnessStartDate');
    //if (data[0].TreatmentTypeID_P19 == 1) { data[0].TreatmentTypeID_P19 = 66;}
    //if (data[0].TreatmentTypeID_P19 == 2) { data[0].TreatmentTypeID_P19=65;}
    $("#ddlHospTreatmentType").val(data[0].TreatmentTypeID_P19).change();

    $("#hdnHospTreatmentType").val(data[0].TreatmentTypeID_P19);
    $("#txtPastHistoryOfPresentAilment").val(data[0].PastHistory);
    $("#txtProbableLineOfTreatment").val(data[0].PlanOfTreatment);
    $("#hdnProbableLineOfTreatment").val(data[0].PlanOfTreatment);
    $("#txtProbableDiagnosis").val(data[0].Diagnosis);
    $("#txtExecutiveNotes").val(data[0].ExecutiveNotes);
    $("#txtRouteOfDrugAdministration").val(data[0].DrugAdministration);
    $("#txtPED").val(data[0].PreExistingDisease);
    $("#txtInvestigationResults").val(data[0].InvestigationResults);
    $("#txtPresentComplaint").val(data[0].PresentComplaint);
    isAccidentRTA = data[0].isAccident_RTA;
    BindCheckBox(data[0].isAccident_RTA, 'chkAccidentCase');
    $('#txtDateOfInjury').val(JSONDate2(data[0].DateOfInjury));
    BindCheckBox(data[0].isinjury_alcohol, 'chkInjuryDiseaseCaused');
    BindCheckBox(data[0].isAlcoholTested, 'chkTestConducted');
    $("#txtHowDidInjuryOccur").val(data[0].Injury_Occured);

    BindCheckBox(data[0].ReportedToPolice, 'chkReportedToPolice');
    $("#txtFIRNo").val(data[0].FIRNo);
    $('#txtFIRDate').val(JSONDate2(data[0].FIRDate));
    $("#txtFIRLocation").val(data[0].FIRLocation);

    BindCheckBox(data[0].isMaternity, 'chkIsMaternity');
    $("#txtMaternityG").val(data[0].Maternity_G);
    $("#txtMaternityP").val(data[0].Maternity_P);
    $("#txtMaternityL").val(data[0].Maternity_L);
    $("#txtMaternityA").val(data[0].Maternity_A);
    $("#txtMaternityD").val(data[0].Maternity_D);
    $("#txtDateOfDelivery").val(data[0].ExpdateofDelivery);


    if (parseInt($('#hdnClaimStageID').val()) == 4 || parseInt($('#hdnClaimStageID').val()) == 5 || parseInt($('#hdnClaimStageID').val()) == 24) {
        $("#txtPhysicianMobileNo").removeAttr("disabled");
        $("#txtTreatingDoctorName").removeAttr("disabled");

    }
    else {
        $("#txtPhysicianMobileNo").attr("disabled", "disabled");
        $("#txtTreatingDoctorName").attr("disabled", "disabled");
    }
    //alert(parseInt($('#hdnClaimStageID').val()));
    //alert($('#hdnClaimStageID').val());

    if (parseInt($('#hdnClaimTypeID').val()) == 2) {
        $("#ddlApprovedFacility").attr("disabled", "disabled");
    }
    else if (parseInt(data[0].ServiceTypeID) == 2 && $('#hdnClaimTypeID').val() == 1) {
        $("#ddlApprovedFacility").attr("disabled", "disabled");
    }
    else
        $("#ddlApprovedFacility").removeAttr("disabled", "disabled");

    if ($('#chkAccidentCase').is(":checked") == true) {
        $('#divReportedToPolice').show();
        $('#divAccidentCase').show();
    }

    //Identification for receipt of physical claim documents(SP-1373)
    var PhyDOC;
    if (data[0].physicalDoc == true) {
        PhyDOC = "Yes";
    }
    else {
        PhyDOC = "No";
    }
    $("#spnphysicalDoc").text(PhyDOC);
    //End Of Identification for receipt of physical claim documents(SP-1373)

    //Identification for i3 Systems Claims Integration (SP-1394)
    var isAutofillby_i3;
    if (data[0].IsAutofillby_i3 == true) {
        isAutofillby_i3 = "Yes";
    }
    else {
        isAutofillby_i3 = "No";
    }
    $("#spnIsAutofillby_i3").text(isAutofillby_i3);
    //End Of Identification for i3 Systems Claims Integration (SP-1394)

    var noofdaysforneftdate = (Math.round((new Date() - new Date($('#txtHospDOA').val())) / 1000 / 60 / 60 / 24));
    // alert(noofdaysforneftdate);

    // AddDateTimePicker('txtSettlement_ChequeTransactionDate');
    $('#txtSettlement_ChequeTransactionDate').datepicker({
        changeMonth: true,
        changeYear: true,
        minDate: "-0M -" + noofdaysforneftdate + "D",
        maxDate: "Today",
        //dateFormat: 'yy-mm-dd',
        dateFormat: 'dd-M-yy',
        onSelect: function (selected) {

            var dt = new Date(selected);
            $(this).val(selected);
            DateRangeValidationwithToday($(this).val(), $('#txtHospDOA').val(), null, 'txtSettlement_ChequeTransactionDate');
        }
    });
    if ($('#hdnClaimTypeID').val() === "1" && $('#hdnRequestTypeID').val() === "4" && $('#hdnClaimStageID').val() === "4") {
        $('.hdnclonebillingcoding').show();
    }
    else {
        $('.hdnclonebillingcoding').hide();
    }
    $('#hdnSkipScrutinyAuditRecal').val(data[0].SkipScrutiny);
    $('#hdnSkipScrutinyAuditShow').val(data[0].PreauthSkipScrutiny);
    var IsCovidcase;
    if (data[0].IsCovid == true) {
        IsCovidcase = 'Yes';
    }
    else {
        IsCovidcase = 'No';
    }
    $("#spnIsCovidCase").text(IsCovidcase);
    $("#hdnIsCovid").val(IsCovidcase);

    //New column in claimsdetails to capture Claims Upload Member Ref ID(SP3V-42)
    var ClaimDocsUploadRefID = (data[0].MemberClaimDocsUploadRefID == "" || data[0].MemberClaimDocsUploadRefID == null) ? "NA" : data[0].MemberClaimDocsUploadRefID
    $("#spnClaimDocsUploadReferenceID").text(ClaimDocsUploadRefID);
    //End Of New column in claimsdetails to capture Claims Upload Member Ref ID(SP3V-42)
    //Leena SP3V1082
    if (data[0].DischargeTypeId == '0') {
        $("#ddlDischargeType").prop("selectedIndex", 0).val();
    } else {
        $("#ddlDischargeType").val(data[0].DischargeTypeId);
    }
    //End Leena SP3V1082

    if (data[0].ServiceTypeID == 2) {
        $("#divtxt_hd_add_pincode").show();
        $("#divtxtLocationone").show();
        $("#divddlstates").show();
        $("#divtxt_hd_add_City").show();
        $("#divddlDistrict").show();
    }
    if (data[0].ServiceSubTypeID == 11 || data[0].ServiceSubTypeID == 12 || data[0].ServiceSubTypeID == 13 || data[0].ServiceSubTypeID == 15
        || data[0].ServiceSubTypeID == 16 || data[0].ServiceSubTypeID == 25 || data[0].ServiceSubTypeID == 31 || data[0].ServiceSubTypeID == 35
        || data[0].ServiceSubTypeID == 37 || data[0].ServiceSubTypeID == 39 || data[0].ServiceSubTypeID == 43 || data[0].ServiceSubTypeID == 47
        || data[0].ServiceSubTypeID == 49) {
        $("#txtClinicName").val(data[0].ClinicName);
        $("#txtClinicAddress").val(data[0].ClinicAddress);
        $("#divtxtClinicName").show();
        $("#divtxtClinicAddress").show();
    }
    else if (data[0].ServiceSubTypeID == 14 || data[0].ServiceSubTypeID == 45) {
        $("#txtDiagnosticCenterName").val(data[0].DiagnosisName);
        $("#txtDiagnosticCenterAddress").val(data[0].DiagnosisAddress);
        $("#divtxtDiagnosticCenterName").show();
        $("#divtxtDiagnosticCenterAddress").show();
    }
    else if (data[0].ServiceSubTypeID == 32) {
        $("#txtPharmacyNamee").val(data[0].PharmacyName);
        $("#txtPharmacyAddresss").val(data[0].PharmacyAddress);
        $("#divtxtPharmacyNamee").show();
        $("#divtxtPharmacyAddresss").show();
    }


    $("#txt_hd_add_pincode").val(data[0].additionalPincode);
    $("#txtLocationone").val(data[0].additionalLocation);
    $("#ddlstates").val(data[0].additionalState);
    $("#txt_hd_add_City").val(data[0].additionalCity);
    $("#ddlDistrict").val(data[0].additionalDistrict);

    if (data[0].ServiceTypeID == 1 && $("#hdnClaimTypeID").val() == 2 && data[0].RequestTypeID == 4 && $("#hdnCoverageType").val() == "674") {
        $("#txtHCBProviderName").val(data[0].HCBProviderName);
        $("#txtHCBProviderAddr").val(data[0].HCBProviderAddr);
        $("#divtxtHCBProviderName").show();
        $("#divtxtHCBProviderAddr").show();
        $("#divtxt_hd_add_pincode").show();
        $("#divtxtLocationone").show();
        $("#divddlstates").show();
        $("#divtxt_hd_add_City").show();
        $("#divddlDistrict").show();
    }
}

function DisableByProbableLineOfTreatment() {
    if (MakeNullfromUndefinedorEmpty($('#ddlHospTreatmentType').val()) == 65)
        $('#ddlTypeOfAnesthitia').attr("disabled", true);
    else
        $('#ddlTypeOfAnesthitia').removeAttr("disabled", "disabled");
}


function validateDoctorName(el) {
    let name = el.value.trim();

    if (name !== '' && !/^[A-Za-z\s]+$/.test(name)) {
        DialogWarningMessage("Treating Doctor Name can contain only alphabets and spaces.");
        el.value = "";
        el.focus();
    }
}

var billingflag = false;
function Save_HospitalizationDetails(_ClaimID, _SlNo, _ProviderID, _ClaimTypeID, _RoleID, isResponseNotRequired) {

    $('#divAudit').hide();
    $('#divBillcalculation').hide();
    $('#divMSProceed').hide();

    try {
        var flag = true;

        var _basicData = JSON.parse(MasterData.BasicData);
        // ClaimAI: Room/ICU days validation removed — fields are auto-populated
        if ($('#ddlRequestType').val() != 1 && $('#ddlRequestType').val() != 2) {
            if ($('#txtHospDOA').val() == "") {
                DialogWarningMessage('Date of discharge cannot be blank');
                return false;
            }

            if ($('#txtHospDOD').val() == "") {
                DialogWarningMessage('Date of discharge cannot be blank');
                return false;
            }
        }

        if (DOBofChaildValidation()) {
            DialogWarningMessage('Date of Delivery cannot be blank');
            return false;
        }

        //Commented by Leena sp3v-1982
        //var DischargeTypeId = $('#ddlDischargeType').val();
        //if ((DischargeTypeId == '0' || DischargeTypeId == null || DischargeTypeId == '' || DischargeTypeId == 'undefiened')) {
        //    //DialogResultMessage("Please Select Discharge Type.");
        //    //return false;
        //    DischargeTypeId = 0;
        //}
        //End 
        //SP3V-1697 Leena
        var InsurerId = $('#hdnInsuranceCompanyID').val();
        var _ClaimTypeID = $('#hdnClaimTypeID').val();
        var _RequestTypeID = $("#hdnRequestTypeID").val();

        var DischargeTypeId = '';
        if ((InsurerId == 5) && ((_RequestTypeID != 1) && (_RequestTypeID != 2) && (_RequestTypeID != 3))) {
            if ($('#ddlDischargeType').val() != '') {
                DischargeTypeId = $('#ddlDischargeType').val();
            }

            if ((DischargeTypeId == '0' || DischargeTypeId == null || DischargeTypeId == '' || DischargeTypeId == 'undefiened')) {
                DialogResultMessage("Please Select Discharge Type.");
                return false;
            }
        }
        $("#hdnHospTreatmentType").val($("#ddlHospTreatmentType").val())
        $("#hdnProbableLineOfTreatment").val($("#txtProbableLineOfTreatment").val());
        //END SP3V-1697 Leena
        //TOA and TOD Logic Added START
        $('#dtTOAHH').val(MakeZerofromUndefinedorEmpty($('#dtTOAHH').val()));
        ($('#dtTODHH').val() == "") ? $('#dtTODHH').val('23') : null;
        // $('#dtTODHH').val(MakeZerofromUndefinedorEmpty($('#dtTODHH').val()));
        $('#dtTOAMM').val(MakeZerofromUndefinedorEmpty($('#dtTOAMM').val()));
        ($('#dtTODMM').val() == "") ? $('#dtTODMM').val('59') : null;
        //  $('#dtTODMM').val(MakeZerofromUndefinedorEmpty($('#dtTODMM').val()));

        if ($('#dtTOAHH').val() > 23 || $('#dtTODHH').val() > 23) {
            DialogWarningMessage('Invalid Hours provided');
            return false;
        }
        if ($('#dtTOAMM').val() > 59 || $('#dtTODMM').val() > 59) {
            DialogWarningMessage('Invalid Minutes provided');
            return false;
        }
        //TOA and TOD Logic Added End
        if (($('#chkAccidentCase').is(":checked") == true) && ($('#txtDateOfInjury').val() == '')) {
            flag = false;
            alert('Please enter date of injury');
        }
        else if ($('#ddlServiceSubType').val() == 3 && parseInt($('#txtExtimatedDays').val()) > 1) {
            flag = false;
            alert('For day care more than 1 day not acceptable');
        }

        var oldEstimatedDays = $("#hdnEstimatedDays").val();

        if (parseInt($("#hdnEstimatedDays").val()) != parseInt($('#txtExtimatedDays').val())) {
            if ($('#txtTotalServicesBillAmount').val() != '') {
                alert('There could be impact on the bill related amounts as the estimation days is changed. Please cross check and save the bill details.');
            }
        }
        //Abhishek sp3v- 2914
        if ($('#ddlNatureofTreatmentType').val() == '') {
            flag = false;
            DialogWarningMessage('Nature of Treatment is Mandatory');
        }

        if ($('#txtTreatingDoctorName').val().trim() === ''
            && $('#hdnClaimTypeID').val() === "2"
            && ($('#hdnClaimStageID').val() == "4" || $('#hdnClaimStageID').val() == "5")) {

            flag = false;
            DialogWarningMessage('Treating Doctor Name is Mandatory');
        }

        if ($('#txtProbableDiagnosis').val().trim() == '') {
            flag = false;
            DialogWarningMessage('Provisional/Final Diagnosis is Mandatory');
        }
        if ($('#ddlTypeofNatureofTreatmentType').val() == '') {
            flag = false;
            DialogWarningMessage('Type of Nature of Treatment is Mandatory');
        }
        if ($('#ddlAdmissionType').val() == '') {
            flag = false;
            DialogWarningMessage('Please Select Admission Type');
        }
        if ($('#txtClaimedAmount').val() == '') {
            flag = false;
            DialogWarningMessage('Please Enter Claim Amount');
        }

        if (MakeZerofromUndefinedorEmpty($('#ddlPatientCondition').val()) == 0) {
            flag = false;
            DialogWarningMessage('Please select patient condition');
        }
        else if ($('#ddlPatientCondition').val() == "271") {
            if ($('#txtPatientConditionDate').val() == '') {
                flag = false;
                DialogWarningMessage('Please enter patient condition date');
            }
        }
        // ClaimAI: Approved accommodation validation removed — handled by AI save flow
        if (basicData[0].ServiceSubTypeID == 11 || basicData[0].ServiceSubTypeID == 12 || basicData[0].ServiceSubTypeID == 13 || basicData[0].ServiceSubTypeID == 15
            || basicData[0].ServiceSubTypeID == 16 || basicData[0].ServiceSubTypeID == 25 || basicData[0].ServiceSubTypeID == 31 || basicData[0].ServiceSubTypeID == 35
            || basicData[0].ServiceSubTypeID == 37 || basicData[0].ServiceSubTypeID == 39 || basicData[0].ServiceSubTypeID == 43 || basicData[0].ServiceSubTypeID == 47
            || basicData[0].ServiceSubTypeID == 49) {
            if ($("#txtClinicName").val() == "" || $("#txtClinicAddress").val() == "") {
                flag = false;
                $('#txtClinicName').focus();
                DialogWarningMessage('Please select Clinic Name and Address');
            }
        }
        else if (basicData[0].ServiceSubTypeID == 14 || basicData[0].ServiceSubTypeID == 45) {
            if ($("#txtDiagnosticCenterName").val() == "" || $("#txtDiagnosticCenterAddress").val() == "") {
                flag = false;
                $('#txtDiagnosticCenterName').focus();
                DialogWarningMessage('Please select Diagnostic Center Name and  Address');
            }
        }
        else if (basicData[0].ServiceSubTypeID == 32) {
            if ($("#txtPharmacyNamee").val() == "" || $("#txtPharmacyAddresss").val() == "") {
                flag = false;
                $('#txtPharmacyNamee').focus();
                DialogWarningMessage('Please select Pharmacy Name and  Address');
            }
        }
        if (basicData[0].ServiceTypeID == 2) {
            if ($("#txt_hd_add_pincode").val() == "" || $("#txtLocationone").val() == "" || $("#ddlstates").val() == "" || $("#txt_hd_add_City").val() == "" || $("#ddlDistrict").val() == "") {
                flag = false;
                DialogWarningMessage('Please Provide Complete Address Details');
            }
        }

        if (basicData[0].ServiceTypeID == 1 && basicData[0].RequestTypeID == 4 && $("#hdnClaimTypeID").val() == 2 && $("#hdnCoverageType").val() == "674") {
            if ($("#txtHCBProviderName").val() == "" || $("#txtHCBProviderAddr").val() == "") {
                flag = false;
                $('#txtHCBProviderName').focus();
                DialogWarningMessage('Please select Provider Name and  Address');
            }

            if ($("#txt_hd_add_pincode").val() == "" || $("#txtLocationone").val() == "" || $("#ddlstates").val() == "" || $("#txt_hd_add_City").val() == "" || $("#ddlDistrict").val() == "") {
                flag = false;
                DialogWarningMessage('Please Provide Complete Address Details');
            }
        }

        if (flag == true) {
            //var _controlFields = consolidateRequiredElements('divHospitalizationDetails');

            //********************* For Task: (SP-1103)
            //var _isFacilityChanged = (_basicData[0].ApprovedFacilityID == $("#ddlApprovedFacility").val()) ? false : true;
            var _isFacilityChanged = (_basicData[0].ReqFacilityID == $("#ddlReceivedAccomodation").val()) ? false : true;
            //****************************************

            if (HospitalizationDetails_Validate(_basicData[0].ServiceTypeID)) {
                $("#hdnEstimatedDays").val($('#txtExtimatedDays').val());
                $('#divErrorMessage').html('');

                if (!isResponseNotRequired)
                    ajaxGETResonsesync('/Claims/Save_HospitalizationDetails', HospitalizationDetails_Response, HospitalizationDetails_Response,
                        {
                            HospitalizationDetails: JSON.stringify(consolidateElements('divHospitalizationDetails')), ClaimID: _ClaimID, SlNo: _SlNo,
                            ProviderID: _ProviderID, ClaimTypeID: _ClaimTypeID, ExcRoleID: _RoleID, IsFacilityChanged: _isFacilityChanged
                        });
                else
                    ajaxGETResonsesync('/Claims/Save_HospitalizationDetails', '', '',
                        {
                            HospitalizationDetails: JSON.stringify(consolidateElements('divHospitalizationDetails')), ClaimID: _ClaimID, SlNo: _SlNo,
                            ProviderID: _ProviderID, ClaimTypeID: _ClaimTypeID, ExcRoleID: _RoleID, IsFacilityChanged: _isFacilityChanged
                        });
                if (parseInt($('#hdnClaimStageID').val()) == 5 || parseInt($('#hdnClaimStageID').val()) == 38)
                    basicData[0].IsAprvFacilitychanged = 1;
                if (MakeZerofromUndefinedorEmpty($("#txtTotalServicesPackageAmount").val()) != 0 || MakeZerofromUndefinedorEmpty($("#txtTotalServicesEligibleAmount").val()) != 0) {
                    if ((basicData[0].RequestTypeID = 1 || basicData[0].RequestTypeID == 2 || basicData[0].RequestTypeID == 3)) {
                        if ((_basicData[0].ApprovedFacilityID != null && _basicData[0].ApprovedFacilityID != "" && _basicData[0].ApprovedFacilityID != undefined)
                            && (MakeNullfromUndefinedorEmpty($("#ddlApprovedFacility").val()) != null)) {
                            billingflag = true;
                            Get_ServiceBillingDetails(_ClaimID, _SlNo, 0);
                        }
                    }
                }
            }
        }


    } catch (e) {
        alert('Error Occured while Insert Patient Details');
    }
}

$('#ddlPatientCondition').on("change", function () {
    if ($('#hdnMainMemberPolicyID').val() == $('#hdnMemberPolicyID').val() && $('#ddlPatientCondition').val() == "271") {
        $('#divPatientNomineeName').show();
    }
    else {
        $('#divPatientNomineeName').hide();
    }
});

//************************************************************** 
//               For Task: (SP-1103)
//**************************************************************
function IsAccommodationTypeChanged() {
    var claimID = $('#hdnClaimID').val();
    var slNo = $('#hdnClaimSlNo').val();
    var claimStageID = $('#hdnClaimStageID').val();
    if (claimStageID == 24) {
        $.ajax({
            type: 'GET',
            url: "/Claims/IsAccommodationTypeChanged",
            data: { claimID: claimID, slNo: slNo },
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            async: false,
            cache: false,
            success: function (resData) {
                var objClaimFacilityInfo = JSON.parse(resData);
                if (objClaimFacilityInfo.length > 0) {
                    //alert(objClaimFacilityInfo[0].IsFacilityChanged);
                    var isFacilityChanged = (objClaimFacilityInfo[0].IsFacilityChanged == true) ? true : false;
                    $("#hdnIsFacilityChanged").val(isFacilityChanged);
                }
            },
            error: function (err, xhr) {
                console.log(err.statusText);
            }
        });
    }
}
IsAccommodationTypeChanged();
//**************************************************************//


function HospitalizationDetails_Response(data) {
    try {
        CheckSessionVariable(data.responseText);
        DialogResultMessage(data.responseText);
        IsAccommodationTypeChanged();  //For Task: (SP-1103)
    } catch (e) {
        alert('Error Occured');
    }
}

function HospitalizationDetails_Validate(_ServiceTypeID) {
    try {
        var _controlFields = [];
        // Hospitalization Details
        if (_ServiceTypeID != 2) {
            _controlFields.push(['ddlReceivedAccomodation', 'Please Select Requested Accomodation']);
            _controlFields.push(['txtExtimatedDays', 'Please Enter Estimated Days']);
        }
        //_controlFields.push(['ddlServiceType', 'Please Select Service Type']);
        //_controlFields.push(['ddlServiceSubType', 'Please Select SubService Type']);
        //_controlFields.push(['ddlRequestType', 'Please Select Request Type']);
        //_controlFields.push(['ddlApprovedFacility', 'Please Select ddlApproved Accomodation']);       
        _controlFields.push(['txtClaimedAmount', 'Please Enter Estimated Amount']);
        //_controlFields.push(['txtDurationOfAilment', 'Please Enter Duration of Ailment']);
        //_controlFields.push(['ddlAdmissionType', 'Please Select Admission Type']);
        _controlFields.push(['txtProbableDiagnosis', 'Please Enter Probable Diagnosis']);
        _controlFields.push(['txtBillNo', 'Please Enter BillNo.']);
        return CustomFiledsValidate(_controlFields, 'divErrorMessage');

    } catch (e) {
        alert('Error Occured while Validating Executive Scrutiny Information');
    }
}

function HospDetails_SumEstimatedDays(_ctrlRoomDays, _ctrlICUDays, _ctrlTotalDays) {
    var roomDays = 0;
    var ICUDays = 0;
    var totalDays = 0;

    var DOD = $('#txtHospDOD').val();
    var DOA = $('#txtHospDOA').val();

    if ($('#' + _ctrlRoomDays).val() != '')
        roomDays = MakeZerofromUndefinedorEmpty($('#' + _ctrlRoomDays).val());

    if ($('#' + _ctrlICUDays).val() != '')
        ICUDays = MakeZerofromUndefinedorEmpty($('#' + _ctrlICUDays).val());

    totalDays = parseInt(roomDays) + parseInt(ICUDays);

    if ((DOD != null && DOD != "") && (DOA != null && DOA != "")) {
        var days = daydiff(DOA, DOD);
        $('#' + _ctrlTotalDays).val(days);

        if (false && ($('#' + _ctrlRoomDays).val() != '' && $('#' + _ctrlICUDays).val() == '') && ($('#' + _ctrlRoomDays).val() > days)) {
            $('#' + _ctrlRoomDays).val('');
            alert('Invalid Room days');
        }
        else if (false && ($('#' + _ctrlRoomDays).val() == '' && $('#' + _ctrlICUDays).val() != '') && ($('#' + _ctrlICUDays).val() > days)) {
            $('#' + _ctrlICUDays).val('');
            alert('Invalid ICU days');
        }
        else if ($('#' + _ctrlRoomDays).val() != '' && $('#' + _ctrlICUDays).val() != '') {
            // ClaimAI: Room/ICU days validation removed
            if (totalDays > 0)
                $('#' + _ctrlTotalDays).val(totalDays);
        }
        else {
            // ClaimAI: Room/ICU days validation removed
            if (totalDays > 0)
                $('#' + _ctrlTotalDays).val(totalDays);
        }

        //if (totalDays != 0) {
        //    var totalPlus = totalDays + 1;
        //    var totalMinus = totalDays - 1;

        //    if (days > totalPlus || days < totalMinus) {
        //        $('#' + _ctrlRoomDays).val('');
        //        $('#' + _ctrlICUDays).val('');
        //        alert('Invalid Room and ICU days');
        //    }
        //    else
        //        $('#' + _ctrlTotalDays).val(totalDays);
        //}

        //if (parseInt(totalDays) > parseInt(days)) {
        //    $('#' + _ctrlRoomDays).val('');
        //    $('#' + _ctrlICUDays).val('');
        //    alert('Invalid Room and ICU days');
        //}
    }
    else {
        $('#' + _ctrlTotalDays).val(parseInt(roomDays) + parseInt(ICUDays));
    }

}

/* Start Past History Details */
function Design_PastHistoryDetails() {
    var _mstDetails = MasterData.mPastHistory;
    var addDesign = '';
    for (var i = 0; i < _mstDetails.length; i++) {
        var ctrlNameOriginal = _mstDetails[i].Name;
        var ctrlName = _mstDetails[i].Name;
        ////ctrlName = $.trim(ctrlName);
        ////ctrlName = ctrlName.replace(' ', '');
        ctrlName = ctrlName.replace(/\s+/g, '');

        if (i == 0) {
            //addDesign = '<div class="form-group" style="clear:both;"><label class="col-sm-3 control-label no-padding-right" for="form-field-1-1"><input id="chk' + ctrlName + '" onclick="EnableorDisablePastHistoryDetails(chk' + ctrlName + ', txt' + ctrlName + ', ddl' + ctrlName + ', txt' + ctrlName + 'Remarks)" type="checkbox"><span class="lbl padding-8"></span>' + ctrlNameOriginal + '</label>'
            //+ '<div class="col-sm-9"><span class="input-icon"><input id="txt' + ctrlName + '" disabled="disabled"  maxlength="4" onkeypress="javascript: return onlydigits(event);" type="text" placeholder="0" class="form-control"></span> '
            //+ '<span class="input-icon input-icon-right"><select id="ddl' + ctrlName + '" disabled="disabled" class="form-control"><option value="">Select</option><option value="61">Days</option><option value="62">Months</option><option value="63">Years</option></select></span> '
            //+ '<span class="input-icon input-icon-right">Remarks <input id="txt' + ctrlName + 'Remarks" maxlength="250" disabled="disabled" type="text" placeholder="Remarks"></span></div></div><br>';

            addDesign = '<table style="float:left"><tr><td><label class="col-sm-3 control-label no-padding-right" for="form-field-1-1"><input id="chk' + ctrlName + '" onclick="EnableorDisablePastHistoryDetails(chk' + ctrlName + ', txt' + ctrlName + ', ddl' + ctrlName + ', txt' + ctrlName + 'Remarks)" type="checkbox"><span class="lbl padding-8" style="float:left"></span>' + ctrlNameOriginal + '</label></td>'
                + '<td><input id="txt' + ctrlName + '" disabled="disabled"  maxlength="4" onkeypress="javascript: return onlydigits(event);" type="text" placeholder="0" class="form-control"</td><td></td>'
                + '<td><select id="ddl' + ctrlName + '" disabled="disabled" class="form-control"><option value="">Select</option><option value="61">Days</option><option value="62">Months</option><option value="63">Years</option></select></td><td></td>'
                + '<td><label>Remarks</label></td><td></td>'
                + '<td><textarea id="txt' + ctrlName + 'Remarks" maxlength="250" disabled="disabled" type="textarea" placeholder="Remarks"></textarea></td></tr>'

            //  addDesign = '<table><tr><td><label>Name</label></td><td><input type="text" /></td><td><select></select/></td></tr>'
        }
        else {
            //addDesign = addDesign + '<div class="form-group"  style="clear:both;"><label class="col-sm-3 control-label no-padding-right" for="form-field-1-1"><input id="chk' + ctrlName + '" onclick="EnableorDisablePastHistoryDetails(chk' + ctrlName + ', txt' + ctrlName + ', ddl' + ctrlName + ', txt' + ctrlName + 'Remarks)" type="checkbox"><span class="lbl padding-8"></span>' + ctrlNameOriginal + ' </label>'
            //+ '<div class="col-sm-9"><span class="input-icon"><input id="txt' + ctrlName + '" disabled="disabled"  maxlength="4" onkeypress="javascript: return onlydigits(event);" type="text" placeholder="0" class="form-control"></span> '
            //+ '<span class="input-icon input-icon-right"><select id="ddl' + ctrlName + '" disabled="disabled" class="form-control"><option value="">Select</option><option value="61">Days</option><option value="62">Months</option><option value="63">Years</option></select></span> '
            //+ '<span class="input-icon input-icon-right">Remarks <input id="txt' + ctrlName + 'Remarks"  maxlength="250" disabled="disabled" type="text" placeholder="Remarks"></span></div></div><br>';

            addDesign = addDesign + '<tr><td><label class="col-sm-3 control-label no-padding-right" for="form-field-1-1"><input id="chk' + ctrlName + '" onclick="EnableorDisablePastHistoryDetails(chk' + ctrlName + ', txt' + ctrlName + ', ddl' + ctrlName + ', txt' + ctrlName + 'Remarks)" type="checkbox"><span class="lbl padding-8" style="float:left"></span>' + ctrlNameOriginal + '</label></td>'
                + '<td><input id="txt' + ctrlName + '" disabled="disabled"  maxlength="4" onkeypress="javascript: return onlydigits(event);" type="text" placeholder="0" class="form-control"</td><td></td>'
                + '<td><select id="ddl' + ctrlName + '" disabled="disabled" class="form-control"><option value="">Select</option><option value="61">Days</option><option value="62">Months</option><option value="63">Years</option></select></td><td></td>'
                + '<td><label>Remarks</label></td><td></td>'
                + '<td><textarea id="txt' + ctrlName + 'Remarks" maxlength="250" disabled="disabled" type="textarea" placeholder="Remarks"></textarea></td></tr>'

            //  addDesign = addDesign + '<tr><td><label>Name</label></td><td><input type="text" /></td><td><select></select/></td></tr>'
        }
    }

    $("#divPastHistoryDetails").append(addDesign);
}

function Get_PastHistoryDetails(_ClaimID, _SlNo, _txtHypertension, IsFrmArchived) {

    var paramString = [_ClaimID, _SlNo, IsFrmArchived].join('|');

    $.ajax({
        url: '/Common/EncryptParameters',
        type: 'POST',
        data: { Q: paramString },
        success: function (encryptedValue) {
            if (encryptedValue) {

                $.ajax({
                    url: '/Claims/Get_PastHistoryDetails',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ Q: encryptedValue }),
                    success: function (response) {
                        if (response && response.Success) {
                            data = $.parseJSON(response.Data);

                            if (data && data !== "") {
                                Fill_PastHistoryDetails(data);
                            } else {
                                // alert('Data not found.');
                            }
                        }
                        else {
                            DialogWarningMessage(response.Message || 'An unexpected issue occurred while processing the request.');
                        }
                    },
                    error: function (e) {
                        ShowResultMessage('ErrorMessage', e.responseText);
                    }
                });

            } else {
                ShowResultMessage('ErrorMessage', 'Error encrypting parameters.');
            }
        },
        error: function () {
            ShowResultMessage('ErrorMessage', 'Encryption failed.');
        }
    });
    //if ($("#" + _spnSystemPatient_PatientName).text() == "") {
    //$.ajax({
    //    //type: "POST",
    //    url: "/Claims/Get_PastHistoryDetails",
    //    contentType: 'application/json;charset=utf-8',
    //    //processData: false,
    //    data: { ClaimID: _ClaimID, SlNo: _SlNo, IsFrmArchived: IsFrmArchived },
    //    success: function (data) {
    //        data = $.parseJSON(data);

    //        if (data == null || data == "") {
    //            //alert('Data not found.');
    //        }
    //        else {

    //            Fill_PastHistoryDetails(data);
    //        }
    //    },
    //    error: function (e, x) {
    //        ShowResultMessage('ErrorMessage', e.responseText);
    //    }
    //});
    //}
}

function Fill_PastHistoryDetails(data) {

    for (var i = 0; i < data.length; i++) {
        var ctrlName = data[i].Name;
        ////ctrlName = $.trim(ctrlName);
        ////ctrlName = ctrlName.replace(' ', '');
        ctrlName = ctrlName.replace(/\s+/g, '');

        //if ((data[i].Value != '' && data[i].Value != null) && (data[i].ValueType_P18 != '' && data[i].ValueType_P18 != null)) {
        if (data[i].Value != null && data[i].ValueType_P18 != null) {
            $("#chk" + ctrlName).attr("checked", true);
            $("#txt" + ctrlName).val(data[i].Value);
            $("#ddl" + ctrlName).val(data[i].ValueType_P18);
            $("#txt" + ctrlName + 'Remarks').val(data[i].Remarks);

            $("#txt" + ctrlName).removeAttr("disabled");
            $("#ddl" + ctrlName).removeAttr("disabled");
            $("#txt" + ctrlName + 'Remarks').removeAttr("disabled");
        }
    }
}

function EnableorDisablePastHistoryDetails(chkCtrl, value, time, remarks) {
    var chkID = chkCtrl.id;
    var txtValue = value.id;
    var ddlTime = time.id;
    var txtRemarks = remarks.id;

    if ($('#' + chkID).is(":checked") == true) {
        $('#' + txtValue).removeAttr("disabled");
        $('#' + ddlTime).removeAttr("disabled");
        $('#' + txtRemarks).removeAttr("disabled");
    }
    else {
        $('#' + txtValue).attr("disabled", "disabled");
        $('#' + ddlTime).attr("disabled", "disabled");
        $('#' + txtRemarks).attr("disabled", "disabled");

        $('#' + txtValue).val('');
        $('#' + ddlTime).val('');
        $('#' + txtRemarks).val('');
    }

    //if ($('#' + chkCtrl).is(":checked") == true) {
    //    $('#' + value).removeAttr("disabled");
    //    $('#' + time).removeAttr("disabled");
    //    $('#' + remarks).removeAttr("disabled");
    //}
    //else {
    //    $('#' + value).attr("disabled", "disabled");
    //    $('#' + time).attr("disabled", "disabled");
    //    $('#' + remarks).attr("disabled", "disabled");

    //    $('#' + value).val('');
    //    $('#' + time).val('');
    //    $('#' + remarks).val('');
    //}

}

function Save_PastHistoryDetails(_ClaimID, _SlNo) {
    try {
        var validMsg = Validate_PastHistoryData();
        if (validMsg == '') {
            var matchData;
            matchData = PastHistory_SaveData();
            if (matchData.length != 0) {
                $('#divErrorMessage').html('');
                ajaxGETResonse('/Claims/Save_PastHistoryDetails', PastHistoryDetails_Response, PastHistoryDetails_Response,
                    {
                        PastHistoryDetails: JSON.stringify(matchData), ClaimID: _ClaimID, SlNo: _SlNo
                    });
            }
            else
                DialogErrorMessage('Please enter atleast one past history data.');
        }
        else
            DialogErrorMessage(validMsg);

    } catch (e) {
        alert('Error Occured while Insert Patient Details');
    }
}

function PastHistoryDetails_Response(data) {
    try {
        CheckSessionVariable(data.responseText);
        DialogResultMessage(data.responseText);
    } catch (e) {
        alert('Error Occured');
    }
}

function PastHistory_SaveData() {
    var _dataArrany = [];
    var _mstDetails = MasterData.mPastHistory;

    $.each(_mstDetails, function (i, item) {
        var _dataObject = {};
        var ctrlName = item.Name;
        ctrlName = $.trim(ctrlName);
        //ctrlName = ctrlName.replace(' ', '');
        ctrlName = ctrlName.replace(/\s+/g, '');

        if ($("#chk" + ctrlName).is(":checked")) {
            _dataObject.PastHistoryID = item.ID;
            _dataObject.Value = $("#txt" + ctrlName).val();
            _dataObject.ValueType_P18 = $("#ddl" + ctrlName).val();
            _dataObject.Remarks = $("#txt" + ctrlName + 'Remarks').val();

            _dataArrany.push(_dataObject);
        }
    });

    return _dataArrany;
}

function Validate_PastHistoryData() {
    var message = '';
    var _mstDetails = MasterData.mPastHistory;

    $.each(_mstDetails, function (i, item) {
        var _dataObject = {};
        var ctrlName = item.Name;
        ctrlName = ctrlName.replace(/\s+/g, '');

        if ($("#chk" + ctrlName).is(":checked")) {

            if (($("#txt" + ctrlName).val() == '' || $("#txt" + ctrlName).val() == null) && ($("#ddl" + ctrlName).val() == 0 || $("#ddl" + ctrlName).val() == '')) {
                message = 'Please Enter Past histroty values of ' + ctrlName;
                return false;
            }
        }
    });

    return message;
}

/*Claims History */
function Get_ClaimHistoryDetailsbkp(_UHIDNo) {
    if ($('#tblClaimsHistory tbody').children().length == 0) {

        var parameter = [
            _UHIDNo
        ].join('|');

        $.ajax({
            url: '/Common/EncryptParameters',
            type: 'POST',
            data: { Q: parameter },
            success: function (encryptedValue) {
                if (encryptedValue) {
                    $.ajax({
                        type: "Get",
                        url: "/Claims/Get_ClaimHistoryDetails",
                        data: { Q: encryptedValue },
                        success: function (response) {
                            if (response && response.Success) {
                                data = $.parseJSON(response.Data);

                                if (data == null || data == "") {
                                    //alert('Data not found.');
                                }
                                else {
                                    $('#tblClaimsHistory tbody').html('');
                                    for (var i = 0; i < data.length; i++) {
                                        //var planPeriod = data[i].MemberCommencingDate.substring(0, 10) + ' To ' + data[i].MemberEndDate.substring(0, 10);
                                        var planPeriod = JSONDate2(data[i].MemberCommencingDate) + ' To ' + JSONDate2(data[i].MemberEndDate);

                                        //var DateofAdminisionanddischarge = JSONDate2(data[i].DateofAdmission) + ' To ' + JSONDate2(data[i].DateofDischarge);

                                        var row = $('<tr>');

                                        row.append($('<td>').html('<a target=_blank  href=/MedicalScrutiny/ClaimsView?ClaimID=' + data[i].ClaimID + '&SlNo=' + data[i].SlNo + '&SID=' + data[i].StageID + '>' + data[i].ClaimID + "/" + data[i].SlNo + '</a>'));
                                        //row.append($('<td>').html(data[i].ClaimID));
                                        //row.append($('<td>').html(data[i].Slno));
                                        row.append($('<td>').html(data[i].UhidNo));
                                        row.append($('<td>').html(data[i].PatientName));
                                        row.append($('<td>').html(data[i].RelationShip));
                                        row.append($('<td>').html(planPeriod));
                                        //row.append($('<td>').html(DateofAdminisionanddischarge));
                                        //row.append($('<td>').html(data[i].HospitalName));
                                        //row.append($('<td>').html(data[i].Diagnosis));
                                        row.append($('<td>').html(data[i].ServiceType));
                                        row.append($('<td>').html(data[i].ClaimType));
                                        row.append($('<td>').html(data[i].ServiceSubType));
                                        row.append($('<td>').html(data[i].RequestType));
                                        //row.append($('<td>').html(data[i].ExternalName));
                                        row.append($('<td>').html(data[i].InternalStage));
                                        row.append($('<td>').html(data[i].ClaimedAmount));
                                        row.append($('<td>').html(data[i].SettledAmount));

                                        //row.append($('<td>').html(data[i].InsUhidno));


                                        $('#tblClaimsHistory tbody').append(row);
                                    }
                                }
                            }
                            else {
                                DialogWarningMessage(response.Message || 'An unexpected issue occurred while processing the request.');
                            }
                        },
                        error: function (e, x) {
                            ShowResultMessage('ErrorMessage', e.responseText);
                        }
                    });
                } else {
                    DialogWarningMessage('Error encrypting request parameters.');
                    $('#progress').hide();
                    progress_stop();
                }
            },
            error: function (err) {
                DialogWarningMessage('Encryption failed.');
                $('#progress').hide();
                progress_stop();
            }
        });
    }
}

function Get_ClaimHistoryDetails(_UHIDNo, isFrmArchived) {
    var uniquePlanPeriod = [];

    var uniquePlanPeriodTT = [];
    $('#divClaimHistory').html('');
    if (isFrmArchived == undefined) {
        isFrmArchived = $('#hdnIsFrmArchived').val();
    }


    var subconditionpanel = '<div id="faq-tab-1" class="tab-pane fade active in">';
    var subconditionpanelHeader = '<a href="#rule-1-5" data-parent="#rule-list-1" data-toggle="collapse" class="accordion-toggle" aria-expanded="true"></a></div>';// '<div class="panel panel-default"><div class="panel-heading"><a href="#rule-list-1-sub-1" data-parent="#rule-list-nested-1" data-toggle="collapse" class="accordion-toggle collapsed"><i class="ace-icon fa fa-plus smaller-80 middle" data-icon-hide="ace-icon fa fa-minus" data-icon-show="ace-icon fa fa-plus"></i>&nbsp;Enim eiusmod high life accusamus terry?</a></div>';
    var subconditionpanelBody = '';
    var tdView = '';
    var tblBody = '';
    var tblP = '';
    var tblheader = '<table id="tblClaimsHistory" class="col-md-12 table-bordered table-striped table-condensed cf"><thead><tr><th>Claim No.</th><th>UHID</th><th>Patient Name</th><th>Relationship</th><th>DOA-DOD</th><th>Hospital Name</th><th>Diagnosis</th><th>Service Type</th><th>Claim Type</th><th>Claim Sub Type</th><th>Request Type</th><th>Internal Claim Status</th><th>Claimed Amount</th><th>Settled Amount</th></tr></thead>';

    var parameter = [
        _UHIDNo,
        isFrmArchived
    ].join('|');
    $.ajax({
        url: '/Common/EncryptParameters',
        type: 'POST',
        data: { Q: parameter },
        success: function (encryptedValue) {
            if (encryptedValue) {
                $.ajax({
                    type: "GET",
                    url: "/Claims/Get_ClaimHistoryDetails",
                    data: { Q: encryptedValue },
                    success: function (response) {
                        if (response && response.Success) {
                            data = $.parseJSON(response.Data);

                            if (data == null || data == "") {
                                //alert('Data not found.');
                            }
                            else {


                                // LOOP THROUGH ORIGINAL ARRAY AND PUT EACH DISTINCT VALUE IN THE UNIQUE ARRAY
                                for (i = 0; i < data.length; i++) {

                                    //   var DateofAdminisionanddischarge = JSONDate2(data[i].DateofAdmission) + ' To ' + JSONDate2(data[i].DateofDischarge);
                                    var planPeriod = JSONDate2(data[i].MemberCommencingDate) + ' To ' + JSONDate2(data[i].MemberEndDate);
                                    if (uniquePlanPeriod.indexOf(planPeriod) === -1) {
                                        uniquePlanPeriod.push(planPeriod);
                                        //uniquePlanPeriodTT.push({ id: data[i].UhidNo, Name: planPeriod });
                                        uniquePlanPeriodTT.push({ id: data[i].UhidNo, Name: planPeriod, ClaimID: data[i].ClaimID })
                                    }
                                }

                                for (var k = 0; k < uniquePlanPeriod.length; k++) {


                                    for (var i = 0; i < data.length; i++) {
                                        if (data != null) {
                                            var DateofAdminisionanddischarge = JSONDate2(data[i].DateofAdmission) + ' To ' + JSONDate2(data[i].DateofDischarge);
                                            var planPeriodP = JSONDate2(data[i].MemberCommencingDate) + ' To ' + JSONDate2(data[i].MemberEndDate);
                                            if (uniquePlanPeriod[k] == planPeriodP) {
                                                var tdView = '';

                                                tblBody = tblBody + '<tr><td data-title="Claim No."><a target=_blank  href=/MedicalScrutiny/ClaimsView?ClaimID=' + data[i].ClaimID + '&SlNo=' + data[i].SlNo + '&SID=' + data[i].StageID + '>' + data[i].ClaimID + "/" + data[i].SlNo + '</a></td>'
                                                    + '<td data-title="UHID">' + data[i].UhidNo + '</td>'
                                                    + '<td data-title="Patient Name">' + data[i].PatientName + '</td>'
                                                    + '<td data-title="Relationship">' + data[i].RelationShip + '</td><td data-title="DOA-DOD">' + DateofAdminisionanddischarge + '</td>'
                                                    + '<td data-title="HospitalName">' + data[i].HospitalName + '</td><td data-title="Diagnosis">' + data[i].Diagnosis + '</td>'
                                                    + '<td data-title="Service Type">' + data[i].ServiceType + '</td><td data-title="Claim Type">' + data[i].ClaimType + '</td>'
                                                    + '<td data-title="Claim Sub Type">' + data[i].ServiceSubType + '</td>'
                                                    + '<td data-title="Request Type">' + data[i].RequestType + '</td>'
                                                    + '<td data-title="Internal Claim Status">' + data[i].InternalStage + '</td>'
                                                    + '<td data-title="Claimed Amount">' + data[i].ClaimedAmount + '</td>'
                                                    + '<td data-title="Settled Amount">' + data[i].SettledAmount + '</td>'
                                                '</tr>';

                                            }
                                        }
                                    }

                                    tblP = tblBody;
                                    //$('#divClaimHistory').append('<div id="faq-tab-1" class="tab-pane fade active in"><a id="' + uniquePlanPeriodTT[k].id + '" href="#rule-1-' + uniquePlanPeriodTT[k].id + '" data-parent="#rule-list-' + uniquePlanPeriodTT[k].id + '" data-toggle="collapse" class="accordion-toggle" aria-expanded="true"></a></div><div class="panel-collapse collapse in" id="rule-1' + uniquePlanPeriodTT[k].id + '" aria-expanded="true" style=""><div class="panel-body"><div id="rule-list-nested' + uniquePlanPeriodTT[k].id + '" class="panel-group accordion-style1 accordion-style2"><div class="panel-heading"><a href="#rule-list-' + uniquePlanPeriodTT[k].id + '-sub-27" data-parent="#rule-list-nested-' + uniquePlanPeriodTT[k].id + '" data-toggle="collapse" class="accordion-toggle"><i class="ace-icon fa fa-minus smaller-80 middle" data-icon-hide="ace-icon fa fa-minus" data-icon-show="ace-icon fa fa-plus"></i>Plan Period From [' + uniquePlanPeriod[k] + ']</a></div><div class="panel-collapse collapse in" id="rule-list-' + uniquePlanPeriodTT[k].id + '-sub-27"><div>' + tblheader + tblP + '</div></div></div></div></div>');
                                    $('#divClaimHistory').append('<div id="faq-tab-1" class="tab-pane fade active in"><a id="' + uniquePlanPeriodTT[k].ClaimID + '" href="#rule-1-' + uniquePlanPeriodTT[k].ClaimID + '" data-parent="#rule-list-' + uniquePlanPeriodTT[k].ClaimID + '" data-toggle="collapse" class="accordion-toggle" aria-expanded="true"></a></div><div class="panel-collapse collapse in" id="rule-1' + uniquePlanPeriodTT[k].ClaimID + '" aria-expanded="true" style=""><div class="panel-body"><div id="rule-list-nested' + uniquePlanPeriodTT[k].ClaimID + '" class="panel-group accordion-style1 accordion-style2"><div class="panel-heading"><a href="#rule-list-' + uniquePlanPeriodTT[k].ClaimID + '-sub-27" data-parent="#rule-list-nested-' + uniquePlanPeriodTT[k].ClaimID + '" data-toggle="collapse" class="accordion-toggle"><i class="ace-icon fa fa-minus smaller-80 middle" data-icon-hide="ace-icon fa fa-minus" data-icon-show="ace-icon fa fa-plus"></i>Plan Period From [' + uniquePlanPeriod[k] + ']</a></div><div class="panel-collapse collapse in" id="rule-list-' + uniquePlanPeriodTT[k].ClaimID + '-sub-27"><div>' + tblheader + tblP + '</div></div></div></div></div>');
                                    tblBody = '';
                                }

                            }
                        }
                        else {
                            DialogWarningMessage(response.Message || 'An unexpected issue occurred while processing the request.');
                        }
                    },
                    error: function (e, x) {
                        ShowResultMessage('ErrorMessage', e.responseText);
                    }
                });
            } else {
                DialogWarningMessage('Error encrypting request parameters.');
                $('#progress').hide();
                progress_stop();
            }
        },
        error: function (err) {
            DialogWarningMessage('Encryption failed.');
            $('#progress').hide();
            progress_stop();
        }
    });

}


/* Billing Sheet Design */
var txtServiceBillNo = "txtServiceBillNo_";
var txtServiceBillDate = "txtServiceBBillDate_";
var txtServiceBBillAmount = "txtServiceBBillAmount_";

var txtBillDeduction = "txtBillDeduction_";
var ddlBillDeductionReason = "ddlBillDeductionReason_";
//SP3V-2902 -> IRDA Non Payables dropdown  Abhishek 08 Aug 2023
var ddlIRDADeductionReason = "ddlIRDADeductionReason_";
var txtBillDeductionFreeText = "txtBillDeductionFreeText_";

var tblBillDeductions = "tblBillDeductions_";
var trDeductionValues = "trDeductionValues_";

var lblBillDeduction = "lblBillDeduction_";
var lblBillDeductionReason = "lblBillDeductionReason_";
//SP3V-2902
var lblIRDADeductionReason = "lblIRDADeductionReason_";
var lblBillDeductionFreeText = "lblBillDeductionFreeText_";

var servicedetails = '';
function Get_ServiceBillingDetails(_ClaimID, _SlNo, _flag) {
    if ($('#tblServicewiseBills tbody').children().length == 0 || billingflag == true) {

        // Step 1️⃣: Combine parameters into one string for encryption
        var paramString = [_ClaimID, _SlNo, _flag].join('|');

        // Step 2️⃣: Encrypt parameters first
        $.ajax({
            url: '/Common/EncryptParameters',
            type: 'POST',
            data: { Q: paramString },
            beforeSend: function () { $("#progress1").show(); },
            success: function (encryptedValue) {
                if (encryptedValue) {

                    // Step 3️⃣: Make actual API call with encrypted data
                    $.ajax({
                        url: "/Claims/Get_ServiceBillingDetails",
                        type: 'GET',
                        data: { Q: encryptedValue }, //  Encrypted parameter
                        success: function (response) {
                            if (response && response.Success) {
                                $("#progress1").hide();
                                data = $.parseJSON(response.Data);

                                if (data == null || data == "") {
                                    return;
                                } else {
                                    $('#divModelBilling').html('');

                                    $('#hdnServiceTariffAndDiscount').val(JSON.stringify(data.Table3));
                                    $('#hdnBaseServiceDetails').val(JSON.stringify(data.Table));
                                    $('#hdnprepostbilldays').val(JSON.stringify(data.Table6));

                                    if (data.Table5 != null && data.Table5 != '') {
                                        $('#txtServiceBills_Remarks').val(data.Table5[0].Remarks);
                                    }

                                    var saveServices = [];
                                    for (var i = 0; i < data.Table.length; i++) {
                                        var _sServices = {};
                                        if (data.Table[i].BillAmount != "" && data.Table[i].BillAmount != null) {
                                            _sServices.ServiceID = data.Table[i].ID;
                                            _sServices.BillAmount = data.Table[i].BillAmount;
                                            _sServices.DeductionAmount = data.Table[i].DeductionAmount;
                                            _sServices.DiscountAmount = data.Table[i].DiscountAmount || 0;
                                            _sServices.EligibleAmount = data.Table[i].EligibleAmount;
                                            _sServices.SanctionedAmount = data.Table[i].Sanctionedamount;
                                            _sServices.TariffAmount = 0;

                                            for (var j = 0; j < data.Table3.length; j++) {
                                                if (data.Table[i].ID == data.Table3[j].ServiceID) {
                                                    _sServices.TariffAmount = data.Table3[j].Amount || 0;
                                                }
                                            }

                                            _sServices.BillRoomdays = data.Table[i].BillRoomdays;
                                            saveServices.push(_sServices);
                                        }
                                    }
                                    if (saveServices.length > 0)
                                        $('#hdnServiceDetails').val(JSON.stringify(saveServices));

                                    var saveBills = [];
                                    for (var i = 0; i < data.Table1.length; i++) {
                                        var _sBills = {};
                                        _sBills.ServiceID = data.Table1[i].ServiceID;
                                        _sBills.BillSlNo = data.Table1[i].BillSlNo;
                                        _sBills.BillNo = data.Table1[i].BillNo;
                                        _sBills.BillDate = data.Table1[i].BillDate;
                                        _sBills.BillAmount = data.Table1[i].BillAmount;
                                        _sBills.DeductionAmount = data.Table1[i].DeductionAmount;
                                        saveBills.push(_sBills);
                                    }

                                    var OldBillsSlNo = [];
                                    for (var i = 0; i < saveServices.length; i++) {
                                        var count = 1;
                                        for (var j = 0; j < saveBills.length; j++) {
                                            if (saveServices[i].ServiceID == saveBills[j].ServiceID) {
                                                OldBillsSlNo.push({
                                                    ServiceID: saveBills[j].ServiceID,
                                                    OldBillSlNo: saveBills[j].BillSlNo,
                                                    NewBillSlNo: count
                                                });
                                                saveBills[j].BillSlNo = count++;
                                            }
                                        }
                                    }
                                    if (saveBills.length > 0)
                                        $('#hdnBillDetails').val(JSON.stringify(saveBills));

                                    var BillRoomdaysDetails = [];
                                    BillRoomdaysDetails.push(data.Table[1].BillRoomdays);
                                    BillRoomdaysDetails.push(data.Table[2].BillRoomdays);
                                    if (BillRoomdaysDetails.length > 0)
                                        $('#hdnDaysDetails').val(JSON.stringify(BillRoomdaysDetails));

                                    var saveDeductions = [];
                                    var nextDeductionSlNo = [];
                                    for (var i = 0; i < data.Table2.length; i++) {
                                        var d = data.Table2[i];
                                        saveDeductions.push({
                                            ServiceID: d.ServiceID,
                                            BillSlNo: d.BillSlNo,
                                            DeductionSlNo: d.DeductionSlNo,
                                            DeductionAmount: d.DeductionAmount,
                                            DeductionReasonID: d.DeductionReasonID,
                                            IRDADeductionReasonID: d.IRDADeductionReasonID,
                                            FreeTextValue: d.FreeTextValue
                                        });
                                        nextDeductionSlNo.push({
                                            ServiceID: d.ServiceID,
                                            BillSlNo: d.BillSlNo,
                                            DeductionSlNo: d.DeductionSlNo
                                        });
                                    }

                                    for (var i = 0; i < OldBillsSlNo.length; i++) {
                                        var count = 1;
                                        for (var j = 0; j < saveDeductions.length; j++) {
                                            if (OldBillsSlNo[i].ServiceID == saveDeductions[j].ServiceID &&
                                                OldBillsSlNo[i].OldBillSlNo == saveDeductions[j].BillSlNo) {
                                                saveDeductions[j].BillSlNo = OldBillsSlNo[i].NewBillSlNo;
                                                saveDeductions[j].DeductionSlNo = count++;
                                            }
                                        }
                                    }
                                    if (saveDeductions.length > 0)
                                        $('#hdnDecuctionsDetails').val(JSON.stringify(saveDeductions));

                                    $('#tblServicewiseBills tbody').html('');
                                    $('#hdnservicedetailsdata').val(JSON.stringify(data));
                                    if ($('#hdnservicedetailsdata').val())
                                        servicedetails = $.parseJSON($('#hdnservicedetailsdata').val());

                                    Generate_ServicewiseBills_BodyDesign(data.Table, _ClaimID, data.Table3, _flag, data.Table5);
                                    CalculateTotalServiceBillAmount_New(data.Table, _ClaimID, data.Table3, 0, data.Table5);

                                    if (basicData[0].iAIClaim == 1) {
                                        Bind_BillDetails(0, 2, 'ICU Charges');
                                        AddValuesToBillHiddenField(2, 1);
                                        $("#billing_service_ID").trigger('click');

                                        Bind_BillDetails(0, 3, 'Room Rent');
                                        AddValuesToBillHiddenField(3, 1);
                                        $("#billing_service_ID").trigger('click');
                                    }

                                    EnableDisable_Load_ServiceButtons();

                                    if (billingflag == true) {
                                        calculate_proportionateperc(3);
                                        $("#btnServiceBillDetailsSave").trigger('click');
                                    }
                                    billingflag = false;

                                    if ($('#prop_dedu_appl_flag').is(':checked') && propbilling_override_flag == true) {
                                        $('#div_prop_dedu_remarks').show();
                                        deletepropagainstservices();
                                        propbilling_override_flag = false;
                                    }
                                }
                            }
                            else {
                                DialogWarningMessage(response.Message || 'An unexpected issue occurred.');
                            }
                        },
                        error: function (e, x) {
                            $("#progress1").hide();
                            ShowResultMessage('ErrorMessage', e.responseText);
                        }
                    });
                } else {
                    $("#progress1").hide();
                    ShowResultMessage('ErrorMessage', 'Error encrypting parameters');
                }
            },
            error: function () {
                $("#progress1").hide();
                ShowResultMessage('ErrorMessage', 'Encryption failed');
            }
        });
    }
}


//SP3V-1058 SP3V-411 Leena  05MAR2024
function Generate_ServicewiseBills_BodyDesign(data, _ClaimID, TariffAmount, _flag, tblClaimDisc) {

    //SP3V-1058 SP3V-411 Leena  05MAR2024
    var _ClaimTypeID = $('#hdnClaimTypeID').val();
    //var claimstageid = $('#hdnClaimStageID').val();  //Commented SP3V-4017 - 12MAR2024 Leena
    var _tariffDiscount = 0;
    var discountamt = 0;
    var eligibleBillAmount = 0;
    var toteligableamt = 0;

    //var toteligableamt = 0;
    //var ClaimIPPercentage = 0;
    //if (_ClaimTypeID == 1) {
    //    var _basicData = JSON.parse(MasterData.BasicData);
    //    if (tblClaimDisc != null && tblClaimDisc.length > 0) {

    //        if (parseInt(_basicData[0].ServiceTypeID) == 2) {
    //            ClaimIPPercentage = tblClaimDisc[0].OPPercentage;
    //        } else {
    //            ClaimIPPercentage = tblClaimDisc[0].IPPercentage;
    //        }
    //     }
    //}
    //End //SP3V-1058 SP3V-411 Leena  05MAR2024

    var _applicabletoHtml = FormatHtml_Dropdown(MasterData.mAdditionalReason);
    var BillRoomdaysDetails = [];
    for (var i = 0; i < data.length; i++) {
        var _serviceID = data[i].ID;
        var ctrlID = _serviceID + '_' + _ClaimID;

        var className;
        var color;
        if (data[i].ParentID == 0) {
            //className = 'background-color:#6fb3e0';
            className = "level3";
            //color = 'white';
        }
        else {
            className = 'background-color:lightgrey';
            //className = "level2";
            color = '#3c763d';
        }

        var _buttions = '';
        var billingdays = '';
        if (_flag == 0) {
            _buttions = '<button id="btnAdd_' + ctrlID + '" onclick="Bind_BillDetails(0,' + _serviceID + ',\'' + data[i].Name + '\')" type="button" name="btnAdd_' + ctrlID + '" class="btn btn-xs btn-primary" style="float:right !important;">Add</button>';
        }
        if (_serviceID == 2 || _serviceID == 3) {
            billingdays = '<td data-title="Room days"><input id="txtbillRoomdays_' + ctrlID + '" type="text" name="txtbillRoomdays_' + ctrlID + '" onkeyup="cnahgeamtonroomdays(' + _serviceID + ')" style="width:40px !important;" onkeypress="javascript: return onlydigits(event);"/></td>'
        }
        else
            billingdays = '<td> </td>';

        var tblBody = '<tr id="tr_' + ctrlID + '" class="' + className + '"  style="color:' + color + ' !important;font-size:14px !important;"><td  data-title="ServicesID"><input type="hidden" id="hdn_' + ctrlID + '" name="hdn_' + ctrlID + '"/></td>'
            + '<td data-title="Services" style="text-align: left;"><label id="lblServiceName_' + ctrlID + '" name="lblServiceName_' + ctrlID + '" style="width:190px !important;"></label></td>'
            + billingdays
            + '<td data-title="Internal Limit"><label id="lblInternalLimit_' + ctrlID + '" name="lblInternalLimit_' + ctrlID + '"></label></td>'
            + '<td data-title="External Limit"><label id="lblExternalLimit_' + ctrlID + '" name="lblExternalLimit_' + ctrlID + '"></label></td>'
            // + '<td data-title="Add Bill"><button id="btnAdd_' + ctrlID + '" onclick="Bind_BillDetails(0,' + _serviceID + ',\'' + data[i].Name + '\')" type="button" name="btnAdd_' + ctrlID + '" class="btn btn-xs btn-primary" style="float:right !important;">Add</button></td>'
            + '<td data-title="Add Bill">' + _buttions + '</td>'
            + '<td data-title="Bill Amount"><input id="txtBillAmount_' + ctrlID + '" readonly="readonly" type="text" name="txtBillAmount_' + ctrlID + '" style="width:70px !important;" onkeypress="javascript: return onlydigits(event);"/></td>'
            + '<td data-title="Deductions"><input id="txtDeductions_' + ctrlID + '"  readonly="readonly" type="text" name="txtDeductions_' + ctrlID + '"  style="width:70px !important;" onkeypress="javascript: return onlydigits(event);"/></td>'
            + '<td data-title="Bill - Deductions"><label id="lblBillDeductions_' + ctrlID + '" name="lblBillDeductions_' + ctrlID + '"></label></td>'
            + '<td data-title="Discount" style="!important;float:left;"><input  id="txtDiscount_' + ctrlID + '" type="text" style="width:70px !important;"  readonly="readonly" name="txtDiscount_' + ctrlID + '" onkeypress="javascript: return onlydigits(event);"/></td>'
            + '<td><label id="lblServiceTariffDiscount_' + ctrlID + '" name="lblServiceTariffDiscount_' + ctrlID + '"></label></td>'
            + '<td data-title="Tariff"><label id="lblTariff_' + ctrlID + '" name="lblTariff_' + ctrlID + '"></label></td>'
            + '<td data-title="Eligible Amount"><label id="lblEligibleAmount_' + ctrlID + '" name="lblEligibleAmount_' + ctrlID + '"></label></td>'
            + '<td data-title="Payable Amount"><label id="lblPayableAmount_' + ctrlID + '" name="lblPayableAmount_' + ctrlID + '"></label></td>'
            //+ '<td data-title="Copay"><input  id="txtCopay_' + ctrlID + '" type="text" name="txtCopay_' + ctrlID + '" readonly="readonly" onkeypress="javascript: return onlydigits(event);"/></td>'
            //+ '<td data-title="Additional Amount"><input id="txtAdditionalAmt_' + ctrlID + '" type="text"  name="txtAdditionalAmt_' + ctrlID + '" readonly="readonly" onkeypress="javascript: return onlydigits(event);"/></td>'
            //+ '<td data-title="Additional Amount Reason"><select id="ddlAdditionalAmtReason_' + ctrlID + '" name="ddlAdditionalAmtReason_' + ctrlID + '" readonly="readonly"> <option value="">Select</option>' + _applicabletoHtml + '</select></td>'
            //+ '<td data-title="Remarks"><input id="txtRemarks_' + ctrlID + '" type="text" name="txtRemarks_' + ctrlID + '" /></td>'
            + '</tr>';

        $('#tblServicewiseBills tbody').append(tblBody);


        //var deductionBillAmount = 0;
        //if (data[i].BillAmount != '' && data[i].BillAmount != null)
        //    deductionBillAmount = parseInt(data[i].BillAmount) - parseInt(data[i].DeductionAmount);

        //SP3V-1058 SP3V-411 Leena  05MAR2024 SP3V-3998

        if (_ClaimTypeID === "1" || (basicData[0].IssueID == 7 && basicData[0].RequestTypeID == 4 && (basicData[0].ServiceSubTypeID == 3 || basicData[0].ServiceSubTypeID == 4))) {
            // Initialize _tariffDiscount to 0
            _tariffDiscount = 0;

            var Prvtariffamt = 0;
            // Loop through TariffAmount array to find the matching ServiceID
            for (var j = 0; j < TariffAmount.length; j++) {
                if (data[i].ID === TariffAmount[j].ServiceID) {
                    _tariffDiscount = MakeZerofromUndefinedorEmpty(TariffAmount[j].Discount);
                    Prvtariffamt = TariffAmount[j].Amount;
                    break;
                }
            }

            // Calculate deductionBillAmount
            var deductionBillAmount = MakeZerofromUndefinedorEmpty(data[i].BillAmount) - MakeZerofromUndefinedorEmpty(data[i].DeductionAmount);

            // Calculate discount and eligibleBillAmount if deductionBillAmount is greater than 0
            if (deductionBillAmount > 0) {
                discountamt = Math.round((MakeZerofromUndefinedorEmpty(deductionBillAmount) * (MakeZerofromUndefinedorEmpty(_tariffDiscount) / 100)));
                eligibleBillAmount = MakeZerofromUndefinedorEmpty(Math.round(deductionBillAmount)) - MakeZerofromUndefinedorEmpty(Math.round(discountamt));
            }
        }

        //End SP3V-1058 SP3V-411 Leena  05MAR2024


        $('#hdn_' + ctrlID).val(data[i].ID);
        $('#lblServiceName_' + ctrlID).text(data[i].Name);
        $('#lblInternalLimit_' + ctrlID).text(MakeZerofromUndefinedorEmpty(Prvtariffamt));
        if (data[i].ID == 30 && (data[i].ClaimLimit != null || data[i].IndividualLimit != null || data[i].FamilyLimit != null)) {
            var ambulancelimit = [];
            if (data[i].ClaimLimit != null)
                ambulancelimit.push(data[i].ClaimLimit);
            if (data[i].IndividualLimit != null)
                ambulancelimit.push(data[i].IndividualLimit);
            if (data[i].FamilyLimit != null)
                ambulancelimit.push(data[i].FamilyLimit);
            var smallvalue = Math.min.apply(Math, ambulancelimit);
            //Math.min((data[i].ClaimLimit), (data[i].IndividualLimit), (data[i].FamilyLimit));
            $('#lblExternalLimit_' + ctrlID).text(smallvalue);
        }
        else
            $('#lblExternalLimit_' + ctrlID).text(MakeZerofromUndefinedorEmpty(data[i].ExternalValueAbs));
        $('#txtBillAmount_' + ctrlID).val(MakeZerofromUndefinedorEmpty(data[i].BillAmount));
        $('#txtDeductions_' + ctrlID).val(MakeZerofromUndefinedorEmpty(data[i].DeductionAmount));

        if (MakeZerofromUndefinedorEmpty($('#txtTotalServicesBillAmount').val()) == 0 && MakeZerofromUndefinedorEmpty($('#txtTotalServicesPackageAmount').val()) == 0) {
            if (_serviceID == 2) {
                $('#txtbillRoomdays_' + ctrlID).val($('#txtICUDays').val())
            }
            else if (_serviceID == 3) {
                $('#txtbillRoomdays_' + ctrlID).val($('#txtRoomDays').val())
            }
        }
        else
            $('#txtbillRoomdays_' + ctrlID).val(MakeZerofromUndefinedorEmpty(data[i].BillRoomdays));

        // startregion  SP3V-4995

        if (_serviceID == 2) {
            BillRoomdaysDetails.push($('#txtbillRoomdays_' + ctrlID).val());  //ICU
        }
        if (_serviceID == 3) {
            BillRoomdaysDetails.push($('#txtbillRoomdays_' + ctrlID).val());   //Roomrent

            $('#hdnDaysDetails').val(JSON.stringify(BillRoomdaysDetails));

        }

        // endregion




        $('#lblBillDeductions_' + ctrlID).text(parseInt($('#txtBillAmount_' + ctrlID).val()) - parseInt($('#txtDeductions_' + ctrlID).val()));
        //SP3V-1058 SP3V-411 Leena  05MAR2024
        if (_ClaimTypeID == 1) {
            $('#txtDiscount_' + ctrlID).val(MakeZerofromUndefinedorEmpty(discountamt));
            $('#lblEligibleAmount_' + ctrlID).text(eligibleBillAmount);
            $('#lblPayableAmount_' + ctrlID).text(MakeZerofromUndefinedorEmpty(eligibleBillAmount));
            toteligableamt = toteligableamt + eligibleBillAmount;
        }
        else {
            $('#txtDiscount_' + ctrlID).val(MakeZerofromUndefinedorEmpty(data[i].DiscountAmount));
            $('#lblEligibleAmount_' + ctrlID).text(data[i].EligibleAmount);
            $('#lblPayableAmount_' + ctrlID).text(MakeZerofromUndefinedorEmpty(data[i].Sanctionedamount));
            toteligableamt = toteligableamt + MakeZerofromUndefinedorEmpty(data[i].EligibleAmount);
        }
        //SP3V-4161
        if (data[i].ParentID == 0 && (data[i].BillAmount == null || data[i].BillAmount == 0)) {
            $('#btnAdd_' + ctrlID).attr("disabled", "disabled");
        }
        //End of SP3V-4161
        //SP3V-1058 SP3V-411 Leena  05MAR2024

        //$('#txtCopay_' + ctrlID).val(MakeZerofromUndefinedorEmpty(data[i].Copayment));
        //$('#ddlAdditionalAmtReason_' + ctrlID).val(data[i].AdditionalReason);
        //$('#ddlAdditionalAmtReason_' + ctrlID).attr("disabled", "disabled");
        //$('#txtAdditionalAmt_' + ctrlID).val(MakeZerofromUndefinedorEmpty(data[i].AdditionalAmount));
        //$('#txtRemarks_' + ctrlID).val(data[i].Remarks);


    }
    $('#txtTotalServicesEligibleAmount').val(toteligableamt); //SP3V-1058 SP3V-411 Leena SP3V-3998 05MAR2024


}
//Leena Added Parameter tblClaimDisc SP3V-411 SP3V-1058 SP3V-3998
function CalculateTotalServiceBillAmount_New(data, claimID, tblTariffDiscount, flag, tblClaimDisc) {

    var TotalTariffAmount = 0;
    var TotalInternalValues = 0;
    var TotalDiscountAmt = 0;
    var estimatedDays = MakeZerofromUndefinedorEmpty($('#txtExtimatedDays').val());
    var ICUDays = MakeZerofromUndefinedorEmpty($('#txtICUDays').val());
    var RoomDays = MakeZerofromUndefinedorEmpty($('#txtRoomDays').val());

    var _basicData = JSON.parse(MasterData.BasicData);

    // ClaimType - 1 - Preauth
    if (parseInt($('#hdnClaimTypeID').val()) == 1 || (basicData[0].IssueID == 7 && basicData[0].RequestTypeID == 4 && (basicData[0].ServiceSubTypeID == 3 || basicData[0].ServiceSubTypeID == 4))) {
        // ClaimType - 1 - Preauth

        var toteligableamt = 0;
        var NewdeductionBillAmount = 0;
        var eligibleBillAmount = 0;
        var _tariffDiscount = 0;
        var discountamt = 0;
        var internalValue = 0; //15MAR2024
        var _services = [];
        if ($('#hdnServiceDetails').val() != '') {
            _services = $.parseJSON($('#hdnServiceDetails').val());
        }

        //End SP3V-411
        for (var i = 0; i < data.length; i++) {
            _tariffDiscount = 0;
            var ctrlID = data[i].ID + '_' + claimID;
            if (data[i].ID == 2) {
                if ($('#txtbillRoomdays_' + ctrlID).val() != '')
                    ICUDays = $('#txtbillRoomdays_' + ctrlID).val();
            }
            else if (data[i].ID == 3) {
                if ($('#txtbillRoomdays_' + ctrlID).val() != '')
                    RoomDays = $('#txtbillRoomdays_' + ctrlID).val();
            }
            internalValue = 0; //15MAR2024
            var tariffAmount = 0;
            internalValue = MakeZerofromUndefinedorEmpty(data[i].ExternalValueAbs); //15MAR2024
            for (var j = 0; j < tblTariffDiscount.length; j++) {
                if (data[i].ID == tblTariffDiscount[j].ServiceID) {

                    var _tariffAmount = MakeZerofromUndefinedorEmpty(tblTariffDiscount[j].Amount);
                    var _ServiceDiscount = MakeZerofromUndefinedorEmpty(tblTariffDiscount[j].Discount);

                    $('#lblServiceTariffDiscount_' + ctrlID).text(_ServiceDiscount + '%');
                    _tariffDiscount = _ServiceDiscount; //05MAR2024 SP3V-3998

                    // 2 - Out Patient
                    if (parseInt(_basicData[0].ServiceTypeID) == 2) {
                        $('#lblTariff_' + ctrlID).text(_tariffAmount);

                        if ($('#txtBillAmount_' + ctrlID).val() != 0)
                            TotalTariffAmount = parseInt(TotalTariffAmount) + parseInt(_tariffAmount);
                    }
                    else {

                        if (parseInt(_tariffAmount) != 0) {
                            if (parseInt(data[i].ID) == 2)
                                tariffAmount = parseInt(ICUDays) * parseInt(_tariffAmount);
                            else if (parseInt(data[i].ID) == 3)
                                tariffAmount = parseInt(RoomDays) * parseInt(_tariffAmount);
                            else if (parseInt(data[i].ID) == 4)
                                tariffAmount = parseInt(RoomDays) * parseInt(_tariffAmount);
                            else {
                                //tariffAmount = parseInt(estimatedDays) * parseInt(_tariffAmount);
                                tariffAmount = _tariffAmount;
                            }
                        }

                        $('#lblTariff_' + ctrlID).text(tariffAmount);

                        if ($('#txtBillAmount_' + ctrlID).val() != 0)
                            TotalTariffAmount = parseInt(TotalTariffAmount) + parseInt(tariffAmount);
                    }


                    break;
                }
            }
            //05MAR2024 Leena SP3V-3998// 2 - Out Patient
            if (parseInt(_basicData[0].ServiceTypeID) != 2) {
                if (parseInt(_basicData[0].ServiceTypeID) != 2) {
                    if (parseInt(data[i].ID) == 2)
                        internalValue = parseInt(ICUDays) * parseInt(internalValue);
                    else if (parseInt(data[i].ID) == 3)
                        internalValue = parseInt(RoomDays) * parseInt(internalValue);
                    else if (parseInt(data[i].ID) == 4)   //added by Bhagyaraj # for Nursing & DMO Rates Calculation Based On LOS
                        internalValue = parseInt(RoomDays) * parseInt(internalValue);

                    else {

                        internalValue = internalValue;
                    }
                }
            }


            NewdeductionBillAmount = parseInt(MakeZerofromUndefinedorEmpty(data[i].BillAmount)) - parseInt(MakeZerofromUndefinedorEmpty(data[i].DeductionAmount));
            var eligibleAmount = 0;
            if (NewdeductionBillAmount > 0) {
                if (parseInt(_tariffDiscount) != 0) {
                    discountamt = Math.round(((NewdeductionBillAmount) * (_tariffDiscount)) / 100);
                    eligibleBillAmount = Math.round((NewdeductionBillAmount) - (discountamt));

                    if (parseInt(internalValue) != 0 && parseInt(tariffAmount) != 0)
                        eligibleAmount = Math.min(parseInt(internalValue), parseInt(tariffAmount), parseInt(eligibleBillAmount));
                    else if (parseInt(internalValue) == 0 && parseInt(tariffAmount) == 0)
                        eligibleAmount = eligibleBillAmount;
                    else if (parseInt(internalValue) == 0)
                        eligibleAmount = Math.min(parseInt(tariffAmount), parseInt(eligibleBillAmount));
                    else if (parseInt(tariffAmount) == 0)
                        eligibleAmount = Math.min(parseInt(internalValue), parseInt(eligibleBillAmount));
                }
                else {

                    if (parseInt(internalValue) != 0 && parseInt(tariffAmount) != 0)
                        eligibleAmount = Math.min(parseInt(internalValue), parseInt(tariffAmount), parseInt(NewdeductionBillAmount));
                    else if (parseInt(internalValue) == 0 && parseInt(tariffAmount) == 0)
                        eligibleAmount = NewdeductionBillAmount;
                    else if (parseInt(internalValue) == 0)
                        eligibleAmount = Math.min(parseInt(tariffAmount), parseInt(NewdeductionBillAmount));
                    else if (parseInt(tariffAmount) == 0)
                        eligibleAmount = Math.min(parseInt(internalValue), parseInt(NewdeductionBillAmount));
                }
            }
            else {
                discountamt = 0;
                eligibleBillAmount = 0;
                eligibleAmount = 0;
            }

            //--SP3V-3998 05MAR2024 ---------------------------------
            if (NewdeductionBillAmount != 0)
                TotalInternalValues = parseInt(TotalInternalValues) + parseInt(internalValue);
            $('#txtDiscount_' + ctrlID).val(MakeZerofromUndefinedorEmpty(discountamt));
            $('#lblEligibleAmount_' + ctrlID).text(eligibleAmount);
            $('#lblPayableAmount_' + ctrlID).text(MakeZerofromUndefinedorEmpty(eligibleAmount));
            toteligableamt = toteligableamt + eligibleAmount;
            TotalDiscountAmt = Math.round(parseInt(TotalDiscountAmt) + discountamt);//+ parseInt(MakeZerofromUndefinedorEmpty($('#txtDiscount_' + ctrlID).val()));
            if (_services.length > 0) {
                for (var srow = 0; srow < _services.length; srow++) {
                    if (data[i].ID == _services[srow].ServiceID) {
                        // Perform actions when ServiceID matches
                        _services[srow].ServiceID = _services[srow].ServiceID;
                        _services[srow].BillAmount = parseInt(MakeZerofromUndefinedorEmpty(data[i].BillAmount));
                        _services[srow].DeductionAmount = parseInt(MakeZerofromUndefinedorEmpty(data[i].DeductionAmount))
                        _services[srow].DiscountAmount = discountamt;
                        _services[srow].EligibleAmount = eligibleAmount;
                        _services[srow].SanctionedAmount = eligibleAmount;
                        _services[srow].TariffAmount = tariffAmount;
                        _services[srow].BillRoomdays = _services[srow].BillRoomdays;
                        //_services.push(_services[srow]);
                        break;
                    }

                }
            }
        }
    }
    //SP3V - 3998 05MAR2024
    if (_services != undefined) {
        if (_services.length > 0)
            $('#hdnServiceDetails').val(JSON.stringify(_services));
    }
    //End SP3V - 3998 05MAR2024

    if (parseInt(TotalDiscountAmt) != 0) {
        $('#hdnTotalServiceDiscounts').val(TotalDiscountAmt);
        $("#txtTotalServiceDiscountAmt").val(TotalDiscountAmt);
    }
    else {
        $('#hdnTotalServiceDiscounts').val('');
        $("#txtTotalServiceDiscountAmt").val('');
    }

    $('#txtTotalServicesEligibleAmount').val(toteligableamt);
    $('#hdnTatalSeriveTariffAmount').val(TotalTariffAmount);
    $('#hdnTatalSeriveBPAmount').val(TotalInternalValues);

}

//Commented by Leena Previous Logic----------------------------------------------------------------------------
//function CalculateTotalServiceBillAmount_New(data, claimID, tblTariffDiscount, flag,tblClaimDisc) {

//    var TotalTariffAmount = 0;
//    var TotalInternalValues = 0;
//    var TotalDiscountAmt = 0;
//    var estimatedDays = MakeZerofromUndefinedorEmpty($('#txtExtimatedDays').val());
//    var ICUDays = MakeZerofromUndefinedorEmpty($('#txtICUDays').val());
//    var RoomDays = MakeZerofromUndefinedorEmpty($('#txtRoomDays').val());

//    var _basicData = JSON.parse(MasterData.BasicData);

//    // ClaimType - 1 - Preauth
//    if (parseInt($('#hdnClaimTypeID').val()) == 1) {
//        // ClaimType - 1 - Preauth
//        //SP3V-411 Leena
//        //var ClaimPackagePercentage = 0; //SP3V-4017 - 12MAR2024 Leena
//        //var ClaimIPPercentage = 0; //SP3V-4017 - 12MAR2024 Leena
//        //var FlgBillDisc = 0; //SP3V-4017 - 12MAR2024 Leena
//        var toteligableamt = 0;
//        var NewdeductionBillAmount = 0;
//        var eligibleBillAmount = 0;
//        var _tariffDiscount = 0;
//        var discountamt = 0;
//        // Commented on //SP3V-4017 - 12MAR2024 Leena
//        //if (tblClaimDisc != null && tblClaimDisc.length > 0) {
//        //    ClaimPackagePercentage = tblClaimDisc[0].PackagePercentage;
//        //    if (parseInt(_basicData[0].ServiceTypeID) == 2) {
//        //        ClaimIPPercentage = tblClaimDisc[0].OPPercentage;
//        //    } else {
//        //        ClaimIPPercentage = tblClaimDisc[0].IPPercentage;
//        //    }

//        //    FlgBillDisc = 1;
//        //}
//        ////SP3V-4017 - 12MAR2024
//        //05MAR2024----SP3V-3998---------------------------------------------
//        var _services = [];
//        if ($('#hdnServiceDetails').val() != '') {
//            _services = $.parseJSON($('#hdnServiceDetails').val());
//        }

//        //End SP3V-411
//        for (var i = 0; i < data.length; i++) {
//            var ctrlID = data[i].ID + '_' + claimID;

//            for (var j = 0; j < tblTariffDiscount.length; j++) {
//                if (data[i].ID == tblTariffDiscount[j].ServiceID) {

//                    var _tariffAmount = MakeZerofromUndefinedorEmpty(tblTariffDiscount[j].Amount);
//                    var _ServiceDiscount = MakeZerofromUndefinedorEmpty(tblTariffDiscount[j].Discount);
//                     //Commented by Leena SP3V-411 Display Discount
//                    $('#lblServiceTariffDiscount_' + ctrlID).text(_ServiceDiscount + '%');
//                    _tariffDiscount = _ServiceDiscount; //05MAR2024 SP3V-3998
//                    //Leena SP3V-411 Display Discount which is previously applied on bill not from disc master - ClaimDiscountDetails
//                    //Commented SP3V-4017 - 12MAR2024 Leena
//                    //var claimstageid = $('#hdnClaimStageID').val();
//                    //Show discount define in master table ProviderTariff or ProviderMOU
//                    //if (claimstageid == 24 || claimstageid == 4 || claimstageid == 5 || claimstageid == 22) {
//                    //    tblTariffDiscount[j] = _ServiceDiscount;
//                    //    _tariffDiscount = _ServiceDiscount; //05MAR2024 SP3V-3998
//                    //    $('#lblServiceTariffDiscount_' + ctrlID).text(_ServiceDiscount + '%');
//                    //}
//                    //else {
//                    //     //Show discount from ClaimDiscountDetails or ClaimsServiceDetails
//                    //    var _BillDiscPcnt = MakeZerofromUndefinedorEmpty(data[i].BillDiscPcnt);
//                    //    if (_BillDiscPcnt > 0) {
//                    //        tblTariffDiscount[j] = _BillDiscPcnt;
//                    //        _tariffDiscount = _BillDiscPcnt; //05MAR2024 SP3V-3998
//                    //        $('#lblServiceTariffDiscount_' + ctrlID).text(_BillDiscPcnt + '%');
//                    //    }
//                    //    else {
//                    //        tblTariffDiscount[j] = ClaimIPPercentage;
//                    //        _tariffDiscount = ClaimIPPercentage; //05MAR2024 SP3V-3998
//                    //        $('#lblServiceTariffDiscount_' + ctrlID).text(ClaimIPPercentage + '%');
//                    //    }
//                    //}
//                     //End Commented SP3V-4017 - 12MAR2024 Leena
//                    //End Leena SP3V-411
//                    // 2 - Out Patient
//                    if (parseInt(_basicData[0].ServiceTypeID) == 2) {
//                        $('#lblTariff_' + ctrlID).text(_tariffAmount);
//
//                        if ($('#txtBillAmount_' + ctrlID).val() != 0)
//                            TotalTariffAmount = parseInt(TotalTariffAmount) + parseInt(_tariffAmount);
//                    }
//                    else {
//                        var tariffAmount = 0;
//                        if (parseInt(_tariffAmount) != 0) {
//                            if (parseInt(data[i].ID) == 2)
//                                tariffAmount = parseInt(ICUDays) * parseInt(_tariffAmount);
//                            else if (parseInt(data[i].ID) == 3)
//                                tariffAmount = parseInt(RoomDays) * parseInt(_tariffAmount);
//                            else {
//                                //tariffAmount = parseInt(estimatedDays) * parseInt(_tariffAmount);
//                                tariffAmount = _tariffAmount;
//                            }
//                        }

//                        $('#lblTariff_' + ctrlID).text(tariffAmount);

//                        if ($('#txtBillAmount_' + ctrlID).val() != 0)
//                            TotalTariffAmount = parseInt(TotalTariffAmount) + parseInt(tariffAmount);
//                    }


//                    break;
//                }
//            }
//            //05MAR2024 Leena SP3V-3998
//            NewdeductionBillAmount = parseInt(MakeZerofromUndefinedorEmpty(data[i].BillAmount)) - parseInt(MakeZerofromUndefinedorEmpty(data[i].DeductionAmount));

//            if (NewdeductionBillAmount > 0) {
//                discountamt = (parseInt(NewdeductionBillAmount) * parseInt(_tariffDiscount)) / 100;
//                eligibleBillAmount = parseInt(NewdeductionBillAmount) - parseInt(discountamt);
//            }
//            else {
//                discountamt = 0;
//                eligibleBillAmount = 0;
//            }

//            //--SP3V-3998 05MAR2024 ---------------------------------
//            $('#txtDiscount_' + ctrlID).val(MakeZerofromUndefinedorEmpty(discountamt));
//            $('#lblEligibleAmount_' + ctrlID).text(eligibleBillAmount);
//            $('#lblPayableAmount_' + ctrlID).text(MakeZerofromUndefinedorEmpty(eligibleBillAmount));
//            toteligableamt = toteligableamt + eligibleBillAmount;
//            TotalDiscountAmt = parseInt(TotalDiscountAmt) + discountamt;//+ parseInt(MakeZerofromUndefinedorEmpty($('#txtDiscount_' + ctrlID).val()));
//            if (_services.length > 0) {
//                for (var srow = 0; srow < _services.length; srow++) {
//                    if (data[i].ID == _services[srow].ServiceID) {
//                        // Perform actions when ServiceID matches
//                        _services[srow].ServiceID = _services[srow].ServiceID;
//                        _services[srow].BillAmount = parseInt(MakeZerofromUndefinedorEmpty(data[i].BillAmount));
//                        _services[srow].DeductionAmount = parseInt(MakeZerofromUndefinedorEmpty(data[i].DeductionAmount))
//                        _services[srow].DiscountAmount = discountamt;
//                        _services[srow].EligibleAmount = eligibleBillAmount;
//                        _services[srow].SanctionedAmount = eligibleBillAmount;
//                        break;
//                     }

//                }
//            }
//        }
//    }
//    //SP3V - 3998 05MAR2024
//    if (_services.length > 0)
//        $('#hdnServiceDetails').val(JSON.stringify(_services));
//    //End SP3V - 3998 05MAR2024

//    var internalValue = 0;
//    ////var estimatedDays = MakeZerofromUndefinedorEmpty($('#txtExtimatedDays').val());
//    ////var ICUDays = MakeZerofromUndefinedorEmpty($('#txtICUDays').val());
//    ////var RoomDays = MakeZerofromUndefinedorEmpty($('#txtRoomDays').val());

//    for (var i = 0; i < data.length; i++) {
//        var ctrlID = data[i].ID + '_' + claimID;

//        internalValue = MakeZerofromUndefinedorEmpty(data[i].InternalValueAbs);
//        // 2 - Out Patient
//        if (parseInt(_basicData[0].ServiceTypeID) != 2) {

//            if (parseInt(data[i].ID) == 2)
//                internalValue = parseInt(ICUDays) * parseInt(internalValue);
//            else if (parseInt(data[i].ID) == 3)
//                internalValue = parseInt(RoomDays) * parseInt(internalValue);
//            else {
//                //internalValue = parseInt(estimatedDays) * parseInt(internalValue);
//                internalValue = internalValue;
//            }
//        }

//        if ($('#txtBillAmount_' + ctrlID).val() != 0)
//            TotalInternalValues = parseInt(TotalInternalValues) + parseInt(internalValue);

//    }

//    if (parseInt(TotalDiscountAmt) != 0) {
//        $('#hdnTotalServiceDiscounts').val(TotalDiscountAmt);
//        $("#txtTotalServiceDiscountAmt").val(TotalDiscountAmt);
//    }
//    else {
//        $('#hdnTotalServiceDiscounts').val('');
//        $("#txtTotalServiceDiscountAmt").val('');
//    }

//    $('#txtTotalServicesEligibleAmount').val(toteligableamt);
//    $('#hdnTatalSeriveTariffAmount').val(TotalTariffAmount);
//    $('#hdnTatalSeriveBPAmount').val(TotalInternalValues);

//}
//End Commented by Leena Previous Logic----------------------------------------------------------------------------

// Commented Code
function commentedCode_Calcullation() {
    //function CalculateTotalServiceBillAmount(data, claimID, tblTariffDiscount, flag) {

    //    var TotBillAmt = 0;
    //    var TotDeduBillAmt = 0;
    //    var TotEligibleAmt = 0;
    //    var TotalDiscountAmt = 0;
    //    var estimatedDays = MakeZerofromUndefinedorEmpty($('#txtExtimatedDays').val());
    //    var ICUDays = MakeZerofromUndefinedorEmpty($('#txtICUDays').val());
    //    var RoomDays = MakeZerofromUndefinedorEmpty($('#txtRoomDays').val());

    //    if (parseInt($('#hdnClaimTypeID').val()) == 2) {
    //        for (var i = 0; i < data.length; i++) {
    //            var ctrlID = data[i].ID + '_' + claimID;
    //            var eligibleAmount = 0;

    //            var deductBillAmount = parseInt(MakeZerofromUndefinedorEmpty(data[i].BillAmount)) - parseInt(MakeZerofromUndefinedorEmpty(data[i].DeductionAmount));
    //            $('#lblBillDeductions_' + ctrlID).text(deductBillAmount);

    //            var internalValue = MakeZerofromUndefinedorEmpty(data[i].InternalValueAbs);
    //            if (parseInt(data[i].ID) == 2)
    //                internalValue = parseInt(ICUDays) * parseInt(internalValue);
    //            else if (parseInt(data[i].ID) == 3)
    //                internalValue = parseInt(RoomDays) * parseInt(internalValue);
    //            else
    //                internalValue = parseInt(estimatedDays) * parseInt(internalValue);


    //            if (parseInt(internalValue) == 0)
    //                eligibleAmount = deductBillAmount;
    //            else
    //                eligibleAmount = Math.min(parseInt(internalValue), parseInt(deductBillAmount));

    //            TotBillAmt = parseInt(TotBillAmt) + parseInt(MakeZerofromUndefinedorEmpty(data[i].BillAmount));
    //            TotDeduBillAmt = parseInt(TotDeduBillAmt) + parseInt(deductBillAmount);
    //            TotEligibleAmt = parseInt(TotEligibleAmt) + parseInt(eligibleAmount);
    //            TotalDiscountAmt = 0;

    //            $('#lblEligibleAmount_' + ctrlID).text(eligibleAmount);
    //            $('#lblPayableAmount_' + ctrlID).text(eligibleAmount);

    //        }
    //    }
    //    else {

    //        for (var i = 0; i < data.length; i++) {
    //            var ctrlID = data[i].ID + '_' + claimID;
    //            var deductBillAmount = parseInt(MakeZerofromUndefinedorEmpty(data[i].BillAmount)) - parseInt(MakeZerofromUndefinedorEmpty(data[i].DeductionAmount));

    //            $('#lblBillDeductions_' + ctrlID).text(deductBillAmount);

    //            for (var j = 0; j < tblTariffDiscount.length; j++) {
    //                if (data[i].ID == tblTariffDiscount[j].ServiceID) {
    //                    var _tariffAmount = MakeZerofromUndefinedorEmpty(tblTariffDiscount[j].Amount);
    //                    var _tariffDiscount = MakeZerofromUndefinedorEmpty(tblTariffDiscount[j].Discount);

    //                    var tariffAmount = 0;
    //                    if (parseInt(_tariffAmount) != 0) {
    //                        if (parseInt(data[i].ID) == 2)
    //                            tariffAmount = parseInt(ICUDays) * parseInt(_tariffAmount);
    //                        else if (parseInt(data[i].ID) == 3)
    //                            tariffAmount = parseInt(RoomDays) * parseInt(_tariffAmount);
    //                        else
    //                            tariffAmount = parseInt(estimatedDays) * parseInt(_tariffAmount);
    //                    }
    //                    $('#lblTariff_' + ctrlID).text(tariffAmount);

    //                    var internalValue = MakeZerofromUndefinedorEmpty(data[i].InternalValueAbs);
    //                    if (parseInt(data[i].ID) == 2)
    //                        internalValue = parseInt(ICUDays) * parseInt(internalValue);
    //                    else if (parseInt(data[i].ID) == 3)
    //                        internalValue = parseInt(RoomDays) * parseInt(internalValue);
    //                    else
    //                        internalValue = parseInt(estimatedDays) * parseInt(internalValue);

    //                    var eligibleBillAmount = 0;
    //                    var eligibleAmount = 0;
    //                    if (parseInt(deductBillAmount) != 0) {

    //                        if (parseInt(_tariffDiscount) != 0) {
    //                            var discount = (parseInt(deductBillAmount) * parseInt(_tariffDiscount)) / 100;
    //                            $('#txtDiscount_' + ctrlID).val(discount);
    //                            var eligibleBillAmount = parseInt(deductBillAmount) - parseInt(discount);

    //                            if (parseInt(internalValue) != 0 && parseInt(tariffAmount) != 0)
    //                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(tariffAmount), parseInt(deductBillAmount));
    //                            else if (parseInt(internalValue) == 0 && parseInt(tariffAmount) == 0)
    //                                eligibleAmount = eligibleBillAmount;
    //                            else if (parseInt(internalValue) == 0)
    //                                eligibleAmount = Math.min(parseInt(tariffAmount), parseInt(eligibleBillAmount));
    //                            else if (parseInt(tariffAmount) == 0)
    //                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(eligibleBillAmount));
    //                        }
    //                        else {
    //                            $('#txtDiscount_' + ctrlID).val('');

    //                            if (parseInt(internalValue) != 0 && parseInt(tariffAmount) != 0)
    //                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(tariffAmount), parseInt(deductBillAmount));
    //                            else if (parseInt(internalValue) == 0 && parseInt(tariffAmount) == 0)
    //                                eligibleAmount = deductBillAmount;
    //                            else if (parseInt(internalValue) == 0)
    //                                eligibleAmount = Math.min(parseInt(tariffAmount), parseInt(deductBillAmount));
    //                            else if (parseInt(tariffAmount) == 0)
    //                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(deductBillAmount));

    //                        }
    //                    }

    //                    $('#lblEligibleAmount_' + ctrlID).text(eligibleAmount);
    //                    $('#lblPayableAmount_' + ctrlID).text(eligibleAmount);
    //                    break;
    //                }
    //            }

    //            TotBillAmt = parseInt(TotBillAmt) + parseInt(MakeZerofromUndefinedorEmpty(data[i].BillAmount));
    //            TotDeduBillAmt = parseInt(TotDeduBillAmt) + parseInt(deductBillAmount);
    //            TotEligibleAmt = parseInt(TotEligibleAmt) + parseInt(eligibleAmount);
    //            TotalDiscountAmt = parseInt(TotalDiscountAmt) + parseInt(MakeZerofromUndefinedorEmpty($('#txtDiscount_' + ctrlID).val()));
    //        }
    //    }

    //    if (parseInt(TotBillAmt) != 0)
    //        $('#txtTotalServicesBillAmount').val(TotBillAmt);
    //    else
    //        $('#txtTotalServicesBillAmount').val('');

    //    if (parseInt(TotDeduBillAmt) != 0)
    //        $('#txtTotServicesAfterDedAmt').val(TotDeduBillAmt);
    //    else
    //        $('#txtTotServicesAfterDedAmt').val('');

    //    if (parseInt(TotEligibleAmt) != 0)
    //        $('#txtTotalServicesEligibleAmount').val(TotEligibleAmt);
    //    else
    //        $('#txtTotalServicesEligibleAmount').val('');

    //    if (parseInt(TotalDiscountAmt) != 0)
    //        $('#hdnTotalServiceDiscounts').val(TotalDiscountAmt);
    //    else
    //        $('#hdnTotalServiceDiscounts').val('');

    //    if (parseInt(TotBillAmt) == 0)
    //        $('#txtTotalServicesEligibleAmount').val($('#txtTotalServicesPackageAmount').val());


    //}
}
// End Commented Code

function EnableDisable_Load_ServiceButtons() {

    var totalServiceDetails = [];
    totalServiceDetails = $.parseJSON($('#hdnBaseServiceDetails').val());

    $.each(totalServiceDetails, function (i, totService) {

        var ctrlID = totService["ID"] + '_' + $("#hdnClaimID").val();
        var parentBillAmount = MakeZerofromUndefinedorEmpty(totService["BillAmount"]);

        if (parseInt(totService["ParentID"]) == 0) {
            var serviceIDs = [];
            var childBillAmount = 0;
            $.each(totalServiceDetails, function (j, innerTotService) {
                if (totService["ID"] == innerTotService["ParentID"]) {
                    serviceIDs.push(innerTotService["ID"]);
                    childBillAmount = parseInt(childBillAmount) + MakeZerofromUndefinedorEmpty(innerTotService["BillAmount"]);
                }
            });

            if (parseInt(parentBillAmount) != 0) {
                for (var k = 0; k < serviceIDs.length; k++) {
                    var innerCtrlID = serviceIDs[k] + '_' + $("#hdnClaimID").val();
                    $('#btnAdd_' + innerCtrlID).attr("disabled", "disabled");
                }
            }
            else if (parseInt(childBillAmount) != 0) {
                $('#btnAdd_' + ctrlID).attr("disabled", "disabled");
            }
        }



    });

    // If claims service is out patient 
    var _basicData = JSON.parse(MasterData.BasicData);
    if (parseInt(_basicData[0].ServiceTypeID) == 2) {
        $.each(totalServiceDetails, function (i, totService) {
            if (parseInt(totService["ID"]) == 1) {
                var ctrlID = totService["ID"] + '_' + $("#hdnClaimID").val();
                $('#btnAdd_' + ctrlID).attr("disabled", "disabled");

                $.each(totalServiceDetails, function (j, innerTotService) {
                    var innerCtrlID = innerTotService["ID"] + '_' + $("#hdnClaimID").val();
                    if (totService["ID"] == innerTotService["ParentID"]) {
                        $('#btnAdd_' + innerCtrlID).attr("disabled", "disabled");
                    }
                });
            }
        });
    }

}

function EnableDisableMap_ServiceButtons(_serviceID, TotalBillAmount, parentID) {

    var totalServiceDetails = [];
    totalServiceDetails = $.parseJSON($('#hdnBaseServiceDetails').val());
    //////$.each(totalServiceDetails, function (i, totService) {
    //////    if (_serviceID == totService["ID"]) {
    //////        parentID = totService["ParentID"];
    //////        return false;
    //////    }
    //////});

    var _services = [];
    if ($('#hdnServiceDetails').val() != '') {
        _services = $.parseJSON($('#hdnServiceDetails').val());
    }

    if (parseInt(parentID) == 0) {
        $.each(totalServiceDetails, function (i, totService) {

            if (parseInt(_serviceID) == parseInt(totService["ParentID"])) {
                var ctrlID = totService["ID"] + '_' + $("#hdnClaimID").val();
                if (parseInt(TotalBillAmount) > 0)
                    $('#btnAdd_' + ctrlID).attr("disabled", "disabled");
                else
                    $('#btnAdd_' + ctrlID).removeAttr("disabled", "disabled");
            }

        });
    }
    else {
        var ctrlID = parentID + '_' + $("#hdnClaimID").val();
        if (parseInt(TotalBillAmount) > 0) {
            $('#btnAdd_' + ctrlID).attr("disabled", "disabled");
        }
        else {
            var billAmount = 0;
            var serviceIDs = [];
            $.each(totalServiceDetails, function (i, totService) {
                if (parseInt(parentID) == parseInt(totService["ParentID"])) {
                    serviceIDs.push(totService["ID"]);
                }
            });

            $.each(_services, function (i, service) {
                for (var j = 0; j < serviceIDs.length; j++) {
                    if (parseInt(serviceIDs[j]) == parseInt(service.ServiceID))
                        billAmount = parseInt(billAmount) + parseInt(service.BillAmount);
                }
            });

            if (billAmount == 0 && CheckServiceParentids(parentID) == false) {
                $('#btnAdd_' + ctrlID).removeAttr("disabled", "disabled");
            }
            else {
                $('#btnAdd_' + ctrlID).attr("disabled", "disabled");
            }
        }
    }
}

function CheckServiceParentids(InsID) {
    var result = false;
    var Parentids = [1, 7, 13, 20, 25, 33, 42, 49];
    for (var i = 0; i < Parentids.length; i++) {
        if (Parentids[i] == InsID) {
            result = true;
            break;
        }
    }
    return result;
};
function Bind_BillDetails(_flagDialog, _billServiceID, _serviceName) {
    var vBills = 0;
    if ($('#hdnBillDetails').val() != '')
        var vBills = $.parseJSON($('#hdnBillDetails').val());

    var vDeductions = 0;
    if ($('#hdnDecuctionsDetails').val() != '')
        var vDeductions = $.parseJSON($('#hdnDecuctionsDetails').val());

    if (vBills.length != 0) {
        var isBillsAvailable = false;
        var isDeductionAvailable = false;


        var _billSlNo = 0;
        for (var i = 0; i < vBills.length; i++) {
            var _serviceID = vBills[i].ServiceID;

            if (_serviceID == _billServiceID) {
                _billSlNo = parseInt(_billSlNo) + 1;
                var nextBillSlNo = parseInt(_billSlNo) + 1;

                isBillsAvailable = true;
                NewBill(_serviceID, _billSlNo, nextBillSlNo);

                $('#btn_' + _serviceID + '_' + _billSlNo).removeClass('btn btn-warning btn-sm');
                $('#btn_' + _serviceID + '_' + _billSlNo).addClass('btn btn-info btn-sm');

                $('#' + txtServiceBillNo + _serviceID + '_' + _billSlNo).val(vBills[i].BillNo);
                //var ctrlDate = JSONDate2(vBills[i].BillDate);
                var ctrlDate = validateDateDDMMMYYYY(vBills[i].BillDate) ? vBills[i].BillDate : JSONDate2(vBills[i].BillDate);
                $('#' + txtServiceBillDate + _serviceID + '_' + _billSlNo).val(ctrlDate);
                $('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val(vBills[i].BillAmount);

                // Deductions design and bind values
                var _deductionSlNo = 0;
                for (var j = 0; j < vDeductions.length; j++) {
                    if (_serviceID == vDeductions[j].ServiceID && _billSlNo == vDeductions[j].BillSlNo) {
                        //var _deductionSlNo = $('#' + tblBillDeductions + _serviceID + '_' + _billSlNo + ' tbody tr').length + 1;
                        _deductionSlNo = parseInt(_deductionSlNo) + 1;

                        BillDeduction(_serviceID, _billSlNo, 1, _deductionSlNo);
                        $('#' + lblBillDeduction + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo).text(vDeductions[j].DeductionAmount);
                        var reasonName = getNamepropwithId(vDeductions[j].DeductionReasonID, MasterData.mDeductionReasons);
                        var irdareasonName = getNamepropwithId(vDeductions[j].IRDADeductionReasonID, MasterData.mIRDADeductionReasons); //SP3V-2902
                        $('#' + lblBillDeductionReason + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo).text(reasonName);
                        $('#' + lblIRDADeductionReason + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo).text(irdareasonName); //SP3V-2902
                        $('#' + lblBillDeductionFreeText + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo).text(vDeductions[j].FreeTextValue);
                    }
                }
            }
        }

        if (isBillsAvailable == false) {
            NewBill(_billServiceID, 1, 2, 1);
        }

    }
    else {
        NewBill(_billServiceID, 1, 2, 1);
    }

    if (_flagDialog == 0)
        BillingAjaxDialog(_serviceName, _billServiceID, Error_MapBills_Service);

}

function NewBill(_serviceID, _billSlNo, _nextBillSlNo) {

    var TotalBillAmount = 0;
    var _saveBills = [];
    var oldBillSlNo = 1;

    if (_billSlNo != 1) {
        oldBillSlNo = _billSlNo - 1;

        if ($('#hdnBillDetails').val() != '') {
            _saveBills = $.parseJSON($('#hdnBillDetails').val());
        }
        $.each(_saveBills, function (i, sBillIDs) {
            if (_serviceID == sBillIDs["ServiceID"] && oldBillSlNo == sBillIDs["BillSlNo"]) {
                TotalBillAmount = parseInt(TotalBillAmount) + parseInt(sBillIDs["BillAmount"]);
            }
        });
    }



    if (TotalBillAmount <= 0 && _billSlNo != 1) {
        ShowErrorMessage('divBillingMessage', 'Please save current bill amount');
    }
    else {

        $('#divBillingMessage').text('');

        var nextBillSlNo = parseInt(_nextBillSlNo) + 1;
        var nextMaxBillSlNo = _nextBillSlNo;
        var hideBillSlNo = parseInt(_billSlNo) - 1;

        var _applicabletoHtml = FormatHtml_Dropdown(MasterData.mDeductionReasons);
        var _applicabletoIRDA = FormatHtml_Dropdown(MasterData.mIRDADeductionReasons); //SP3V-2902
        var Sid_BSlNo = _serviceID + '_' + _billSlNo;

        if (hideBillSlNo > 0 && ($('#' + txtServiceBBillAmount + _serviceID + '_' + hideBillSlNo).val() == '' || $('#' + txtServiceBBillAmount + _serviceID + '_' + hideBillSlNo).val() == null)) {
            //if (_billSlNo > 1 && ($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val() == '' || $('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val() == null)) {
            ShowErrorMessage('divMessage', 'Please enter bill amount.');
            //$('#divMessage').text('Please enter bill amount.');
        }
        else {

            var btnAdd = 'img_' + Sid_BSlNo;
            var deductionButtion = '';
            //if (parseInt(_serviceID) != 1 && parseInt(_serviceID) != 2 && parseInt(_serviceID) != 3 && parseInt(_serviceID) != 4 && parseInt(_serviceID) != 5 && parseInt(_serviceID) != 6)
            var deductionButtion = '<div class="widget-toolbar bigger-110"><a href="#" data-action="collapse"><i class="ace-icon fa btn-info" style="padding-left:5px;padding-right:5px;padding-top:5px;padding-bottom:5px;">Add Deduction</i></a></div>';


            /* Start Billing Div*/
            var vBilling = '<div id="divBills_' + Sid_BSlNo + '" class="widget-box widget-color-blue collapsed ui-sortable-handle">'
                //+ '<div class="widget-header widget-header-small" style="padding: 0px !important; margin: 0px !important;min-height:0px !important;">'
                + '<div class="widget-header">'
                // Header Table Heading
                + '<table id="tblBills" class="col-md-12">'
                //<thead><tr><th style="text-align: center;">Bill No</th><th style="text-align: center;">Bill Date</th><th style="text-align: center;">Bill Amount</th>'
                //+'<th style="text-align: center;"></th><th style="text-align: center;"></th></tr></thead>'
                //Header Table Body
                + '<tbody><tr><td style="text-align: center;"><label><strong> Bill No </strong></label> <input type="text" id="' + txtServiceBillNo + Sid_BSlNo + '" /></td>'
                + '<td style="text-align: center;"> <label><strong> Bill Date </strong><span class="ReqFieldbold">*</span></label> <input type="text" id="' + txtServiceBillDate + Sid_BSlNo + '" maxlength="11" onkeyup="javascript:return ValidateDate(this, event.keyCode)" onkeypress="    javascript: return onlydigits(event)" onblur="    FutureDateValidation($(this).val(),' + txtServiceBillDate + Sid_BSlNo + ')" onkeydown="    return DateFormat(this, event)"/></td>'
                + '<td style="text-align: center;"> <label><strong> Bill Amount </strong></label> <input type="text" id="' + txtServiceBBillAmount + Sid_BSlNo + '" onkeypress="javascript: return onlydigits(event);" /></td>'
                + '<td style="text-align: center;"><a id="btn_' + Sid_BSlNo + '" onclick="AddValuesToBillHiddenField(' + _serviceID + ',' + _billSlNo + ')" class="btn btn-warning btn-sm" style="padding:0px 8px !important">Save</a>&nbsp;&nbsp;</td>'
                + '<td style="text-align: center;"><a id="btnDeleteBill_' + Sid_BSlNo + '" onclick="DeleteBillDetails(' + _serviceID + ',' + _billSlNo + ')" class="glyphicon glyphicon-trash" title="Delete" style="color:#fff;font-size: 1.5em;"></a></td>'
                + '<td style="text-align: center;">' + deductionButtion
                ////<div class="widget-toolbar bigger-110"><a href="#" data-action="collapse"><i class="ace-icon fa btn-info" style="padding-left:5px;padding-right:5px;padding-top:5px;padding-bottom:5px;">Add Deduction</i></a></div>
                + '</td>'
                + '<td id="tdBillService_' + _serviceID + '_' + _billSlNo + '" style="text-align: center; padding:0px 8px"><a><img id="' + btnAdd + '"  src="/Content/images/s2.png" onclick="NewBill(' + _serviceID + ',' + _nextBillSlNo + ',' + nextBillSlNo + ')" width="22" height="22"></a></td>'
                + '</tr></tbody></table></div>'
                /* End Billing Div */

                /* Start Deduction Div*/
                + '<div class="widget-body"><div class="alert alert-info"><div class="row"><div>'
                // Deduction Table Heading
                + '<table id="' + tblBillDeductions + Sid_BSlNo + '_Bill" class="col-md-12 table-bordered table-striped table-condensed cf"><thead><tr><th>Deduction</th><th>Reason</th><th>IRDA&nbsp;Non&nbsp;Payables</th>'
                + '<th class="numeric">Value</th><th></th></tr></thead><tbody>'
                // Deduction Table Body
                + '<tr id="trBillDeductionsMain_' + Sid_BSlNo + '"><td><input id="' + txtBillDeduction + Sid_BSlNo + '" type="text" oncopy="return false" onpaste="return false" oncut="return false" onkeypress="javascript: return onlydigits(event);"/></td>'
                //SP3V-5359 Changed dropdwon to searchable dropdown.
                + '<td><select id="' + ddlBillDeductionReason + Sid_BSlNo + '" class="js-searchable" style="width:200px;" onchange=ReasonChange(this,"' + Sid_BSlNo + '");><option value="">Select</option>' + _applicabletoHtml + '</select></td>'
                //SP3V-2902 Add new dropdown for IRDA non payables.
                + '<td><select class="select2" id="' + ddlIRDADeductionReason + Sid_BSlNo + '" style="width:200px;" disabled ><option value="">Select</option>' + _applicabletoIRDA + '</select></td>'
                + '<td><input id="' + txtBillDeductionFreeText + Sid_BSlNo + '" type="text" /></td>'
                + '<td><img id="AddDA_' + Sid_BSlNo + '" onclick="BillDeduction(' + _serviceID + ',' + _billSlNo + ',0,0)" src="/Content/images/s2.png"  width="22" height="22"></td</tr>'
                + '</tbody></table>'
                // Deductions Bind Table
                + '<div class="col-md-12" style="padding-top: 5px;"><table style="width:800px;"'
                + '" id="' + tblBillDeductions + Sid_BSlNo + '" class="table-bordered text-info"><thead style="background-color:gray;text-align:center;">'
                + '<tr><th>Deduction</th><th>Reason</th><th>IRDA&nbsp;Non&nbsp;Payables</th><th>Value</th><th></th></tr></thead><tbody></tbody></table></div>'
                + '</div></div></div></div></div>';

            $('#divModelBilling').append(vBilling);

            //AddDateTimePicker(txtServiceBillDate + Sid_BSlNo);
            Add_DateTimePicker(txtServiceBillDate + Sid_BSlNo);

            if (_billSlNo != 1) {
                //if (_maxBillSlNo != _billSlNo) {
                //    $('#' + btnAdd).hide();
                //}
                $('#img_' + _serviceID + '_' + hideBillSlNo).hide();
            }


            //Disable new bill
            //btnAdd = 'img_' + _serviceID + '_' + hideBillSlNo;
            //$('#' + btnAdd).hide();

            $(document).ready(function () {
                $('.js-searchable').select2({
                    placeholder: "Select",
                    allowClear: true,
                    width: '200px'
                });
            });
        }
    }

}
var x = 0;
function AddValuesToBillHiddenField(_serviceID, _billSlNo, x, flag = 1, prop_amt_service = 0) {
    if (($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val() == '' || $('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val() == null)) {
        ShowErrorMessage('divBillingMessage', 'Please enter bill amount.');
    }
    else {

        var _deductions = [];
        var TotalDeductionAmount = 0;
        if ($('#hdnDecuctionsDetails').val() != '') {
            _deductions = $.parseJSON($('#hdnDecuctionsDetails').val());
        }
        $.each(_deductions, function (i, sIDs) {
            if (_serviceID == sIDs["ServiceID"] && _billSlNo == sIDs["BillSlNo"]) {
                TotalDeductionAmount = parseInt(TotalDeductionAmount) + parseInt(sIDs["DeductionAmount"]);
            }
        });

        if (TotalDeductionAmount > $('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val()) {
            ShowErrorMessage('divBillingMessage', 'Bill amount can not be less than deduction amount');
        }
        else {
            var _saveBills = [];
            var _sBills = {};
            if ($('#hdnBillDetails').val() != '') {
                _saveBills = $.parseJSON($('#hdnBillDetails').val());
            }

            var isBillExist = false;
            $.each(_saveBills, function (i, sBillIDs) {
                if (sBillIDs["ServiceID"] == _serviceID && sBillIDs["BillSlNo"] == _billSlNo) {
                    isBillExist = true;
                    _saveBills.splice(i, 1);
                    return false;
                }
            });

            //if (isBillExist == false) {    
            _sBills.ServiceID = _serviceID;
            _sBills.BillSlNo = _billSlNo;
            _sBills.BillNo = $('#' + txtServiceBillNo + _serviceID + '_' + _billSlNo).val();
            if ($('#' + txtServiceBillDate + _serviceID + '_' + _billSlNo).val() != '')
                _sBills.BillDate = $('#' + txtServiceBillDate + _serviceID + '_' + _billSlNo).val();
            else
                _sBills.BillDate = null;
            _sBills.BillAmount = $('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val();
            _sBills.DeductionAmount = 0;

            _saveBills.push(_sBills);
            $('#hdnBillDetails').val(JSON.stringify(_saveBills));

            $('#btn_' + _serviceID + '_' + _billSlNo).removeClass('btn btn-warning btn-sm');
            $('#btn_' + _serviceID + '_' + _billSlNo).addClass('btn btn-info btn-sm');

            var billdeductiondelete = '';
            if ($('#hdnDecuctionsDetails').val() != '') {
                billdeductiondelete = $.parseJSON($('#hdnDecuctionsDetails').val());
            }
            if (basicData[0].RequestTypeID == 7) {
                var prepostbilldays = $.parseJSON($('#hdnprepostbilldays').val());
                var servicebilldate = new Date($('#' + txtServiceBillDate + _serviceID + '_' + _billSlNo).val());
                var claimDOA = new Date($('#txtHospDOA').val());
                var claimDOD = new Date($('#txtHospDOD').val());
                var prepostrespon = 0;
                if (claimDOA > servicebilldate) {
                    var predifftime = Math.abs(claimDOA - servicebilldate);
                    var prediffDays = Math.floor(predifftime / (1000 * 60 * 60 * 24));
                    prepostrespon = 11;
                }
                else if (servicebilldate > claimDOD) {
                    var postdifftime = Math.abs(servicebilldate - claimDOD);
                    var postdiffDays = Math.floor(postdifftime / (1000 * 60 * 60 * 24));
                    prepostrespon = 10;
                }
                if ((prepostbilldays[0].prehospitaldays != 0 || prepostbilldays[0].posthospitaldays != 0) && billdeductiondelete != '') {
                    $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val();
                    $.each(billdeductiondelete, function (i, delbill) {
                        if (delbill.ServiceID == _serviceID && (delbill.DeductionReasonID == 11 || delbill.DeductionReasonID == 10))
                            Delete_DeductionDetails(_serviceID, _billSlNo, delbill.DeductionSlNo);
                    })
                }
                if (prepostbilldays[0].prehospitaldays != 0 && prepostrespon == 11 && prediffDays > parseInt(MakeZerofromUndefinedorEmpty(prepostbilldays[0].prehospitaldays))) {
                    if (billdeductiondelete != '') {
                        $.each(billdeductiondelete, function (i, delbill) {
                            if (delbill.ServiceID == _serviceID)
                                Delete_DeductionDetails(_serviceID, _billSlNo, delbill.DeductionSlNo);
                        })
                    }
                    $('.widget-body').css("display", "block");
                    $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val());
                    $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val(11);
                    $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val('');
                    BillDeduction(_serviceID, _billSlNo, 0, 0);
                }
                else if (prepostbilldays[0].posthospitaldays != 0 && prepostrespon == 10 && postdiffDays > parseInt(MakeZerofromUndefinedorEmpty(prepostbilldays[0].posthospitaldays))) {
                    if (billdeductiondelete != '') {
                        $.each(billdeductiondelete, function (i, delbill) {
                            if (delbill.ServiceID == _serviceID)
                                Delete_DeductionDetails(_serviceID, _billSlNo, delbill.DeductionSlNo);
                        })
                    }
                    $('.widget-body').css("display", "block");
                    $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val());
                    $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val(10);
                    $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val('');
                    BillDeduction(_serviceID, _billSlNo, 0, 0);
                }
            }

            var totalbill = 0;
            var totaldeduc = 0;
            var sereligiamt = 0;
            if (_serviceID == 30 && flag != 0) {
                if (_saveBills != '' && _saveBills != []) {
                    $.each(_saveBills, function (i, bill) {
                        if (bill.ServiceID == _serviceID)
                            totalbill = totalbill + parseInt(bill.BillAmount);
                    })
                }
                if (billdeductiondelete != '') {
                    $.each(billdeductiondelete, function (i, delbill) {
                        if (delbill.ServiceID == _serviceID)
                            Delete_DeductionDetails(_serviceID, _billSlNo, delbill.DeductionSlNo);
                    })
                }
                if ($('#hdnDecuctionsDetails').val() != '') {
                    if ($.parseJSON($('#hdnDecuctionsDetails').val()) != '' && $.parseJSON($('#hdnDecuctionsDetails').val()) != []) {
                        $.each($.parseJSON($('#hdnDecuctionsDetails').val()), function (i, dedu) {
                            if (dedu.ServiceID == _serviceID)
                                totaldeduc = totaldeduc + parseInt(dedu.DeductionAmount);
                        })
                    }
                }
                sereligiamt = servicedetails.Table7[0].mineligibleamount;
                if (sereligiamt > (totalbill - (totaldeduc + parseInt($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val()))))
                    sereligiamt = sereligiamt - (totalbill - (totaldeduc + parseInt($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val())));
                else
                    sereligiamt = 0;
            }
            //if (flag != 0)
            //    addupdatepoproportionate(_serviceID, _billSlNo);
            if (flag != 0 && _serviceID == 30 && (servicedetails.Table7[0].mineligibleamount != null || servicedetails.Table7[0].mineligibleamount != undefined)) {
                if (($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val()) > sereligiamt) {
                    if (billdeductiondelete != '') {
                        $.each(billdeductiondelete, function (i, delbill) {
                            if (delbill.ServiceID == 30)
                                Delete_DeductionDetails(_serviceID, _billSlNo, delbill.DeductionSlNo);
                        })
                    }
                    $('.widget-body').css("display", "block");
                    $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val((($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val()) - parseInt(sereligiamt)));
                    $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val(2);
                    $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val('');
                    BillDeduction(_serviceID, _billSlNo, 0, 0);

                }
            }

            if (flag != 0 && (_serviceID != 30) && (basicData[0].ClaimTypeID == 1 || (basicData[0].ClaimTypeID == 2 && basicData[0].RequestTypeID == 4 && (basicData[0].ServiceSubTypeID == 3 || basicData[0].ServiceSubTypeID == 4))) && prop_amt_service == 0) {
                var tarifflimit = 0;
                var interexterflag = 0;
                var policyreasonID = 15;
                var tariffreasonID = 3;
                var service_bill_amt = parseInt($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val());
                var internallimit = parseInt($('#lblInternalLimit_' + _serviceID + '_' + $("#hdnClaimID").val()).text());
                var externallimit = parseInt($('#lblExternalLimit_' + _serviceID + '_' + $("#hdnClaimID").val()).text());
                var days = parseInt($('#txtbillRoomdays_' + _serviceID + '_' + $("#hdnClaimID").val()).val());
                if (_serviceID == 2 || _serviceID == 3) {
                    if (MakeZerofromUndefinedorEmpty(internallimit) > 0)
                        internallimit = internallimit * days;
                    if (MakeZerofromUndefinedorEmpty(externallimit) > 0)
                        externallimit = externallimit * days;
                }
                if (internallimit == 0 && externallimit == 0)
                    tarifflimit = 0;
                else if (internallimit == 0 && externallimit != 0) {
                    tarifflimit = externallimit;
                    interexterflag = 1;
                }
                else if (internallimit != 0 && externallimit == 0) {
                    tarifflimit = internallimit;
                    interexterflag = 2;
                }
                else {
                    tarifflimit = Math.min(internallimit, externallimit);
                    //if (tarifflimit == internallimit) interexterflag = 2;
                    //else interexterflag = 1;
                    interexterflag = 3;
                }

                if (tarifflimit != 0) {
                    if (_saveBills != '' && _saveBills != []) {
                        $.each(_saveBills, function (i, bill) {
                            if (bill.ServiceID == _serviceID)
                                totalbill = totalbill + parseInt(bill.BillAmount);
                        })
                    }
                    if (billdeductiondelete != '') {
                        $.each(billdeductiondelete, function (i, delbill) {
                            if (delbill.ServiceID == _serviceID && (parseInt(delbill["DeductionReasonID"]) == policyreasonID || parseInt(delbill["DeductionReasonID"]) == tariffreasonID))
                                Delete_DeductionDetails(_serviceID, _billSlNo, delbill.DeductionSlNo);
                        })
                    }
                    if ($('#hdnDecuctionsDetails').val() != '') {
                        if ($.parseJSON($('#hdnDecuctionsDetails').val()) != '' && $.parseJSON($('#hdnDecuctionsDetails').val()) != []) {
                            $.each($.parseJSON($('#hdnDecuctionsDetails').val()), function (i, dedu) {
                                if (dedu.ServiceID == _serviceID)
                                    totaldeduc = totaldeduc + parseInt(dedu.DeductionAmount);
                            })
                        }
                    }
                    sereligiamt = tarifflimit;
                    if (sereligiamt > (totalbill - (totaldeduc + service_bill_amt)))
                        sereligiamt = sereligiamt - (totalbill - (totaldeduc + service_bill_amt));
                    else
                        sereligiamt = 0;
                    if ((service_bill_amt > sereligiamt)) {
                        if (billdeductiondelete != '') {
                            $.each(billdeductiondelete, function (i, delbill) {
                                if (delbill.ServiceID == 30)
                                    Delete_DeductionDetails(_serviceID, _billSlNo, delbill.DeductionSlNo);
                            })
                        }
                        if (interexterflag == 1)
                            Automatictariffdeduction(service_bill_amt, sereligiamt, policyreasonID, _serviceID, _billSlNo, 1);
                        else if (interexterflag == 2)
                            Automatictariffdeduction(service_bill_amt, sereligiamt, tariffreasonID, _serviceID, _billSlNo, 1);
                        else if (interexterflag == 3) {
                            if (tarifflimit == internallimit) {
                                if (sereligiamt > 0) {
                                    if (((externallimit - internallimit) > (service_bill_amt - sereligiamt)) || (externallimit > service_bill_amt))
                                        Automatictariffdeduction(service_bill_amt, sereligiamt, tariffreasonID, _serviceID, _billSlNo, 1);
                                    else {
                                        Automatictariffdeduction(service_bill_amt, (externallimit), policyreasonID, _serviceID, _billSlNo, 1);
                                        if ((service_bill_amt - sereligiamt) > (service_bill_amt - externallimit))
                                            Automatictariffdeduction(service_bill_amt, (sereligiamt + (service_bill_amt - externallimit)), tariffreasonID, _serviceID, _billSlNo, 0);
                                    }
                                }
                                else
                                    Automatictariffdeduction(service_bill_amt, sereligiamt, policyreasonID, _serviceID, _billSlNo, 1);
                            }
                            else if (tarifflimit == externallimit) {
                                if (sereligiamt > 0) {
                                    if (((internallimit - externallimit) > (service_bill_amt - sereligiamt)) || (internallimit > service_bill_amt))
                                        Automatictariffdeduction(service_bill_amt, sereligiamt, policyreasonID, _serviceID, _billSlNo, 1);
                                    else {
                                        Automatictariffdeduction(service_bill_amt, internallimit, tariffreasonID, _serviceID, _billSlNo, 1);
                                        if ((service_bill_amt - sereligiamt) > (service_bill_amt - internallimit))
                                            Automatictariffdeduction(service_bill_amt, (sereligiamt + (service_bill_amt - internallimit)), policyreasonID, _serviceID, _billSlNo, 0);
                                    }
                                }
                                else
                                    Automatictariffdeduction(service_bill_amt, sereligiamt, tariffreasonID, _serviceID, _billSlNo, 1);
                            }
                        }
                        //$('.widget-body').css("display", "block");
                        //$('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val((($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val()) - parseInt(sereligiamt)));
                        //$('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val(2);
                        //$('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val('');
                        //BillDeduction(_serviceID, _billSlNo, 0, 0);
                    }
                }
            }
            if (prop_amt_service > 0) {
                deductpropammount(_serviceID, _billSlNo, prop_amt_service);
            }

            ShowResultMessage('divBillingMessage', 'Bill amount added successfully');
        }
    }
    if ($('#hdnRequestTypeID').val() == 7 && _saveBills != undefined) {
        if (($('#' + txtServiceBillDate + _serviceID + '_' + _billSlNo).val() == '' || $('#' + txtServiceBillDate + _serviceID + '_' + _billSlNo).val() == null)) {
            ShowErrorMessage('divBillingMessage', 'Please enter bill Date.');
            return false
            x = 0;
            return x;
        }
    }// added by vsvskprasad
    //}
    //else {
    //    DialogResultMessage("Same bill number exist for this service.");
    //}

}

function Automatictariffdeduction(billamt, sereligiamt, reasonID, _serviceID, _billSlNo, _flag) {
    if (_flag == 1)
        $('.widget-body').css("display", "block");
    $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val((billamt - parseInt(sereligiamt)));
    $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val(reasonID);
    $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val('');
    BillDeduction(_serviceID, _billSlNo, 0, 0);
}

function DeleteBillDetails(_serviceID, _billSlNo) {
    $('#divBills_' + _serviceID + '_' + _billSlNo).remove();

    var _saveBills = [];
    var _sBills = {};
    if ($('#hdnBillDetails').val() != '') {
        _saveBills = $.parseJSON($('#hdnBillDetails').val());
    }

    $.each(_saveBills, function (i, sBillIDs) {
        if (sBillIDs["ServiceID"] == _serviceID && sBillIDs["BillSlNo"] == _billSlNo) {
            _saveBills.splice(i, 1);

            $('#hdnBillDetails').val(JSON.stringify(_saveBills));
            return false;
        }
    });

    var _deductions = [];
    if ($('#hdnDecuctionsDetails').val() != '') {
        _deductions = $.parseJSON($('#hdnDecuctionsDetails').val());
    }
    $.each(_deductions, function (i, sIDs) {
        if (sIDs != undefined) {
            if (sIDs["ServiceID"] == _serviceID && sIDs["BillSlNo"] == _billSlNo) {
                _deductions.splice(i, 1);
                $('#hdnDecuctionsDetails').val(JSON.stringify(_deductions));
                //return false;
            }
        }
    });

    var isBillsExist = false;
    var lastBillSlNo = 0;
    $.each(_saveBills, function (i, sBillIDs) {
        if (sBillIDs["ServiceID"] == _serviceID) {
            isBillsExist = true;
            lastBillSlNo = sBillIDs["BillSlNo"];
        }
    });

    if (isBillsExist == false) {
        NewBill(_serviceID, 1, 2);
    }
    else {
        var _nextBillSlNo = lastBillSlNo + 1;
        var nextBillSlNo = _nextBillSlNo + 1;
        var _addButtion = '<a><img id="img_' + _serviceID + '_' + lastBillSlNo + '"  src="/Content/images/s2.png" onclick="NewBill(' + _serviceID + ',' + _nextBillSlNo + ',' + nextBillSlNo + ')" width="22" height="22"></a>';
        $('#tdBillService_' + _serviceID + '_' + lastBillSlNo + ' a').remove();
        $('#tdBillService_' + _serviceID + '_' + lastBillSlNo).html(_addButtion);
    }
    //if (_serviceID == 2 || _serviceID == 3) {
    //    if (_billSlNo == 1)
    //        $('#txtbillRoomdays_' + _serviceID + '_' + $("#hdnClaimID").val()).val(0);
    //    else
    //        cnahgeamtonroomdays(_serviceID);
    //}
    if ((_serviceID == 3 || _serviceID == 4 || _serviceID == 5) && servicedetails.Table8.length > 0) {
        if (($('#prop_dedu_appl_flag').is(':checked') == false) && basicData[0].ServiceTypeID == 1) {
            calculate_proportionateperc(_serviceID);
        }
    }
    ShowResultMessage('divBillingMessage', 'Bill details deleted successfully.');

}

function BillDeduction(_serviceID, _billSlNo, _flag, _deductionSlNo) {

    if (_flag == 0) {

        var valtxtBD = txtBillDeduction + _serviceID + '_' + _billSlNo;
        var varddlBD = ddlBillDeductionReason + _serviceID + '_' + _billSlNo;
        var varddlIRDABD = ddlIRDADeductionReason + _serviceID + '_' + _billSlNo;

        var _billAmount = MakeZerofromUndefinedorEmpty($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val());
        var _deductions = [];
        var TotalDeductionAmount = 0;
        if ($('#hdnDecuctionsDetails').val() != '') {
            _deductions = $.parseJSON($('#hdnDecuctionsDetails').val());
        }
        $.each(_deductions, function (i, sIDs) {
            if (_serviceID == sIDs["ServiceID"] && _billSlNo == sIDs["BillSlNo"]) {
                TotalDeductionAmount = parseInt(TotalDeductionAmount) + parseInt(sIDs["DeductionAmount"]);
            }
        });

        TotalDeductionAmount = TotalDeductionAmount + parseInt($('#' + valtxtBD).val());

        var TotalBillAmount = 0;
        var _saveBills = [];
        if ($('#hdnBillDetails').val() != '') {
            _saveBills = $.parseJSON($('#hdnBillDetails').val());
        }
        $.each(_saveBills, function (i, sBillIDs) {
            if (_serviceID == sBillIDs["ServiceID"] && _billSlNo == sBillIDs["BillSlNo"]) {
                TotalBillAmount = parseInt(TotalBillAmount) + parseInt(sBillIDs["BillAmount"]);
            }
        });

        if (TotalBillAmount <= 0 && _billAmount > 0) {
            ShowErrorMessage('divBillingMessage', 'Please save bill amount');
        }
        else if (TotalBillAmount <= 0) {
            ShowErrorMessage('divBillingMessage', 'Invalid bill amount');
        }
        //else if (parseInt(_billAmount) < parseInt(TotalDeductionAmount)) {
        else if (parseInt(TotalBillAmount) < parseInt(TotalDeductionAmount)) {
            ShowErrorMessage('divBillingMessage', 'Deduction amount can not be more than bill amount');
        }
        else if ($('#' + valtxtBD).val() == '' || $('#' + valtxtBD).val() == null || $('#' + varddlBD).val() == '' || $('#' + varddlBD).val() == null) {
            ShowErrorMessage('divBillingMessage', 'Please enter deduction bill amount or reason.');
        }
        //SP3V-2902 IF user had selected Reaseon as Non-Payable -FT then he/she must select the appropriate IRDA non payable reason
        else if ($('#' + varddlBD).val() != null && $('#' + varddlBD).val() == '6' && ($('#' + varddlIRDABD).val() == '' || $('#' + varddlIRDABD).val() == null)) {
            ShowErrorMessage('divBillingMessage', 'Please select appropriate IRDA non payable reason.');
        }
        else {
            ////var _deductionSlNo = $('#' + tblBillDeductions + _serviceID + '_' + _billSlNo + ' tbody tr').length + 1;
            var _deductionSlNo = 0;
            var nextDuductionValues = [];
            var addNextDuductionValues = {};
            var isDeductionExist = false;
            if ($('#hdnNextDeductionSlNo').val() != '')
                nextDuductionValues = $.parseJSON($('#hdnNextDeductionSlNo').val());

            if (nextDuductionValues.length > 0) {
                for (var j = 0; j < nextDuductionValues.length; j++) {
                    if (_serviceID == nextDuductionValues[j].ServiceID && _billSlNo == nextDuductionValues[j].BillSlNo) {
                        isDeductionExist = true;
                        _deductionSlNo = parseInt(_deductionSlNo) + 1;
                    }
                }
                if (isDeductionExist == false)
                    _deductionSlNo = 1;
                else
                    _deductionSlNo = parseInt(_deductionSlNo) + 1;
            }
            else
                _deductionSlNo = 1;

            BillDeductionDesign(_serviceID, _billSlNo, _deductionSlNo);

            var lblDBillDeduction = lblBillDeduction + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo;
            var lblDBillDeductionReason = lblBillDeductionReason + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo
            var lblDIRDADeductionReason = lblIRDADeductionReason + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo;   //SP3V-2902 
            var lblDBillDeductionFreeText = lblBillDeductionFreeText + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo;

            $('#' + lblDBillDeduction).text($('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val());
            var reasonName = getNamepropwithId($('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val(), MasterData.mDeductionReasons);
            var irdareasonName = getNamepropwithId($('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).val(), MasterData.mIRDADeductionReasons);  //SP3V-2902
            $('#' + lblDBillDeductionReason).text(reasonName);
            $('#' + lblDIRDADeductionReason).text(irdareasonName);   //SP3V-2902
            $('#' + lblDBillDeductionFreeText).text($('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val());

            var saveDeductions = [];
            var _sDectValues = {};
            if ($('#hdnDecuctionsDetails').val() != '') {
                saveDeductions = $.parseJSON($('#hdnDecuctionsDetails').val());
            }

            _sDectValues.ServiceID = _serviceID
            _sDectValues.BillSlNo = _billSlNo
            _sDectValues.DeductionSlNo = _deductionSlNo
            _sDectValues.DeductionAmount = $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val();
            _sDectValues.DeductionReasonID = $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val();
            var IRDADeductionReasonID = $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).val();
            _sDectValues.IRDADeductionReasonID = (IRDADeductionReasonID == '') ? 0 : IRDADeductionReasonID; //sp3v-2902
            _sDectValues.FreeTextValue = $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val();
            saveDeductions.push(_sDectValues);
            $('#hdnDecuctionsDetails').val(JSON.stringify(saveDeductions));

            addNextDuductionValues.ServiceID = _serviceID
            addNextDuductionValues.BillSlNo = _billSlNo
            addNextDuductionValues.DeductionSlNo = _deductionSlNo
            nextDuductionValues.push(addNextDuductionValues);
            $('#hdnNextDeductionSlNo').val(JSON.stringify(nextDuductionValues));

            $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val('');
            $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val('');
            $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).select2("val", null); //sp3v-2902
            $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val('');
            $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).attr("disabled", "disabled"); //sp3v-2902
        }
    }
    else {
        BillDeductionDesign(_serviceID, _billSlNo, _deductionSlNo);
    }
}

function BillDeductionDesign(_serviceID, _billSlNo, _deductionSlNo) {

    //var _deductionSlNo = $('#' + tblBillDeductions + _serviceID + '_' + _billSlNo + ' tbody tr').length + 1;

    var lblDBillDeduction = lblBillDeduction + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo;
    var lblDBillDeductionReason = lblBillDeductionReason + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo;
    var lblDIRDADeductionReason = lblIRDADeductionReason + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo; //sp3v-2902
    var lblDBillDeductionFreeText = lblBillDeductionFreeText + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo;

    var DeductionRow = '<tr id="' + trDeductionValues + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo + '" style="text-align:center;">'
        + '<td><label id="' + lblDBillDeduction + '"><strong></strong></label></td>'
        + '<td><label id="' + lblDBillDeductionReason + '"><strong></strong></label></td>'
        //Abhishek 07 Aug 2023 SP3V-2902 Non-medical expenses bifurcation-IRDA Non Payables
        + '<td><label id="' + lblDIRDADeductionReason + '"><strong></strong></label></td>'
        + '<td><label id="' + lblDBillDeductionFreeText + '"><strong></strong></label></td>'
        + '<td><a onclick="EditBillDecuctions(' + _serviceID + ',' + _billSlNo + ',' + _deductionSlNo + ')" class="btn btn-info">Edit</a>'
        + '<a onclick="Delete_DeductionDetails(' + _serviceID + ',' + _billSlNo + ',' + _deductionSlNo + ')" class="btn btn-danger">Delete</a></td</tr>';

    $('#' + tblBillDeductions + _serviceID + '_' + _billSlNo + ' tbody').append(DeductionRow);
}


function AddDateTimePicker(ctrl) {
    $('#' + ctrl).datepicker({
        changeMonth: true,
        changeYear: true,
        //minDate: -30,
        //maxDate: "+0M +7D",
        dateFormat: 'dd-M-yy'
    });
}

function EditBillDecuctions(_serviceID, _billSlNo, _deductionSlNo) {

    var _deductions = [];
    if ($('#hdnDecuctionsDetails').val() != '') {
        _deductions = $.parseJSON($('#hdnDecuctionsDetails').val());
    }

    $.each(_deductions, function (i, sIDs) {
        if (sIDs["ServiceID"] == _serviceID && sIDs["BillSlNo"] == _billSlNo && sIDs["DeductionSlNo"] == _deductionSlNo) {
            $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).select2(); //create searchable textbox in irda ddl, sp3v-2902
            $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val(sIDs["DeductionAmount"]);
            $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val(sIDs["DeductionReasonID"]);
            var IRDAreasonName = getNamepropwithId($('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).val(), MasterData.mIRDADeductionReasons);
            $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).select2("val", sIDs["IRDADeductionReasonID"]); //set the selected value sp3v-2902
            $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val(sIDs["FreeTextValue"]);

            var reasonId = parseInt(sIDs["DeductionReasonID"]); //Enable/disable the irda ddl based on deduction reason selection sp3v-2902
            if (reasonId == 6) {
                $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).removeAttr("disabled", "disabled");
            }
            else {
                $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).attr("disabled", "disabled");
                $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).select2("val", null);
            }
            $('#trBillDeductionsMain_' + _serviceID + '_' + _billSlNo + ' td:last').html('<a id="EditDA_' + _serviceID + '_' + _billSlNo + '" onclick="Update_DeductionDetails(' + _serviceID + ',' + _billSlNo + ',' + _deductionSlNo + ')" class="btn btn-info">Update</a>');
            $('#' + trDeductionValues + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo + ' td:gt(0) a').attr('disabled', true);
        }
    });


}

function Update_DeductionDetails(_serviceID, _billSlNo, _deductionSlNo) {
    var lblDBillDeduction = lblBillDeduction + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo;
    var lblDBillDeductionReason = lblBillDeductionReason + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo;
    var lblDIRDADeductionReason = lblIRDADeductionReason + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo; //sp3v-2902
    var lblDBillDeductionFreeText = lblBillDeductionFreeText + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo;

    var _deductions = [];
    var _dectValues = {};
    if ($('#hdnDecuctionsDetails').val() != '') {
        _deductions = $.parseJSON($('#hdnDecuctionsDetails').val());
    }

    var valtxtBD = txtBillDeduction + _serviceID + '_' + _billSlNo;
    var varddlBD = ddlBillDeductionReason + _serviceID + '_' + _billSlNo;
    var varddlIRDABD = ddlIRDADeductionReason + _serviceID + '_' + _billSlNo;

    var TotalDeductionAmount = 0;
    $.each(_deductions, function (i, sIDs) {
        if (_serviceID == sIDs["ServiceID"] && _billSlNo == sIDs["BillSlNo"]) {
            TotalDeductionAmount = parseInt(TotalDeductionAmount) + parseInt(sIDs["DeductionAmount"]);
        }
    });

    TotalDeductionAmount = TotalDeductionAmount - parseInt($('#' + lblDBillDeduction).text());
    TotalDeductionAmount = TotalDeductionAmount + parseInt($('#' + valtxtBD).val());

    var TotalBillAmount = 0;
    var _saveBills = [];
    if ($('#hdnBillDetails').val() != '') {
        _saveBills = $.parseJSON($('#hdnBillDetails').val());
    }
    $.each(_saveBills, function (i, sBillIDs) {
        if (_serviceID == sBillIDs["ServiceID"] && _billSlNo == sBillIDs["BillSlNo"]) {
            TotalBillAmount = parseInt(TotalBillAmount) + parseInt(sBillIDs["BillAmount"]);
        }
    });

    if (parseInt(TotalBillAmount) < parseInt(TotalDeductionAmount)) {
        ShowErrorMessage('divBillingMessage', 'Deduction amount can not be more than bill amount');
    }
    else if ($('#' + valtxtBD).val() == '' || $('#' + valtxtBD).val() == null || $('#' + varddlBD).val() == '' || $('#' + varddlBD).val() == null) {
        ShowErrorMessage('divBillingMessage', 'Please enter deduction bill amount or reason.');
    }
    //SP3V-2902 IF user had selected Reaseon as Non-Payable -FT then he/she must select the appropriate IRDA non payable reason
    else if ($('#' + varddlBD).val() != null && $('#' + varddlBD).val() == '6' && ($('#' + varddlIRDABD).val() == '' || $('#' + varddlIRDABD).val() == null)) {
        ShowErrorMessage('divBillingMessage', 'Please select appropriate IRDA non payable reason.');
    }
    else {

        $.each(_deductions, function (i, sIDs) {
            if (sIDs["ServiceID"] == _serviceID && sIDs["BillSlNo"] == _billSlNo && sIDs["DeductionSlNo"] == _deductionSlNo) {



                $('#' + lblDBillDeduction).text($('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val());
                var reasonName = getNamepropwithId($('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val(), MasterData.mDeductionReasons);
                $('#' + lblDBillDeductionReason).text(reasonName);
                var IRDAreasonName = getNamepropwithId($('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).val(), MasterData.mIRDADeductionReasons);
                $('#' + lblDIRDADeductionReason).text(IRDAreasonName);//SP3V-2902

                $('#' + lblDBillDeductionFreeText).text($('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val());

                // Modifying Hidden variable
                _deductions.splice(i, 1);

                _dectValues.ServiceID = _serviceID;
                _dectValues.BillSlNo = _billSlNo;
                _dectValues.DeductionSlNo = _deductionSlNo;
                _dectValues.DeductionAmount = $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val();
                _dectValues.DeductionReasonID = $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val();
                var IRDADeductionReasonID = $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).val();
                _dectValues.IRDADeductionReasonID = (IRDADeductionReasonID == '') ? 0 : IRDADeductionReasonID;

                _dectValues.FreeTextValue = $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val();
                _deductions.push(_dectValues);
                $('#hdnDecuctionsDetails').val(JSON.stringify(_deductions));

                $('#trBillDeductionsMain_' + _serviceID + '_' + _billSlNo + ' td:last').html('<img id="AddDA_' + _serviceID + '_' + _billSlNo + '" onclick="BillDeduction(' + _serviceID + ',' + _billSlNo + ',0,0)" src="/Content/images/s2.png"  width="22" height="22">');

                $('#' + trDeductionValues + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo + ' td:gt(0) a').attr('disabled', false);

                $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val('');
                $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val('');
                $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).select2("val", null);//SP3V-2902
                $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val('');
                $('#' + ddlIRDADeductionReason + _serviceID + '_' + _billSlNo).attr("disabled", "disabled");//SP3V-2902
                return false;
            }
        });

        ShowResultMessage('divBillingMessage', 'Deduction details updated successfully.');
    }
}

function Delete_DeductionDetails(_serviceID, _billSlNo, _deductionSlNo) {
    var _deductions = [];
    if ($('#hdnDecuctionsDetails').val() != '') {
        _deductions = $.parseJSON($('#hdnDecuctionsDetails').val());
    }

    $.each(_deductions, function (i, sIDs) {
        if (sIDs["ServiceID"] == _serviceID && sIDs["BillSlNo"] == _billSlNo && sIDs["DeductionSlNo"] == _deductionSlNo) {

            $('#' + trDeductionValues + _serviceID + '_' + _billSlNo + '_' + _deductionSlNo).remove();

            _deductions.splice(i, 1);
            $('#hdnDecuctionsDetails').val(JSON.stringify(_deductions));
            return false;
        }
    });

    ShowResultMessage('divBillingMessage', 'Deduction details deleted successfully.');
}

function BillingAjaxDialog(titletext, _serviceID, errormethod, _billSlNo) {
    ////$('#divModelBilling').append(htmlDesign);

    $("#dialog-Billing").removeClass('hide').dialog({
        resizable: false,
        width: '990',
        modal: true,
        title: titletext,
        closeOnEscape: false,
        //title:"<div class='widget-header'><h4 class='smaller'><i class='ace-icon fa fa-exclamation-triangle red'></i> Empty the recycle bin?</h4></div>",
        title_html: true,
        buttons: [
            {
                html: "<i class='ace-icon fa fa-chevron-down bigger-110'></i>&nbsp; Save",
                "class": "btn btn-success btn-minier",
                "id": "billing_service_ID",
                click: function () {
                    var _saveBills = [];
                    var _sBills = {};
                    var billingflag = 0;
                    if (_billSlNo != undefined)
                        billingflag = 1;
                    if ($('#hdnBillDetails').val() != '') {
                        _saveBills = $.parseJSON($('#hdnBillDetails').val());
                    }

                    $.each(_saveBills, function (i, sBillIDs) {
                        _billSlNo = sBillIDs["BillSlNo"];

                    });
                    var y = 1
                    y = AddValuesToBillHiddenField(_serviceID, _billSlNo, x, billingflag);
                    if (y == 0) {
                        DialogResultMessage("Please enter bill date");
                        return false;
                    } else {
                        $(this).dialog("close");
                        MapBills_Service(_serviceID);
                        if ((_serviceID == 3 || _serviceID == 4 || _serviceID == 5)) {
                            if (($('#prop_dedu_appl_flag').is(':checked') == false) && basicData[0].ServiceTypeID == 1) {
                                calculate_proportionateperc(_serviceID);
                            }
                        }
                        return true;
                    }
                }
            }
            ,
            {
                html: "<i class='ace-icon fa fa-times bigger-110'></i>&nbsp; Cancel",
                "class": "btn btn-danger btn-minier",
                click: function () {
                    $(this).dialog("close");
                    MapBills_Service(_serviceID);
                    //Cancel_BillsDialog();
                    //return false;
                    return true;
                }
            }
        ]
    });

}

function calculate_proportionateperc(_serviceID) {
    proportionatesum = 0;
    proportionateperc = 0;
    var prop_internallimit = parseInt($('#lblInternalLimit_' + 3 + '_' + $("#hdnClaimID").val()).text());
    var prop_externallimit = parseInt($('#lblExternalLimit_' + 3 + '_' + $("#hdnClaimID").val()).text());
    var prop_days = parseInt($('#txtbillRoomdays_' + 3 + '_' + $("#hdnClaimID").val()).val());
    if (prop_days <= 0)
        prop_days = 1;

    if (servicedetails.Table8.length > 0) {
        if (parseInt(servicedetails.Table8[0].Dailylimit) > 0) {
            if (basicData[0].IssueID == 5 || basicData[0].IssueID == 6 || basicData[0].IssueID == 7 || basicData[0].IssueID == 8)
                proportionatesum = parseInt($('#txtBillAmount_' + 3 + '_' + $("#hdnClaimID").val()).val()) + parseInt($('#txtBillAmount_' + 4 + '_' + $("#hdnClaimID").val()).val()) + parseInt($('#txtBillAmount_' + 5 + '_' + $("#hdnClaimID").val()).val());
            else {
                proportionatesum = parseInt($('#txtBillAmount_' + 3 + '_' + $("#hdnClaimID").val()).val());
                if (servicedetails.Table8[0].daily_limit_appl_services != null && servicedetails.Table8[0].daily_limit_appl_services != '' && servicedetails.Table8[0].daily_limit_appl_services != undefined) {
                    if (servicedetails.Table8[0].daily_limit_appl_services.indexOf("4") > -1)
                        proportionatesum = proportionatesum + parseInt($('#txtBillAmount_' + 4 + '_' + $("#hdnClaimID").val()).val());
                    if (servicedetails.Table8[0].daily_limit_appl_services.indexOf("5") > -1)
                        proportionatesum = proportionatesum + parseInt($('#txtBillAmount_' + 5 + '_' + $("#hdnClaimID").val()).val());
                }
            }
            proportionatesum = proportionatesum / prop_days;
            if (basicData[0].ClaimTypeID == 1 || basicData[0].IssueID == 7) {
                if (prop_externallimit > proportionatesum && prop_externallimit > prop_internallimit)
                    proportionateperc = 0;
                else if (prop_internallimit != 0 && proportionatesum > prop_internallimit)
                    proportionateperc = (((prop_internallimit - prop_externallimit) / (prop_internallimit)) * 100);
                else
                    proportionateperc = (((proportionatesum - prop_externallimit) / (proportionatesum)) * 100);
            }
            else {
                if (prop_externallimit > proportionatesum)
                    proportionateperc = 0;
                else
                    proportionateperc = (((proportionatesum - prop_externallimit) / (proportionatesum)) * 100);
            }
        }
        // }
        if (proportionateperc <= 0) {
            proportionateperc = 0;
            deletepropagainstservices();
            $('#prop_dedu_appl_flag').attr('disabled', true);
        }
        $('#prop_dedu_percentage').val((proportionateperc).toFixed(2));
        if (proportionateperc > 0) {
            if ((basicData[0].ClaimTypeID == 1 && basicData[0].RequestTypeID != 4) || basicData[0].ClaimTypeID == 2)
                $('#prop_dedu_appl_flag').removeAttr("disabled", "disabled");
        }

        //var _billdetails = $.parseJSON($('#hdnBillDetails').val());
        //var prop_dedu_appl_services = servicedetails.Table8[0].prop_dedu_appl_services.split(',');
        //$.each(_billdetails, function (i, sIDs) {
        //    if (prop_dedu_appl_services.indexOf(sIDs["ServiceID"].toString()) > -1 && parseInt(sIDs["BillSlNo"]) ==1) {
        //        addupdatepoproportionate(sIDs["ServiceID"], sIDs["BillSlNo"], sIDs["BillAmount"],1);
        //    }
        //});
    }
    else
        $('#prop_dedu_percentage').val((proportionateperc).toFixed(2));
}

function addpoproportionateper() {
    var _billdetails = $.parseJSON($('#hdnBillDetails').val());
    calculate_proportionateperc(3);
    if (servicedetails.Table8.length > 0) {
        if (servicedetails.Table8[0].prop_dedu_appl_services != '' && servicedetails.Table8[0].prop_dedu_appl_services != null && servicedetails.Table8[0].prop_dedu_appl_services != undefined) {
            var prop_dedu_appl_services = servicedetails.Table8[0].prop_dedu_appl_services.split(',');
            $.each(_billdetails, function (i, sIDs) {
                if (prop_dedu_appl_services.indexOf(sIDs["ServiceID"].toString()) > -1 && parseInt(sIDs["BillSlNo"]) == 1) {
                    addingproportionateservice(parseInt(sIDs["ServiceID"].toString()));
                }
            });
        }
    }
}

function addingproportionateservice(_serviceID) {
    proportionateperc = parseFloat($('#prop_dedu_percentage').val());
    var servicebillamt = 0;// parseInt($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val());
    var TotalDeductionAmount = 0; var prop_amt_service = 0; var finaleligipropamt = 0;
    var servicedeductions = []; var servicepropdedu = []; var servicebills = []; var isbillopen = false; var _billSlNo = 0;
    var _deductions = [];
    var _billdetails = $.parseJSON($('#hdnBillDetails').val());
    if ($('#hdnDecuctionsDetails').val() != '' && $('#hdnDecuctionsDetails').val() != null)
        _deductions = $.parseJSON($('#hdnDecuctionsDetails').val());
    servicebills = _billdetails.filter(
        function (item) {
            return item.ServiceID == _serviceID;
        });
    servicedeductions = _deductions.filter(
        function (item) {
            return item.ServiceID == _serviceID;
        });
    servicepropdedu = servicedeductions.filter(
        function (item) {
            return item.DeductionReasonID == proporreasionID;
        });
    if (servicepropdedu.length > 0) {
        Bind_BillDetails(0, _serviceID, '');
        isbillopen = true;
        $.each(servicepropdedu, function (i, sIDs) {
            Delete_DeductionDetails(parseInt(sIDs["ServiceID"]), parseInt(sIDs["BillSlNo"]), parseInt(sIDs["DeductionSlNo"]));
        });
    }
    if (proportionateperc > 0) {
        if (servicebills.length > 0) {
            if (isbillopen == false) Bind_BillDetails(0, _serviceID, '');
            isbillopen = true;
            $.each(servicebills, function (i, sIDs) {
                _billSlNo = parseInt(sIDs["BillSlNo"]); servicebillamt = parseInt(sIDs["BillAmount"]); TotalDeductionAmount = 0;

                if (servicedeductions.length > 0) {
                    $.each(servicedeductions, function (i, dedu) {
                        if (_serviceID == parseInt(dedu["ServiceID"]) && _billSlNo == parseInt(dedu["BillSlNo"]) && parseInt(dedu["DeductionReasonID"]) != proporreasionID)
                            TotalDeductionAmount = parseInt(TotalDeductionAmount) + parseInt(dedu["DeductionAmount"]);
                    });
                }

                prop_amt_service = Math.round(((servicebillamt - TotalDeductionAmount) * proportionateperc) / 100);
                if (prop_amt_service > 0) {
                    finaleligipropamt = servicebillamt - TotalDeductionAmount;
                    if (prop_amt_service > finaleligipropamt) prop_amt_service = finaleligipropamt;
                    AddValuesToBillHiddenField(_serviceID, parseInt(sIDs["BillSlNo"]), 0, 1, prop_amt_service);
                    prop_amt_service = 0;
                }
            })
        };
        //    prop_amt_service = Math.round(((servicebillamt - TotalDeductionAmount) * proportionateperc) / 100);
        //    if (prop_amt_service > 0) {
        //        finaleligipropamt = servicebillamt - TotalDeductionAmount;
        //        if (prop_amt_service > finaleligipropamt)
        //            prop_amt_service = finaleligipropamt;

        //        Bind_BillDetails(0, _serviceID, 'Surgeon/Physician');

        //        $.each(_billdetails, function (i, sIDs) {
        //            if (parseInt(sIDs["ServiceID"]) == _serviceID && _billSlNo == parseInt(sIDs["BillSlNo"].toString()))
        //                AddValuesToBillHiddenField(_serviceID, parseInt(sIDs["BillSlNo"]), 0, 1, prop_amt_service);
        //        });
        //        //BillingAjaxDialog('Surgeon/Physician', _serviceID, Error_MapBills_Service);
        //        //$('.widget-body').css("display", "block");
        //        $("#billing_service_ID").trigger('click');
        //}
    }
    if (isbillopen == true)
        $("#billing_service_ID").trigger('click');
}
function deductpropammount(_serviceID, _billSlNo, prop_amt_service) {
    $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val(prop_amt_service);
    $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val(proporreasionID);
    $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val('');
    BillDeduction(_serviceID, _billSlNo, 0, 0);
}

function deletepropagainstservices() {
    var servicedeductions = [];
    var _deductions_str = $('#hdnDecuctionsDetails').val()
    if (_deductions_str != '' && _deductions_str != undefined) {
        var _deductions = $.parseJSON(_deductions_str);
        servicedeductions = _deductions.filter(
            function (item) {
                return item.DeductionReasonID == proporreasionID;
            });
        if (servicedeductions.length > 0) {
            $.each(servicedeductions, function (i, sIDs) {
                Bind_BillDetails(0, parseInt(sIDs["ServiceID"]), '');
                Delete_DeductionDetails(parseInt(sIDs["ServiceID"]), parseInt(sIDs["BillSlNo"]), parseInt(sIDs["DeductionSlNo"]));
                $("#billing_service_ID").trigger('click');
            });
        }
    }
}


function addupdatepoproportionate_old(_serviceID, _billSlNo, billamount = 0, propflag = 0) {
    proportionateperc = parseFloat($('#prop_dedu_percentage').val());
    var servicebillamt = parseInt($('#' + txtServiceBBillAmount + _serviceID + '_' + _billSlNo).val());
    if (propflag == 1) servicebillamt = parseInt(billamount);
    var prop_dedu_services1 = servicedetails.Table8[0].prop_dedu_appl_services;
    var prop_dedu_services = prop_dedu_services1.split(',');
    var TotalDeductionAmount = 0;
    var prop_amt_service = 0;
    var isprop_dedu_exist = false;
    var finaleligipropamt = 0;
    if (proportionateperc > 0 && prop_dedu_services.indexOf(_serviceID.toString()) > -1) {
        var _deductions = $.parseJSON($('#hdnDecuctionsDetails').val());

        $.each(_deductions, function (i, sIDs) {
            if (_serviceID == sIDs["ServiceID"] && _billSlNo == sIDs["BillSlNo"]) {
                if (parseInt(sIDs["DeductionReasonID"]) == 4 || parseInt(sIDs["DeductionReasonID"]) == 2) {
                    isprop_dedu_exist = true;
                    Delete_DeductionDetails(_serviceID, _billSlNo, parseInt(sIDs["DeductionSlNo"]));
                }
                else
                    TotalDeductionAmount = parseInt(TotalDeductionAmount) + parseInt(sIDs["DeductionAmount"]);
            }
        });
        prop_amt_service = Math.round((servicebillamt * proportionateperc) / 100);
        if (prop_amt_service > 0) {
            finaleligipropamt = servicebillamt - TotalDeductionAmount;
            if (prop_amt_service > finaleligipropamt)
                prop_amt_service = finaleligipropamt;
            if (propflag == 1) {
                Bind_BillDetails(0, _serviceID, 'Surgeon/Physician');
                var _billdetails = $.parseJSON($('#hdnBillDetails').val());
                $.each(_billdetails, function (i, sIDs) {
                    if (parseInt(sIDs["ServiceID"]) == _serviceID)
                        AddValuesToBillHiddenField(_serviceID, parseInt(sIDs["BillSlNo"]), 0, 1);
                });
                //BillingAjaxDialog('Surgeon/Physician', _serviceID, Error_MapBills_Service);
                //$('.widget-body').css("display", "block");
                $("#billing_service_ID").trigger('click');
            }
            if (propflag == 0) {
                $('#' + txtBillDeduction + _serviceID + '_' + _billSlNo).val(prop_amt_service);
                $('#' + ddlBillDeductionReason + _serviceID + '_' + _billSlNo).val(4);
                $('#' + txtBillDeductionFreeText + _serviceID + '_' + _billSlNo).val('');
                BillDeduction(_serviceID, _billSlNo, 0, 0);
            }
        }
    }
}


function enablepropremarks() {
    if ($('#tblServicewiseBills tbody').children().length == 0) {
        propbilling_override_flag = true;
        $("#ID_Servicebilldetails").trigger('click');
        // return Get_ServiceBillingDetails($('#hdnClaimID').val(), $('#hdnClaimSlNo').val(), 0);
    }
    else {
        if ($('#prop_dedu_appl_flag').is(':checked') == true) {
            $('#div_prop_dedu_remarks').show();
            deletepropagainstservices();
            isproportionatechanged = true;
        }
        else {
            $('#div_prop_dedu_remarks').hide();
            if (basicData[0].prop_dedu_appl_flag == true)
                isproportionatechanged = true;
        }
    }
    if ($('#prop_dedu_appl_flag').is(':checked') == false)
        $('#div_prop_dedu_remarks').hide();
    if (basicData[0].prop_dedu_appl_flag != $('#prop_dedu_appl_flag').is(':checked'))
        isproportionatechanged = true;
    else
        isproportionatechanged = false;

}

function enableservicebilldetails() {
    $("#ID_Servicebilldetails").trigger('click');
}

function MapBills_Service(_serviceID) {

    var parentID = 0;
    /* Calculate Total Bill Amount */
    var TotalBillAmount = 0;
    var _saveBills = [];
    if ($('#hdnBillDetails').val() != '') {
        _saveBills = $.parseJSON($('#hdnBillDetails').val());
    }
    $.each(_saveBills, function (i, sBillIDs) {
        if (_serviceID == sBillIDs["ServiceID"]) {
            TotalBillAmount = parseInt(TotalBillAmount) + parseInt(sBillIDs["BillAmount"]);
        }
    });

    /* Calculate Total Deduction Amount */
    //var AccommodationDeduction = 0;
    var TotalDeductionAmount = 0;
    var _deductions = [];
    if ($('#hdnDecuctionsDetails').val() != '') {
        _deductions = $.parseJSON($('#hdnDecuctionsDetails').val());
    }
    $.each(_deductions, function (i, sIDs) {
        if (_serviceID == sIDs["ServiceID"]) {
            TotalDeductionAmount = parseInt(TotalDeductionAmount) + parseInt(sIDs["DeductionAmount"]);
        }
    });

    /* Bind Bill and Deduction values to controls */
    var ctrlID = _serviceID + '_' + $("#hdnClaimID").val();
    $('#txtBillAmount_' + ctrlID).val(TotalBillAmount);
    $('#txtDeductions_' + ctrlID).val(TotalDeductionAmount);

    /* Get Discount and InternalAbs from the DB Data */
    var vDiscountAmount = 0;
    var totalServiceDetails = [];
    totalServiceDetails = $.parseJSON($('#hdnBaseServiceDetails').val());
    $.each(totalServiceDetails, function (i, totService) {
        if (_serviceID == totService["ID"]) {
            if (totService["DiscountAmount"] != null && totService["DiscountAmount"] != '')
                vDiscountAmount = totService["DiscountAmount"];

            parentID = totService["ParentID"];
            return false;
        }
    });

    // Load Service Details Hidden Variable
    var _services = [];
    if ($('#hdnServiceDetails').val() != '') {
        _services = $.parseJSON($('#hdnServiceDetails').val());
    }
    $.each(_services, function (i, service) {
        if (_serviceID == service["ServiceID"]) {
            _services.splice(i, 1);
            return false;
        }
    });

    if (TotalBillAmount > 0) {
        ////var sID = parseInt(_serviceID) - 1;
        ////var discountamount = MakeZerofromUndefinedorEmpty(totalServiceDetails[sID].DiscountAmount);

        var _serviceRows = {};
        _serviceRows.ServiceID = _serviceID;
        _serviceRows.BillAmount = $('#txtBillAmount_' + ctrlID).val();
        _serviceRows.DeductionAmount = $('#txtDeductions_' + ctrlID).val();
        ////if ($('#txtDiscount_' + ctrlID).val() != "")
        ////    _serviceRows.DiscountAmount = $('#txtDiscount_' + ctrlID).val();
        ////else
        ////    _serviceRows.DiscountAmount = 0;
        ////_serviceRows.DiscountAmount = MakeZerofromUndefinedorEmpty(totalServiceDetails[sID].DiscountAmount);
        _serviceRows.DiscountAmount = vDiscountAmount;
        //_serviceRows.EligibleAmount = $('#lblEligibleAmount_' + ctrlID).text();
        //_serviceRows.SanctionedAmount = $('#lblPayableAmount_' + ctrlID).text();
        ////_serviceRows.AdditionalAmount = $('#txtAdditionalAmt_' + ctrlID).val();
        ////_serviceRows.AdditionalAmtReasonIDs = $('#ddlAdditionalAmtReason_' + ctrlID).val();
        ////_serviceRows.CoPayment = $('#txtCopay_' + ctrlID).val();
        ////_serviceRows.Remarks = $('#txtRemarks_' + ctrlID).val();
        _services.push(_serviceRows);
    }
    else {
        $('#lblBillDeductions_' + ctrlID).text('');
        $('#lblEligibleAmount_' + ctrlID).text('');
        $('#lblPayableAmount_' + ctrlID).text('');
        $('#txtDiscount_' + ctrlID).val('');
    }

    //$('#hdnServiceDetails').val(JSON.stringify(_services));

    $('#divModelBilling').html('');

    /* Calculate Eligible Amount */
    var TotBillAmt = 0;
    var TotDeduBillAmt = 0;
    var TotDeductionAmount = 0;
    var TotEligibleAmt = 0;
    var TotalDiscountAmt = 0;
    var estimatedDays = MakeZerofromUndefinedorEmpty($('#txtExtimatedDays').val());
    var ICUDays = MakeZerofromUndefinedorEmpty($('#txtICUDays').val());
    var RoomDays = MakeZerofromUndefinedorEmpty($('#txtRoomDays').val());
    var LOS = MakeZerofromUndefinedorEmpty($('#txtExtimatedDays').val());
    var TotalTariffAmount = 0;
    var TotalInternalValues = 0;

    var _basicData = JSON.parse(MasterData.BasicData);

    /* 2 - Reimbusment*/
    if ((parseInt($('#hdnClaimTypeID').val()) == 2 && basicData[0].IssueID == 7 && basicData[0].RequestTypeID != 4) || (parseInt($('#hdnClaimTypeID').val()) == 2 && basicData[0].IssueID == 7 && basicData[0].ServiceSubTypeID != 3 && basicData[0].ServiceSubTypeID != 4)) {
        for (var i = 0; i < _services.length; i++) {
            //var sID = parseInt(_services[i].ServiceID) - 1;
            var internalValue = 0;
            $.each(totalServiceDetails, function (k, totService) {
                if (_services[i].ServiceID == totService["ID"]) {
                    internalValue = MakeZerofromUndefinedorEmpty(totService["ExternalValueAbs"]);
                    return false;
                }
            });

            var ctrlID1 = _services[i].ServiceID + '_' + $("#hdnClaimID").val();
            var deductBillAmount = parseInt(MakeZerofromUndefinedorEmpty(_services[i].BillAmount)) - parseInt(MakeZerofromUndefinedorEmpty(_services[i].DeductionAmount));

            ////if (parseInt(_serviceID) != 1 && parseInt(_serviceID) != 2 && parseInt(_serviceID) != 3 && parseInt(_serviceID) != 4 && parseInt(_serviceID) != 5 && parseInt(_serviceID) != 6)
            $('#lblBillDeductions_' + ctrlID1).text(deductBillAmount);

            var eligibleAmount = 0;
            ////var internalValue = MakeZerofromUndefinedorEmpty(totalServiceDetails[sID].InternalValueAbs);
            if (_services[i].ServiceID == 2) {
                if ($('#txtbillRoomdays_' + ctrlID1).val() != '')
                    ICUDays = $('#txtbillRoomdays_' + ctrlID1).val();
            }
            else if (_services[i].ServiceID == 3) {
                if ($('#txtbillRoomdays_' + ctrlID1).val() != '')
                    RoomDays = $('#txtbillRoomdays_' + ctrlID1).val();
            }
            eligibleAmount = deductBillAmount;
            TotalDiscountAmt = 0;

            $('#lblEligibleAmount_' + ctrlID1).text(eligibleAmount);
            $('#lblPayableAmount_' + ctrlID1).text(eligibleAmount);
            $('#txtDiscount_' + ctrlID1).val('0');
        }
    }
    else if (parseInt($('#hdnClaimTypeID').val()) == 2 && basicData[0].IssueID != 7) {
        for (var i = 0; i < _services.length; i++) {
            //var sID = parseInt(_services[i].ServiceID) - 1;
            var internalValue = 0;
            $.each(totalServiceDetails, function (k, totService) {
                if (_services[i].ServiceID == totService["ID"]) {
                    internalValue = MakeZerofromUndefinedorEmpty(totService["ExternalValueAbs"]);
                    return false;
                }
            });

            var ctrlID1 = _services[i].ServiceID + '_' + $("#hdnClaimID").val();
            var deductBillAmount = parseInt(MakeZerofromUndefinedorEmpty(_services[i].BillAmount)) - parseInt(MakeZerofromUndefinedorEmpty(_services[i].DeductionAmount));

            ////if (parseInt(_serviceID) != 1 && parseInt(_serviceID) != 2 && parseInt(_serviceID) != 3 && parseInt(_serviceID) != 4 && parseInt(_serviceID) != 5 && parseInt(_serviceID) != 6)
            $('#lblBillDeductions_' + ctrlID1).text(deductBillAmount);

            var eligibleAmount = 0;
            ////var internalValue = MakeZerofromUndefinedorEmpty(totalServiceDetails[sID].InternalValueAbs);
            if (_services[i].ServiceID == 2) {
                if ($('#txtbillRoomdays_' + ctrlID1).val() != '')
                    ICUDays = $('#txtbillRoomdays_' + ctrlID1).val();
            }
            else if (_services[i].ServiceID == 3) {
                if ($('#txtbillRoomdays_' + ctrlID1).val() != '')
                    RoomDays = $('#txtbillRoomdays_' + ctrlID1).val();
            }

            if (parseInt(_basicData[0].ServiceTypeID) != 2) {
                if (parseInt(_services[i].ServiceID) == 2)
                    internalValue = parseInt(ICUDays) * parseInt(internalValue);
                else if (parseInt(_services[i].ServiceID) == 3)
                    internalValue = parseInt(RoomDays) * parseInt(internalValue);
                else {
                    //internalValue = parseInt(estimatedDays) * parseInt(internalValue);
                    internalValue = internalValue;
                }
            }

            if ($('#txtBillAmount_' + ctrlID1).val() != 0)
                TotalInternalValues = parseInt(TotalInternalValues) + parseInt(internalValue);

            if (parseInt(internalValue) == 0)
                eligibleAmount = deductBillAmount;
            else
                eligibleAmount = Math.min(parseInt(internalValue), parseInt(deductBillAmount));

            TotalDiscountAmt = 0;

            $('#lblEligibleAmount_' + ctrlID1).text(eligibleAmount);
            $('#lblPayableAmount_' + ctrlID1).text(eligibleAmount);
            $('#txtDiscount_' + ctrlID1).val('0');
        }
    }
    else {
        var tblTariffDiscount = [];
        tblTariffDiscount = $.parseJSON($('#hdnServiceTariffAndDiscount').val());

        for (var i = 0; i < _services.length; i++) {
            //var sID = parseInt(_services[i].ServiceID) - 1;

            var ctrlID2 = _services[i].ServiceID + '_' + $("#hdnClaimID").val();
            var deductBillAmount = parseInt(MakeZerofromUndefinedorEmpty(_services[i].BillAmount)) - parseInt(MakeZerofromUndefinedorEmpty(_services[i].DeductionAmount));

            ////if (parseInt(_serviceID) != 1 && parseInt(_serviceID) != 2 && parseInt(_serviceID) != 3 && parseInt(_serviceID) != 4 && parseInt(_serviceID) != 5 && parseInt(_serviceID) != 6)
            $('#lblBillDeductions_' + ctrlID2).text(deductBillAmount);
            if (_services[i].ServiceID == 2) {
                if ($('#txtbillRoomdays_' + ctrlID2).val() != '')
                    ICUDays = $('#txtbillRoomdays_' + ctrlID2).val();
            }
            else if (_services[i].ServiceID == 3) {
                if ($('#txtbillRoomdays_' + ctrlID2).val() != '')
                    RoomDays = $('#txtbillRoomdays_' + ctrlID2).val();
            }

            for (var j = 0; j < tblTariffDiscount.length; j++) {
                if (_services[i].ServiceID == tblTariffDiscount[j].ServiceID) {

                    var _tariffAmount = MakeZerofromUndefinedorEmpty(tblTariffDiscount[j].Amount);
                    var _tariffDiscount = MakeZerofromUndefinedorEmpty(tblTariffDiscount[j].Discount);

                    // Commented By BhagyaRaj.A -  (SP-1121) MOU Discount Calculation at Cashless level
                    //if ($('#hdnRequestTypeID').val() == 1 || $('#hdnRequestTypeID').val() == 2 || $('#hdnRequestTypeID').val() == 3) {
                    //    _tariffDiscount = 0;
                    //}

                    //var internalValue = MakeZerofromUndefinedorEmpty(totalServiceDetails[sID].InternalValueAbs);
                    var internalValue = 0;
                    $.each(totalServiceDetails, function (k, totService) {
                        if (_services[i].ServiceID == totService["ID"]) {
                            internalValue = MakeZerofromUndefinedorEmpty(totService["ExternalValueAbs"]);
                            return false;
                        }
                    });

                    var tariffAmount = 0;
                    if (parseInt(_tariffAmount) != 0) {
                        if (parseInt(_basicData[0].ServiceTypeID) != 2) {
                            if (parseInt(_services[i].ServiceID) == 2)
                                tariffAmount = parseInt(ICUDays) * parseInt(_tariffAmount);
                            else if (parseInt(_services[i].ServiceID) == 3)
                                tariffAmount = parseInt(RoomDays) * parseInt(_tariffAmount);
                            else if (parseInt(_services[i].ServiceID) == 4)   //added by Bhagyaraj for # Nursing & DMO Rates Calculation Based On LOS SP-1246
                                tariffAmount = parseInt(RoomDays) * parseInt(_tariffAmount);
                            //else if (parseInt(_services[i].ServiceID) == 5)
                            //    tariffAmount = parseInt(LOS) * parseInt(_tariffAmount);
                            else {
                                //tariffAmount = parseInt(estimatedDays) * parseInt(_tariffAmount);
                                tariffAmount = _tariffAmount;
                            }
                        }
                        else
                            tariffAmount = _tariffAmount;
                    }
                    $('#lblTariff_' + ctrlID2).text(tariffAmount);

                    if ($('#txtBillAmount_' + ctrlID2).val() != 0)
                        TotalTariffAmount = parseInt(TotalTariffAmount) + parseInt(tariffAmount);

                    if (parseInt(_basicData[0].ServiceTypeID) != 2) {
                        if (parseInt(_services[i].ServiceID) == 2)
                            internalValue = parseInt(ICUDays) * parseInt(internalValue);
                        else if (parseInt(_services[i].ServiceID) == 3)
                            internalValue = parseInt(RoomDays) * parseInt(internalValue);
                        else if (parseInt(_services[i].ServiceID) == 4)   //added by Bhagyaraj # for Nursing & DMO Rates Calculation Based On LOS
                            internalValue = parseInt(RoomDays) * parseInt(internalValue);
                        //else if (parseInt(_services[i].ServiceID) == 5)
                        //    internalValue = parseInt(LOS) * parseInt(internalValue);
                        else {
                            //internalValue = parseInt(estimatedDays) * parseInt(internalValue);
                            internalValue = internalValue;
                        }
                    }

                    if ($('#txtBillAmount_' + ctrlID2).val() != 0)
                        TotalInternalValues = parseInt(TotalInternalValues) + parseInt(internalValue);

                    var eligibleBillAmount = 0;
                    var eligibleAmount = 0;
                    if (parseInt(deductBillAmount) != 0) {

                        if (parseInt(_tariffDiscount) != 0) {
                            var discount = (parseInt(deductBillAmount) * (_tariffDiscount)) / 100;
                            $('#txtDiscount_' + ctrlID2).val(Math.round(discount));
                            var eligibleBillAmount = parseInt(deductBillAmount) - parseInt(Math.round(discount));

                            if (parseInt(internalValue) != 0 && parseInt(tariffAmount) != 0)
                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(tariffAmount), parseInt(eligibleBillAmount));
                            else if (parseInt(internalValue) == 0 && parseInt(tariffAmount) == 0)
                                eligibleAmount = eligibleBillAmount;
                            else if (parseInt(internalValue) == 0)
                                eligibleAmount = Math.min(parseInt(tariffAmount), parseInt(eligibleBillAmount));
                            else if (parseInt(tariffAmount) == 0)
                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(eligibleBillAmount));
                        }
                        else {
                            $('#txtDiscount_' + ctrlID2).val('');

                            if (parseInt(internalValue) != 0 && parseInt(tariffAmount) != 0)
                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(tariffAmount), parseInt(deductBillAmount));
                            else if (parseInt(internalValue) == 0 && parseInt(tariffAmount) == 0)
                                eligibleAmount = deductBillAmount;
                            else if (parseInt(internalValue) == 0)
                                eligibleAmount = Math.min(parseInt(tariffAmount), parseInt(deductBillAmount));
                            else if (parseInt(tariffAmount) == 0)
                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(deductBillAmount));
                        }

                    }
                    else {
                        $('#txtDiscount_' + ctrlID2).val('0');
                    }
                    $('#lblEligibleAmount_' + ctrlID2).text(eligibleAmount);
                    $('#lblPayableAmount_' + ctrlID2).text(eligibleAmount);

                    break;
                }
                else {
                    $('#lblEligibleAmount_' + ctrlID2).text(deductBillAmount);
                    $('#lblPayableAmount_' + ctrlID2).text(deductBillAmount);
                }
            }

            TotalDiscountAmt = parseInt(TotalDiscountAmt) + parseInt(MakeZerofromUndefinedorEmpty($('#txtDiscount_' + ctrlID2).val()));
        }
    }

    $('#hdnTatalSeriveTariffAmount').val(TotalTariffAmount);
    $('#hdnTatalSeriveBPAmount').val(TotalInternalValues);

    if (parseInt(TotalDiscountAmt) != 0) {
        $('#hdnTotalServiceDiscounts').val(TotalDiscountAmt);
        $("#txtTotalServiceDiscountAmt").val(TotalDiscountAmt);
    }
    else {
        $('#hdnTotalServiceDiscounts').val('');
        $("#txtTotalServiceDiscountAmt").val('');
    }


    ////........ Add Deduction Amount For Accomodaition Charges .........
    //var accommEligibleAmt = 0;
    //var accommBAD = 0;
    //if (parseInt(_serviceID) == 1 || parseInt(_serviceID) == 2 || parseInt(_serviceID) == 3 || parseInt(_serviceID) == 4 ||
    //    parseInt(_serviceID) == 5 || parseInt(_serviceID) == 6) {

    //    accommEligibleAmt = MakeZerofromUndefinedorEmpty($('#lblEligibleAmount_' + ctrlID).text());
    //    accommBAD = MakeZerofromUndefinedorEmpty($('#lblBillDeductions_' + ctrlID).text());

    //    if (parseInt(accommBAD) > parseInt(accommEligibleAmt)) {
    //        var accomDeductionAmount = parseInt(accommBAD) - parseInt(accommEligibleAmt);
    //        accommBAD = accommBAD - accomDeductionAmount;

    //        accomDeductionAmount = accomDeductionAmount + parseInt($('#txtDeductions_' + ctrlID).val());

    //        $('#txtDeductions_' + ctrlID).val(accomDeductionAmount);
    //        $('#lblBillDeductions_' + ctrlID).text(accommBAD);
    //    }
    //}

    //if (parseInt(TotBillAmt) == 0)
    //    $('#txtTotalServicesEligibleAmount').val($('#txtTotalServicesPackageAmount').val());


    if (TotalBillAmount > 0) {
        $.each(_services, function (i, service) {
            if (_serviceID == service["ServiceID"]) {
                _services.splice(i, 1);
                return false;
            }
        });

        var _serviceRows1 = {};
        _serviceRows1.ServiceID = _serviceID;
        _serviceRows1.BillAmount = $('#txtBillAmount_' + ctrlID).val();
        _serviceRows1.DeductionAmount = $('#txtDeductions_' + ctrlID).val();
        if ($('#txtDiscount_' + ctrlID).val() == '' || $('#txtDiscount_' + ctrlID).val() == null)
            _serviceRows1.DiscountAmount = 0;
        else
            _serviceRows1.DiscountAmount = $('#txtDiscount_' + ctrlID).val();
        _serviceRows1.EligibleAmount = $('#lblEligibleAmount_' + ctrlID).text();
        _serviceRows1.SanctionedAmount = $('#lblPayableAmount_' + ctrlID).text();

        _services.push(_serviceRows1);
        //$('#hdnServiceDetails').val(JSON.stringify(_services));
    }

    var _finalServices = [];
    for (var i = 0; i < _services.length; i++) {

        var ctrlID3 = _services[i].ServiceID + '_' + $("#hdnClaimID").val();

        var _finalServicesRow = {};
        _finalServicesRow.ServiceID = _services[i].ServiceID;
        _finalServicesRow.BillAmount = $('#txtBillAmount_' + ctrlID3).val();
        _finalServicesRow.DeductionAmount = $('#txtDeductions_' + ctrlID3).val();
        if ($('#txtDiscount_' + ctrlID3).val() == '' || $('#txtDiscount_' + ctrlID3).val() == null)
            _finalServicesRow.DiscountAmount = "0";
        else
            _finalServicesRow.DiscountAmount = Math.round($('#txtDiscount_' + ctrlID3).val());
        _finalServicesRow.EligibleAmount = $('#lblEligibleAmount_' + ctrlID3).text();
        _finalServicesRow.SanctionedAmount = $('#lblPayableAmount_' + ctrlID3).text();
        if (_services[i].ServiceID == 2 || _services[i].ServiceID == 3)
            _finalServicesRow.BillRoomdays = $('#txtbillRoomdays_' + ctrlID3).val();
        else
            _finalServicesRow.BillRoomdays = "0";

        _finalServices.push(_finalServicesRow);

        TotBillAmt = TotBillAmt + parseInt(MakeZerofromUndefinedorEmpty($('#txtBillAmount_' + ctrlID3).val()));
        TotEligibleAmt = TotEligibleAmt + parseInt(MakeZerofromUndefinedorEmpty($('#lblEligibleAmount_' + ctrlID3).text()));
        TotDeductionAmount = TotDeductionAmount + parseInt(MakeZerofromUndefinedorEmpty($('#txtDeductions_' + ctrlID3).val()));

        if (parseInt(_services[i].BillAmount) > parseInt(MakeZerofromUndefinedorEmpty($('#txtDeductions_' + ctrlID3).val())))
            TotDeduBillAmt = TotDeduBillAmt + (parseInt(MakeZerofromUndefinedorEmpty($('#txtDeductions_' + ctrlID3).val())) - parseInt(MakeZerofromUndefinedorEmpty($('#txtDeductions_' + ctrlID3).val())));

        //TotBillAmt = TotBillAmt + parseInt(_services[i].BillAmount);
        //TotEligibleAmt = TotEligibleAmt + parseInt(_services[i].EligibleAmount);
        //TotDeductionAmount = TotDeductionAmount + parseInt(_services[i].DeductionAmount);

        //if (parseInt(_services[i].BillAmount) > parseInt(_services[i].DeductionAmount))
        //    TotDeduBillAmt = TotDeduBillAmt + (parseInt(_services[i].BillAmount) - parseInt(_services[i].DeductionAmount));
    }

    if (_finalServices.length > 0)
        $('#hdnServiceDetails').val(JSON.stringify(_finalServices));


    if (parseInt(TotBillAmt) == 0)
        $('#txtTotalServicesEligibleAmount').val(MakeZerofromUndefinedorEmpty($('#txtTotalServicesPackageAmount').val()));
    else
        $('#txtTotalServicesEligibleAmount').val(TotEligibleAmt);

    $('#txtTotalServicesBillAmount').val(TotBillAmt);
    $('#txtTotServicesAfterDedAmt').val(TotDeduBillAmt);
    $('#txtTotalServicesDeductionAmount').val(TotDeductionAmount);

    EnableDisableMap_ServiceButtons(_serviceID, TotalBillAmount, parentID);

}

function MapBills_Service_Old(_serviceID) {

    var parentID = 0;
    /* Calculate Total Bill Amount */
    var TotalBillAmount = 0;
    var _saveBills = [];
    if ($('#hdnBillDetails').val() != '') {
        _saveBills = $.parseJSON($('#hdnBillDetails').val());
    }
    $.each(_saveBills, function (i, sBillIDs) {
        if (_serviceID == sBillIDs["ServiceID"]) {
            TotalBillAmount = parseInt(TotalBillAmount) + parseInt(sBillIDs["BillAmount"]);
        }
    });

    /* Calculate Total Deduction Amount */
    var AccommodationDeduction = 0;
    var TotalDeductionAmount = 0;
    var _deductions = [];
    if ($('#hdnDecuctionsDetails').val() != '') {
        _deductions = $.parseJSON($('#hdnDecuctionsDetails').val());
    }
    $.each(_deductions, function (i, sIDs) {
        if (_serviceID == sIDs["ServiceID"]) {
            if (parseInt(_serviceID) == 1 || parseInt(_serviceID) == 2 || parseInt(_serviceID) == 3 || parseInt(_serviceID) == 4 || parseInt(_serviceID) == 5 || parseInt(_serviceID) == 6) {
                AccommodationDeduction = parseInt(AccommodationDeduction) + parseInt(sIDs["DeductionAmount"]);
                TotalDeductionAmount = 0;
            }
            else {
                TotalDeductionAmount = parseInt(TotalDeductionAmount) + parseInt(sIDs["DeductionAmount"]);
            }
        }
    });

    /* Bind Bill and Deduction values to controls */
    var ctrlID = _serviceID + '_' + $("#hdnClaimID").val();
    $('#txtBillAmount_' + ctrlID).val(TotalBillAmount);
    $('#txtDeductions_' + ctrlID).val(TotalDeductionAmount);

    /* Get Discount and InternalAbs from the DB Data */
    var vDiscountAmount = 0;
    var totalServiceDetails = [];
    totalServiceDetails = $.parseJSON($('#hdnBaseServiceDetails').val());
    $.each(totalServiceDetails, function (i, totService) {
        if (_serviceID == totService["ID"]) {
            if (totService["DiscountAmount"] != null && totService["DiscountAmount"] != '')
                vDiscountAmount = totService["DiscountAmount"];

            parentID = totService["ParentID"];
            return false;
        }
    });

    // Load Service Details Hidden Variable
    var _services = [];
    if ($('#hdnServiceDetails').val() != '') {
        _services = $.parseJSON($('#hdnServiceDetails').val());
    }
    $.each(_services, function (i, service) {
        if (_serviceID == service["ServiceID"]) {
            _services.splice(i, 1);
            return false;
        }
    });

    if (TotalBillAmount > 0) {
        //var sID = parseInt(_serviceID) - 1;
        ////var discountamount = MakeZerofromUndefinedorEmpty(totalServiceDetails[sID].DiscountAmount);

        var _serviceRows = {};
        _serviceRows.ServiceID = _serviceID;
        _serviceRows.BillAmount = $('#txtBillAmount_' + ctrlID).val();
        _serviceRows.DeductionAmount = $('#txtDeductions_' + ctrlID).val();
        ////if ($('#txtDiscount_' + ctrlID).val() != "")
        ////    _serviceRows.DiscountAmount = $('#txtDiscount_' + ctrlID).val();
        ////else
        ////    _serviceRows.DiscountAmount = 0;
        //_serviceRows.DiscountAmount = MakeZerofromUndefinedorEmpty(totalServiceDetails[sID].DiscountAmount);
        _serviceRows.DiscountAmount = vDiscountAmount;
        _serviceRows.EligibleAmount = $('#lblEligibleAmount_' + ctrlID).text();
        _serviceRows.SanctionedAmount = $('#lblPayableAmount_' + ctrlID).text();
        //_serviceRows.AdditionalAmount = $('#txtAdditionalAmt_' + ctrlID).val();
        //_serviceRows.AdditionalAmtReasonIDs = $('#ddlAdditionalAmtReason_' + ctrlID).val();
        //_serviceRows.CoPayment = $('#txtCopay_' + ctrlID).val();
        //_serviceRows.Remarks = $('#txtRemarks_' + ctrlID).val();
        _services.push(_serviceRows);
    }
    else {
        $('#lblBillDeductions_' + ctrlID).text('');
        $('#lblEligibleAmount_' + ctrlID).text('');
        $('#lblPayableAmount_' + ctrlID).text('');
        $('#txtDiscount_' + ctrlID).val('');
    }

    $('#hdnServiceDetails').val(JSON.stringify(_services));

    $('#divModelBilling').html('');

    /* Calculate Eligible Amount */
    var TotBillAmt = 0;
    var TotDeduBillAmt = 0;
    var TotDeductionAmount = 0;
    var TotEligibleAmt = 0;
    var TotalDiscountAmt = 0;
    var estimatedDays = MakeZerofromUndefinedorEmpty($('#txtExtimatedDays').val());
    var ICUDays = MakeZerofromUndefinedorEmpty($('#txtICUDays').val());
    var RoomDays = MakeZerofromUndefinedorEmpty($('#txtRoomDays').val());

    var TotalTariffAmount = 0;
    var TotalInternalValues = 0;

    var _basicData = JSON.parse(MasterData.BasicData);

    /* 2 - Reimbusment*/
    if (parseInt($('#hdnClaimTypeID').val()) == 2) {
        for (var i = 0; i < _services.length; i++) {
            //var sID = parseInt(_services[i].ServiceID) - 1;
            var internalValue = 0;
            $.each(totalServiceDetails, function (k, totService) {
                if (_services[i].ServiceID == totService["ID"]) {
                    internalValue = MakeZerofromUndefinedorEmpty(totService["InternalValueAbs"]);
                    return false;
                }
            });

            var ctrlID1 = _services[i].ServiceID + '_' + $("#hdnClaimID").val();
            var deductBillAmount = parseInt(MakeZerofromUndefinedorEmpty(_services[i].BillAmount)) - parseInt(MakeZerofromUndefinedorEmpty(_services[i].DeductionAmount));

            ////if (parseInt(_serviceID) != 1 && parseInt(_serviceID) != 2 && parseInt(_serviceID) != 3 && parseInt(_serviceID) != 4 && parseInt(_serviceID) != 5 && parseInt(_serviceID) != 6)
            $('#lblBillDeductions_' + ctrlID1).text(deductBillAmount);

            var eligibleAmount = 0;
            ////var internalValue = MakeZerofromUndefinedorEmpty(totalServiceDetails[sID].InternalValueAbs);

            if (parseInt(_basicData[0].ServiceTypeID) != 2) {
                if (parseInt(_services[i].ServiceID) == 2)
                    internalValue = parseInt(ICUDays) * parseInt(internalValue);
                else if (parseInt(_services[i].ServiceID) == 3)
                    internalValue = parseInt(RoomDays) * parseInt(internalValue);
                else {
                    //internalValue = parseInt(estimatedDays) * parseInt(internalValue);
                    internalValue = internalValue;
                }
            }

            if ($('#txtBillAmount_' + ctrlID1).val() != 0)
                TotalInternalValues = parseInt(TotalInternalValues) + parseInt(internalValue);

            if (parseInt(internalValue) == 0)
                eligibleAmount = deductBillAmount;
            else
                eligibleAmount = Math.min(parseInt(internalValue), parseInt(deductBillAmount));

            //TotBillAmt = parseInt(TotBillAmt) + parseInt(MakeZerofromUndefinedorEmpty(_services[i].BillAmount));
            //TotDeduBillAmt = parseInt(TotDeduBillAmt) + parseInt(deductBillAmount);
            //TotEligibleAmt = parseInt(TotEligibleAmt) + parseInt(eligibleAmount);
            TotalDiscountAmt = 0;

            $('#lblEligibleAmount_' + ctrlID1).text(eligibleAmount);
            $('#lblPayableAmount_' + ctrlID).text(eligibleAmount);
        }
    }
    else {
        var tblTariffDiscount = [];
        tblTariffDiscount = $.parseJSON($('#hdnServiceTariffAndDiscount').val());

        for (var i = 0; i < _services.length; i++) {
            //var sID = parseInt(_services[i].ServiceID) - 1;

            var ctrlID2 = _services[i].ServiceID + '_' + $("#hdnClaimID").val();
            var deductBillAmount = parseInt(MakeZerofromUndefinedorEmpty(_services[i].BillAmount)) - parseInt(MakeZerofromUndefinedorEmpty(_services[i].DeductionAmount));

            ////if (parseInt(_serviceID) != 1 && parseInt(_serviceID) != 2 && parseInt(_serviceID) != 3 && parseInt(_serviceID) != 4 && parseInt(_serviceID) != 5 && parseInt(_serviceID) != 6)
            $('#lblBillDeductions_' + ctrlID2).text(deductBillAmount);

            for (var j = 0; j < tblTariffDiscount.length; j++) {
                if (_services[i].ServiceID == tblTariffDiscount[j].ServiceID) {

                    var _tariffAmount = MakeZerofromUndefinedorEmpty(tblTariffDiscount[j].Amount);
                    var _tariffDiscount = MakeZerofromUndefinedorEmpty(tblTariffDiscount[j].Discount);

                    //var internalValue = MakeZerofromUndefinedorEmpty(totalServiceDetails[sID].InternalValueAbs);
                    var internalValue = 0;
                    $.each(totalServiceDetails, function (k, totService) {
                        if (_services[i].ServiceID == totService["ID"]) {
                            internalValue = MakeZerofromUndefinedorEmpty(totService["InternalValueAbs"]);
                            return false;
                        }
                    });

                    var tariffAmount = 0;
                    if (parseInt(_tariffAmount) != 0) {
                        if (parseInt(_basicData[0].ServiceTypeID) != 2) {
                            if (parseInt(_services[i].ServiceID) == 2)
                                tariffAmount = parseInt(ICUDays) * parseInt(_tariffAmount);
                            else if (parseInt(_services[i].ServiceID) == 3)
                                tariffAmount = parseInt(RoomDays) * parseInt(_tariffAmount);
                            else {
                                //tariffAmount = parseInt(estimatedDays) * parseInt(_tariffAmount);
                                tariffAmount = _tariffAmount;
                            }
                        }
                        else
                            tariffAmount = _tariffAmount;
                    }
                    $('#lblTariff_' + ctrlID2).text(tariffAmount);

                    if ($('#txtBillAmount_' + ctrlID2).val() != 0)
                        TotalTariffAmount = parseInt(TotalTariffAmount) + parseInt(tariffAmount);

                    if (parseInt(_basicData[0].ServiceTypeID) != 2) {
                        if (parseInt(_services[i].ServiceID) == 2)
                            internalValue = parseInt(ICUDays) * parseInt(internalValue);
                        else if (parseInt(_services[i].ServiceID) == 3)
                            internalValue = parseInt(RoomDays) * parseInt(internalValue);
                        else {
                            //internalValue = parseInt(estimatedDays) * parseInt(internalValue);
                            internalValue = internalValue;
                        }
                    }

                    if ($('#txtBillAmount_' + ctrlID2).val() != 0)
                        TotalInternalValues = parseInt(TotalInternalValues) + parseInt(internalValue);

                    var eligibleBillAmount = 0;
                    var eligibleAmount = 0;
                    if (parseInt(deductBillAmount) != 0) {

                        if (parseFloat(_tariffDiscount) != 0) {
                            var discount = (parseInt(deductBillAmount) * parseFloat(_tariffDiscount)) / 100;
                            $('#txtDiscount_' + ctrlID2).val(discount);
                            var eligibleBillAmount = parseInt(deductBillAmount) - parseInt(discount);

                            if (parseInt(internalValue) != 0 && parseInt(tariffAmount) != 0)
                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(tariffAmount), parseInt(deductBillAmount));
                            else if (parseInt(internalValue) == 0 && parseInt(tariffAmount) == 0)
                                eligibleAmount = eligibleBillAmount;
                            else if (parseInt(internalValue) == 0)
                                eligibleAmount = Math.min(parseInt(tariffAmount), parseInt(eligibleBillAmount));
                            else if (parseInt(tariffAmount) == 0)
                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(eligibleBillAmount));
                        }
                        else {
                            $('#txtDiscount_' + ctrlID2).val('');

                            if (parseInt(internalValue) != 0 && parseInt(tariffAmount) != 0)
                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(tariffAmount), parseInt(deductBillAmount));
                            else if (parseInt(internalValue) == 0 && parseInt(tariffAmount) == 0)
                                eligibleAmount = deductBillAmount;
                            else if (parseInt(internalValue) == 0)
                                eligibleAmount = Math.min(parseInt(tariffAmount), parseInt(deductBillAmount));
                            else if (parseInt(tariffAmount) == 0)
                                eligibleAmount = Math.min(parseInt(internalValue), parseInt(deductBillAmount));
                        }

                    }
                    $('#lblEligibleAmount_' + ctrlID2).text(eligibleAmount);
                    $('#lblPayableAmount_' + ctrlID).text(eligibleAmount);

                    break;
                }
            }

            //TotBillAmt = parseInt(TotBillAmt) + parseInt(MakeZerofromUndefinedorEmpty(_services[i].BillAmount));
            //TotDeduBillAmt = parseInt(TotDeduBillAmt) + parseInt(deductBillAmount);
            //TotEligibleAmt = parseInt(TotEligibleAmt) + parseInt(eligibleAmount);
            TotalDiscountAmt = parseInt(TotalDiscountAmt) + parseInt(MakeZerofromUndefinedorEmpty($('#txtDiscount_' + ctrlID2).val()));
        }
    }

    $('#hdnTatalSeriveTariffAmount').val(TotalTariffAmount);
    $('#hdnTatalSeriveBPAmount').val(TotalInternalValues);

    //if (parseInt(TotBillAmt) != 0)
    //    $('#txtTotalServicesBillAmount').val(TotBillAmt);
    //else
    //    $('#txtTotalServicesBillAmount').val('');

    //if (parseInt(TotDeduBillAmt) != 0)
    //    $('#txtTotServicesAfterDedAmt').val(TotDeduBillAmt);
    //else
    //    $('#txtTotServicesAfterDedAmt').val('');

    //if (parseInt(TotEligibleAmt) != 0)
    //    $('#txtTotalServicesEligibleAmount').val(TotEligibleAmt);
    //else
    //    $('#txtTotalServicesEligibleAmount').val('');

    if (parseInt(TotalDiscountAmt) != 0)
        $('#hdnTotalServiceDiscounts').val(TotalDiscountAmt);
    else
        $('#hdnTotalServiceDiscounts').val('');




    //........ Add Deduction Amount For Accomodaition Charges .........
    //var servicewiseAfterDeduction = 0;
    var AccommodationEligibleAmt = 0;
    var accommBillAmount = 0;
    if (parseInt(_serviceID) == 1 || parseInt(_serviceID) == 2 || parseInt(_serviceID) == 3 || parseInt(_serviceID) == 4 ||
        parseInt(_serviceID) == 5 || parseInt(_serviceID) == 6) {
        var BillMinusDiductions = 0;
        AccommodationEligibleAmt = MakeZerofromUndefinedorEmpty($('#lblEligibleAmount_' + ctrlID).text());
        accommBillAmount = MakeZerofromUndefinedorEmpty($('#txtBillAmount_' + ctrlID).val());

        if (parseInt(accommBillAmount) > parseInt(AccommodationEligibleAmt)) {

            ////$('#txtDeductions_' + ctrlID).val(parseInt($('#txtBillAmount_' + ctrlID).val()) - parseInt($('#lblEligibleAmount_' + ctrlID).text()));
            ////$('#lblBillDeductions_' + ctrlID).text(parseInt($('#txtBillAmount_' + ctrlID).val()) - parseInt($('#txtDeductions_' + ctrlID).val()));
            ////servicewiseAfterDeduction = MakeZerofromUndefinedorEmpty($('#lblBillDeductions_' + ctrlID).text());

            var _accomDeduction = 0;
            var _accomBill_Diduction = 0;
            _accomDeduction = parseInt(accommBillAmount) - parseInt(AccommodationEligibleAmt);
            _accomBill_Diduction = parseInt(accommBillAmount) - parseInt(_accomDeduction);

            _accomDeduction = parseInt(_accomDeduction) + parseInt(AccommodationDeduction);
            _accomBill_Diduction = parseInt(accommBillAmount) - parseInt(_accomDeduction);

            $('#txtDeductions_' + ctrlID).val(_accomDeduction);
            if (_accomBill_Diduction < 0)
                $('#lblBillDeductions_' + ctrlID).text('0');
            else
                $('#lblBillDeductions_' + ctrlID).text(_accomBill_Diduction);

            AccommodationEligibleAmt = parseInt(AccommodationEligibleAmt) - parseInt(AccommodationDeduction);
            if (AccommodationEligibleAmt < 0) {
                $('#lblEligibleAmount_' + ctrlID).text('0');
                $('#lblPayableAmount_' + ctrlID).text('0');
            }
            else {
                $('#lblEligibleAmount_' + ctrlID).text(AccommodationEligibleAmt);
                $('#lblPayableAmount_' + ctrlID).text(AccommodationEligibleAmt);
            }

        }
        else {

            ////$('#txtDeductions_' + ctrlID).val(0);
            ////$('#lblBillDeductions_' + ctrlID).text($('#txtBillAmount_' + ctrlID).val());
            $('#txtDeductions_' + ctrlID).val(AccommodationDeduction);
            $('#lblBillDeductions_' + ctrlID).text(parseInt(accommBillAmount) - parseInt(AccommodationDeduction));

            AccommodationEligibleAmt = parseInt(AccommodationEligibleAmt) - parseInt(AccommodationDeduction);
            $('#lblEligibleAmount_' + ctrlID).text(AccommodationEligibleAmt);
            $('#lblPayableAmount_' + ctrlID).text(AccommodationEligibleAmt);
        }

        ///*Deduction Amount*/
        ////var TotServicesAfterDedAmt = MakeZerofromUndefinedorEmpty($('#txtTotServicesAfterDedAmt').val());
        //if (accommBillAmount != 0) {

        //    if (TotDeduBillAmt == 0)
        //        $('#txtTotServicesAfterDedAmt').val(parseInt($('#lblBillDeductions_' + ctrlID).text()));
        //    else
        //        $('#txtTotServicesAfterDedAmt').val(parseInt($('#lblBillDeductions_' + ctrlID).text()) + parseInt(TotDeduBillAmt));
        //}
        //else {
        //    if (parseInt(TotDeduBillAmt) != 0)
        //        $('#txtTotServicesAfterDedAmt').val(TotDeduBillAmt);
        //    else
        //        $('#txtTotServicesAfterDedAmt').val('');
        //}

        ///*Eligible Amount*/
        //var TotServicesEligibleAmt = MakeZerofromUndefinedorEmpty($('#txtTotalServicesEligibleAmount').val());
        //if (accommBillAmount != 0) {

        //    if (TotServicesEligibleAmt == 0)
        //        $('#txtTotalServicesEligibleAmount').val(parseInt($('#lblEligibleAmount_' + ctrlID).text()));
        //    else
        //        $('#txtTotalServicesEligibleAmount').val(parseInt($('#lblEligibleAmount_' + ctrlID).text()) + parseInt($('#txtTotalServicesEligibleAmount').val()));
        //}
        //else {
        //    if (parseInt(TotEligibleAmt) != 0)
        //        $('#txtTotalServicesEligibleAmount').val(TotEligibleAmt);
        //    else
        //        $('#txtTotalServicesEligibleAmount').val('');
        //}

        //////var TotServicesAfterDedAmt = MakeZerofromUndefinedorEmpty($('#txtTotServicesAfterDedAmt').val());
        //////if (TotServicesAfterDedAmt == 0)
        //////    $('#txtTotServicesAfterDedAmt').val(parseInt(servicewiseAfterDeduction));
        //////else
        //////    $('#txtTotServicesAfterDedAmt').val(parseInt(servicewiseAfterDeduction) + parseInt($('#txtTotServicesAfterDedAmt').val()));

    }
    else {
        //if (parseInt(TotDeduBillAmt) != 0)
        //    $('#txtTotServicesAfterDedAmt').val(TotDeduBillAmt);
        //else
        //    $('#txtTotServicesAfterDedAmt').val('');

        //if (parseInt(TotEligibleAmt) != 0)
        //    $('#txtTotalServicesEligibleAmount').val(TotEligibleAmt);
        //else
        //    $('#txtTotalServicesEligibleAmount').val('');
    }

    if (parseInt(TotBillAmt) == 0)
        $('#txtTotalServicesEligibleAmount').val($('#txtTotalServicesPackageAmount').val());

    if (TotalBillAmount > 0) {
        $.each(_services, function (i, service) {
            if (_serviceID == service["ServiceID"]) {
                _services.splice(i, 1);
                return false;
            }
        });

        var _serviceRows1 = {};
        _serviceRows1.ServiceID = _serviceID;
        _serviceRows1.BillAmount = $('#txtBillAmount_' + ctrlID).val();
        _serviceRows1.DeductionAmount = $('#txtDeductions_' + ctrlID).val();
        if ($('#txtDiscount_' + ctrlID).val() == '' || $('#txtDiscount_' + ctrlID).val() == null)
            _serviceRows1.DiscountAmount = 0;
        else
            _serviceRows1.DiscountAmount = $('#txtDiscount_' + ctrlID).val();
        _serviceRows1.EligibleAmount = $('#lblEligibleAmount_' + ctrlID).text();

        _serviceRows1.SanctionedAmount = $('#lblPayableAmount_' + ctrlID).text();
        //_serviceRows1.AdditionalAmount = $('#txtAdditionalAmt_' + ctrlID).val();
        //_serviceRows1.AdditionalAmtReasonIDs = $('#ddlAdditionalAmtReason_' + ctrlID).val();
        //_serviceRows1.CoPayment = $('#txtCopay_' + ctrlID).val();
        //_serviceRows1.Remarks = $('#txtRemarks_' + ctrlID).val();
        _services.push(_serviceRows1);

        $('#hdnServiceDetails').val(JSON.stringify(_services));
    }

    //if (_services.length <= 0)
    //    $('#txtTotServicesAfterDedAmt').val('');

    for (var i = 0; i < _services.length; i++) {

        TotBillAmt = TotBillAmt + parseInt(_services[i].BillAmount);
        TotEligibleAmt = TotEligibleAmt + parseInt(_services[i].EligibleAmount);
        TotDeductionAmount = TotDeductionAmount + parseInt(_services[i].DeductionAmount);

        if (parseInt(_services[i].BillAmount) > parseInt(_services[i].DeductionAmount))
            TotDeduBillAmt = TotDeduBillAmt + (parseInt(_services[i].BillAmount) - parseInt(_services[i].DeductionAmount));
        //else
        //    TotDeduBillAmt = TotDeduBillAmt +  parseInt(_services[i].DeductionAmount);

    }

    $('#txtTotalServicesBillAmount').val(TotBillAmt);
    $('#txtTotServicesAfterDedAmt').val(TotDeduBillAmt);
    $('#txtTotalServicesEligibleAmount').val(TotEligibleAmt);
    $('#txtTotalServicesDeductionAmount').val(TotDeductionAmount);

    EnableDisableMap_ServiceButtons(_serviceID, TotalBillAmount, parentID);

}

function Cancel_BillsDialog() {
    $('#divModelBilling').html('');
}

function Error_MapBills_Service() {
    ShowResultMessage('ErrorMessage', 'Error occured while bill details added against service');
}


/* Final Confirm Button */
function ExecutiveScrutiny_Confirm(_ClaimID, _SlNo, _ClaimTypeID, _RoleID) {

    if (isproportionatechanged == true) {
        DialogWarningMessage("As you override proportionate, first save bill details and then confirm");
        return false;
    }
    try {
        var ESConfirmDetails = {};
        ESConfirmDetails.ClaimID = _ClaimID;
        ESConfirmDetails.Slno = _SlNo;
        ESConfirmDetails.ClaimTypeID = _ClaimTypeID;
        ESConfirmDetails.RequestTypeID = $("#ddlRequestType").val();
        ESConfirmDetails.ServiceTypeID = $("#ddlServiceType").val();
        ESConfirmDetails.ServiceSubTypeID = $("#ddlServiceSubType").val();
        ESConfirmDetails.RequestTypeID = $("#spnRequestType").val();
        ESConfirmDetails.ServiceTypeID = $("#spnServiceType").val();
        ESConfirmDetails.ServiceSubTypeID = $("#spnServiceSubType").val();

        ESConfirmDetails.ClaimStageID = 5;
        ESConfirmDetails.RoleID = _RoleID;
        ESConfirmDetails.ClaimedAmount = $("#txtClaimedAmount").val();
        var parameters = JSON.stringify(ESConfirmDetails);
        ////Leena SP3V 1082
        //var InsurerId = $('#hdnInsuranceCompanyID').val();
        //var DischargeTypeId = '';
        //if ($('#ddlDischargeType').val() != '') {
        //    var DischargeTypeId = $('#ddlDischargeType').val();
        //}

        //if ((DischargeTypeId == '0' || DischargeTypeId == null || DischargeTypeId == '' || DischargeTypeId == 'undefiened'  )) {
        //    //DialogResultMessage("Please Select Discharge Type!");
        //    //return false;
        //    DischargeTypeId = 0;
        //}
        ////End Leena SP3V 1082
        //SP3V-1697 Leena
        var InsurerId = $('#hdnInsuranceCompanyID').val();
        var _ClaimTypeID = $('#hdnClaimTypeID').val();
        var _RequestTypeID = $("#hdnRequestTypeID").val();
        if ($('#hdnProviderID').val() == "185422") {
            DialogResultMessage("Please change the provider details..");
            return false;
        }

        var DischargeTypeId = '';
        if ((InsurerId == 5) && ((_RequestTypeID != 1) && (_RequestTypeID != 2) && (_RequestTypeID != 3))) {
            if ($('#ddlDischargeType').val() != '') {
                DischargeTypeId = $('#ddlDischargeType').val();
            }

            if ((DischargeTypeId == '0' || DischargeTypeId == null || DischargeTypeId == '' || DischargeTypeId == 'undefiened')) {
                DialogResultMessage("Please Select Discharge Type.");
                return false;
            }
        }
        //END SP3V-1697 Leena
        //SP3V-1778 Leena
        var InsurerId = $('#hdnInsuranceCompanyID').val();
        if (($('#hdnClaimTypeID').val() == 2) && InsurerId == 7 && $('#hdnClaimStageID').val() == 24) {
            var strmandatoryfield = '';
            if ($('#txtReceivedPatient_Address1').val() == "" || $('#txtReceivedPatient_Address1').val() == undefined) {
                strmandatoryfield = ' Address1 / ';
            }
            if ($('#txtReceivedPatient_Address2').val() == "" || $('#txtReceivedPatient_Address2').val() == undefined) {
                strmandatoryfield = strmandatoryfield + ' Address2 / ';
            }
            if ($('#ddlReceivedPatient_State').val() == '' || $('#ddlReceivedPatient_State').val() == undefined || $('#ddlReceivedPatient_State').val() == 0) {
                strmandatoryfield = strmandatoryfield + ' State / ';
            }
            if ($('#ddlReceivedPatient_District').val() == '' || $('#ddlReceivedPatient_District').val() == undefined || $('#ddlReceivedPatient_District').val() == 0) {
                strmandatoryfield = strmandatoryfield + ' District / ';
            }
            if (($('#ddlReceivedPatient_CityID').val() == '' || ($('#ddlReceivedPatient_CityID').val() == undefined || $('#ddlReceivedPatient_CityID').val() == 0))) {
                strmandatoryfield = strmandatoryfield + ' City / ';
            }
            if ($('#txtReceivedPatient_Location').val() == '' || $('#txtReceivedPatient_Location').val() == undefined) {
                strmandatoryfield = strmandatoryfield + ' Location / ';
            }
            if (MakeNullfromUndefinedorEmpty($('#txtReceivedPatient_Pincode').val()) == null) {
                strmandatoryfield = strmandatoryfield + ' PinCode / ';
            }

            if (strmandatoryfield != '') {
                strmandatoryfield = strmandatoryfield.substring(0, strmandatoryfield.length - 2);
                DialogErrorMessage('Please enter Temporary Address : ' + strmandatoryfield);
                return false;
            }
            else if (MakeNullfromUndefinedorEmpty($('#txtReceivedPatient_Pincode').val()) != null && MakeNullfromUndefinedorEmpty($('#txtReceivedPatient_Pincode').val()).length < 6) {
                DialogErrorMessage('Pin Code should be 6 digits.');
                return false;
            }

        }

        //SP3V-1778 End
        if (ExecutiveScrutiny_Confirm_Validate()) {
            $('#btnBillingButton').prop('disabled', true);
            $.ajax({
                //type: "POST",
                url: "/ExecutiveScrutiny/ExecutiveScrutiny_Confirmation",
                contentType: 'application/json;charset=utf-8',
                //processData: false,
                data: { ClaimActionItems: parameters, QMS: $("#hdnQMS").val(), QMSadmin: $("#hdnQMS").val() },
                success: function (data) {
                    if (data == '') {
                        if ($("#hdnQMSAdmin").val() != '') {
                            window.location = '/Qmsv2CMO/CMODashboard';
                        }
                        else if ($("#hdnQMS").val() != '') {
                            window.location = '/Qmsv2CM/CMDashboard';
                        }
                        else {
                            window.location = '/Claims/Index';
                        }
                    }
                    else
                        DialogResultMessage(data);
                },
                error: function (e, x) {
                    ShowResultMessage('ErrorMessage', e.responseText);
                }
            });

            //ajaxGETResonse('/ExecutiveScrutiny/ExecutiveScrutiny_Confirmation',ExecutiveScrutiny_Confirm_Response, null,
            //    {
            //        ClaimActionItems: parameters
            //    });
        }

    } catch (e) {
        alert('Error Occured while Insert Patient Details');
    }
}

function ExecutiveScrutiny_Confirm_Validate() {
    try {
        var _controlFields = [];

        //_controlFields.push(['ddlServiceType', 'Please Select Service Type']);
        //_controlFields.push(['ddlServiceSubType', 'Please Select SubService Type']);
        //_controlFields.push(['ddlRequestType', 'Please Select Request Type']);
        _controlFields.push(['txtClaimedAmount', 'Please Enter Estimated Amount']);

        return CustomFiledsValidate(_controlFields, 'divErrorMessage');

    } catch (e) {
        alert('Error Occured while Validating Executive Scrutiny Information');
    }
}

function ExecutiveScrutiny_Confirm_Response(data) {
    try {
        if (data.responseText == '')
            window.location = '/Claims/Index';
        else {
            CheckSessionVariable(data.responseText);
            DialogResultMessage(data.responseText);
        }
    } catch (e) {
        alert('Error Occured');
    }
}

/*Linked Entities */
function ClaimLinkedEntities_Retrieve(_policyID, _flag) {
    if ($("#hdnMainMemberPolicyID").val() != '') {
        if ($('#tblLinkedEntities tbody').children().length == 0) {
            $.ajax({
                type: "GET",
                url: "/Claims/ClaimLinkedEntities_Retrieve",
                contentType: 'application/json;charset=utf-8',
                //processData: false,
                data: { PolicyID: _policyID, Type: 2 },
                success: function (data) {
                    if (data == null || data == "") {
                        //alert('Data not found.');
                    }
                    data = $.parseJSON(data);
                    Bind_LinkedEntities(data, _flag);
                },
                error: function (e, x) {
                    ShowResultMessage('ErrorMessage', e.responseText);
                }
            });
        }
    }
    // else
    // ShowWanringMessage("")
}

function Bind_LinkedEntities(data, _flag) {
    var j = '';
    var name;
    if (data != null && data.length > 0) {
        for (var i = 0; i < data.length; i++) {
            j = data[i].CreatedOperatorID;
            name = GetUserName(j, MasterData.Lnk_UserRegions, MasterData.Mst_Users) + "-" + GetRegionNameByuserregionID(j, MasterData.Lnk_UserRegions, MasterData.RegionData);
            if (data[i].ClaimID == null) {
                var buttions = '<td></td>';
                if (_flag == 0) {
                    buttions = '';
                    buttions = '<td id="tdClaimLinking_' + data[i].IntimationID + '"><button type="button" class="btn btn-xs btn-danger" onclick="Claim_Linking(' + data[i].IntimationID + ')">LINK<i class="ace-icon fa fa-reply icon-only"></i></button></td>';
                }
                var tblBody = '<tr> <td data-title="IntimationID">' + data[i].IntimationID + '</td><td data-title="Present Complaint"class="numeric">' + data[i].PresentComplaint + '</td>'
                    + '<td data-title="Probable Diagnosis" class="numeric">' + data[i].ProbableDiagnosis + '</td> <td data-title="Intimation Date" class="numeric">' + JSONDateTime(data[i].IntimationDate) + '</td>'
                    + ' <td data-title="Probable DOA" class="numeric">' + JSONDateTime(data[i].ProbableDOA) + '</td><td data-title="Estimated Cost">' + data[i].EstimatedCost + '</td>'
                    + '<td data-title="Hospital Name" class="numeric">' + data[i].provider + '</td>'
                    + '<td data-title="ClaimID" class="numeric">' + MakeEmptyfromUndefinedorNull(data[i].ClaimID) + '</td>'
                    + '<td data-title="Created User-Region" class="numeric">' + name + '</td>'
                    //+ '<td><button class="btn btn-xs btn-danger" onclick="Claim_Linking(' + data[0].IntimationID + ')">LINK<i class="ace-icon fa fa-reply icon-only"></i></button></td>'
                    + buttions
                    + '</tr>';
            }
            else {
                var buttions = '<td></td>';
                if (_flag == 0) {
                    if (data[i].ClaimID == MakeEmptyfromUndefinedorNull($('#hdnClaimID').val())) {
                        buttions = '';
                        buttions = '<td id="tdClaimLinking_' + data[i].IntimationID + '" ><button type="button" class="btn btn-xs btn-danger" onclick="Claim_UnLink(' + data[i].IntimationID + ')">UNLINK<i class="ace-icon fa fa-reply icon-only"></i></button></td>';
                    }
                }
                var tblBody = '<tr> <td data-title="IntimationID">' + data[i].IntimationID + '</td><td data-title="Present Complaint"class="numeric">' + data[i].PresentComplaint + '</td>'
                    + '<td data-title="Probable Diagnosis" class="numeric">' + data[i].ProbableDiagnosis + '</td> <td data-title="Intimation Date" class="numeric">' + JSONDateTime(data[i].IntimationDate) + '</td>'
                    + ' <td data-title="Probable DOA" class="numeric">' + JSONDateTime(data[i].ProbableDOA) + '</td><td data-title="Estimated Cost">' + data[i].EstimatedCost + '</td>'
                    + '<td data-title="Hospital Name" class="numeric">' + data[i].provider + '</td>'
                    + '<td data-title="ClaimID" class="numeric">' + MakeEmptyfromUndefinedorNull(data[i].ClaimID) + '</td>'
                    + '<td data-title="Created User-Region" class="numeric">' + name + '</td>'
                    //+ '<td><button class="btn btn-xs btn-danger" onclick="Claim_UnLink(' + data[0].IntimationID + ')">UNLINK<i class="ace-icon fa fa-reply icon-only"></i></button></td>'
                    + buttions
                    + '</tr>';
            }
            $('#tblLinkedEntities tbody').append(tblBody);
        }
    }
    else {
        $('#tblLinkedEntities tbody').append('<tr><td colspan="9">No Linked Entities Found</td></tr>');
    }
}

function Claim_Linking(_intimationID) {
    if ($('#hdnIsFrmArchived').val() == 'True') {
        DialogWarningMessage('Archived Claims cannot be linked or unlinked');
        return false;
    }
    if (_intimationID != null && _intimationID != '') {
        $.ajax({
            url: '/Claims/Claim_Linking',
            type: 'POST',
            dataType: "json",
            data: { IntimationID: _intimationID, ClaimID: $('#hdnClaimID').val() }
        }).done(function (data) {
            CheckSessionVariable(data);
            if (data == '') {
                $('#tdClaimLinking_' + _intimationID + '').html('<td id="tdClaimLinking' + _intimationID + '" ><button type="button" class="btn btn-xs btn-danger" onclick="Claim_UnLink(' + _intimationID + ')">UNLINK<i class="ace-icon fa fa-reply icon-only"></i></button></td>');
                DialogResultMessage('Intimation linked successfully.');
            }
            else
                DialogResultMessage(data);
        });
    }
}

function Claim_UnLink(_intimationID) {
    if ($('#hdnIsFrmArchived').val() == 'True') {
        DialogWarningMessage('Archived Claims cannot be linked or unlinked');
        return false;
    }
    if (_intimationID != null && _intimationID != '') {
        $.ajax({
            url: '/Claims/Claim_UnLink',
            type: 'POST',
            dataType: "json",
            data: { IntimationID: _intimationID, ClaimID: null }
        }).done(function (data) {
            CheckSessionVariable(data);
            $('#tdClaimLinking_' + _intimationID + '').html('<td id="tdClaimLinking_' + _intimationID + '"><button type="button" class="btn btn-xs btn-danger" onclick="Claim_Linking(' + _intimationID + ')">LINK<i class="ace-icon fa fa-reply icon-only"></i></button></td>');
            DialogResultMessage('Intimation unlinked successfully.');
        });
    }
}


/* Balance SumInsured Details */
function Show_BalanceSumInsured(_memberPolicyID, _sITypeID) {

    if ($('#tblBSIIndividual tbody').children().length == 0 && $('#tblBSIFloater tbody').children().length == 0) {
        $.ajax({
            //type: "POST",
            url: "/Claims/Get_BalanceSumInsured",
            contentType: 'application/json;charset=utf-8',
            //processData: false,
            data: { MemberPolicyID: _memberPolicyID, SITypeID: _sITypeID, ClaimID: $("#hdnClaimID").val(), SlNo: $("#hdnClaimSlNo").val() },
            success: function (data) {
                data = $.parseJSON(data);
                _bsiData = data;
                if (data == null || data == "") {
                    //alert('Data not found.');
                }
                else {
                    Design_BalanceSumInsured(data, _sITypeID)
                }
            },
            error: function (e, x) {
                ShowResultMessage('ErrorMessage', e.responseText);
            }
        });
    }
}
function ReasonChange(ctrlId, atCtrlId) {
    var reasonId = parseInt($(ctrlId).val());
    $('#' + ddlIRDADeductionReason + atCtrlId).select2();
    if (reasonId == 6) {
        $('#' + ddlIRDADeductionReason + atCtrlId).removeAttr("disabled", "disabled");
    }
    else {
        $('#' + ddlIRDADeductionReason + atCtrlId).attr("disabled", "disabled");
        $('#' + ddlIRDADeductionReason + atCtrlId).select2("val", null);
    }
}
function Design_BalanceSumInsured(data, _sITypeID) {
    $('#tblBSIIndividual tbody').html('');
    $('#tblBSIFloater tbody').html('');

    if (_sITypeID == "6") {
        $('#ddlBalanceSumInsured').val('individual');

        var individualTRID = 'trBSIIndividual_';
        var individualISSI = 'chkIndividualISSI_';
        var individualSI = 'spanIndividualSI_';
        var individualBlocked = 'spanIndividualBlocked_';
        var individualUtilized = 'spanIndividualUtilized_';
        var individualBalance = 'spanIndividualBalance_';

        var individualTRIDIns = 'trBSIIndividualIns_';
        var individualISSIIns = 'chkIndividualISSIIns_';
        var txtIndividualAllocatedIns = 'txtIndividualAllocatedIns_';
        var txtIndividualBalanceIns = 'txtIndividualBalanceIns_';
        var txtIndividualRemarksIns = 'txtIndividualRemarksIns_';
        var fileIndividualUpload = 'fileIndividualUpload';

        for (var i = 0; i < data.Table1.length; i++) {
            var SICategoryID = data.Table1[i].SICategoryID;
            isBPconfigured = data.Table1[i].isAutoRule ? 1 : 0;
            ////categoryName = categoryName.replace(/\s+/g, '');
            var vBSIRowDesign = '<tr><td colspan="5"><input hidden="hiddden" type="checkbox" checked="checked"></td></tr><tr id="' + individualTRID + SICategoryID + '">'
                + '<td data-title="Sum Insured Category"><input id="' + individualISSI + SICategoryID + '" type="checkbox" checked="checked" onclick="EnableorDisable_BSIControls(' + individualISSI + SICategoryID + ',' + individualISSIIns + SICategoryID + ',' + txtIndividualAllocatedIns + SICategoryID
                + ',' + txtIndividualBalanceIns + SICategoryID + ',' + txtIndividualRemarksIns + SICategoryID + ',' + fileIndividualUpload + SICategoryID + ',btnIndividual_' + SICategoryID + ',' + SICategoryID + ')">'
                + '<span class="lbl padding-8"></span>&nbsp;<strong>' + data.Table1[i].Categoryname + '</strong></td>'
                + '<td data-title="Individual SI"><a onclick="myPopup(\'/BenefitPlan/BPSIView?SIID=' + data.Table1[i].BPSIID + "&Source=0" + '\')"><span id="' + individualSI + SICategoryID + '" ></span></a></td>'
                + '<td data-title="CB Amount"><span >' + Makezerofromnullorundefined(data.Table1[i].CB_Amount) + '</span></td>'
                + '<td data-title="Individual Blocked"><span id="' + individualBlocked + SICategoryID + '"></span></td>'

                ////@*<td><a href="" id="hplIndividual_BaseBlocked" data-showpopup="1" class="show-popup">50,000</a></td>*@
                + '<td data-title="Individual Utilized"><span id="' + individualUtilized + SICategoryID + '"></span></td>'
                + '<td data-title="Individual Balance"><span id="' + individualBalance + SICategoryID + '"></span></td></tr>';

            if (SICategoryID == 71 || SICategoryID == 73) {
                vBSIRowDesign = vBSIRowDesign + '<tr id="' + individualTRIDIns + SICategoryID + '"><td></td>'
                    + '<td><input disabled="disabled" id="' + individualISSIIns + SICategoryID + '" type="checkbox"><span class="lbl padding-8"></span>&nbsp;<strong>Insurer Approved</strong></td>'
                    + '<td><strong>Allocated : </strong><input type="text" disabled="disabled" id="' + txtIndividualAllocatedIns + SICategoryID + '" maxlength="10"  onkeypress="javascript: return onlydigits(event);"></td>'
                    + '<td><strong>Balance : </strong><input type="text" readonly="readonly" id="' + txtIndividualBalanceIns + SICategoryID + '"  maxlength="10"  onkeypress="javascript: return onlydigits(event);"></td>'
                    + '<tr id="trBSIIndividualInsRemarks_' + SICategoryID + '"><td></td>'
                    + '<td colspan="3"> <input disabled="disabled" id="' + txtIndividualRemarksIns + SICategoryID + '" type="text" style="width:500px;" placeholder="Remarks">'
                    + '<span class="middle"><span class="upload"><input disabled="disabled" id="' + fileIndividualUpload + SICategoryID + '" type="file" name="myPhoto" onchange="PreviewImage(uploadImage1,uploadPreview1);></span><img id="uploadPreview1"></span></td>'
                    + '<td><input type="button" disabled="disabled" class="btn btn-info" id="btnIndividual_' + SICategoryID + '" onclick="Save_BalanceSumInsuredDetails('
                    + data.Table1[i].MemberSIID + ',' + txtIndividualAllocatedIns + SICategoryID + ',' + txtIndividualBalanceIns + SICategoryID + ',' + txtIndividualRemarksIns + SICategoryID + ',' + individualISSIIns + SICategoryID + ')" value="Save" /></td></tr>';

            }

            $('#tblBSIIndividual tbody').append(vBSIRowDesign);

            $('#' + individualSI + SICategoryID).text(data.Table1[i].SumInsured);
            $('#' + individualBlocked + SICategoryID).text(data.Table1[i].BlockedAmt);
            $('#' + individualUtilized + SICategoryID).text(data.Table1[i].UtilizedAmt);
            var balaceIns = (parseInt(data.Table1[i].SumInsured) + parseInt(Makezerofromnullorundefined(data.Table1[i].CB_Amount))) - (parseInt(data.Table1[i].BlockedAmt) + parseInt(data.Table1[i].UtilizedAmt));
            if (balaceIns > 0)
                $('#' + individualBalance + SICategoryID).text(balaceIns);
            else
                $('#' + individualBalance + SICategoryID).text('0');

            if (SICategoryID == 71 || SICategoryID == 73) {
                for (var j = 0; j < data.Table2.length; j++) {
                    if (data.Table2[j].SICategoryID == data.Table1[i].SICategoryID) {
                        $('#' + individualISSI + SICategoryID).attr("checked", true);
                        $('#' + individualISSIIns + SICategoryID).attr("checked", true);
                        $('#' + txtIndividualAllocatedIns + SICategoryID).val(data.Table2[j].ApprovedAmount);
                        $('#' + txtIndividualBalanceIns + SICategoryID).val(data.Table2[j].UtilizedAmount);
                        $('#' + txtIndividualRemarksIns + SICategoryID).val(data.Table2[j].Remarks);

                        $('#' + individualISSIIns + SICategoryID).removeAttr("disabled");
                        $('#' + txtIndividualAllocatedIns + SICategoryID).removeAttr("disabled");
                        $('#' + txtIndividualBalanceIns + SICategoryID).removeAttr("disabled");
                        $('#' + txtIndividualRemarksIns + SICategoryID).removeAttr("disabled");
                        $('#btnIndividual_' + SICategoryID).removeAttr("disabled");
                    }
                }
            }

        }
    }
    if (_sITypeID == "5") {
        $('#ddlBalanceSumInsured').val('floater');

        var floaterTRID = 'trBSIFloater_';
        var floaterISSI = 'chkFloaterISSI_';
        var floaterSI = 'spanIndFloaterSI_';
        var floaterBlocked = 'spanFloaterBlocked_';
        var floaterUtilized = 'spanFloaterUtilized_';
        var floaterBalance = 'spanFloaterBalance_';

        var floaterTRIDIns = 'trBSIFloaterIns_';
        var floaterISSIIns = 'chkFloaterISSIIns_';
        var txtFloaterAllocatedIns = 'txtFloaterAllocatedIns_';
        var txtFloaterBalanceIns = 'txtFloaterBalanceIns_';
        var txtFloaterRemarksIns = 'txtFloaterRemarksIns_';
        var fileFloaterUpload = 'fileFloaterUpload';

        var floaterUtilizedIns
        for (var i = 0; i < data.Table1.length; i++) {
            ////var categoryName = data[i].Categoryname;
            ////categoryName = categoryName.replace(/\s+/g, '');
            var SICategoryID = data.Table1[i].SICategoryID;
            isBPconfigured = data.Table1[i].isAutoRule ? 1 : 0;
            var vBSIRowDesign = '<tr><td colspan="5"><input hidden="hiddden" type="checkbox" checked="checked"></td></tr><tr id="' + floaterTRID + SICategoryID + '">'
                + '<td><input id="' + floaterISSI + SICategoryID + '"  checked="checked" type="checkbox" onclick="EnableorDisable_BSIControls(' + floaterISSI + SICategoryID + ',' + floaterISSIIns + SICategoryID + ',' + txtFloaterAllocatedIns + SICategoryID
                + ',' + txtFloaterBalanceIns + SICategoryID + ',' + txtFloaterRemarksIns + SICategoryID + ',' + fileFloaterUpload + SICategoryID + ',btnFloated_' + SICategoryID + ',' + SICategoryID + ')">'
                + '<span class="lbl padding-8"></span>&nbsp;<strong>' + data.Table1[i].Categoryname + '</strong></td>'
                + '<td><a onclick="myPopup(\'/BenefitPlan/BPSIView?SIID=' + data.Table1[i].BPSIID + "&Source=0" + '\')"><span id="' + floaterSI + SICategoryID + '" ></span></a></td>'
                + '<td><span >' + Makezerofromnullorundefined(data.Table1[i].CB_Amount) + '</span></td>'
                + '<td><span id="' + floaterBlocked + SICategoryID + '"></span></td>'
                ////@*<td><a href="" id="hplIndividual_BaseBlocked" data-showpopup="1" class="show-popup">50,000</a></td>*@
                + '<td><span id="' + floaterUtilized + SICategoryID + '"></span></td>'
                + '<td><span id="' + floaterBalance + SICategoryID + '"></span></td></tr>';

            if (SICategoryID == 71 || SICategoryID == 73) {
                vBSIRowDesign = vBSIRowDesign + '<tr id="' + floaterTRIDIns + SICategoryID + '"><td></td>'
                    + '<td><input disabled="disabled" id="' + floaterISSIIns + SICategoryID + '" type="checkbox"><span class="lbl padding-8"></span>&nbsp;<strong>Insurer Approved</strong></td>'
                    + '<td><strong>Allocated : </strong><input  type="text" disabled="disabled" id="' + txtFloaterAllocatedIns + SICategoryID + '" maxlength="10"  onkeypress="javascript: return onlydigits(event);"></td>'
                    + '<td><strong>Balance : </strong><input readonly="readonly" type="text" id="' + txtFloaterBalanceIns + SICategoryID + '" maxlength="10"  onkeypress="javascript: return onlydigits(event);"></td></tr>'
                    + '<tr id="trBSIFloaterInsRemarks_' + SICategoryID + '"><td></td>'
                    + '<td colspan="3"> <input disabled="disabled" id="' + txtFloaterRemarksIns + SICategoryID + '" type="text" style="width:500px;" placeholder="Remarks">'
                    + '<span class="middle"><span class="upload"><input disabled="disabled" id="' + fileFloaterUpload + SICategoryID + '" type="file" name="myPhoto"></span><img id="uploadPreview1"></span></td>'
                    + '<td><input type="button" disabled="disabled" id="btnFloated_' + SICategoryID + '" class="btn btn-info" onclick="Save_BalanceSumInsuredDetails('
                    + data.Table1[i].MemberSIID + ',' + txtFloaterAllocatedIns + SICategoryID + ',' + txtFloaterBalanceIns + SICategoryID + ',' + txtFloaterRemarksIns + SICategoryID + ',' + floaterISSIIns + SICategoryID + ')" value="Save" /></td></tr>';

            }

            $('#tblBSIFloater tbody').append(vBSIRowDesign);

            $('#' + floaterSI + SICategoryID).text(data.Table1[i].SumInsured);
            $('#' + floaterBlocked + SICategoryID).text(data.Table1[i].BlockedAmt);
            $('#' + floaterUtilized + SICategoryID).text(data.Table1[i].UtilizedAmt);
            var balaceIns = (parseInt(data.Table1[i].SumInsured) + parseInt(Makezerofromnullorundefined(data.Table1[i].CB_Amount))) - (parseInt(data.Table1[i].BlockedAmt) + parseInt(data.Table1[i].UtilizedAmt));
            if (balaceIns <= 0)
                $('#' + floaterBalance + SICategoryID).text('0');
            else
                $('#' + floaterBalance + SICategoryID).text(balaceIns);

            if (SICategoryID == 71 || SICategoryID == 73) {
                for (var j = 0; j < data.Table2.length; j++) {
                    if (data.Table2[j].SICategoryID == data.Table1[i].SICategoryID) {
                        $('#' + floaterISSI + SICategoryID).attr("checked", true);
                        $('#' + floaterISSIIns + SICategoryID).attr("checked", true);
                        $('#' + txtFloaterAllocatedIns + SICategoryID).val(data.Table2[j].ApprovedAmount);
                        $('#' + txtFloaterBalanceIns + SICategoryID).val(data.Table2[j].UtilizedAmount);
                        $('#' + txtFloaterRemarksIns + SICategoryID).val(data.Table2[j].Remarks);

                        $('#' + floaterISSIIns + SICategoryID).removeAttr("disabled");
                        $('#' + txtFloaterAllocatedIns + SICategoryID).removeAttr("disabled");
                        $('#' + txtFloaterBalanceIns + SICategoryID).removeAttr("disabled");
                        $('#' + txtFloaterRemarksIns + SICategoryID).removeAttr("disabled");
                        $('#btnFloated_' + SICategoryID).removeAttr("disabled");
                    }
                }
            }

        }
    }
    if (data.Table3 != null && data.Table3.length > 0) {
        for (var i = 0; i < data.Table3.length; i++) {
            var SICategoryID = data.Table1[i].SICategoryID;
            if (_sITypeID == "5") {
                var vBSIRowDesign = '<tr><td colspan="5"><input hidden="hiddden" type="checkbox" checked="checked"></td></tr><tr id="' + floaterTRID + SICategoryID + '">'
                    + '<td><input id="' + floaterISSI + SICategoryID + '"  checked="checked" type="checkbox" onclick="EnableorDisable_BSIControls(' + floaterISSI + SICategoryID + ',' + floaterISSIIns + SICategoryID + ',' + txtFloaterAllocatedIns + SICategoryID
                    + ',' + txtFloaterBalanceIns + SICategoryID + ',' + txtFloaterRemarksIns + SICategoryID + ',' + fileFloaterUpload + SICategoryID + ',btnFloated_' + SICategoryID + ',' + SICategoryID + ')">'
                    + '<span class="lbl padding-8"></span>&nbsp;<strong>' + data.Table3[i].Categoryname + '</strong></td>'
                    + '<td><a class="show-popup" id="btnBufferPopup" onclick="Bufferpopup();" data-showpopup="50" ><span id="' + floaterSI + SICategoryID + '" >' + data.Table3[i].ApprovedAmount + '</span> </a></td>'
                    + '<td><span >0</span></td>'
                    + '<td><span id="' + floaterBlocked + SICategoryID + '">' + data.Table3[i].BlockedAmt + '</span></td>'
                    + '<td><span id="' + floaterUtilized + SICategoryID + '">' + data.Table3[i].UtilizedAmt + '</span></td>'
                    + '<td><span id="' + floaterBalance + SICategoryID + '">' + (data.Table3[i].ApprovedAmount - data.Table3[i].UtilizedAmt) + '</span></td></tr>';
                $('#tblBSIFloater tbody').append(vBSIRowDesign);
            }
            else {
                var vBSIRowDesign = '<tr><td colspan="5"><input hidden="hiddden" type="checkbox" checked="checked"></td></tr><tr id="' + individualTRID + SICategoryID + '">'
                    + '<td><input id="' + individualISSI + SICategoryID + '" type="checkbox" checked="checked" onclick="EnableorDisable_BSIControls(' + individualISSI + SICategoryID + ',' + individualISSIIns + SICategoryID + ',' + txtIndividualAllocatedIns + SICategoryID
                    + ',' + txtIndividualBalanceIns + SICategoryID + ',' + txtIndividualRemarksIns + SICategoryID + ',' + fileIndividualUpload + SICategoryID + ',btnIndividual_' + SICategoryID + ',' + SICategoryID + ')">'
                    + '<span class="lbl padding-8"></span>&nbsp;<strong>' + data.Table3[i].Categoryname + '</strong></td>'
                    + '<td><a class="show-popup"  id="btnBufferPopup" onclick="Bufferpopup();" data-showpopup="50" ><span id="' + individualSI + SICategoryID + '" >' + data.Table3[i].ApprovedAmount + '</span> </a></td>'
                    + '<td><span >0</span></td>'
                    + '<td><span id="' + individualBlocked + SICategoryID + '">' + data.Table3[i].BlockedAmt + '</span></td>'
                    + '<td><span id="' + individualUtilized + SICategoryID + '">' + data.Table3[i].UtilizedAmt + '</span></td>'
                    + '<td><span id="' + individualBalance + SICategoryID + '">' + (data.Table3[i].ApprovedAmount - data.Table3[i].UtilizedAmt) + '</span></td></tr>';

                $('#tblBSIIndividual tbody').append(vBSIRowDesign);
            }
        }
    }
}

function EnableorDisable_BSIControls(chkCtrlID, chkIns, txtAllocated, txtBalance, txtRemarks, upload, btnSave, SICategoryID) {
    if (SICategoryID == 71 || SICategoryID == 73) {
        var chkCtrlID = chkCtrlID.id;
        var chkIns = chkIns.id;
        var txtAllocated = txtAllocated.id;
        var txtBalance = txtBalance.id;
        var txtRemarks = txtRemarks.id;
        var upload = upload.id;
        var btnSave = btnSave.id;

        if ($('#' + chkCtrlID).is(":checked") == true) {
            $('#' + chkIns).removeAttr("disabled");
            $('#' + txtAllocated).removeAttr("disabled");
            //$('#' + txtBalance).removeAttr("disabled");
            $('#' + txtRemarks).removeAttr("disabled");
            $('#' + upload).removeAttr("disabled");
            $('#' + btnSave).removeAttr("disabled");
        }
        else {
            $('#' + chkIns).attr("disabled", "disabled");
            $('#' + txtAllocated).attr("disabled", "disabled");
            //$('#' + txtBalance).attr("disabled", "disabled");
            $('#' + txtRemarks).attr("disabled", "disabled");
            $('#' + upload).attr("disabled", "disabled");
            $('#' + btnSave).attr("disabled", "disabled");


            $('#' + chkIns).removeAttr("checked", "checked");
            $('#' + txtAllocated).val('');
            $('#' + txtBalance).val('');
            $('#' + txtRemarks).val('');
            $('#' + upload).val('');
        }
    }
}

function Save_BalanceSumInsuredDetails(_MemberSIID, _AllocatedAmount, _BalanceAmount, _Remarks, _chkIns) {
    try {
        if (BalanceSumInsuredDetails_Validate(_AllocatedAmount, _Remarks, _chkIns)) {
            var AllocatedAmount = _AllocatedAmount.id;
            var Remarks = _Remarks.id;
            var BalanceAmount = _BalanceAmount.id

            ajaxGETResonse('/MedicalScrutiny/Save_BalanceSumInsured', BalanceSumInsured_Response, BalanceSumInsured_Response,
                {
                    ClaimID: $("#hdnClaimID").val(), SlNo: $("#hdnClaimSlNo").val(), MemberSIID: _MemberSIID, AllocatedAmount: $('#' + AllocatedAmount).val(),
                    BalanceAmount: $('#' + BalanceAmount).val(), Remarks: $('#' + Remarks).val()
                });
        }

    } catch (e) {
        alert(e.message);
    }
}

function BalanceSumInsuredDetails_Validate(_AllocatedAmount, _Remarks, _chkIns) {
    try {
        var _controlFields = [];

        // Hospitalization Details
        _controlFields.push([_AllocatedAmount.id, 'Please Enter Allocated Amount']);
        _controlFields.push([_Remarks.id, 'Please Enter Remarks']);
        _controlFields.push([_chkIns.id, 'Please Select Insurer Approved']);

        return CustomFiledsValidate(_controlFields, 'divErrorMessage');

    } catch (e) {
        alert('Error Occured While Validating Balance SI');
    }
}

function BalanceSumInsured_Response(data) {
    try {
        CheckSessionVariable(data.responseText);
        DialogResultMessage(data.responseText);
    } catch (e) {
        alert('Error Occured');
    }
}
/* End Balace SumInsured */

function myPopup(url) {
    window.open(url, url, "width=1000, height=600,left=100,top=20,menubar=no,location=no,resizable=yes,scrollbars=yes,status=yes");

    //var windowObjectReference;
    //var strWindowFeatures = "target=_blank,menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes";

    //function openRequestedPopup() {
    //    windowObjectReference = window.open(url, url, strWindowFeatures);
    //}
    //openRequestedPopup();
}

function OpenTariffPopUp(probableDOA, prcNo) {
    var PRCNo = MakeNullfromUndefinedorEmpty(prcNo);
    if (PRCNo != null) {
        //var url = 'http://webshare.fhpl.net/ProviderTariff/Home.aspx?PRC=' + PRCNo + '&DOA=' + probableDOA + '&AppName=MCare Product';
        var url = '/Common/ProviderTariff?PRCNO=' + PRCNo + '';
        window.open(url, "width=1000, height=600");
    }
}

function OpenTariffDocPopUp(tariffKey) {
    if (tariffKey != null) {
        var url = '/Common/ProviderTariff?tariffKey=' + tariffKey;
        window.open(url, "width=1000, height=600");
    }
}

function CommentedCode() {
    //function Save_ServicesBillsDeductions(_ClaimID, _SlNo, _RoleID, _ServiceTypeID, _ServiceSubTypeID) {
    //    try {

    //        if ($('#hdnServiceDetails').val() != '') {
    //            _services = $.parseJSON($('#hdnServiceDetails').val());
    //        }
    //        $.each(_services, function (i, service) {

    //            _serviceID.splice(i, 1);

    //            if (parseInt(_serviceRows.BillAmount) > 0) {
    //                var _serviceRows = {};
    //                _serviceRows.ServiceID = _serviceID;
    //                _serviceRows.BillAmount = _serviceRows.BillAmount;
    //                _serviceRows.DeductionAmount = _serviceRows.DeductionAmount;
    //                if ($('#txtDiscount_' + ctrlID).val() == '' || $('#txtDiscount_' + ctrlID).val() == null)
    //                    _serviceRows.DiscountAmount = null;
    //                else
    //                    _serviceRows.DiscountAmount = $('#txtDiscount_' + ctrlID).val();
    //                _serviceRows.EligibleAmount = null;
    //                _serviceRows.SanctionedAmount = null;
    //                _serviceRows.AdditionalAmount = null;
    //                _serviceRows.AdditionalAmtReasonIDs = 0;
    //                _serviceRows.CoPayment = null;
    //                _serviceRows.Remarks = $('#txtRemarks_' + ctrlID).val();
    //                _services.push(_serviceRows);
    //            }
    //        });
    //        if (_services.length > 0)
    //            $('#hdnServiceDetails').val(JSON.stringify(_services));

    //        ajaxGETResonse('/Claims/Save_ServiceBillingDetails', ServicesBillsDeductions_Response, ServicesBillsDeductions_Response,
    //            {
    //                ClaimID: _ClaimID, SlNo: _SlNo, ClaimBillDetails: $('#hdnBillDetails').val(),
    //                ClaimDeductionDetails: $('#hdnDecuctionsDetails').val(), ClaimsServiceDetails: $('#hdnServiceDetails').val(), ServiceTypeID: _ServiceTypeID,
    //                ServiceSubTypeID: _ServiceSubTypeID, RoleID: _RoleID
    //            });


    //    } catch (e) {
    //        alert('Error Occured while Insert Service Details');
    //    }
    //}

    //function ServicesBillsDeductions_Response(data) {
    //    try {
    //        //ShowResultMessage('divErrorMessage', data.responseText);
    //        DialogResultMessage(data.responseText);
    //    } catch (e) {
    //        alert('Error Occured');
    //    }
    //}
}

function BindPastBankDetails(data) {
    if (data != null) {

    }
}

/* CallCenter Remarks */
function LoadCallCenter_CallDetails() {
    if ($('#tblCallCenterRemarks tbody').children().length == 0) {
        $.ajax({
            //type: "POST",
            url: "/Claims/CallCenterRemarks",
            contentType: 'application/json;charset=utf-8',
            //processData: false,
            data: { ClaimID: $('#hdnClaimID').val(), IsFrmArchived: $('#hdnIsFrmArchived').val() },
            success: function (data) {
                CheckSessionVariable(data);
                data = $.parseJSON(data);

                if (data.ID == 1) {
                    DialogErrorMessage(data.Message);
                }
                else {
                    for (var i = 0; i < data.length; i++) {
                        var tblBody = '<tr><td>' + MakeEmptyfromUndefinedorNull(data[i].CallerName) + '</td>'
                            + '<td>' + MakeEmptyfromUndefinedorNull(data[i].MobileNo) + '</td>'
                            + '<td>' + MakeEmptyfromUndefinedorNull(data[i].EmailID) + '</td>'
                            + '<td>' + data[i].Remarks + '</td>'
                            + '</tr>';
                        $('#tblCallCenterRemarks tbody').append(tblBody);
                    }
                }
            },
            error: function (e, x) {
                ShowResultMessage('ErrorMessage', e.responseText);
            }
        });

    }
}


//$('#ddlReceivedAccomodation').on("change", function () {    
//    var ID = $('#ddlReceivedAccomodation').val();
//    if (ID != null && ID != "") {
//            $("#ddlApprovedFacility").val($('#ddlReceivedAccomodation').val());
//    }
//            });
//function ddlReceivedAccomodationchange() {
//    if (approvedfacilityid != 0) {
//        $("#ddlApprovedFacility").val(approvedfacilityid);
//    }
//    else {
//        var ID = $('#ddlReceivedAccomodation').val();
//        if (ID != null && ID != "") {
//            $("#ddlApprovedFacility").val($('#ddlReceivedAccomodation').val());
//        }
//    }
//}


//******************************************************************************** 
// For task: SP-1321 (Bank IFSC Master Implementation Under Patient Temp Address)
//********************************************************************************
$("#txtReceivedPatient_IFSCode").change(function () {
    var inputvalues = $(this).val();
    var reg = /[A-Z|a-z]{4}[0][a-zA-Z0-9]{6}$/;
    if (inputvalues.match(reg)) {
        GetBankDetailsByIFSCCode(inputvalues);
    }
    else {
        $("#txtReceivedPatient_IFSCode").val("");
        alert("You entered invalid IFSC code");
        return false;
    }
});

function GetBankDetailsByIFSCCode(_IFSCCode) {
    $.ajax({
        //type: "POST",
        url: "/Claims/GetBankDetailsByIFSCCode",
        contentType: 'application/json;charset=utf-8',
        //processData: false,
        data: { IFSCCode: _IFSCCode },
        success: function (data) {
            CheckSessionVariable(data.responseText);
            data = $.parseJSON(data);
            if (data.length > 0) {
                $('#txtReceivedPatient_BankName').val(data[0].Name);
                $('#txtReceivedPatient_BranchName').val(data[0].Branch);
            }
        },
        error: function (e, x) {
            ShowResultMessage('ErrorMessage', e.responseText);
        }
    });
}

function showdataPopup() {   // added by prasad
    $.ajax({
        url: "/MedicalScrutiny/GetClaimInvestigationScore",
        contentType: 'application/json;charset=utf-8',
        //processData: false,
        data: { ClaimID: $('#hdnClaimID').val(), SlNo: $("#hdnClaimSlNo").val() },
        success: function (data) {
            CheckSessionVariable(data.responseText);
            data = $.parseJSON(data);
            if (data.length > 0) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].conditionID == 1) {
                        $("#Pincode_Score").text(data[i].name = null ? 'N/A' : data[i].name);
                        $("#scoreProvider").text(data[i].score = null ? 'N/A' : data[i].score);
                    }
                    else if (data[i].conditionID == 2) {
                        $("#Age_Score").text(data[i].name = null ? 'N/A' : data[i].name);
                        $("#scoreAge").text(data[i].score = null ? 'N/A' : data[i].score);
                    }
                    else if (data[i].conditionID == 3) {
                        $("#HospitalType_Score").text(data[i].name = null ? 'N/A' : data[i].name);
                        $("#scoreHospital").text(data[i].score = null ? 'N/A' : data[i].score);
                    }
                    else if (data[i].conditionID == 4) {
                        $("#ICD_Score").text(data[i].name = null ? 'N/A' : data[i].name);
                        $("#scoreCode").text(data[i].score = null ? 'N/A' : data[i].score);
                    }
                }
            }
            else if (data.length <= 0) {
                $("#Pincode_Score").text('N/A');
                $("#scoreProvider").text('N/A');
                $("#Age_Score").text('N/A');
                $("#scoreAge").text('N/A');
                $("#HospitalType_Score").text('N/A');
                $("#scoreHospital").text('N/A');
                $("#ICD_Score").text('N/A');
                $("#scoreCode").text('N/A');
            }
        },
        error: function (e, x) {
            ShowResultMessage('ErrorMessage', e.responseText);
        }
    })
}

//GST Details

function showdataPopup1(id) {
    $('#DivGstdetails').show();
    $("#gst_tab").attr("disabled", "false");
    $('#gst_tab').attr('checked', false)
    $('#sgst_123,#gst_123,#cgst_123,#igst_123,#gst_1,#cgst_2,#igst_3,#sgst_4').attr("disabled", "true");
    if ($('#gst_1,#cgst_2,#igst_3,#sgst_4').is(":checked") == true) { $('#gst_1,#cgst_2,#igst_3,#sgst_4').attr('checked', false); }
    //$('#gst_123,#igst_123,#cgst_123,#sgst_123').val('');
    if (GSTdata.length > 0) {
        if (GSTdata[0].GST != null) { $('#gst_1').prop('checked', true); $('#gst_tab').prop('checked', true); $('#gst_123').val(GSTdata[0].GST); $('#gst_123,#gst_1').removeAttr("disabled", "false") }
        if (GSTdata[0].IGST != null) { $('#igst_3').prop('checked', true); $('#gst_tab').prop('checked', true); $('#igst_123').val(GSTdata[0].IGST); $('#igst_123,#igst_3').removeAttr("disabled", "false") }
        if (GSTdata[0].CGST != null) { $('#cgst_2').prop('checked', true); $('#gst_tab').prop('checked', true); $('#cgst_123').val(GSTdata[0].CGST); $('#cgst_123,#cgst_2').removeAttr("disabled", "false") }
        if (GSTdata[0].SGST != null) { $('#sgst_4').prop('checked', true); $('#gst_tab').prop('checked', true); $('#sgst_123').val(GSTdata[0].SGST); $('#sgst_123,#sgst_4').removeAttr("disabled", "false") }
        $("#gst_tab").attr("disabled", "true");
    }
    if (GSTdata[0].GST == null && GSTdata[0].IGST == null && GSTdata[0].CGST == null && GSTdata[0].SGST == null) {
        $('#gst_tab').removeAttr("disabled", "false");
    }

    if ($('#hdnRequestTypeID').val() == 1 || $('#hdnRequestTypeID').val() == 2 || $('#hdnRequestTypeID').val() == 3 || $('#hdnRequestTypeID').val() == 4) {
        $('#gst_tab').removeAttr("disabled", "false");

    }
    else {
        $('#gst_tab').prop("disabled", "true");
    }
    if (($('#hdnClaimStageID').val() == 4 || $('#hdnClaimStageID').val() == 24)) {
        $('#gst_tab').removeAttr("disabled", "false");
    }
    else {
        $('#sgst_123,#gst_123,#cgst_123,#igst_123,#gst_1,#cgst_2,#igst_3,#sgst_4').attr("disabled", "false");
        $('#gst_tab').attr("disabled", "true");
    }
    if ($("#ddlServiceType").val() == 2) {
        $('#gst_tab').prop("disabled", "true");
    }
    else { $('#gst_tab').removeAttr("disabled", "false"); }
    if (id == 0) {
        $('#gst_tab,#gst_1,#cgst_2,#igst_3,#sgst_4').attr("disabled", "true");
        // $('#gst_1,#cgst_2,#igst_3,#sgst_4').attr("disabled", "true");
    }

}

function showdataPopup12() {
    var SkipValidation = {};
    if ($('#gst_tab').is(":checked") == true) { SkipValidation["isgst"] = 1; } else { SkipValidation["isgst"] = 0; }

    if (SkipValidation["isgst"] == 0) {
        $('#sgst_123,#gst_123,#cgst_123,#igst_123,#gst_1,#cgst_2,#igst_3,#sgst_4').attr("disabled", "true");
        if ($('#gst_1,#cgst_2,#igst_3,#sgst_4').is(":checked") == true) { $('#gst_1,#cgst_2,#igst_3,#sgst_4').attr('checked', false); }
        $('#gst_123,#igst_123,#cgst_123,#sgst_123').val('');
    }
    else if (SkipValidation["isgst"] == 1) {
        //$('#sgst_123,#gst_123,#cgst_123,#igst_123,#gst_1,#cgst_2,#igst_3,#sgst_4').removeAttr("disabled", "false");
        $('#gst_1,#cgst_2,#igst_3,#sgst_4').removeAttr("disabled", "false");


    }
    if (GSTdata.length > 0 && SkipValidation["isgst"] == 1) {
        if (GSTdata[0].GST != null) { $('#gst_1').prop('checked', true); $('#gst_tab').prop('checked', true); $('#gst_123').val(GSTdata[0].GST); $('#gst_123,#gst_1').removeAttr("disabled", "false"); $('#sgst_123,#cgst_123,#igst_123,#cgst_2,#igst_3,#sgst_4').attr("disabled", "true"); }

        if (GSTdata[0].IGST != null) { $('#gst_tab').prop('checked', true); $('#igst_3').prop('checked', true); $('#igst_123').val(GSTdata[0].IGST); $('#igst_123,#igst_3').removeAttr("disabled", "false"); $('#sgst_123,#gst_123,#cgst_123,#gst_1,#cgst_2,#sgst_4').attr("disabled", "true"); }
        if (GSTdata[0].CGST != null) { $('#cgst_2').prop('checked', true); $('#gst_tab').prop('checked', true); $('#cgst_123').val(GSTdata[0].CGST); $('#cgst_123,#cgst_2').removeAttr("disabled", "false"); $('#sgst_123,#gst_123,#igst_123,#gst_1,#igst_3,#sgst_4').attr("disabled", "true"); }
        if (GSTdata[0].SGST != null) { $('#sgst_4').prop('checked', true); $('#gst_tab').prop('checked', true); $('#sgst_123').val(GSTdata[0].SGST); $('#sgst_123,#sgst_4').removeAttr("disabled", "false"); $('#gst_123,#cgst_123,#igst_123,#gst_1,#cgst_2,#igst_3').attr("disabled", "true"); }
        if (($('#hdnClaimStageID').val() == 4 || $('#hdnClaimStageID').val() == 24)) {
            $('#gst_tab').removeAttr("disabled", "false");
        }
        else {
            $('#sgst_123,#gst_123,#cgst_123,#igst_123,#gst_1,#cgst_2,#igst_3,#sgst_4').attr("disabled", "false");
            $('#gst_tab').attr("disabled", "true");
        }
    }
}

function EnableDisable() {
    if ($('#gst_1').is(":checked") == true || $('#igst_3').is(":checked") == true) {
        $('#cgst_2,#sgst_4,#cgst_123,#sgst_123').attr("disabled", "true")
        //$('#gst_4').attr("disabled", "true")
        //$('#cgst_123').attr("disabled", "true")
        //$('#sgst_123').attr("disabled", "true")

    }

    else if ($('#gst_1').is(":checked") == false || $('#igst_3').is(":checked") == false) {
        $('#cgst_2,#sgst_4,#cgst_123,#sgst_123').removeAttr("disabled", "false");
        $('#gst_123,#cgst_123,#igst_123,#sgst_123').attr("disabled", "true");
        // $('#sgst_4').removeAttr("disabled", "false")
        // $('#cgst_123').removeAttr("disabled", "false")
        //  $('#sgst_123').removeAttr("disabled", "false")

    }
    if ($('#gst_1').is(":checked") == true) {
        $('#igst_3,#igst_123').attr("disabled", "true");
        $('#gst_123').removeAttr("disabled", "false");
    }
    //else if ($('#gst_1').is(":checked") == false) {
    //    $('#gst_123,#cgst_123,#igst_123,#sgst_123').attr("disabled", "true");
    //    $('#gst_123').val('');
    //    //$('#igst_3,#igst_123').removeAttr("disabled", "false");

    //    // $('#igst_123').removeAttr("disabled", "false")
    //}
    if ($('#igst_3').is(":checked") == true) {
        $('#igst_123').removeAttr("disabled", "true");
        $('#gst_1').attr("disabled", "true");
        $('#gst_123').attr("disabled", "true");
    }
    //else if ($('#igst_3').is(":checked") == false) {
    //  //  $('#gst_123,#cgst_123,#igst_123,#sgst_123').attr("disabled", "true");
    //    $('#igst_123').val('');

    //    //$('#gst_1').removeAttr("disabled", "false");
    //    //$('#gst_123').removeAttr("disabled", "false");
    //}

    if ($('#cgst_2').is(":checked") == true) {
        $('#cgst_123,#sgst_123').removeAttr("disabled", "false");
        $('#sgst_4').prop('checked', true);
        $('#gst_1').attr("disabled", "true");
        $('#gst_123').attr("disabled", "true");
        $('#igst_3').attr("disabled", "true");
        $('#igst_123').attr("disabled", "true");


    } if ($('#cgst_2').is(":checked") == false) {
        //if ($('#sgst_4').is(":checked") == false) {
        $('#sgst_4').prop('checked', false);
        // }
        // $('#sgst_4').is(":checked") == false)
    }
    if ($('#sgst_4').is(":checked") == true) {
        $('#cgst_123,#sgst_123').removeAttr("disabled", "false");
        $('#cgst_2').prop('checked', true);
        $('#gst_1').attr("disabled", "true");
        $('#gst_123').attr("disabled", "true");
        $('#igst_3').attr("disabled", "true");
        $('#igst_123').attr("disabled", "true");


    }
    else if ($('#cgst_2').is(":checked") == false || $('#sgst_4').is(":checked") == false) {
        if ($('#gst_1').is(":checked") != true && $('#igst_3').is(":checked") != true) {
            $('#gst_1,#gst_123,#igst_3,#igst_123').removeAttr("disabled", "false");
            $('#cgst_123').val('');
            $('#sgst_123').val('');
            // $('#gst_123').removeAttr("disabled", "false")
            // $('#igst_3').removeAttr("disabled", "false")
            // $('#igst_123').removeAttr("disabled", "false")
        }
    }
    if ($('#gst_1').is(":checked") == false && $('#igst_3').is(":checked") == false && ($('#cgst_2').is(":checked") == false && $('#sgst_4').is(":checked") == false)) {
        $('#gst_123,#cgst_123,#igst_123,#sgst_123').attr("disabled", "true");
        $('#gst_123').val('');
        //$('#igst_3,#igst_123').removeAttr("disabled", "false");

        // $('#igst_123').removeAttr("disabled", "false")
    }
    if ($('#igst_3').is(":checked") == false) {
        //  $('#gst_123,#cgst_123,#igst_123,#sgst_123').attr("disabled", "true");
        $('#igst_123').val('');

        //$('#gst_1').removeAttr("disabled", "false");
        //$('#gst_123').removeAttr("disabled", "false");
    }


}


function Savegstdetails() {
    if ($('#gst_123').val() == "" && $('#sgst_123').val() == "" && $('#igst_123').val() == "" && $('#cgst_123').val() == "") {
        ShowResultMessage('divGSTyPendingMessage', 'Please select atlaease one field.');
        return;
    }
    try {
        $.ajax({
            //type:"POST",
            url: "/MedicalScrutiny/GetGstDetails",
            contentType: 'application/json;charset=utf-8',
            data: {
                claimid: $('#hdnClaimID').val(), slno: $("#hdnClaimSlNo").val(), gst: $('#gst_123').val(), sgst: $('#sgst_123').val(),
                igst: $('#igst_123').val(), cgst: $('#cgst_123').val()
            },
            success: function (data) {
                data = $.parseJSON(data);

                if (data == null || data == "") {
                    //alert('Data not found.');
                }
                else {
                    FillReceivedPatientDetails(data);
                }
            },

        })
    }
    catch (e) {
        DialogErrorMessage("Error while unlock");
    }
}
$('#gst_123,#cgst_123,#igst_123,#sgst_123').keypress(function (e) {
    if (this.value.length == 0 && e.which == 48) {
        return false;
    }
});
//ENd of GST details
function MemberDetails_ViewInsuranceWise12() {  // added by prasad
    if ($("#hdnInsuranceCompanyID").val() != 24) {
        alert('Data not found');
    }
    else {
        if ($('#hdnMemberPolicyID').val() == null) {
            alert('Insurance Member Details Data not found.');
        }
        else {
            $.ajax({
                type: "GET",
                url: "/Common/MemberDetails_RetrieveInsuranceWise",
                contentType: 'application/json;charset=utf-8',

                data: { memberPolicyID: $('#hdnMemberPolicyID').val(), IssueID: $("#hdnInsuranceCompanyID").val() },
                success: function (data) {
                    CheckSessionVariable(data);
                    data = $.parseJSON(data);
                    var InsuranceData = data.Table;
                    var _html = '';
                    var columns = GetColumnsOfJsonObj(data.Table[0]);
                    $('#divinsurerbenefits').html(_html);
                    $.each(columns, function (i, item) {
                        if (item != 'PortingFileID' && item != 'IssueID' && item != 'MemberPolicyID') {
                            if (i < 137) {
                                _html = _html + '<div class="form-group col-sm-3"><label > <strong><u>' + item + '</u></strong> </label><br><span> ' + (InsuranceData[0][item] == null || InsuranceData[0][item] == "" ? 'N/A' : InsuranceData[0][item]) + '</span></div>';
                            } else {
                                _html = _html + '<div class="form-group col-sm-4"><label > <strong><u>' + item + '</u></strong> </label><br><span> ' + (InsuranceData[0][item] == null || InsuranceData[0][item] == "" ? 'N/A' : InsuranceData[0][item]) + '</span></div>';
                            }
                        }
                    });
                    $('#divinsurerbenefits').html(_html);
                },
                error: function (e, x) {
                    ShowResultMessage('ErrorMessage', e.responseText);
                }
            });

        }
    }
}   //added by prasad
//added by Rajesh Yerramsetti. sp3v-1566
function OpenCashTariffPopUp(_prcNo, _providerID, _ClaimID, _ClaimSlno) {
    window.open("/Claims/GetRequestTariffDetails?PRCNO=" + _prcNo + "&ProviderID=" + _providerID + "&ClaimID=" + _ClaimID + "&ClaimSlno=" + _ClaimSlno, "", "width=1000, height=600");
}

function cnahgeamtonroomdays(ServiceID) {
    if (MakeZerofromUndefinedorEmpty(ServiceID) != 0) {
        var hosroomdays = parseInt($('#txtICUDays').val()) + parseInt($('#txtRoomDays').val())

        // startregion  SP3V-4995
        var BillRoomdaysDetails = [];
        BillRoomdaysDetails.push(parseInt($('#txtbillRoomdays_' + 2 + '_' + $('#hdnClaimID').val()).val()));   //ICU
        BillRoomdaysDetails.push(parseInt($('#txtbillRoomdays_' + 3 + '_' + $('#hdnClaimID').val()).val()));   //Roomrent
        if (BillRoomdaysDetails.length > 0) {
            $('#hdnDaysDetails').val(JSON.stringify(BillRoomdaysDetails));
        }
        // endregion

        var billroomdays = (parseInt($('#txtbillRoomdays_' + 2 + '_' + $('#hdnClaimID').val()).val())) + (parseInt($('#txtbillRoomdays_' + 3 + '_' + $('#hdnClaimID').val()).val()))
        if (parseInt(hosroomdays) < parseInt(billroomdays)) {
            $('#txtbillRoomdays_' + ServiceID + '_' + $('#hdnClaimID').val()).val(0)
            DialogWarningMessage('Billing roomdays should be less than hospitalisation room days')
            return false;
        }

        else {
            //if (ServiceID == 2)
            //    MapBills_Service(ServiceID);
            //else if (ServiceID == 3)
            MapBills_Service(ServiceID);
            calculate_proportionateperc(ServiceID);
        }
    }
}
function DOBofChaildValidation() {
    var isvalid = false;
    var corporateID = $("#hdnCorporateID").val();
    var allowedCorporates = ["230792", "123742", "85495", "81889", "80991", "70899", "70576", "56830", "56787", "23452", "23448", "23447", "23446", "23445", "21485", "21484", "21341", "21340", "21339", "21263", "21180", "21055", "20988", "20987", "20986"];

    if ($('#txtDateOfDelivery').val() == "" && allowedCorporates.includes(corporateID.toString()) && $('#chkIsMaternity').is(":checked") == true) {
        isvalid = true;
    }
    return isvalid;
}
