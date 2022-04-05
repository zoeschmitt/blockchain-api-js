module.exports = {
  tables: [
    {
      TableName: "polygon-prod",
      KeySchema: [{ AttributeName: "orgId", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "orgId", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    }
  ],
};
