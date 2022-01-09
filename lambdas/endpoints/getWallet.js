import getOrg from "../common/getOrg";
import { Buffer } from "buffer";
import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../common/getSecrets";
import crypto from "crypto";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  const walletId = uuidv4();
  try {
    console.log(event);
    if (!event.pathParameters || !event.pathParameters.walletId)
      return Responses._400({ message: "Missing a walletId in the path" });

    const walletId = event.pathParameters.walletId;

    const org = await getOrg(event["headers"]);
    const orgId = org["orgId"];

    // // Fetching wallet details with walletId from req
    const walletData = await Dynamo.get({
      TableName: tableName,
      Key: {
        PK: `ORG#${orgId}#WAL#${walletId}`,
        SK: `ORG#${orgId}`,
      },
    });
    if (!walletData)
      return Responses._400({
        message: "Failed to find wallet with that walletId",
      });

    const encodedCryptoPrivKey = await getSecrets(process.env.WALLETS_PRIV_KEY);
    const cryptoPrivKey = Buffer.from(
      encodedCryptoPrivKey["privkey"],
      "base64"
    ).toString("ascii");
    const walletPrivateKey = Buffer.from(
      walletData["wallet"]["privateKey"],
      "base64"
    );

    const decryptedWalletPrivKey = crypto.privateDecrypt(
      cryptoPrivKey,
      Buffer.from(walletData["wallet"]["privateKey"], "base64")
    );

    const data = {
      walletId: walletId,
      decryptedPrivateKey: decryptedWalletPrivKey.toString("ascii"),
      address: walletData["wallet"]["address"],
    };

    return Responses._200({ wallet: data });
  } catch (e) {
    console.log(
      `getWallet error - walletId: ${walletId} error: ${e.toString()}`
    );
    return Responses._400({ message: "Failed to get wallet" });
  }
}
