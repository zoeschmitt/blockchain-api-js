const AWS = require("aws-sdk");

let options = {};
if (process.env.IS_OFFLINE)
  options = {
    region: "localhost",
    endpoint: "http://localhost:8000",
  };
const documentClient = new AWS.DynamoDB.DocumentClient(options);

const Dynamo = {
  async get(id, TableName) {
    const params = {
      TableName,
      Key: {
        id,
      },
    };

    const data = await documentClient.get(params).promise();

    if (!data || !data.Item) {
      throw Error(
        `There was an error fetching the data for id of ${id} from ${TableName}`
      );
    }
    console.log(data);

    return data.Item;
  },

  async write(data, TableName) {
    if (!data.id) {
      throw Error("no id on the data");
    }

    const params = {
      TableName,
      Item: data,
    };

    const res = await documentClient.put(params).promise();

    if (!res) {
      throw Error(
        `There was an error inserting id of ${data.id} in table ${TableName}`
      );
    }

    return data;
  },
};

module.exports = Dynamo;
