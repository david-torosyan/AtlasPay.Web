namespace AtlasPay.WebApplication.Configuration;

public sealed class AtlasPayOptions
{
    public const string SectionName = "AtlasPay";
    public ApiOptions Apis { get; init; } = new();
    public KeycloakOptions Keycloak { get; init; } = new();
    public ApplicationOptions Application { get; init; } = new();
}

public sealed class ApiOptions
{
    public string IdentityBaseUrl { get; init; } = string.Empty;
    public string FinanceBaseUrl { get; init; } = string.Empty;
    public string NotificationBaseUrl { get; init; } = string.Empty;
}

public sealed class KeycloakOptions
{
    public string Authority { get; init; } = string.Empty;
    public string TokenEndpoint { get; init; } = string.Empty;
    public string WebClientId { get; init; } = string.Empty;
    public string OnboardingClientId { get; init; } = string.Empty;
    public string OnboardingClientSecret { get; init; } = string.Empty;
    public string Scopes { get; init; } = string.Empty;
}

public sealed class ApplicationOptions
{
    public string Name { get; init; } = string.Empty;
    public string PublicOrigin { get; init; } = string.Empty;
    public string RedirectUrl { get; init; } = string.Empty;
    public string SilentRedirectUrl { get; init; } = string.Empty;
    public string PostLogoutRedirectUrl { get; init; } = string.Empty;
    public string BffUrl { get; init; } = string.Empty;
    public string FinanceGatewayPath { get; init; } = string.Empty;
    public string NotificationGatewayPath { get; init; } = string.Empty;
    public string KnownAccountStoragePrefix { get; init; } = string.Empty;
}
