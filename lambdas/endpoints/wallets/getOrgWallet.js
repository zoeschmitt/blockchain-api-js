import { Buffer } from "buffer";
import Responses from "../../common/apiResponses";
import Dynamo from "../../common/dynamo";
import getSecrets from "../../common/getSecrets";
import crypto from "crypto";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  try {
    if (!event.pathParameters || !event.pathParameters.orgId)
      return Responses._400({ message: "Missing a orgId in the path" });

    const orgId = event.pathParameters.orgId;

    const params = {
      TableName: tableName,
      Key: {
        PK: `ORG#${orgId}`,
        SK: `METADATA#${orgId}`,
      },
    };

    const org = await Dynamo.get(params);
    const orgWallet = org["orgData"]["wallet"];

    const encodedCryptoPrivKey = await getSecrets(process.env.WALLETS_PRIV_KEY);
    const cryptoPrivKey = Buffer.from(
      encodedCryptoPrivKey["privkey"],
      "base64"
    ).toString("ascii");

    const decryptedWalletPrivKey = crypto.privateDecrypt(
      cryptoPrivKey,
      Buffer.from(orgWallet["privateKey"], "base64")
    );

    const data = {
      decryptedPrivateKey: decryptedWalletPrivKey.toString("ascii"),
      address: orgWallet["address"],
    };

    return Responses._200({ wallet: data });
  } catch (e) {
    console.log(e);
    return Responses._400({
      message: `getOrgWallet error: ${e}`,
    });
  }
}
