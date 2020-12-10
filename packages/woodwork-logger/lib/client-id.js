let clientId;
const generateClientId = () => {
  if (!clientId) {
    clientId = Math.random().toString(36).substr(2, 9);
  }

  return clientId;
};

const getClientId = () => generateClientId();

module.exports = {
  generateClientId,
  getClientId,
};
