import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;

  if (!event.pathParameters || !event.pathParameters.id)
    return Responses._400({ message: "missing the nft id from the path" });

  const id = event.pathParameters.id;

  const orgId = await getOrgId(event["headers"]["X-API-KEY"]);

  const params = {
    TableName: tableName,
    Key: {
      PK: `ORG#${orgId}#NFT#${id}`,
      SK: `ORG#${orgId}`,
    },
  };

  const nft = await Dynamo.get(params).catch((err) => {
    console.log("error in Dynamo Get", err);
    return null;
  });

  if (!nft) {
    return Responses._404({ message: `Failed to get nft with id ${id}` });
  }

  return Responses._200({ nft: nft });
}
