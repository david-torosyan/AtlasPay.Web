using System.Net.Http.Json;
using System.Text.Json.Serialization;
using AtlasPay.WebApplication.Configuration;
using Microsoft.Extensions.Options;

namespace AtlasPay.WebApplication.Services;

public sealed class OnboardingTokenService(
    IHttpClientFactory httpClientFactory,
    IOptions<AtlasPayOptions> options)
{
    private readonly AtlasPayOptions _options = options.Value;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private string? _accessToken;
    private DateTimeOffset _expiresAt;

    public async Task<string> GetTokenAsync(CancellationToken ct)
    {
        if (HasUsableToken())
            return _accessToken!;

        await _lock.WaitAsync(ct);
        try
        {
            if (HasUsableToken())
                return _accessToken!;

            using var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = _options.Keycloak.OnboardingClientId,
                ["client_secret"] = _options.Keycloak.OnboardingClientSecret
            });

            using var response = await httpClientFactory.CreateClient()
                .PostAsync(_options.Keycloak.TokenEndpoint, content, ct);
            response.EnsureSuccessStatusCode();

            var token = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: ct)
                ?? throw new InvalidOperationException("Keycloak returned an empty token response.");

            _accessToken = token.AccessToken;
            _expiresAt = DateTimeOffset.UtcNow.AddSeconds(token.ExpiresIn);
            return _accessToken;
        }
        finally
        {
            _lock.Release();
        }
    }

    private bool HasUsableToken() =>
        !string.IsNullOrWhiteSpace(_accessToken) &&
        _expiresAt > DateTimeOffset.UtcNow.AddSeconds(30);

    private sealed record TokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);
}
