import getOrg from "../../common/getOrg";
import Responses from "../../common/apiResponses";
import Dynamo from "../../common/dynamo";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../../common/getSecrets";
import generateWallet from "../../common/wallet/generateWallet";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  const walletId = uuidv4();
  try {
    const org = await getOrg(event["headers"]);
    const orgId = org["orgId"];
    const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const encodedCryptoPubKey = await getSecrets(process.env.WALLETS_PUB_KEY);
    
    const walletData = await generateWallet(alchemyKey, encodedCryptoPubKey, walletId);

    const data = {
      PK: `ORG#${orgId}#WAL#${walletId}`,
      SK: `ORG#${orgId}`,
      walletId: walletId,
      wallet: walletData,
    };

    await Dynamo.put(data, tableName);

    console.log(`createWallet Finished successfully`);
    return Responses._200({ walletId: walletId });
  } catch (e) {
    console.log(`ERROR - walletId: ${walletId} error: ${e.toString()}`);
    return Responses._400({
      message:
        "Failed to create wallet, our development team has been notified.",
    });
  }
}
