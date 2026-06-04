SELECT Doc.Id, Doc.FileName, Doc.SystemFileName, Doc.Status, Doc.CreatedDateTime
FROM ProviderTariffDocs Doc WITH(NOLOCK)
INNER JOIN ProviderTariff_Map Mp WITH(NOLOCK) ON Doc.Id = Mp.DocumentId
WHERE Mp.ProviderID = 4140 AND Doc.Status = 1 AND Mp.Status = 1
ORDER BY Doc.CreatedDateTime DESC;
