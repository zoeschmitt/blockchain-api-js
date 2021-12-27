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
    const reqOrgInfo = JSON.parse(event.body);
    if (
      !reqOrgInfo ||
      !reqOrgInfo["name"] ||
      !reqOrgInfo["apiKey"] ||
      !reqOrgInfo["tier"]
    ) {
      return Responses._400({
        message:
          "Missing the organization name or apiKey or tier from the request body",
      });
    }
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

    const orgKeyData = {
      PK: `KEY#${reqOrgInfo["apiKey"]}`,
      SK: `KEY#${reqOrgInfo["apiKey"]}`,
      orgId: orgId,
      tier: reqOrgInfo["tier"],
    };

    await Dynamo.put(orgKeyData, tableName).catch((err) => {
      console.log("error in dynamo write", err);
      return null;
    });

    const orgData = {
      PK: `ORG#${orgId}`,
      SK: `METADATA#${orgId}`,
      orgId: orgId,
      name: reqOrgInfo["name"],
      tier: reqOrgInfo["tier"],
      wallet: walletData,
    };

    const res = await Dynamo.put(orgData, tableName).catch((err) => {
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
