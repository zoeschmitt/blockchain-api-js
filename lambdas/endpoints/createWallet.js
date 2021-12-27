import getOrgId from "../common/getOrgId";
import { Buffer } from "buffer";
import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import Web3 from "web3";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../common/getSecrets";
import crypto from "crypto";

export async function handler(event) {
    const tableName = process.env.TABLE_NAME;
    const walletId = uuidv4();
  try {
    const orgId = await getOrgId(event['headers']['X-API-KEY']);
    const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const encodedCryptoPubKey = await getSecrets(process.env.WALLETS_PUB_KEY);
    const cryptoPubKey = Buffer.from(
      encodedCryptoPubKey["pubkey"],
      "base64"
    ).toString("ascii");
    const web3 = new Web3(alchemyKey["key"]);
    const newWallet = web3.eth.accounts.create([walletId]);

    const encryptedWalletPrivKey = crypto.publicEncrypt(
      cryptoPubKey,
      Buffer.from(newWallet["privateKey"])
    );

    const walletData = {
      address: newWallet["address"],
      privateKey: encryptedWalletPrivKey.toString("base64"),
    };

    const data = {
      PK: `ORG#${orgId}#WAL#${walletId}`,
      SK: `ORG#${orgId}`,
      walletId: walletId,
      wallet: walletData,
    };

    const res = await Dynamo.put(data, tableName).catch((err) => {
      console.log("error in dynamo write", err);
      return null;
    });

    if (!res) {
      return Responses._400({ message: "Failed to create wallet" });
    }

    return Responses._200({ walletId: walletId });
  } catch (e) {
    console.log(
      `createWallet error - walletId: ${walletId} error: ${e.toString()}`
    );
    return Responses._400({ message: "Failed to create wallet" });
  }
}
