# Call Handler

This repository helps you connect Azure Communication Service with incoming call handling and routing to available Service Agents. We've created a routing system using Azure Communication Service, Event Grid, Azure Functions, and Cosmos DB.

For more complex situations, consider using Azure Communication Service's [Job Router](https://learn.microsoft.com/azure/communication-services/concepts/router/concepts) feature.

_Please note these artifacts are under development and subject to change._

## Architecture

```mermaid
sequenceDiagram
    participant Communication Service
    participant Event Grid
    participant Functions
    participant Cosmos DB

    Communication Service->>Event Grid: Event Notification

    Event Grid->>Functions: Incoming Call

    Functions->>Communication Service: List Purchased Numbers
    Communication Service-->>Functions: Phone Number

    Functions->>Cosmos DB: Query Service Agents
    Cosmos DB-->>Functions: Target Phone Number

    Functions->>Communication Service: Redirect Call
```
