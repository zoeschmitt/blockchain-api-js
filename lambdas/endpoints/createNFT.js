import getOrg from "../common/getOrg";
import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import Web3 from "web3";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../common/getSecrets";
import axios from "axios";
import FormData from "form-data";
import nftContract from "../../contracts/NFT.json";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  const nftId = uuidv4();
  try {
    // Verifying request data
    const request = JSON.parse(event.body);
    if (!request || !request["metadata"] || !request["file"]) {
      return Responses._400({
        message: "Missing nft metadata or file from the request body",
      });
    }
    if (!event.pathParameters || !event.pathParameters.walletId)
      return Responses._400({ message: "Missing a walletId in the path" });

    const walletId = event.pathParameters.walletId;
    const org = await getOrg(event["headers"]["X-API-KEY"]);
    const orgId = org["orgId"];

    // Fetching wallet details with walletId from req
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

    console.log(walletData);

    // Uploading image to pinata
    const pinataKeys = await getSecrets(process.env.PINATA_KEY);
    const pinataUrl = "https://gateway.pinata.cloud/ipfs/";

    let pinataData = new FormData();
    pinataData.append("file", request["file"]);
    pinataData.append("metadata", JSON.stringify({ name: walletId }));

    const pinataFileRes = await pinFileToIPFS(
      pinataData,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    let nftMetadata = request["metadata"];
    nftMetadata["image"] = pinataUrl + pinataFileRes;

    const pinataJSONRes = await pinJSONToIPFS(
      nftMetadata,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );
    console.log(pinataFileRes);
    console.log(pinataJSONRes);

    const tokenURI = pinataUrl + pinataJSONRes;

    // Minting NFT
    const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const ourWallet = await getSecrets(process.env.OUR_WALLET);
    const ourAddress = ourWallet["privkey"];
    const ourPrivateKey = ourWallet["address"];
    const web3 = new Web3(alchemyKey["key"]);
    const openseaBaseUrl = `https://testnets.opensea.io/assets/mumbai`;
    const contractAddress = org["contract"];

    const contract = new web3.eth.Contract(nftContract.abi, contractAddress);

    const txn = contract.methods.mintNFT(ourAddress, tokenURI);
    const gas = await txn.estimateGas({ from: ourAddress });
    const gasPrice = await web3.eth.getGasPrice();

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

    const nonce2 = await web3.eth.getTransactionCount(ourAddress, "latest");
    const tokenId = web3.utils.hexToNumber(txnReceipt.logs[0].topics[3]);
    const transferTxn = await web3.eth.accounts.signTransaction(
      {
        to: contractAddress,
        nonce: nonce2,
        data: contract.methods
          .safeTransferFrom(ourAddress, walletData["address"], tokenId)
          .encodeABI(),
        gas,
        gasPrice,
      },
      ourPrivateKey
    );
    await web3.eth.sendSignedTransaction(transferTxn.rawTransaction);

    const nftData = {
      nftId: nftId,
      contract: contractAddress,
      tokenId: tokenId,
      transactionHash: txnReceipt["transactionHash"],
      mintedBy: walletData["address"],
      openseaUrl: `${openseaBaseUrl}/${contractAddress}/${tokenId}`,
      ipfsImgHash: pinataFileRes,
      ipfsJSONHash: pinataJSONRes,
      pinataLink: tokenURI,
      metadata: nftMetadata,
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
