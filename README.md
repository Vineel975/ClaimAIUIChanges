https://spectra-ai.fhpl.net/FUP/UploadingDMSDocuments?ClaimId=26061143194&Slno=1&docCategory=CFR&documentName=Preauth_Form-CFR134246208840111061.pdf&Receivedate=03-Jun-2026%2000:00&Receivedtype=3

[HttpPost]
public string UploadingDMSDocuments(string ClaimId, string Slno, string docCategory, string documentName, string Receivedate, string Receivedtype)
{

    try
    {
        string retVal = string.Empty;
        if (Request.Files.AllKeys.Any())
        {
            var file = Request.Files["files"];

            if (file != null)
            {
                string path = DMSPathForUploadFile;// AppDomain.CurrentDomain.BaseDirectory + "\\Documents\\";

                FullPath = path + YearString + Util_Constants.Slash + YearMonthString + Util_Constants.Slash + DateString + Util_Constants.Slash + ClaimId + "-" +Slno + Util_Constants.Slash;
                if (!Directory.Exists(path + YearString + Util_Constants.Slash + YearMonthString + Util_Constants.Slash + DateString + Util_Constants.Slash + ClaimId + "-" + Slno + Util_Constants.Slash))
                {
                    Directory.CreateDirectory(path + YearString + Util_Constants.Slash + YearMonthString + Util_Constants.Slash + DateString + Util_Constants.Slash + ClaimId + "-" + Slno + Util_Constants.Slash);
                }
                SystemFileName = Guid.NewGuid() + Util_Constants.Underscore + DateTime.Now.ToFileTime().ToString();// +"." + file.FileName.Split('.')[1];
                string fileName = file.FileName.Replace('&', '-');

                file.SaveAs(Path.Combine(FullPath, SystemFileName + Path.GetExtension(fileName)));
               

                long crlid = _fupObj.InsertClaimsFileRecord(file, 191, 191, ref SystemFileName, ref FullPath, 87);
                // long crlid = new FileUploadUtilityModel().InsertClaimsFileRecord(file, 0, 191, ref SystemFileName, ref FullPath, 87);
                retVal = crlid + "," + Path.GetFileName(fileName) + "," + file.ContentLength / 1024;
                if (String.IsNullOrEmpty(clrIds))
                {
                    clrIds = clrIds + crlid;
                    filenames = filenames + Path.GetFileName(fileName);
                    //clrIds = "," + clrIds + ","+ crlid;
                }
                else
                {
                    //clrIds = "," + clrIds + crlid;
                    filenames = "," + filenames + Path.GetFileName(fileName);
                }
                _filesize = _filesize + file.ContentLength / 1024;

                long ClaimLandingId = 0;
                string errormsg = string.Empty;
                int RegionId = Convert.ToInt32(Session[SessionValue.RegionID]);
                int UserregionId = Convert.ToInt32(Session[SessionValue.UserRegionID]);
                //SP3V-176 Leena Commented add 2 output new parameter  and ClaimLandingId in return
                _objClaimsVM.InsertManualuploadrequest(filenames, _filesize.ToString(), clrIds, 86, "Email", RegionId, 0, "Email", "Email", "Email",
                   "Email",Convert.ToDateTime(Receivedate), UserregionId, ClaimId, "3", Slno, "1", docCategory, documentName, Receivedate, Receivedtype, out ClaimLandingId, out errormsg);
                return "Files uploaded successfully|" + Convert.ToString(ClaimLandingId);
            }
        }
        return retVal;
        
    }
    catch (Exception ex)
    {
        Elmah.ErrorLog errorLog = Elmah.ErrorLog.GetDefault(null);
        errorLog.ApplicationName = System.Web.Configuration.WebConfigurationManager.AppSettings["AppName"].ToString();
        errorLog.Log(new Elmah.Error(ex));
        return ex.Message;
    }


}




