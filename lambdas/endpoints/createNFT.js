import getOrgId from "../common/getOrgId";
import { Buffer } from "buffer";
import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import Web3 from "web3";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../common/getSecrets";
import crypto from "crypto";
import axios from "axios";
import FormData from "form-data";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  const nftId = uuidv4();
  try {
    const reqOrgInfo = JSON.parse(event.body);
    if (!reqOrgInfo || !reqOrgInfo["metadata"] || !reqOrgInfo["file"]) {
      return Responses._400({
        message: "Missing nft metadata or file from the request body",
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
    const pinataKeys = await getSecrets(process.env.PINATA_KEY);
    const encodedCryptoPrivKey = await getSecrets(process.env.WALLETS_PRIV_KEY);
    const cryptoPrivKey = Buffer.from(
      encodedCryptoPrivKey["privkey"],
      "base64"
    ).toString("ascii");
    const web3 = new Web3(alchemyKey["key"]);
    const pinataUrl = "https://api.pinata.cloud/pinning/pinFileToIPFS";

    const decryptedWalletPrivKey = crypto.privateDecrypt(
      cryptoPrivKey,
      Buffer.from(walletData["privateKey"])
    );

    let data = new FormData();
    data.append("file", reqOrgInfo["file"]);
    data.append("metadata", JSON.stringify(reqOrgInfo["metadata"]));

    const pinataRes = await axios.post(pinataUrl, data, {
      maxBodyLength: "Infinity", //this is needed to prevent axios from erroring out with large files
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: pinataKeys["pinata_api_key"],
        pinata_secret_api_key: pinataKeys["pinata_secret_api_key"],
      },
    });

    // mint nft

    const nftData = {
      nftId: nftId,
      address: "",
      mintedBy: "",
      openseaUrl: "",
      metadata: reqOrgInfo["metadata"],
      ipfsHash: pinataRes["IpfsHash"],
      fileSize: pinataRes["PinSize"],
    };

    const multNftQueryData = {
      PK: `ORG#${orgId}`,
      SK: `WAL#${walletId}`,
      nftData,
    };

    const singleNftQueryData = {
      PK: `ORG#${orgId}#NFT#${nftId}`,
      SK: `ORG#${orgId}`,
      nftData,
    };

    const res = await Dynamo.put(multNftQueryData, tableName).catch((err) => {
      console.log("error in dynamo write", err);
      return null;
    });

    const res2 = await Dynamo.put(singleNftQueryData, tableName).catch(
      (err) => {
        console.log("error in dynamo write", err);
        return null;
      }
    );

    if (!res || !res2) {
      return Responses._400({ message: "Failed to create nft" });
    }

    return Responses._200({ nft: nftData });
  } catch (e) {
    console.log(`createNFT error - nftId: ${nftId} error: ${e.toString()}`);
    return Responses._400({ message: "Failed to create nft" });
  }
}
