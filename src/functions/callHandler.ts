import { app, EventGridEvent, InvocationContext } from "@azure/functions";
import { ManagedIdentityCredential } from "@azure/identity";
import { CosmosClient, ItemResponse } from "@azure/cosmos";
import { PhoneNumbersClient } from "@azure/communication-phone-numbers"
import { CallAutomationClient, CallInvite } from "@azure/communication-call-automation";


// Cosmos DB

async function createCosmosClient(context: InvocationContext) {
    context.debug("Initializing cosmos client")

    const endpoint = process.env["COSMOS_ENDPOINT"] || ""
    if (endpoint == "") {
        context.error("Environment variable (COSMOS_ENDPOINT) is not defined.")
    }

    const credential = new ManagedIdentityCredential()
    return new CosmosClient({ endpoint: endpoint, aadCredentials: credential })
}

async function getCosmosItem(context: InvocationContext, client: CosmosClient): Promise<ItemResponse<any>> {
    context.debug("Retrieving cosmos items")

    const databaseId = process.env["COSMOS_DATABASE"] || ""
    if (databaseId == "") {
        context.error("Environment variable (COSMOS_DATABASE) is not defined.")
    }

    const containerId = process.env["COSMOS_CONTAINER"] || ""
    if (containerId == "") {
        context.error("Environment variable (COSMOS_CONTAINER) is not defined.")
    }

    const container = client.database(databaseId).container(containerId)
    const { resources: items } = await container.items.readAll().fetchAll()

    return await container.item(items[0].id).read()
}

// Phone Numbers

async function createPhoneClient(context: InvocationContext) {
    context.debug("Initializing phone client")

    const endpoint = process.env["COMMUNICATION_ENDPOINT"] || ""
    if (endpoint == "") {
        context.error("Environment variable (COMMUNICATION_ENDPOINT) is not defined.")
    }

    const credential = new ManagedIdentityCredential()
    return new PhoneNumbersClient(endpoint, credential)
}

async function getPhoneNumber(context: InvocationContext, client: PhoneNumbersClient) {
    context.debug("Retrieving phone numbers")

    const phoneNumbers = client.listPurchasedPhoneNumbers()

    for await (const phoneNumber of phoneNumbers) {
        return phoneNumber.phoneNumber
    }
}

// Call Automation

async function createCallClient(context: InvocationContext) {
    context.debug("Initializing call client")

    const endpoint = process.env["COMMUNICATION_ENDPOINT"] || ""
    if (endpoint == "") {
        context.error("Environment variable (COMMUNICATION_ENDPOINT) is not defined.")
    }

    const credential = new ManagedIdentityCredential()
    return new CallAutomationClient(endpoint, credential)
}

async function redirectCall(context: InvocationContext, callContext: any, client: CallAutomationClient, sourcePhoneNumber: string, targetPhoneNumber: string) {
    context.log("Redirecting incoming call")

    const callInvite: CallInvite = {
        sourceCallIdNumber: {
            phoneNumber: sourcePhoneNumber
        },
        targetParticipant: {
            phoneNumber: targetPhoneNumber
        }
    }

    await client.redirectCall(callContext, callInvite)
}

// Functions

export async function callHandler(event: EventGridEvent, context: InvocationContext): Promise<void> {
    context.log('Handler processed event:', event);

    const phoneClient = await createPhoneClient(context)
    const sourcePhoneNumber = await getPhoneNumber(context, phoneClient)

    const cosmosClient = await createCosmosClient(context)
    const targetPhoneNumber = (await getCosmosItem(context, cosmosClient)).resource.phoneNumber

    const callClient = await createCallClient(context)
    await redirectCall(context, event.data.incomingCallContext, callClient, sourcePhoneNumber, targetPhoneNumber)
}

app.eventGrid('callHandler', {
    handler: callHandler
});
