# Call Handler

This repository helps you connect Azure Communication Service with incoming call handling and routing to available Service Agents. We've created a routing system using Azure Communication Service, Event Grid, Azure Functions, and Cosmos DB.

For more complex situations, consider using Azure Communication Service's Job Router feature.

_Please note these artifacts are under development and subject to change._

## Guides

- [Getting Started](./docs/README.md#getting-started)

## Architecture

### Process Flow

```mermaid
sequenceDiagram
    participant Communication Service
    participant Event Grid
    participant Functions
    participant Cosmos DB
    participant Application Insights

    Communication Service->>Event Grid: Event Notification

    Event Grid->>Functions: Incoming Call

    Functions-->Application Insights: Request Invocation

    Event Grid-->Functions: Parse Event Payload

    Functions->>Cosmos DB: Query Service Agents
    Cosmos DB-->>Functions: Target Phone Number

    Functions->>Communication Service: Redirect Call
```

### Identity Design

```mermaid
flowchart LR
   Functions -- Contributor --> Communuication-Service
   Functions -- Cosmos DB Built-in Data Reader --> Cosmos-DB
```
