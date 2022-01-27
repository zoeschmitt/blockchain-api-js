const AWS = require("aws-sdk");

let options = {};

if (process.env.IS_OFFLINE)
  options = {
    region: "localhost",
    endpoint: "http://localhost:8000",
  };

if (process.env.JEST_WORKER_ID)
  options = {
    endpoint: "http://localhost:8000",
    region: "local-env",
    sslEnabled: false,
  };

const documentClient = new AWS.DynamoDB.DocumentClient(options);

const Dynamo = {
  async get(params) {
    const data = await documentClient.get(params).promise();

    if (!data || !data.Item) {
      throw Error(
        `There was an error fetching the data for PK of ${params.Key.PK} from ${params.TableName}`
      );
    }
    console.log(data);

    return data.Item;
  },

  async put(data, TableName) {
    if (!data.PK) {
      throw Error("no PK on the data");
    }

    const params = {
      TableName,
      Item: data,
    };

    const res = await documentClient.put(params).promise();

    if (!res) {
      throw Error(
        `There was an error inserting id of ${data.PK} in table ${TableName}`
      );
    }

    return data;
  },

  async update(data, TableName) {
    if (!data.PK) {
      throw Error("no PK on the data");
    }

    const params = {
      TableName,
      Item: data,
    };

    const res = await documentClient.update(params).promise();

    if (!res) {
      throw Error(
        `There was an error inserting id of ${data.PK} in table ${TableName}`
      );
    }

    return res;
  },

  async query(params) {
    const data = await documentClient.query(params).promise();

    if (!data || !data.Items) {
      throw Error(
        `There was an error fetching the query data ${JSON.stringify(params)}`
      );
    }
    return data.Items;
  },
};

module.exports = Dynamo;
