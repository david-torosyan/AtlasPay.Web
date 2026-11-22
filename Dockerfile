# React build stage
FROM node:24-alpine AS frontend
WORKDIR /src/ClientApp

COPY ClientApp/package*.json ./
RUN npm ci

COPY ClientApp/ ./
RUN npm run build


# .NET build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY AtlasPay.WebApplication.csproj ./
RUN dotnet restore AtlasPay.WebApplication.csproj

COPY . .

RUN dotnet publish AtlasPay.WebApplication.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false \
    /p:BuildClient=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .
COPY --from=frontend /src/ClientApp/dist/ ./wwwroot/

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

USER $APP_UID

ENTRYPOINT ["dotnet", "AtlasPay.WebApplication.dll"]