const AWS = require("aws-sdk");
const Dynamo = require("../common/dynamo");

const getOrgId = async (apiKey) => {
  try {
    const tableName = process.env.TABLE_NAME;
    const params = {
      TableName: tableName,
      Key: {
        PK: `KEY#${apiKey}`,
        SK: `KEY#${apiKey}`
      },
    };
    const res = await Dynamo.get(params);
    return res["orgId"];
  } catch (e) {
    console.log(`Error getOrgId: ${e}`);
    return null;
  }
};

module.exports = getOrgId;
