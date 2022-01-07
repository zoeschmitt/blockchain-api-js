const AWS = require("aws-sdk");
const Dynamo = require("./dynamo");

const getOrg = async (apiKey) => {
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
    return res['orgData'];
  } catch (e) {
    console.log(`Error getOrg: ${e}`);
    return null;
  }
};

module.exports = getOrg;
