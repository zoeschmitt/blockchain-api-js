import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../common/getSecrets";
import generateWallet from "../common/wallet/generateWallet";

export async function handler(event) {
  const orgId = uuidv4();
  try {
    const tableName = process.env.TABLE_NAME;
    const request = JSON.parse(event.body);
    if (
      !request ||
      !request["name"] ||
      !request["apiKey"] ||
      !request["contract"] ||
      !request["tier"]
    )
      return Responses._400({
        message:
          "Missing the organization name or apiKey or tier from the request body",
      });
    const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const encodedCryptoPubKey = await getSecrets(process.env.WALLETS_PUB_KEY);

    const walletData = await generateWallet(
      alchemyKey,
      encodedCryptoPubKey,
      orgId
    );

    const orgData = {
      orgId: orgId,
      name: request["name"],
      contract: request["contract"],
      tier: request["tier"],
      wallet: walletData,
    };

    const orgKeyData = {
      PK: `KEY#${request["apiKey"]}`,
      SK: `KEY#${request["apiKey"]}`,
      orgData,
    };

    await Dynamo.put(orgKeyData, tableName);

    const org = {
      PK: `ORG#${orgId}`,
      SK: `METADATA#${orgId}`,
      orgData,
    };

    await Dynamo.put(org, tableName);

    return Responses._200({ orgId: orgId });
  } catch (e) {
    console.log(`Error - orgId: ${orgId} error: ${e.toString()}`);
    return Responses._400({
      message: `Error - orgId: ${orgId} error: ${e.toString()}`,
    });
  }
}
