import Responses from "../../common/apiResponses";
import Dynamo from "../../common/dynamo";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;

  try {
    if (!event.pathParameters || !event.pathParameters.orgId)
      return Responses._404({ message: "Missing the orgId from the path." });

    const orgId = event.pathParameters.orgId;

    const params = {
      TableName: tableName,
      Key: {
        PK: `ORG#${orgId}`,
        SK: `METADATA#${orgId}`,
      },
    };
    const res = await Dynamo.get(params);
    return Responses._200(res);
  } catch (e) {
    console.log(`getOrgById error: ${e.toString()}`);
    return Responses._400({ message: `Error - getOrgById:  ${e.toString()}` });
  }
}
