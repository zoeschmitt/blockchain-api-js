import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";

export async function handler(event) {
  // console.log('event', event);
  const tableName = process.env.TABLE_NAME;

  if (!event.pathParameters || !event.pathParameters.walletId)
    return _400({ message: "Missing a walletId in the path" });

  const walletId = event.pathParameters.walletId;
  const orgId = await getOrgId(event["headers"]["X-API-KEY"]);

  const nfts = await Dynamo.get({
    TableName: tableName,
    KeyConditionExpression: "#PK = :PK and #SK = :SK",
    ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK" },
    ExpressionAttributeValues: {
      ":PK": `ORG#${orgId}`,
      ":SK": `WAL#${walletId}`,
    },
  });

  if (!nfts) {
    return Responses._404({ message: "Failed to find nfts" });
  }

  let nftData = [];
  for (let nft in nfts) {
    nftData.push({
      id: nft["id"],
      data: nft["data"],
    });
  }

  return _200({ user });
}
