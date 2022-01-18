import getOrg from "../common/getOrg";
import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../common/getSecrets";
import Pinata from "../helpers/pinata";
import FormData from "form-data";
import nftContract from "../../contracts/NFT.json";
import parser from "lambda-multipart-parser";
import { Readable } from "stream";
import mintNFT from "../common/nft/mintNFT";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  const nftId = uuidv4();
  console.log(`nftId: ${nftId}`);
  try {
    // Verifying request data
    console.log(event);
    const request = await parser.parse(event);

    if (
      !request ||
      !request["metadata"] ||
      !request["files"] ||
      !request["base64Img"]
    )
      return Responses._400({
        message:
          "Missing nft metadata, objectFile, or base64Img from the request body",
      });

    if (!event.pathParameters || !event.pathParameters.walletId)
      return Responses._404({ message: "walletId not found in path." });

    const imgFile = request["base64Img"];
    let objFile;

    try {
      objFile = request["files"][0];
      if (!objFile) throw "Object file not found.";
      if (!objFile.filename.includes("obj"))
        throw "Object file contentType must be of type .obj.";
    } catch (e) {
      console.log(e);
      return Responses._400({ message: e.toString() });
    }

    const walletId = event.pathParameters.walletId;
    const metadata = JSON.parse(request["metadata"]);
    const org = await getOrg(event["headers"]);
    const orgId = org["orgId"];

    // // Fetching wallet details with walletId from req
    try {
      const walletData = await Dynamo.get({
        TableName: tableName,
        Key: {
          PK: `ORG#${orgId}#WAL#${walletId}`,
          SK: `ORG#${orgId}`,
        },
      });
      if (!walletData) throw "Wallet not found";
    } catch (e) {
      return Responses._404({
        message: `Wallet not found with walletId ${walletId}`,
      });
    }

    // Getting our wallet info
    const ourWallet = await getSecrets(process.env.OUR_WALLET);
    const ourAddress = ourWallet["address"];

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
    metadata[
      "external_url"
    ] = `https://10xit-inc.github.io/3d-viewer/?object=${pinataObjFileRes}&filename=${objFile["filename"]}`;
    metadata["seller_fee_basis_points"] = 1000; // 10%
    metadata["fee_recipient"] = ourAddress;

    const pinataJSONRes = await pinJSONToIPFS(
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
      metadata,
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

    return Responses._200({ nft: resNftData });
  } catch (e) {
    console.log(`ERROR - nftId: ${nftId} error: ${e.toString()}`);
    return Responses._400({
      message: "Failed to create nft, our development team has been notified.",
    });
  }
}
