/* ============================================================================
   ClaimAI Usage Metrics — table creation + Tariff columns on SaveCount
   ----------------------------------------------------------------------------
   Two tables:
     1. ClaimAI_EventLog   — append-only log: one row per event
                             (SAVE_CLICK / FIELD_CHANGE)
     2. ClaimAI_SaveCount  — one row per claim: running save counter
                             + NEW: TariffFileName, TariffAmount (latest save)

   Idempotent: safe to re-run. Creates tables + SPs if missing, and ADD-COLUMNs
   the two new tariff columns onto an existing ClaimAI_SaveCount.

   Run in SSMS against the McarePlus database.
   ============================================================================ */

SET NOCOUNT ON;
GO

/* ---------------------------------------------------------------------------
   TABLE 1: ClaimAI_EventLog  (unchanged — included so the script is complete)
   --------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ClaimAI_EventLog')
BEGIN
    CREATE TABLE ClaimAI_EventLog (
        ID          BIGINT          IDENTITY(1,1)   NOT NULL,
        ClaimID     BIGINT          NOT NULL,
        SlNo        INT             NOT NULL DEFAULT 1,
        EventType   VARCHAR(50)     NOT NULL,        -- 'SAVE_CLICK' | 'FIELD_CHANGE'
        FieldName   VARCHAR(100)    NULL,            -- null for SAVE_CLICK rows
        AIValue     NVARCHAR(1000)  NULL,            -- value ClaimAI populated
        UserValue   NVARCHAR(1000)  NULL,            -- value user changed to
        ClaimType   VARCHAR(50)     NULL,            -- 'cataract' | 'maternity' | 'other'
        UserID      BIGINT          NULL,
        UserName    NVARCHAR(200)   NULL,
        IPAddress   VARCHAR(50)     NULL,
        CreatedAt   DATETIME        NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_ClaimAI_EventLog PRIMARY KEY CLUSTERED (ID ASC)
    );

    CREATE NONCLUSTERED INDEX IX_ClaimAI_EventLog_ClaimID
        ON ClaimAI_EventLog (ClaimID, SlNo, CreatedAt DESC);
    CREATE NONCLUSTERED INDEX IX_ClaimAI_EventLog_EventType
        ON ClaimAI_EventLog (EventType, CreatedAt DESC);

    PRINT 'TABLE ClaimAI_EventLog — created.';
END
ELSE
    PRINT 'TABLE ClaimAI_EventLog — already exists, skipped.';
GO

/* ---------------------------------------------------------------------------
   TABLE 2: ClaimAI_SaveCount  (now includes TariffFileName + TariffAmount)
   --------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ClaimAI_SaveCount')
BEGIN
    CREATE TABLE ClaimAI_SaveCount (
        ClaimID         BIGINT          NOT NULL,
        SlNo            INT             NOT NULL DEFAULT 1,
        SaveCount       INT             NOT NULL DEFAULT 0,
        FirstSavedAt    DATETIME        NULL,
        LastSavedAt     DATETIME        NULL,
        ClaimType       VARCHAR(50)     NULL,
        LastSavedBy     NVARCHAR(200)   NULL,
        TariffFileName  NVARCHAR(500)   NULL,   -- NEW: tariff file used, captured at save
        TariffAmount    DECIMAL(18, 2)  NULL,   -- NEW: final tariff amount at save (AI or user-edited)
        CONSTRAINT PK_ClaimAI_SaveCount PRIMARY KEY CLUSTERED (ClaimID, SlNo)
    );
    PRINT 'TABLE ClaimAI_SaveCount — created (with tariff columns).';
END
ELSE
BEGIN
    PRINT 'TABLE ClaimAI_SaveCount — already exists; checking for tariff columns...';

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME = 'ClaimAI_SaveCount' AND COLUMN_NAME = 'TariffFileName')
    BEGIN
        ALTER TABLE ClaimAI_SaveCount ADD TariffFileName NVARCHAR(500) NULL;
        PRINT '  added column TariffFileName.';
    END
    ELSE
        PRINT '  TariffFileName already present.';

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME = 'ClaimAI_SaveCount' AND COLUMN_NAME = 'TariffAmount')
    BEGIN
        ALTER TABLE ClaimAI_SaveCount ADD TariffAmount DECIMAL(18, 2) NULL;
        PRINT '  added column TariffAmount.';
    END
    ELSE
        PRINT '  TariffAmount already present.';
END
GO

/* ---------------------------------------------------------------------------
   SP 1: USP_ClaimAI_LogEvent  (unchanged — included for completeness)
   --------------------------------------------------------------------------- */
IF OBJECT_ID('USP_ClaimAI_LogEvent', 'P') IS NOT NULL
    DROP PROCEDURE USP_ClaimAI_LogEvent;
GO
CREATE PROCEDURE USP_ClaimAI_LogEvent
    @ClaimID    BIGINT,
    @SlNo       INT,
    @EventType  VARCHAR(50),
    @FieldName  VARCHAR(100)    = NULL,
    @AIValue    NVARCHAR(1000)  = NULL,
    @UserValue  NVARCHAR(1000)  = NULL,
    @ClaimType  VARCHAR(50)     = NULL,
    @UserID     BIGINT          = NULL,
    @UserName   NVARCHAR(200)   = NULL,
    @IPAddress  VARCHAR(50)     = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO ClaimAI_EventLog
        (ClaimID, SlNo, EventType, FieldName, AIValue, UserValue,
         ClaimType, UserID, UserName, IPAddress, CreatedAt)
    VALUES
        (@ClaimID, @SlNo, @EventType, @FieldName, @AIValue, @UserValue,
         @ClaimType, @UserID, @UserName, @IPAddress, GETDATE());
END
GO
PRINT 'SP USP_ClaimAI_LogEvent — created.';
GO

/* ---------------------------------------------------------------------------
   SP 2: USP_ClaimAI_IncrementSaveCount
         NOW accepts @TariffFileName + @TariffAmount and writes them on every
         save (insert + update). They reflect the LATEST save for the claim.
   --------------------------------------------------------------------------- */
IF OBJECT_ID('USP_ClaimAI_IncrementSaveCount', 'P') IS NOT NULL
    DROP PROCEDURE USP_ClaimAI_IncrementSaveCount;
GO
CREATE PROCEDURE USP_ClaimAI_IncrementSaveCount
    @ClaimID        BIGINT,
    @SlNo           INT,
    @ClaimType      VARCHAR(50)     = NULL,
    @UserName       NVARCHAR(200)   = NULL,
    @TariffFileName NVARCHAR(500)   = NULL,   -- NEW
    @TariffAmount   DECIMAL(18, 2)  = NULL    -- NEW
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM ClaimAI_SaveCount WHERE ClaimID = @ClaimID AND SlNo = @SlNo)
    BEGIN
        -- Already exists — increment and refresh tariff snapshot to the latest save
        UPDATE ClaimAI_SaveCount
        SET
            SaveCount       = SaveCount + 1,
            LastSavedAt     = GETDATE(),
            LastSavedBy     = @UserName,
            TariffFileName  = @TariffFileName,
            TariffAmount    = @TariffAmount
        WHERE ClaimID = @ClaimID AND SlNo = @SlNo;
    END
    ELSE
    BEGIN
        -- First save for this claim
        INSERT INTO ClaimAI_SaveCount
            (ClaimID, SlNo, SaveCount, FirstSavedAt, LastSavedAt, ClaimType, LastSavedBy,
             TariffFileName, TariffAmount)
        VALUES
            (@ClaimID, @SlNo, 1, GETDATE(), GETDATE(), @ClaimType, @UserName,
             @TariffFileName, @TariffAmount);
    END
END
GO
PRINT 'SP USP_ClaimAI_IncrementSaveCount — created (with tariff params).';
GO

PRINT 'ClaimAI metrics tables + SPs ready.';
GO
