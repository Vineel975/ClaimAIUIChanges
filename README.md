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
                try { Elmah.ErrorLog.GetDefault(null).Log(new Elmah.Error(new Exception("DMS upload [" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "] ClaimId=" + ClaimId + " Slno=" + Slno + " | START name='" + file.FileName + "' size=" + file.ContentLength + " bytes (~" + (file.ContentLength / 1024) + " KB) DMSPathForUploadFile='" + DMSPathForUploadFile + "'"))); } catch { } // LOG
                string path = DMSPathForUploadFile;// AppDomain.CurrentDomain.BaseDirectory + "\\Documents\\";
                FullPath = path + YearString + Util_Constants.Slash + YearMonthString + Util_Constants.Slash + DateString + Util_Constants.Slash + ClaimId + "-" +Slno + Util_Constants.Slash;
                try { Elmah.ErrorLog.GetDefault(null).Log(new Elmah.Error(new Exception("DMS upload [" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "] ClaimId=" + ClaimId + " Slno=" + Slno + " | T1 before Directory.Exists/CreateDirectory FullPath='" + FullPath + "'"))); } catch { } // LOG
                if (!Directory.Exists(path + YearString + Util_Constants.Slash + YearMonthString + Util_Constants.Slash + DateString + Util_Constants.Slash + ClaimId + "-" + Slno + Util_Constants.Slash))
                {
                    Directory.CreateDirectory(path + YearString + Util_Constants.Slash + YearMonthString + Util_Constants.Slash + DateString + Util_Constants.Slash + ClaimId + "-" + Slno + Util_Constants.Slash);
                }
                try { Elmah.ErrorLog.GetDefault(null).Log(new Elmah.Error(new Exception("DMS upload [" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "] ClaimId=" + ClaimId + " Slno=" + Slno + " | T2 after dir ensure (T2 - T1 = directory time)"))); } catch { } // LOG
                SystemFileName = Guid.NewGuid() + Util_Constants.Underscore + DateTime.Now.ToFileTime().ToString();// +"." + file.FileName.Split('.')[1];
                string fileName = file.FileName.Replace('&', '-');
                file.SaveAs(Path.Combine(FullPath, SystemFileName + Path.GetExtension(fileName)));
                try { Elmah.ErrorLog.GetDefault(null).Log(new Elmah.Error(new Exception("DMS upload [" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "] ClaimId=" + ClaimId + " Slno=" + Slno + " | T3 after file.SaveAs (T3 - T2 = SaveAs time to the share)"))); } catch { } // LOG
               
                long crlid = _fupObj.InsertClaimsFileRecord(file, 191, 191, ref SystemFileName, ref FullPath, 87);
                try { Elmah.ErrorLog.GetDefault(null).Log(new Elmah.Error(new Exception("DMS upload [" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "] ClaimId=" + ClaimId + " Slno=" + Slno + " | T4 after InsertClaimsFileRecord crlid=" + crlid + " (T4 - T3 = that call's time)"))); } catch { } // LOG
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
                try { Elmah.ErrorLog.GetDefault(null).Log(new Elmah.Error(new Exception("DMS upload [" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "] ClaimId=" + ClaimId + " Slno=" + Slno + " | T5 before InsertManualuploadrequest"))); } catch { } // LOG
                _objClaimsVM.InsertManualuploadrequest(filenames, _filesize.ToString(), clrIds, 86, "Email", RegionId, 0, "Email", "Email", "Email",
                   "Email",Convert.ToDateTime(Receivedate), UserregionId, ClaimId, "3", Slno, "1", docCategory, documentName, Receivedate, Receivedtype, out ClaimLandingId, out errormsg);
                try { Elmah.ErrorLog.GetDefault(null).Log(new Elmah.Error(new Exception("DMS upload [" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "] ClaimId=" + ClaimId + " Slno=" + Slno + " | T6 after InsertManualuploadrequest DONE (T6 - T5 = SP time)"))); } catch { } // LOG
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
