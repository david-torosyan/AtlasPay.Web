# AtlasPay.WebApplication

AtlasPay's React + TypeScript customer banking application, hosted by a minimal ASP.NET Core BFF.

## Architecture

- React uses Authorization Code + PKCE through `oidc-client-ts` and `react-oidc-context`.
- The browser forwards the signed-in user's access token to Finance and Notification through same-origin BFF gateways.
- Registration is the only service-authenticated browser workflow. The BFF obtains an onboarding `client_credentials` token, calls Identity registration, and requests the existing Keycloak activation email.
- The onboarding client secret stays in server-side configuration and is never returned by `/api/config` or included in the React build.
- Non-secret application settings are centralized in `appsettings.json`; secrets are supplied through local environment variables or another ASP.NET Core configuration provider.

## Keycloak client expectations

The `atlaspay-web` client must be a public OpenID Connect client with:

- Standard flow enabled and PKCE method `S256`.
- Valid redirect URI `http://localhost:5190/*`.
- Valid post-logout redirect URI `http://localhost:5190/*`.
- Web origin `http://localhost:5190`.
- Access-token audiences for `atlaspay-finance-api` and `atlaspay-notification-api`.
- A `customer_id` claim sourced from the user's Keycloak attribute.

The confidential `atlaspay-onboarding-service` client must have the Identity API's `provision-users` and `read-users` client roles. The Identity API itself must retain its Keycloak user-management permissions so it can send `VERIFY_EMAIL` and `UPDATE_PASSWORD` actions.

## Run locally

Start Keycloak, Mailpit, the databases, Kafka, and the Identity, Finance, and Notification APIs on the URLs in `appsettings.json`. Set the onboarding client secret for the current PowerShell session, then run the application:

```powershell
$env:AtlasPay__Keycloak__OnboardingClientSecret = '<local Keycloak client secret>'
cd AtlasPay.WebApplication\ClientApp
npm install
npm run build
cd ..
dotnet run
```

Open `http://localhost:5190`. Activation emails can be viewed in Mailpit at `http://localhost:8025`.

## Existing API boundary

Finance currently exposes account lookup by ID but no `GET /api/accounts` customer-list endpoint. The web application therefore remembers successfully created or explicitly added owned account IDs in browser local storage. Ownership remains enforced by Finance; an ID belonging to another customer resolves as not found. Deposits are visibly marked as development-only because Finance returns `404` for that endpoint outside Development.
