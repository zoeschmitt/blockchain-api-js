import getOrg from "../common/getOrg";
import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../common/getSecrets";
import FormData from "form-data";
import nftContract from "../../contracts/NFT.json";
import parser from "lambda-multipart-parser";
import { Readable } from "stream";
import mintNFT from "../common/nft/mintNFT";
import Pinata from "../common/nft/pinata";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  const nftId = uuidv4();
  console.log(`nftId: ${nftId}`);

  try {
    // Verifying request data
    console.log(event);

    if (!event.pathParameters || !event.pathParameters.walletId)
      return Responses._404({ message: "walletId not found in path." });

    const walletId = event.pathParameters.walletId;

    let parseRequest;
    try {
      parseRequest = await verifyAndParseRequest(event);
    } catch (e) {
      console.log(e);
      return Responses._400({ message: e.toString() });
    }
    const { objFile, imgFile, metadata } = parseRequest;

    const org = await getOrg(event["headers"]);
    const orgId = org["orgId"];
    const orgWalletAddress = org["wallet"]["address"];

    let tempWallet;

    try {
      tempWallet = await Dynamo.get({
        TableName: tableName,
        Key: {
          PK: `ORG#${orgId}#WAL#${walletId}`,
          SK: `ORG#${orgId}`,
        },
      });
      if (!tempWallet) throw "Wallet not found";
    } catch (e) {
      console.log(e);
      return Responses._404({
        message: `Wallet not found with walletId ${walletId}`,
      });
    }
    const walletData = tempWallet;
    // Getting our wallet info
    const ourWallet = await getSecrets(process.env.OUR_WALLET);

    // Uploading image to pinata
    const pinataKeys = await getSecrets(process.env.PINATA_KEY);
    const imgBuffer = Buffer.from(imgFile, "base64");
    const stream = Readable.from(imgBuffer);

    let pinataImgData = new FormData();
    pinataImgData.append("file", stream, { filename: "img_preview.png" });

    let pinataObjData = new FormData();
    pinataObjData.append("file", objFile["content"], {
      filename: objFile["filename"],
    });

    const pinataImgFileRes = await Pinata.pinFileToIPFS(
      pinataImgData,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    if (!pinataImgFileRes) throw "pinataImgFileRes error";

    const pinataObjFileRes = await Pinata.pinFileToIPFS(
      pinataObjData,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    if (!pinataObjFileRes) throw "pinataObjFileRes error";

    // Set image hash and royalties information.
    metadata["image"] = `https://ipfs.io/ipfs/${pinataImgFileRes}`;
    metadata["object_ipfs_hash"] = pinataObjFileRes;
    // metadata["external_url"] = `https://10xit-inc.github.io/3d-viewer/?object=${pinataObjFileRes}&filename=${objFile["filename"]}`;
    metadata["seller_fee_basis_points"] = 1000; // 10%
    metadata["fee_recipient"] = orgWalletAddress;

    const pinataJSONRes = await Pinata.pinJSONToIPFS(
      metadata,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    if (!pinataJSONRes) throw "pinataJSONRes error";

    console.log("IPFS pinning complete.");

    const tokenURI = `https://ipfs.io/ipfs/${pinataJSONRes}`;

    // Minting NFT
    const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const walletAddress = walletData["wallet"]["address"];
    const openseaBaseUrl = process.env.OPENSEA_URL;
    const contractAddress = org["contract"];

    const { tokenId, txnReceipt } = await mintNFT(
      nftContract,
      alchemyKey,
      ourWallet,
      walletAddress,
      contractAddress,
      tokenURI
    );

    const nftData = {
      nftId: nftId,
      contract: contractAddress,
      tokenId: tokenId,
      transactionHash: txnReceipt["transactionHash"],
      mintedBy: walletId,
      walletAddress: walletAddress,
      openseaUrl: `${openseaBaseUrl}/${contractAddress}/${tokenId}`,
      ipfsImgHash: pinataImgFileRes,
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

    await Dynamo.put(multNftQueryData, tableName);
    await Dynamo.put(singleNftQueryData, tableName);

    console.log(`create3DNFT Finished successfully - nftId: ${nftId} - transaction hash: ${txnReceipt["transactionHash"]}`);
    return Responses._200({ nft: resNftData });
  } catch (e) {
    console.log(`ERROR - nftId: ${nftId} error: ${e.toString()}`);
    return Responses._400({
      message: "Failed to create nft, our development team has been notified.",
    });
  }
}
// returns objFile, imgFile, metadata
const verifyAndParseRequest = async (event) => {
  let request;
  try {
    request = await parser.parse(event);
  } catch (e) {
    throw e.toString();
  }

  if (!request["metadata"]) throw "No metadata found.";
  if (!request["base64Img"] || typeof request["base64Img"] !== "string")
    throw "Error parsing base64Img. Make sure you are sending it and that it is a base64 string, not a file.";

  const imgFile = request["base64Img"];

  const objFile = request["files"][0];
  if (!objFile) throw "objectFile not found.";
  if (!objFile.filename.includes("obj"))
    throw "Object file contentType must be of type .obj.";

  let metadata;

  try {
    metadata = JSON.parse(request["metadata"]);
  } catch (e) {
    throw `JSON error parsing metadata, make sure you're sending a stringified JSON object: ${e}`;
  }
  return {
    objFile: objFile,
    imgFile: imgFile,
    metadata: metadata,
  };
};
