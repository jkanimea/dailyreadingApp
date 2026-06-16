-- Full database seed: Books + Series + DailyReadings

-- 1. Seed EGW Books (only if empty)
IF NOT EXISTS (SELECT 1 FROM Books)
BEGIN
    SET IDENTITY_INSERT Books ON;
    INSERT INTO Books (Id, Title, Author, BookType, PageCount, FullTextSource, CreatedAt)
    VALUES 
        (1, N'Desire of Ages', N'Ellen G. White', 1, 900, N'elllenwhite.info', GETUTCDATE()),
        (2, N'Acts of the Apostles', N'Ellen G. White', 2, 600, N'elllenwhite.info', GETUTCDATE()),
        (3, N'The Great Controversy', N'Ellen G. White', 3, 700, N'elllenwhite.info', GETUTCDATE()),
        (4, N'Patriarchs and Prophets', N'Ellen G. White', 4, 800, N'elllenwhite.info', GETUTCDATE()),
        (5, N'Prophets and Kings', N'Ellen G. White', 5, 750, N'elllenwhite.info', GETUTCDATE());
    SET IDENTITY_INSERT Books OFF;
    PRINT 'Inserted 5 EGW books';
END
ELSE
    PRINT 'Books already seeded';

-- 2. Seed Series (only if empty)
IF NOT EXISTS (SELECT 1 FROM Series)
BEGIN
    SET IDENTITY_INSERT Series ON;
    INSERT INTO Series (Id, Name, ShortName, Description, SeriesType, PrimaryBookId, SecondaryBookId, SortOrder, CreatedAt)
    VALUES 
        (1, N'Christ The Way', N'ctw', N'Daily readings from Desire of Ages', 1, 1, NULL, 1, GETUTCDATE()),
        (2, N'Christ The Church', N'ctc', N'Daily readings from Acts of the Apostles and Great Controversy', 2, 2, 3, 2, GETUTCDATE()),
        (3, N'Christ Our Redemption', N'cor', N'Daily readings from Patriarchs and Prophets', 3, 4, NULL, 3, GETUTCDATE()),
        (4, N'Christ Our Hope', N'coh', N'Daily readings from Prophets and Kings', 4, 5, NULL, 4, GETUTCDATE());
    SET IDENTITY_INSERT Series OFF;
    PRINT 'Inserted 4 series';
END
ELSE
    PRINT 'Series already seeded';

