import Responses from "../../common/apiResponses";
import Dynamo from "../../common/dynamo";

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

    let updateExpression;
    let expressionAttributes;

    if (request["contract"] && request["tier"]) {
      updateExpression = "set orgData.tier=:t, orgData.contract=:c";
      expressionAttributes = {
        ":t": request["tier"],
        ":c": request["contract"],
      };
    }
    if (request["contract"]) {
      updateExpression = "set orgData.contract=:c";
      expressionAttributes = {
        ":c": request["contract"],
      };
    }
    if (request["tier"]) {
      updateExpression = "set orgData.tier=:t";
      expressionAttributes = {
        ":t": request["tier"],
      };
    }

    const updateParams = {
      TableName: tableName,
      Key: {
        PK: `ORG#${orgId}`,
        SK: `METADATA#${orgId}`,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributes,
      ReturnValues: "UPDATED_NEW",
    };

    console.log(updateParams)

    const udpatedOrg = await Dynamo.update(updateParams, tableName);

    return Responses._200(udpatedOrg);
  } catch (e) {
    console.log(`updateOrg error: ${e.toString()}`);
    return Responses._400({ message: `Error - updateOrg:  ${e.toString()}` });
  }
}
