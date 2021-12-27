import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";

export async function handler(event) {
  // console.log('event', event);
  const tableName = process.env.TABLE_NAME;

  if (!event.pathParameters || !event.pathParameters.walletId)
    return _400({ message: "Missing a walletId in the path" });

  const walletId = event.pathParameters.walletId;

  const nfts = await Dynamo.get({
    TableName: tableName,
    KeyConditionExpression: "#PK = :PK and begins_with(#SK, :SK)",
    ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK" },
    ExpressionAttributeValues: {
      ":PK": `ORG#${orgId}`,
      ":SK": "WAL#${walletId}",
    },
  });

  if (!nfts) {
    return _404({ message: "Failed to get nfts for wallet " });
  }

  return _200({ user });
}
