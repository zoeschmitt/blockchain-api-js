const AWS = require('aws-sdk');
const sm = new AWS.SecretsManager({ region: "us-east-1" });

const getSecrets = async (SecretId) => {
  return await new Promise((resolve, reject) => {
    sm.getSecretValue({ SecretId }, (err, result) => {
      if (err) reject(err.code.toString());
      else resolve(JSON.parse(result.SecretString));
    });
  });
};

module.exports = getSecrets;

// const getErrorMsg = err => {
//     var errMsg = err.code.toString() ?? '';
//     if (err.code === 'DecryptionFailureException')
//             // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
//             // Deal with the exception here, and/or rethrow at your discretion.
//             throw err;
//         else if (err.code === 'InternalServiceErrorException')
//             // An error occurred on the server side.
//             // Deal with the exception here, and/or rethrow at your discretion.
//             throw err;
//         else if (err.code === 'InvalidParameterException')
//             // You provided an invalid value for a parameter.
//             // Deal with the exception here, and/or rethrow at your discretion.
//             throw err;
//         else if (err.code === 'InvalidRequestException')
//             // You provided a parameter value that is not valid for the current state of the resource.
//             // Deal with the exception here, and/or rethrow at your discretion.
//             throw err;
//         else if (err.code === 'ResourceNotFoundException')
//             // We can't find the resource that you asked for.
//             // Deal with the exception here, and/or rethrow at your discretion.
//             throw err;
//         return errMsg;
// }
