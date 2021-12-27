import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;
  const orgId = await getOrgId(event["headers"]["X-API-KEY"]);

  const nfts = await Dynamo.get({
    TableName: tableName,
    KeyConditionExpression: "#PK = :PK and begins_with(#SK, :SK)",
    ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK" },
    ExpressionAttributeValues: {
      ":PK": `ORG#${orgId}`,
      ":SK": "WAL#",
    },
  });

  if (!nfts) {
    return Responses._404({ message: "Failed to find nfts" });
  }

  let nftData = [];
  for (let nft in nfts) {
      nftData.push({
          id: nft['id'],
          data: nft['data']
      })
  }

  return Responses._200({ NFTs: nftData });
}
