import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;

  try {
    if (!event.pathParameters || !event.pathParameters.orgId)
      return Responses._400({ message: "Missing the orgId from the path." });

    const orgId = event.pathParameters.orgId;

    let request;
    try {
      // Verifying request data
      request = JSON.parse(event.body);
    } catch (e) {
      return Responses._400({
        message: `JSON error parsing request body: ${e}`,
      });
    }

    if (!request["tier"] && !request["contract"])
      throw "The only valid update params are tier and contract. Neither of those were found in the request body.";

    if (request["tier"] && typeof request["tier"] !== "string")
      throw "Tier must be of type string.";

    if (request["contract"] && typeof request["contract"] !== "string")
      throw "Contract must be of type string.";

    const updateParams = {
      TableName: tableName,
      Key: {
        PK: `ORG#${orgId}`,
        SK: `METADATA#${orgId}`,
      },
      UpdateExpression: "set orgData.tier = :t, orgData.contract=:c",
      ExpressionAttributeValues: {
        ":t": request["contract"],
        ":c": request["tier"],
      },
      ReturnValues: "UPDATED_NEW",
    };

    const udpatedOrg = await Dynamo.update(updateParams, tableName);

    return Responses._200(udpatedOrg);
  } catch (e) {
    console.log(`getOrgById error: ${e.toString()}`);
    return Responses._400({ message: `Error - getOrgById:  ${e.toString()}` });
  }
}
