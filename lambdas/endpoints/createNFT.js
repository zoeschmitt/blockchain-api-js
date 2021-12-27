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
  const nftId = uuidv4();
  try {
    const reqOrgInfo = JSON.parse(event.body);
    if (!reqOrgInfo || !reqOrgInfo["walletId"]) {
      return Responses._400({
        message: "Missing nft data from the request body",
      });
    }
    if (!event.pathParameters || !event.pathParameters.walletId)
      return Responses._400({ message: "Missing a walletId in the path" });
    const walletId = event.pathParameters.walletId;
    const orgId = await getOrgId(event["headers"]["X-API-KEY"]);
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
    const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const encodedCryptoPrivKey = await getSecrets(process.env.WALLETS_PRIV_KEY);
    const cryptoPrivKey = Buffer.from(
      encodedCryptoPrivKey["privkey"],
      "base64"
    ).toString("ascii");
    const web3 = new Web3(alchemyKey["key"]);

    const decryptedWalletPrivKey = crypto.privateDecrypt(
      cryptoPrivKey,
      Buffer.from(walletData["privateKey"])
    );

    // check nft has all needed data
    // upload to ipfs with pinata
    // mint nft with decryptedWalletPrivKey
    // save opensea link, nft address, ipfs location link
    // return nft data

    const nftData = {
      address: newWallet["address"],
      privateKey: encryptedWalletPrivKey.toString("base64"),
    };

    const data = {
      PK: `ORG#${orgId}`,
      SK: `WAL#${nftId}`,
      nftId: nftId,
      metadata: nftData,
    };

    const data2 = {
      PK: `ORG#${orgId}#NFT#${nftId}`,
      SK: `ORG#${orgId}`,
      nftId: nftId,
      metadata: nftData,
    };

    const res = await Dynamo.put(data, tableName).catch((err) => {
      console.log("error in dynamo write", err);
      return null;
    });

    const res2 = await Dynamo.put(data2, tableName).catch((err) => {
      console.log("error in dynamo write", err);
      return null;
    });

    if (!res || !res2) {
      return Responses._400({ message: "Failed to create nft" });
    }

    return Responses._200({ walletId: nftId });
  } catch (e) {
    console.log(`createNFT error - nftId: ${nftId} error: ${e.toString()}`);
    return Responses._400({ message: "Failed to create nft" });
  }
}
