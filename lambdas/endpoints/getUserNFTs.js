import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import getOrg from "../common/getOrg";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;

  try {
    if (!event.pathParameters || !event.pathParameters.walletId)
      return Responses._400({ message: "Missing a walletId in the path" });

    const walletId = event.pathParameters.walletId;
    const org = await getOrg(event["headers"]);
    const orgId = org["orgId"];

    const nftQuery = await Dynamo.query({
      TableName: tableName,
      KeyConditionExpression: "#PK = :PK and begins_with(#SK, :SK)",
      ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK" },
      ExpressionAttributeValues: {
        ":PK": `ORG#${orgId}`,
        ":SK": `WAL#${walletId}`,
      },
    });

    if (!nftQuery) {
      return Responses._404({ message: "Failed to find nfts" });
    }

    let nfts = [];
    for (let nft in nftQuery) {
      const nftData = nftQuery[nft]["nftData"];

      // Remove unneeded royalty info from metadata response.
      if (nftData.metadata.seller_fee_basis_points !== undefined)
        delete nftData.metadata.seller_fee_basis_points;
      if (nftData.metadata.fee_recipient !== undefined)
        delete nftData.metadata.fee_recipient;

      nfts.push({
        nftId: nftData["nftId"],
        mintedBy: nftData["mintedBy"],
        walletAddress: nftData["walletAddress"],
        transactionHash: nftData["transactionHash"],
        openseaUrl: nftData["openseaUrl"],
        metadata: nftData["metadata"],
        createdAt: nftData["createdAt"],
      });
    }

    console.log(`getUserNFTs Finished successfully`);
    return Responses._200({ NFTs: nfts });
  } catch (e) {
    console.log(`getUserNFTs error: ${e.toString()}`);
    return Responses._400({ message: "Failed to get nfts" });
  }
}
