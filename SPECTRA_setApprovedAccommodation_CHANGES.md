# Spectra change — persist the iframe's Approved Accommodation on Save

File: `Views/MedicalScrutiny/Index.cshtml` (deployed: index_-_2026-06-08T210045_258.cshtml)
Location: the `window.addEventListener('message', ...)` handler — the
`setApprovedAccommodation` branch (currently lines **9076–9114**).

## Why
The handler ignored the value the iframe sent and always forced
`#ddlApprovedFacility` to the **availed** dropdown value
(`$('#ddlReceivedAccomodation').val() || event.data.facilityId`). It also
hardcoded ICU Days = 1 (cataract day-care logic) for every claim. So a manual
Approved Accommodation change made in the iframe could never survive a Save.

## Fix
1. Apply `event.data.facilityId` (the iframe's chosen value — prepopulated or
   manual) to `#ddlApprovedFacility`; fall back to the availed value only if the
   iframe sent nothing.
2. Run the ICU-Days / `hdnDaysDetails` day-care block **only for cataract**
   (`event.data.claimType === 'cataract'`), so maternity / other / manual
   non-day-care changes are left alone.

The ClaimAI iframe now sends `{ type:'setApprovedAccommodation', facilityId, claimType }`
both immediately on a manual dropdown change and again on Save (from
`sendAccommodationToSpectra`, using `selectedApprovedId`).

`#ddlApprovedFacility` is persisted by Spectra's native Save Hospitalization
Details (restore logic at lines 7557-7571 / 8295-8313) — no DB change needed.

---

## FIND (exact — lines 9076-9114)
```javascript
                if (event.data.type === 'setApprovedAccommodation') {
                    // Approved accommodation = Availed accommodation (same)
                    // Read directly from ddlReceivedAccomodation (availed)
                    var availedFacilityId = $('#ddlReceivedAccomodation').val() || event.data.facilityId;
                    console.log('[ClaimAI] setApprovedAccommodation: using availed value:', availedFacilityId);

                    if (availedFacilityId) {
                        var $ddlApprv = $('#ddlApprovedFacility');
                        // Temporarily enable, set value, re-disable
                        $ddlApprv.removeAttr('disabled');
                        $ddlApprv.val(availedFacilityId);
                        $ddlApprv.attr('disabled', 'disabled');
                        window._claimAI_approvedFacilityId = availedFacilityId;
                        console.log('[ClaimAI] ddlApprovedFacility set to:', availedFacilityId);
                    }

                    // Set ICU Days = 1 for cataract day-care cases
                    var $icuDays = $('#txtICUDays');
                    if ($icuDays.length) {
                        $icuDays.removeAttr('disabled').val('1').attr('disabled', 'disabled');
                        console.log('[ClaimAI] ICU Days set to 1');
                    }
                    // Also update hdnDaysDetails JSON: [ICUDays, RoomDays]
                    // hdnDaysDetails is read by Spectra's billing validation
                    try {
                        var _daysArr = [1, 0]; // ICU=1, Room=0 for day-care cataract
                        var _existingDays = $('#hdnDaysDetails').val();
                        if (_existingDays && _existingDays !== '') {
                            var _parsed = $.parseJSON(_existingDays);
                            if (_parsed && _parsed.length >= 2) {
                                _daysArr = [1, _parsed[1]]; // Keep room days, override ICU=1
                            }
                        }
                        $('#hdnDaysDetails').val(JSON.stringify(_daysArr));
                        console.log('[ClaimAI] hdnDaysDetails updated:', JSON.stringify(_daysArr));
                    } catch(e) {
                        console.warn('[ClaimAI] hdnDaysDetails update failed:', e);
                    }
                }
```

## REPLACE WITH
```javascript
                if (event.data.type === 'setApprovedAccommodation') {
                    // Use the Approved Accommodation chosen in the ClaimAI iframe
                    // (the prepopulated value OR the doctor's manual change). Fall back to
                    // the availed value only if the iframe didn't send one.
                    var approvedFacilityId = event.data.facilityId || $('#ddlReceivedAccomodation').val();
                    console.log('[ClaimAI] setApprovedAccommodation: applying approved value:', approvedFacilityId);

                    if (approvedFacilityId) {
                        var $ddlApprv = $('#ddlApprovedFacility');
                        // Temporarily enable, set value, re-disable
                        $ddlApprv.removeAttr('disabled');
                        $ddlApprv.val(approvedFacilityId);
                        $ddlApprv.attr('disabled', 'disabled');
                        window._claimAI_approvedFacilityId = approvedFacilityId;
                        console.log('[ClaimAI] ddlApprovedFacility set to:', approvedFacilityId);
                    }

                    // ICU Days = 1 ONLY for cataract day-care cases. For maternity / other
                    // (and any manual non-day-care change) leave ICU/room days untouched.
                    if ((event.data.claimType || '').toLowerCase() === 'cataract') {
                        var $icuDays = $('#txtICUDays');
                        if ($icuDays.length) {
                            $icuDays.removeAttr('disabled').val('1').attr('disabled', 'disabled');
                            console.log('[ClaimAI] ICU Days set to 1 (cataract day-care)');
                        }
                        // Also update hdnDaysDetails JSON: [ICUDays, RoomDays]
                        try {
                            var _daysArr = [1, 0]; // ICU=1, Room=0 for day-care cataract
                            var _existingDays = $('#hdnDaysDetails').val();
                            if (_existingDays && _existingDays !== '') {
                                var _parsed = $.parseJSON(_existingDays);
                                if (_parsed && _parsed.length >= 2) {
                                    _daysArr = [1, _parsed[1]]; // Keep room days, override ICU=1
                                }
                            }
                            $('#hdnDaysDetails').val(JSON.stringify(_daysArr));
                            console.log('[ClaimAI] hdnDaysDetails updated:', JSON.stringify(_daysArr));
                        } catch(e) {
                            console.warn('[ClaimAI] hdnDaysDetails update failed:', e);
                        }
                    }
                }
```

## ClaimAI side (already done in result-view.tsx in this folder)
- `sendAccommodationToSpectra` now sends `facilityId = selectedApprovedId`
  (the dropdown value = prepopulated OR manual), plus `claimType`.
- The manual `onApprovedChange` postMessage now also carries `claimType`.

## Note (optional, out of scope)
The sibling `copyAvailedToApproved` branch (~line 9116) still sets ICU Days = 1
unconditionally, but it is effectively dead now: the iframe always has a
`selectedApprovedId`, so Save always sends `setApprovedAccommodation` (never
`copyAvailedToApproved`). Gate it the same way if you want it consistent.

## Deploy
ClaimAI: drop `result-view.tsx` into `components/`, build/restart.
Spectra: apply the find/replace above, build in Visual Studio, recycle app pool.
