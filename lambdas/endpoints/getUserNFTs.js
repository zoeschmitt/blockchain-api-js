import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import getOrg from "../common/getOrg";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;

  try {
    if (!event.pathParameters || !event.pathParameters.walletId)
      return Responses._400({ message: "Missing a walletId in the path" });

    const walletId = event.pathParameters.walletId;
    const org = await getOrg(event["headers"]["X-API-KEY"]);
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
      nfts.push({
        nftId: nftData["nftId"],
        mintedBy: nftData["mintedBy"],
        walletAddress: nftData["walletAddress"],
        openseaUrl: nftData["openseaUrl"],
        metadata: nftData["metadata"],
      });
    }

    return Responses._200({ NFTs: nfts });
  } catch (e) {
    console.log(`getUserNFTs error: ${e.toString()}`);
    return Responses._400({ message: "Failed to get nfts" });
  }
}
