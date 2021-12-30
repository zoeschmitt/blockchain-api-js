import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import Web3 from "web3";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../common/getSecrets";
import { Buffer } from "buffer";
import crypto from "crypto";

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
    ) {
      return Responses._400({
        message:
          "Missing the organization name or apiKey or tier from the request body",
      });
    }
    //const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const encodedCryptoPubKey = await getSecrets(process.env.WALLETS_PUB_KEY);
    const cryptoPubKey = Buffer.from(
      encodedCryptoPubKey["pubkey"],
      "base64"
    ).toString("ascii");
    const web3 = new Web3(alchemyKey["key"]);
    const newWallet = web3.eth.accounts.create([orgId]);

    const encryptedWalletPrivKey = crypto.publicEncrypt(
      cryptoPubKey,
      Buffer.from(newWallet["privateKey"])
    );

    const walletData = {
      address: newWallet["address"],
      privateKey: encryptedWalletPrivKey.toString("base64"),
    };

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

    await Dynamo.put(orgKeyData, tableName).catch((err) => {
      console.log("error in dynamo write", err);
      return null;
    });

    const org = {
      PK: `ORG#${orgId}`,
      SK: `METADATA#${orgId}`,
      orgData,
    };

    const res = await Dynamo.put(org, tableName).catch((err) => {
      console.log("error in dynamo write", err);
      return null;
    });

    if (!res) {
      return Responses._400({ message: "Failed to create org" });
    }

    return Responses._200({ orgId: orgId });
  } catch (e) {
    console.log(`createOrg error - orgId: ${orgId} error: ${e.toString()}`);
    return Responses._400({ message: "Failed to create org" });
  }
}
