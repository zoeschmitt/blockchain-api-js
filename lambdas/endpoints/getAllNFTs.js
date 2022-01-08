import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import getOrg from "../common/getOrg";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  try {
    const org = await getOrg(event["headers"]);
    const orgId = org["orgId"];

    const nftQuery = await Dynamo.query({
      TableName: tableName,
      KeyConditionExpression: "#PK = :PK and begins_with(#SK, :SK)",
      ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK" },
      ExpressionAttributeValues: {
        ":PK": `ORG#${orgId}`,
        ":SK": `WAL#`,
      },
    });

    console.log(nftQuery);

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
    console.log(`getAllNFTs error - nftId: ${e.toString()}`);
    return Responses._400({ message: "Failed to get nfts" });
  }
}
