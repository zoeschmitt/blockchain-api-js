import getOrg from "../common/getOrg";
import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import Web3 from "web3";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../common/getSecrets";
import axios from "axios";
import FormData from "form-data";
import nftContract from "../../contracts/NFT.json";
import parser from "lambda-multipart-parser";
import { Readable, Duplex } from "stream";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  const nftId = uuidv4();
  try {
    // Verifying request data
    const request = JSON.parse(event.body);
    console.log(event);
    if (
      !request ||
      !request["metadata"] ||
      !request["content"] ||
      !request["filename"]
    ) {
      return Responses._400({
        message:
          "Missing nft metadata, filename, or content from the request body",
      });
    }

    if (!event.pathParameters || !event.pathParameters.walletId)
      return Responses._400({ message: "Missing a walletId in the path" });

    const walletId = event.pathParameters.walletId;
    const content = request["content"].includes(",")
      ? request["content"].split(",")[1]
      : request["content"];
    const metadata = request["metadata"];
    const filename = request["filename"];

    const org = await getOrg(
      event["headers"]["x-api-key"] !== undefined
        ? event["headers"]["x-api-key"]
        : event["headers"]["X-API-KEY"]
    );
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

    // Uploading image to pinata
    const pinataKeys = await getSecrets(process.env.PINATA_KEY);
    const imgBuffer = Buffer.from(content, "base64");
    const stream = Readable.from(imgBuffer);
    let pinataData = new FormData();
    pinataData.append("file", stream, { filename: filename });

    const pinataFileRes = await pinFileToIPFS(
      pinataData,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    if (!pinataFileRes) throw "pinFileToIPFS error";

    metadata["image"] = `https://gateway.pinata.cloud/ipfs/${pinataFileRes}`;

    const pinataJSONRes = await pinJSONToIPFS(
      metadata,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    if (!pinataJSONRes) throw "pinataJSONRes error";

    console.log(pinataFileRes);
    console.log(pinataJSONRes);

    const tokenURI = `https://gateway.pinata.cloud/ipfs/${pinataJSONRes}`;

    // Minting NFT
    const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const ourWallet = await getSecrets(process.env.OUR_WALLET);
    const ourAddress = ourWallet["address"];
    const ourPrivateKey = ourWallet["privkey"];
    const walletAddress = walletData["wallet"]["address"];
    const web3 = new Web3(alchemyKey["key"]);
    const openseaBaseUrl = `https://testnets.opensea.io/assets/mumbai`;
    const contractAddress = org["contract"];

    console.log(`ourAddress: ${ourAddress}`);
    console.log(`contractAddress: ${contractAddress}`);
    console.log(`walletAddress: ${walletAddress}`);

    const contract = new web3.eth.Contract(nftContract.abi, contractAddress);

    const txn = contract.methods.mintNFT(walletAddress, tokenURI);
    const gas = await txn.estimateGas({ from: ourAddress });
    const gasPrice = await web3.eth.getGasPrice();
    console.log(`gas: ${gas}`);
    console.log(`gasPrice: ${gasPrice}`);

    const data = txn.encodeABI();
    const nonce = await web3.eth.getTransactionCount(ourAddress, "latest");
    const signedTxn = await web3.eth.accounts.signTransaction(
      {
        from: ourAddress,
        to: contractAddress,
        nonce: nonce,
        data,
        gas,
        gasPrice,
      },
      ourPrivateKey
    );
    const txnReceipt = await web3.eth.sendSignedTransaction(
      signedTxn.rawTransaction
    );

    const tokenId = web3.utils.hexToNumber(txnReceipt.logs[0].topics[3]);

    const nftData = {
      nftId: nftId,
      contract: contractAddress,
      tokenId: tokenId,
      transactionHash: txnReceipt["transactionHash"],
      mintedBy: walletId,
      walletAddress: walletAddress,
      openseaUrl: `${openseaBaseUrl}/${contractAddress}/${tokenId}`,
      ipfsImgHash: pinataFileRes,
      ipfsJSONHash: pinataJSONRes,
      pinataLink: tokenURI,
      metadata: metadata,
    };

    const resNftData = {
      nftId: nftId,
      mintedBy: walletId,
      walletAddress: walletAddress,
      openseaUrl: `${openseaBaseUrl}/${contractAddress}/${tokenId}`,
      metadata: metadata,
    };

    const multNftQueryData = {
      PK: `ORG#${orgId}`,
      SK: `WAL#${walletId}#NFT#${nftId}`,
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

    return Responses._200({ nft: resNftData });
  } catch (e) {
    console.log(`createNFT error - nftId: ${nftId} error: ${e.toString()}`);
    return Responses._400({ message: "Failed to create nft" });
  }
}

const pinFileToIPFS = async (data, pinataApiKey, pinataSecretApiKey) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

  return axios
    .post(url, data, {
      maxBodyLength: "Infinity", //this is needed to prevent axios from erroring out with large files
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretApiKey,
      },
    })
    .then(function (response) {
      return response.data["IpfsHash"];
    })
    .catch(function (error) {
      console.log(error);
      return null;
    });
};

const pinJSONToIPFS = async (JSONBody, pinataApiKey, pinataSecretApiKey) => {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
  return axios
    .post(url, JSONBody, {
      headers: {
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretApiKey,
      },
    })
    .then(function (response) {
      console.log(response.data);
      return response.data["IpfsHash"];
    })
    .catch(function (error) {
      console.log(error);
      return null;
    });
};
