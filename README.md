# Client-side changes — pass tariff filename + final amount to the metrics save

The tariff filename and final tariff amount live **inside the ClaimAI iframe**
(financial-summary-tab). They must travel to Spectra in the existing
`claimAISaveComplete` postMessage, then be forwarded to `LogClaimAIEvent`.

Two edits:
- **A. ClaimAI iframe** — include `tariffFileName` + `tariffAmount` in the save postMessage.
- **B. Spectra Index.cshtml** — read them from the message and pass to `_logEvent`.

---

## A. ClaimAI iframe — add tariff data to the save postMessage

In the ClaimAI result view, wherever the `claimAISaveComplete` message is posted
to the parent (Spectra) on save, add the two tariff fields to the payload.

The values:
- **tariffFileName** — the tariff file currently in use. In financial-summary-tab
  this is the `tariffFileName` state/prop already shown in the Tariff card header.
- **tariffAmount** — the FINAL tariff total at the moment of save: the user-edited
  value if edited, else the AI-extracted value. That is exactly what
  `tariffRowsTotal` already holds (it sums the editable tariff rows, which start
  from the AI extraction and reflect any user edits).

```javascript
// when posting the save-complete message to the parent:
window.parent.postMessage({
  type: "claimAISaveComplete",
  // ...existing fields...
  tariffFileName: tariffFileName || "",
  tariffAmount: (tariffRowsTotal != null ? String(tariffRowsTotal) : ""),
}, "*");
```

> If the save message is assembled in a shared handler, add the same two keys
> there. The exact variable names in your build are `tariffFileName` and
> `tariffRowsTotal` (both already exist in financial-summary-tab.tsx). If they
> live in a parent component, lift them via the existing onTariff* callbacks or
> read them from the analysis state at save time.

---

## B. Spectra Index.cshtml — forward them to LogClaimAIEvent

In the `claimAISaveComplete` postMessage handler, the metrics block builds
`_logEvent`. Capture the tariff fields from the message and include them ONLY on
the SAVE_CLICK call (the row that feeds ClaimAI_SaveCount).

**1. Read the values from the message (near `_cid`, `_slno`, `_ct`):**
```javascript
var _cid  = $('#hdnClaimID').val()  || '';
var _slno = $('#hdnClaimSlNo').val() || '1';
var _ct   = window._claimAI_claimType || 'other';
var _snap = window._claimAI_snapshot  || {};
var _tariffFile = (event.data && event.data.tariffFileName) || '';   // NEW
var _tariffAmt  = (event.data && event.data.tariffAmount)   || '';   // NEW
```

**2. Extend `_logEvent` to optionally send tariff fields:**
```javascript
function _logEvent(eventType, fieldName, aiVal, userVal, tariffFile, tariffAmt) {
    $.ajax({
        url:  '/MedicalScrutiny/LogClaimAIEvent',
        type: 'POST',
        data: {
            claimId:        _cid,
            slNo:           _slno,
            eventType:      eventType,
            fieldName:      fieldName  || '',
            aiValue:        aiVal      || '',
            userValue:      userVal    || '',
            claimType:      _ct,
            tariffFileName: tariffFile || '',   // NEW
            tariffAmount:   tariffAmt  || ''    // NEW
        },
        error: function() { /* non-critical — silent */ }
    });
}
```

**3. Pass the tariff data on the SAVE_CLICK call (only that one):**
```javascript
// 1. Log the save click — now carries the tariff snapshot
_logEvent('SAVE_CLICK', null, null, null, _tariffFile, _tariffAmt);

// 2. FIELD_CHANGE calls stay exactly as before (no tariff args needed):
//    _logEvent('FIELD_CHANGE', fieldName, aiVal, userVal);
```

That's all. FIELD_CHANGE rows are unaffected; only the SAVE_CLICK path now carries
`tariffFileName` + `tariffAmount`, which the SP writes into ClaimAI_SaveCount.
