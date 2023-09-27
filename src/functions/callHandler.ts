import { app, EventGridEvent, InvocationContext } from "@azure/functions";
import { ManagedIdentityCredential } from "@azure/identity";
import { CosmosClient, Item, ItemResponse } from "@azure/cosmos";
import { CallAutomationClient, CallInvite } from "@azure/communication-call-automation";

type ServiceAgent = {
    id: string
    fullName: string
    phoneNumber: string
    status: string
}

type CallData = {
    to: {
        kind: string
        rawId: string
        phoneNumber: string[]
    }
    from: {
        kind: string
        rawId: string
        phoneNumber: string[]
    }
    serverCallId: string
    callerDisplayName: string
    incomingCallContext: string
    correlationId: string
}

// Cosmos DB

function createCosmosClient(context: InvocationContext) {
    context.debug("[Handler] Initializing Cosmos DB client")

    const endpoint = process.env["COSMOS_ENDPOINT"] || null
    if (typeof endpoint == null) {
        context.error("Environment variable (COSMOS_ENDPOINT) is not defined.")
    }

    const credential = new ManagedIdentityCredential()
    return new CosmosClient({ endpoint: endpoint, aadCredentials: credential })
}

async function getCosmosItem(context: InvocationContext, client: CosmosClient): Promise<ItemResponse<any>> {
    context.debug("[Handler] Querying Cosmos DB items")

    const databaseId = process.env["COSMOS_DATABASE"] || null
    if (typeof databaseId == null) {
        context.error("Environment variable (COSMOS_DATABASE) is not defined.")
    }

    const containerId = process.env["COSMOS_CONTAINER"] || null
    if (typeof containerId == null) {
        context.error("Environment variable (COSMOS_CONTAINER) is not defined.")
    }

    const container = client.database(databaseId).container(containerId)
    let item: ItemResponse<any>

    try {
        const { resources: items } = await container.items.readAll().fetchAll()
        if (items.length > 0) {
            item = (await container.item(items[0].id).read())
        } else {
            throw new Error("No items found in the container.")
        }
    } catch (error) {
        context.error("Error fetching item from Cosmos DB")
    }

    return item
}

function parseServiceAgent(item: ItemResponse<any>, context: InvocationContext): ServiceAgent {
    context.debug("[Handler] Parsing Cosmos DB item")

    const serviceAgent = item.resource as ServiceAgent | null
    if (typeof serviceAgent == null) {
        context.error("Unable to parse Cosmos DB item")
    }

    return serviceAgent
}

// Call Automation

function createCallClient(context: InvocationContext) {
    context.debug("[Handler] Initializing ACS Call client")

    const endpoint = process.env["COMMUNICATION_ENDPOINT"] || null
    if (typeof endpoint == null) {
        context.error("Environment variable (COMMUNICATION_ENDPOINT) is not defined.")
    }

    const credential = new ManagedIdentityCredential()
    return new CallAutomationClient(endpoint, credential)
}

async function redirectCall(client: CallAutomationClient, callData: CallData, callAgent: ServiceAgent, context: InvocationContext) {
    context.debug("[Handler] Redirecting incoming call")

    const callInvite: CallInvite = {
        sourceCallIdNumber: {
            phoneNumber: callData.to.rawId.split(":")[1]
        },
        targetParticipant: {
            phoneNumber: callAgent.phoneNumber
        }
    }

    await client.redirectCall(callData.incomingCallContext, callInvite)
}

function parseCallData(context: InvocationContext, event: EventGridEvent): CallData {
    context.debug("[Handler] Parsing Event Grid data")

    const callData = event.data as CallData | null
    if (typeof callData == null) {
        context.error("Unable to parse Event Grid data")
    }

    return callData
}

// Functions

export async function callHandler(event: EventGridEvent, context: InvocationContext): Promise<void> {
    context.log('Handler processed event:', event);

    const cosmosItem = await getCosmosItem(context, createCosmosClient(context))
    const serviceAgent = parseServiceAgent(cosmosItem, context)

    const callData = parseCallData(context, event)
    await redirectCall(createCallClient(context), callData, serviceAgent, context)
}

app.eventGrid('callHandler', {
    handler: callHandler
});
