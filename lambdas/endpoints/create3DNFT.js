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

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  const nftId = uuidv4();
  try {
    // Verifying request data
    console.log(event);
    const request = await parser.parse(event);
    let imgFile;
    let objFile;

    if (!request || !request["metadata"] || !request["files"]) {
      return Responses._400({
        message: "Missing nft metadata or files from the request body",
      });
    }

    if (!event.pathParameters || !event.pathParameters.walletId)
      return Responses._404({ message: "walletId not found in path." });

    try {
      const files = await validateRequestFiles(request.files);
      imgFile = files.imgFile;
      objFile = files.objFile;
    } catch (e) {
      console.log(e);
      return Responses._400({ message: e.toString() });
    }

    const walletId = event.pathParameters.walletId;
    const metadata = JSON.parse(request["metadata"]);
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
      return Responses._404({
        message: `Wallet not found with walletId ${walletId}`,
      });

    // Getting our wallet info
    const ourWallet = await getSecrets(process.env.OUR_WALLET);
    const ourAddress = ourWallet["address"];
    const ourPrivateKey = ourWallet["privkey"];

    // Uploading image to pinata
    const pinataKeys = await getSecrets(process.env.PINATA_KEY);
    let pinataImgData = new FormData();
    pinataImgData.append("file", imgFile["content"], {
      filename: imgFile["filename"],
    });

    let pinataObjData = new FormData();
    pinataObjData.append("file", objFile["content"], {
      filename: objFile["filename"],
    });

    const pinataImgFileRes = await pinFileToIPFS(
      pinataImgData,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    if (!pinataImgFileRes) throw "pinFileToIPFS error";

    const pinataObjFileRes = await pinFileToIPFS(
      pinataObjData,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    if (!pinataObjFileRes) throw "pinFileToIPFS error";

    // Set image hash and royalties information.
    metadata["image"] = `https://ipfs.io/ipfs/${pinataImgFileRes}`;
    metadata["object_ipfs_hash"] = pinataObjFileRes;
    metadata["external_url"] = `https://10xit-inc.github.io/3d-viewer/?object=${pinataObjFileRes}&filename=${objFile["filename"]}`;
    metadata["seller_fee_basis_points"] = 1000; // 10%
    metadata["fee_recipient"] = ourAddress;

    const pinataJSONRes = await pinJSONToIPFS(
      metadata,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    if (!pinataJSONRes) throw "pinataJSONRes error";

    const tokenURI = `https://ipfs.io/ipfs/${pinataJSONRes}`;

    // Minting NFT
    const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const walletAddress = walletData["wallet"]["address"];
    const web3 = new Web3(alchemyKey["key"]);
    const openseaBaseUrl = process.env.OPENSEA_URL;
    const contractAddress = org["contract"];
    const contract = new web3.eth.Contract(nftContract.abi, contractAddress);

    const txn = contract.methods.mintNFT(walletAddress, tokenURI);
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
      ipfsLink: tokenURI,
      metadata: metadata,
      createdAt: new Date().toISOString(),
    };

    // Remove unneeded royalty info from metadata response.
    if (metadata.seller_fee_basis_points !== undefined)
      delete metadata.seller_fee_basis_points;
    if (metadata.fee_recipient !== undefined) delete metadata.fee_recipient;

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

const validateRequestFiles = async (files) => {
  const objFile = files.find((file) => file.fieldname === "objectFile");
  const imgFile = files.find(
    (file) => file.fieldname === "file" && file.contentType === "image/png"
  );
  if (!objFile) throw "Object file not found.";
  if (!imgFile) throw "File with contentType image/png not found.";
  if (files.length !== 2)
    throw "To mint a 3d object you must send 2 files: the object file and an image file.";

  return { imgFile, objFile };
};
