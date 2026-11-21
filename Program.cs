using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using AtlasPay.WebApplication.Configuration;
using AtlasPay.WebApplication.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddOptions<AtlasPayOptions>()
    .Bind(builder.Configuration.GetRequiredSection(AtlasPayOptions.SectionName))
    .Validate(options =>
        Uri.TryCreate(options.Apis.IdentityBaseUrl, UriKind.Absolute, out _) &&
        Uri.TryCreate(options.Apis.FinanceBaseUrl, UriKind.Absolute, out _) &&
        Uri.TryCreate(options.Apis.NotificationBaseUrl, UriKind.Absolute, out _) &&
        Uri.TryCreate(options.Keycloak.Authority, UriKind.Absolute, out _) &&
        Uri.TryCreate(options.Keycloak.TokenEndpoint, UriKind.Absolute, out _) &&
        !string.IsNullOrWhiteSpace(options.Keycloak.OnboardingClientSecret),
        "AtlasPay configuration is incomplete.")
    .ValidateOnStart();

var atlasPay = builder.Configuration
    .GetRequiredSection(AtlasPayOptions.SectionName)
    .Get<AtlasPayOptions>()!;

builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(atlasPay.Application.PublicOrigin)
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = atlasPay.Keycloak.Authority;
        options.RequireHttpsMetadata = false;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            NameClaimType = "preferred_username"
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<OnboardingTokenService>();
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseExceptionHandler();
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

var clientDist = Path.Combine(app.Environment.ContentRootPath, "ClientApp", "dist");
if (Directory.Exists(clientDist))
{
    var clientFiles = new PhysicalFileProvider(clientDist);
    app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = clientFiles });
    app.UseStaticFiles(new StaticFileOptions { FileProvider = clientFiles });
}

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/config", (IOptions<AtlasPayOptions> options) =>
{
    var value = options.Value;
    return Results.Ok(new
    {
        applicationName = value.Application.Name,
        authority = value.Keycloak.Authority,
        clientId = value.Keycloak.WebClientId,
        scope = value.Keycloak.Scopes,
        redirectUrl = value.Application.RedirectUrl,
        silentRedirectUrl = value.Application.SilentRedirectUrl,
        postLogoutRedirectUrl = value.Application.PostLogoutRedirectUrl,
        financeApiUrl = value.Application.FinanceGatewayPath,
        notificationApiUrl = value.Application.NotificationGatewayPath,
        knownAccountStoragePrefix = value.Application.KnownAccountStoragePrefix
    });
});

app.MapPost("/api/registration", async (
    RegistrationRequest request,
    OnboardingTokenService tokens,
    IHttpClientFactory clients,
    IOptions<AtlasPayOptions> options,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.FirstName) ||
        string.IsNullOrWhiteSpace(request.LastName) ||
        string.IsNullOrWhiteSpace(request.Email))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["registration"] = ["First name, last name, and email are required."]
        });
    }

    var token = await tokens.GetTokenAsync(ct);
    var client = clients.CreateClient();
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    var customerId = Guid.NewGuid();

    using var registerResponse = await client.PostAsJsonAsync(
        $"{options.Value.Apis.IdentityBaseUrl.TrimEnd('/')}/api/users",
        new
        {
            RequestId = Guid.NewGuid(),
            CustomerId = customerId,
            Email = request.Email.Trim(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim()
        }, ct);

    if (!registerResponse.IsSuccessStatusCode)
        return await ToUpstreamProblem(registerResponse, "Registration failed", ct);

    var userId = await registerResponse.Content.ReadFromJsonAsync<Guid>(cancellationToken: ct);
    using var activationResponse = await client.PostAsync(
        $"{options.Value.Apis.IdentityBaseUrl.TrimEnd('/')}/api/users/by-customer/{customerId}/activation-email",
        null, ct);

    if (!activationResponse.IsSuccessStatusCode)
        return await ToUpstreamProblem(activationResponse, "The user was created, but the activation email could not be sent", ct);

    return Results.Ok(new RegistrationResponse(userId, customerId, request.Email.Trim()));
});

app.MapGet("/api/profile", async (
    ClaimsPrincipal user,
    OnboardingTokenService tokens,
    IHttpClientFactory clients,
    IOptions<AtlasPayOptions> options,
    CancellationToken ct) =>
{
    var customerId = user.FindFirstValue("customer_id");
    if (!Guid.TryParse(customerId, out var parsedCustomerId))
        return Results.Problem(statusCode: 403, title: "The access token has no valid customer_id claim.");

    var client = clients.CreateClient();
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", await tokens.GetTokenAsync(ct));

    using var response = await client.GetAsync(
        $"{options.Value.Apis.IdentityBaseUrl.TrimEnd('/')}/api/users/by-customer/{parsedCustomerId}", ct);
    if (!response.IsSuccessStatusCode)
        return await ToUpstreamProblem(response, "Could not load the AtlasPay user profile", ct);

    var body = await response.Content.ReadAsStringAsync(ct);
    return Results.Text(body, "application/json");
}).RequireAuthorization();

app.MapMethods("/gateway/finance/{**path}", ["GET", "POST", "PUT", "PATCH", "DELETE"],
    (HttpContext context, string? path, IHttpClientFactory clients, IOptions<AtlasPayOptions> options, CancellationToken ct) =>
        Proxy(context, clients, options.Value.Apis.FinanceBaseUrl, path, ct));

app.MapMethods("/gateway/notification/{**path}", ["GET", "POST", "PUT", "PATCH", "DELETE"],
    (HttpContext context, string? path, IHttpClientFactory clients, IOptions<AtlasPayOptions> options, CancellationToken ct) =>
        Proxy(context, clients, options.Value.Apis.NotificationBaseUrl, path, ct));

if (Directory.Exists(clientDist))
    app.MapFallback(() => Results.File(Path.Combine(clientDist, "index.html"), "text/html"));
else
    app.MapFallbackToFile("index.html");
app.Run();

static async Task<IResult> Proxy(
    HttpContext context,
    IHttpClientFactory clients,
    string baseUrl,
    string? path,
    CancellationToken ct)
{
    var target = $"{baseUrl.TrimEnd('/')}/{path}{context.Request.QueryString}";
    using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), target);

    if (context.Request.Headers.Authorization.Count > 0)
        request.Headers.TryAddWithoutValidation("Authorization", context.Request.Headers.Authorization.ToString());

    if (context.Request.ContentLength > 0 || context.Request.Headers.ContainsKey("Transfer-Encoding"))
    {
        request.Content = new StreamContent(context.Request.Body);
        if (!string.IsNullOrWhiteSpace(context.Request.ContentType))
            request.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(context.Request.ContentType);
    }

    using var response = await clients.CreateClient().SendAsync(
        request, HttpCompletionOption.ResponseHeadersRead, ct);
    var bytes = await response.Content.ReadAsByteArrayAsync(ct);
    var contentType = response.Content.Headers.ContentType?.ToString() ?? "application/json";
    context.Response.StatusCode = (int)response.StatusCode;
    context.Response.ContentType = contentType;
    await context.Response.Body.WriteAsync(bytes, ct);
    return Results.Empty;
}

static async Task<IResult> ToUpstreamProblem(
    HttpResponseMessage response,
    string title,
    CancellationToken ct)
{
    var detail = await response.Content.ReadAsStringAsync(ct);
    return Results.Problem(
        statusCode: (int)response.StatusCode,
        title: title,
        detail: string.IsNullOrWhiteSpace(detail) ? response.ReasonPhrase : detail);
}

public sealed record RegistrationRequest(string FirstName, string LastName, string Email);
public sealed record RegistrationResponse(Guid UserId, Guid CustomerId, string Email);
