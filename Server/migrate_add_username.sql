-- Migration script to add username column to Users table
-- Author: System Update
-- Date: September 2025
-- Purpose: Add username column for authentication and populate it from firstName + lastName

USE [chroniccarebridge]; -- Replace with your actual database name

BEGIN TRANSACTION;

BEGIN TRY
    -- Step 1: Add username column to Users table
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'username'
    )
    BEGIN
        PRINT 'Adding username column to Users table...';
        ALTER TABLE Users 
        ADD username NVARCHAR(255);
        PRINT 'Username column added successfully.';
    END
    ELSE
    BEGIN
        PRINT 'Username column already exists.';
    END

    -- Step 2: Populate username column with firstname + lastname (lowercase, no spaces)
    PRINT 'Populating username column...';
    UPDATE Users 
    SET username = LOWER(REPLACE(TRIM(firstName) + TRIM(lastName), ' ', ''))
    WHERE username IS NULL;
    
    -- Handle potential duplicates by adding numbers
    DECLARE @duplicateCount INT = 1;
    WHILE EXISTS (
        SELECT username, COUNT(*) 
        FROM Users 
        WHERE username IS NOT NULL 
        GROUP BY username 
        HAVING COUNT(*) > 1
    )
    BEGIN
        WITH DuplicateUsers AS (
            SELECT 
                id, 
                username,
                ROW_NUMBER() OVER (PARTITION BY username ORDER BY id) as rn
            FROM Users 
            WHERE username IS NOT NULL
        )
        UPDATE Users 
        SET username = u.username + CAST(du.rn AS NVARCHAR(10))
        FROM Users u
        INNER JOIN DuplicateUsers du ON u.id = du.id
        WHERE du.rn > 1;
        
        SET @duplicateCount = @duplicateCount + 1;
        
        -- Safety break to prevent infinite loop
        IF @duplicateCount > 100 
            BREAK;
    END
    
    PRINT 'Username population completed.';

    -- Step 3: Make username column NOT NULL after population
    PRINT 'Setting username column constraints...';
    ALTER TABLE Users 
    ALTER COLUMN username NVARCHAR(255) NOT NULL;
    PRINT 'Username column set to NOT NULL.';

    -- Step 4: Add unique constraint on username
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE TABLE_NAME = 'Users' AND CONSTRAINT_NAME = 'UQ_Users_Username'
    )
    BEGIN
        PRINT 'Adding unique constraint on username...';
        ALTER TABLE Users 
        ADD CONSTRAINT UQ_Users_Username UNIQUE (username);
        PRINT 'Unique constraint added successfully.';
    END
    ELSE
    BEGIN
        PRINT 'Unique constraint on username already exists.';
    END

    -- Step 5: Create index on username for faster lookups
    IF NOT EXISTS (
        SELECT * FROM sys.indexes 
        WHERE name = 'IX_Users_Username' AND object_id = OBJECT_ID('Users')
    )
    BEGIN
        PRINT 'Creating index on username column...';
        CREATE INDEX IX_Users_Username ON Users (username);
        PRINT 'Index created successfully.';
    END
    ELSE
    BEGIN
        PRINT 'Index on username already exists.';
    END

    -- Step 6: Display sample of updated data
    PRINT 'Sample of updated Users table:';
    SELECT TOP 5 
        id, 
        firstName, 
        lastName, 
        username, 
        email, 
        role, 
        isActive
    FROM Users
    ORDER BY id;

    COMMIT TRANSACTION;
    PRINT 'Migration completed successfully!';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    PRINT 'Migration failed: ' + @ErrorMessage;
    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;

-- Verification queries
PRINT 'Verification:';
PRINT 'Total users: ' + CAST((SELECT COUNT(*) FROM Users) AS NVARCHAR(10));
PRINT 'Users with usernames: ' + CAST((SELECT COUNT(*) FROM Users WHERE username IS NOT NULL) AS NVARCHAR(10));
PRINT 'Unique usernames: ' + CAST((SELECT COUNT(DISTINCT username) FROM Users WHERE username IS NOT NULL) AS NVARCHAR(10));