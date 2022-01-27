import getOrg from "../../common/getOrg";
import Responses from "../../common/apiResponses";
import Dynamo from "../../common/dynamo";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../../common/getSecrets";
import FormData from "form-data";
import nftContract from "../../../contracts/NFT.json";
import { Readable } from "stream";
import mintNFT from "../../common/nft/mintNFT";
import Pinata from "../../common/nft/pinata";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  const nftId = uuidv4();
  console.log(`nftId: ${nftId}`);
  try {
    let request;
    try {
      // Verifying request data
      request = JSON.parse(event.body);
    } catch (e) {
      return Responses._400({
        message: `JSON error parsing request body: ${e}`,
      });
    }
    console.log(event);
    if (
      !request ||
      !request["metadata"] ||
      !request["content"] ||
      !request["filename"]
    )
      return Responses._400({
        message:
          "Missing nft metadata, filename, or image content from the request body",
      });

    if (!event.pathParameters || !event.pathParameters.walletId)
      return Responses._404({ message: "walletId not found in path." });

    const walletId = event.pathParameters.walletId;
    const content = request["content"].includes(",")
      ? request["content"].split(",")[1]
      : request["content"];
    const metadata = request["metadata"];
    const filename = request["filename"];

    const org = await getOrg(event["headers"]);
    const orgId = org["orgId"];
    const orgWalletAddress = org["wallet"]["address"];
    const ourWallet = await getSecrets(process.env.OUR_WALLET);

    let walletData;

    try {
      walletData = await Dynamo.get({
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

    // Uploading image to pinata
    const pinataKeys = await getSecrets(process.env.PINATA_KEY);
    const imgBuffer = Buffer.from(content, "base64");
    const stream = Readable.from(imgBuffer);
    let pinataData = new FormData();
    pinataData.append("file", stream, { filename: filename });

    const pinataFileRes = await Pinata.pinFileToIPFS(
      pinataData,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    if (!pinataFileRes) throw "pinFileToIPFS error";

    // Set image hash and royalties information.

    metadata["image"] = `https://ipfs.io/ipfs/${pinataFileRes}`;
    metadata["ipfsImgHash"] = `${pinataFileRes}`;
    metadata["seller_fee_basis_points"] = 1000; // 10%
    metadata["fee_recipient"] = orgWalletAddress;

    const pinataJSONRes = await Pinata.pinJSONToIPFS(
      metadata,
      pinataKeys["pinata_api_key"],
      pinataKeys["pinata_secret_api_key"]
    );

    if (!pinataJSONRes) throw "pinataJSONRes error";

    console.log(pinataFileRes);
    console.log(pinataJSONRes);

    const tokenURI = `https://ipfs.io/ipfs/${pinataJSONRes}`;

    // Minting NFT
    const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
    const contractAddress = org["contract"];
    const openseaBaseUrl = process.env.OPENSEA_URL;
    const walletAddress = walletData["wallet"]["address"];

    const { tokenId, txnReceipt } = await mintNFT(
      nftContract,
      alchemyKey,
      ourWallet,
      walletAddress,
      contractAddress,
      tokenURI
    );

    console.log(tokenId);
    console.log(txnReceipt);

    const nftData = {
      nftId: nftId,
      orgId: orgId,
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
      transactionHash: txnReceipt["transactionHash"],
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

    console.log(`createNFT Finished successfully - nftId: ${nftId} - transaction hash: ${txnReceipt["transactionHash"]}`);
    return Responses._200({ nft: resNftData });
  } catch (e) {
    console.log(`ERROR - nftId: ${nftId} error: ${e.toString()}`);
    return Responses._400({
      message: "Failed to create NFT, our development team has been notified.",
    });
  }
}
