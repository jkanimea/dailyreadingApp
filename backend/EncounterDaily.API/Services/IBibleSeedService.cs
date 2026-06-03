namespace EncounterDaily.API.Services;

public interface IBibleSeedService
{
    Task SeedMissingTranslationsAsync(CancellationToken cancellationToken = default);
}
